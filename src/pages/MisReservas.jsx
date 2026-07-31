import { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { supabase } from "../supabaseClient";

async function enviarCorreo(destinatario, asunto, cuerpo) {
    try {
      const response = await fetch(import.meta.env.VITE_POWERAPPS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinatario: destinatario,
          asunto: asunto,
          cuerpo: cuerpo,
        }),
      });
  
      if (response.ok) return;
      const errorData = await response.json();
      console.error("Error al enviar el correo a:", destinatario, errorData);
    } catch (error) {
      console.error("Error en la solicitud a:", destinatario, error);
    }
}

export default function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState("TODAS");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const ITEMS_PER_PAGE = 15;

  const fetchReservas = async () => {
      try {
        setLoading(true);
        setError(null);

        const correo = localStorage.getItem("email");
        if (!correo) throw new Error("No se encontró el correo en localStorage");

        // Consulta optimizada para obtener directamente las reservas del usuario
        const { data: reservasData, error: reservasError } = await supabase
          .from("reservaciones")
          .select(`
            id,
            motivo_uso,
            cantidad_usuarios,
            fecha,
            estado,
            laboratorio_id,
            dias_repeticion,
            grupo_id,
            descripcion,
            laboratorios:laboratorio_id(nombre),
            reservaciones_usuarios!inner(
              usuarios!inner(
                nombre,
                tipo_usuario,
                correo
              )
            ),
            reservaciones_horarios(
              horarios:horario_id(horario)
            )
          `)
          .eq('reservaciones_usuarios.usuarios.correo', correo)
          .order("fecha", { ascending: true });

        if (reservasError) throw reservasError;

        // Agrupar por grupo_id (UUID) o por id si no hay grupo_id
        const grupos = reservasData.reduce((acc, reserva) => {
          const groupKey = reserva.grupo_id || reserva.id;
          
          if (!acc[groupKey]) {
            acc[groupKey] = {
              grupoId: reserva.grupo_id,
              reservaId: reserva.id,
              motivo: reserva.motivo_uso,
              laboratorio: reserva.laboratorios?.nombre || "No especificado",
              estado: reserva.estado,
              descripcionRechazo: reserva.descripcion || "",
              diasRepeticion: reserva.dias_repeticion,
              usuario: reserva.reservaciones_usuarios[0]?.usuarios?.nombre || "Desconocido",
              tipoUsuario: reserva.reservaciones_usuarios[0]?.usuarios?.tipo_usuario || "Desconocido",
              correo: reserva.reservaciones_usuarios[0]?.usuarios?.correo || "Desconocido",
              fechas: [],
              esRecurrente: !!reserva.grupo_id
            };
          }

          // Agregar fecha y horarios (corregido el problema de la fecha)
          const fechaCorrecta = new Date(reserva.fecha);
          fechaCorrecta.setDate(fechaCorrecta.getDate() + 1); // Ajuste para la zona horaria
          
          acc[groupKey].fechas.push({
            fecha: fechaCorrecta.toISOString().split('T')[0],
            horarios: reserva.reservaciones_horarios.map(h => h.horarios?.horario).filter(Boolean).sort()
          });

          return acc;
        }, {});

        // Ordenar fechas dentro de cada grupo
        Object.values(grupos).forEach(grupo => {
          grupo.fechas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        });

        const reservasAgrupadas = Object.values(grupos);

        setReservas(reservasAgrupadas);
      } catch (err) {
        console.error("Error al obtener reservas:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchReservas();
  }, []);

  const handleCancel = async (grupo) => {
    try {
      // Formatear fechas para correo
      const fechasFormateadas = grupo.fechas
        .map((fecha) =>
          new Date(fecha).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        )
        .join(", ");
      
      const cuerpoCorreo = `Buen día, por este medio se le notifica que la siguiente reserva ha sido cancelada: <br>
        Laboratorio: ${grupo.laboratorios?.nombre}<br>
        Fecha: ${fechasFormateadas}<br>
        Horario: ${grupo.horarios}<br>
        Motivo: ${grupo.motivo_uso}<br>`;
      
      await enviarCorreo(grupo.correo, "Reserva Cancelada", cuerpoCorreo);
      
      // Opcional: notificar a correos estáticos de administración
      if(grupo.estado === "APROBADA"){
        const destinatarioAC = import.meta.env.VITE_CORREO_AC;
        const destinatarioAC2 = import.meta.env.VITE_CORREO_AC2;
        const asuntoAC = `Reserva cancelada - ${grupo.laboratorios?.nombre}`;
        const cuerpoCorreoAC = `Se ha cancelado una reserva para el laboratorio ${grupo.laboratorios?.nombre} por ${grupo.tiposUsuarios} ${grupo.nombresUsuarios}. Fecha: ${fechasFormateadas}, Horario: ${grupo.horarios}.`;
        
        await enviarCorreo(destinatarioAC, asuntoAC, cuerpoCorreoAC);
        await enviarCorreo(destinatarioAC2, asuntoAC, cuerpoCorreoAC);
      }
      
      const supabaseAdmin = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SERVICE_ROLE
      );
    
      const { error } = await supabaseAdmin
        .from("reservaciones")
        .update({ estado: "CANCELADA" })
        .eq("id", grupo.reservaId);
    
      if (error) {
        console.error("Error al cancelar la reserva:", error);
        return;
      }

      fetchReservas();
    } catch (err) {
      console.error("Error en handleCancel:", err);
    }
  };

  const reservasFiltradas = reservas
    .filter(res => estadoFiltro === "TODAS" || res.estado === estadoFiltro)
    .filter(res => !searchTerm || res.motivo.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const fechaA = a.fechas[0]?.fecha ? new Date(a.fechas[0].fecha).getTime() : 0;
      const fechaB = b.fechas[0]?.fecha ? new Date(b.fechas[0].fecha).getTime() : 0;
      return sortOrder === "asc" ? fechaA - fechaB : fechaB - fechaA;
    });

  const totalPages = Math.ceil(reservasFiltradas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReservas = reservasFiltradas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const pagination = totalPages > 1 && (
    <div className="flex items-center justify-center gap-4 my-4">
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Anterior
      </button>
      <span className="text-gray-700 font-medium">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Siguiente
      </button>
    </div>
  );

  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-ES", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">Cargando tus reservas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error al cargar reservas: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-800">Mis Reservas</h1>

        {/* Filtro por estado y orden */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Buscar por motivo:
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: clase, investigación..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Filtrar por estado:
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="TODAS">Todas</option>
              <option value="EN_ESPERA">En Espera</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Ordenar por fecha:
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="asc">Más antigua primero</option>
              <option value="desc">Más reciente primero</option>
            </select>
          </div>
        </div>
        </div>

        {/* Listado de reservas */}
        {reservasFiltradas.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-lg text-gray-600">
              No tienes reservas {estadoFiltro !== "TODAS" ? `con estado ${estadoFiltro}` : ""}
            </p>
          </div>
        ) : (
          <>
            {pagination}
            <div className="space-y-4">
              {paginatedReservas.map((reserva) => (
              <div key={reserva.grupoId || reserva.reservaId} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div>
                      <h2 className="text-xl font-semibold text-blue-700 capitalize">
                        {reserva.motivo}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatFecha(reserva.fechas[0]?.fecha || "")}
                      </p>
                    </div>
                    <p className="text-gray-600">
                      <span className="font-medium">Laboratorio:</span> {reserva.laboratorio}
                    </p>
                    {reserva.esRecurrente && (
                      <p className="text-sm text-green-600 mt-1">
                        Reserva recurrente
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    reserva.estado === "EN_ESPERA" ? "bg-yellow-100 text-yellow-800" :
                    reserva.estado === "APROBADA" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {reserva.estado}
                  </span>
                </div>

                {/* Fechas y horarios del grupo */}
                <div className="mt-4">
                  {reserva.fechas.length === 1 ? (
                    <div className="space-y-2">
                      {reserva.fechas.map((f, i) => (
                        <div key={i} className="border rounded p-2 bg-gray-50">
                          <p className="text-gray-700 font-medium">Fecha: {formatFecha(f.fecha)}</p>
                          <p className="text-gray-700">Horarios: {f.horarios.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const next = new Set(expandedGroups);
                          const key = reserva.grupoId || reserva.reservaId;
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          setExpandedGroups(next);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                      >
                        {expandedGroups.has(reserva.grupoId || reserva.reservaId)
                          ? `Ocultar fechas (${reserva.fechas.length}) ▲`
                          : `Ver fechas (${reserva.fechas.length}) ▼`}
                      </button>
                      {expandedGroups.has(reserva.grupoId || reserva.reservaId) && (
                        <div className="mt-2 space-y-2">
                          {reserva.fechas.map((f, i) => (
                            <div key={i} className="border rounded p-2 bg-gray-50">
                              <p className="text-gray-700 font-medium">Fecha: {formatFecha(f.fecha)}</p>
                              <p className="text-gray-700">Horarios: {f.horarios.join(", ")}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {reserva.diasRepeticion > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-700 font-medium">Días de repetición:</p>
                    <p className="font-semibold">{reserva.diasRepeticion} días</p>
                  </div>
                )}
                {reserva.descripcionRechazo && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-semibold text-red-700">Razón del rechazo</p>
                    <p className="text-gray-700 whitespace-pre-line">{reserva.descripcionRechazo}</p>
                  </div>
                )}
                {reserva.estado !== "RECHAZADA" && (
                  <div className="border-t-2 border-gray-300 mt-4 pt-4 flex justify-center">
                    <button onClick={() => handleCancel(reserva)}className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-colors">
                      Cancelar Reserva
                    </button>
                  </div>
                )}
              </div>
              ))}
            </div>

            {pagination}
          </>
        )}
      </div>
    </div>
  );
}