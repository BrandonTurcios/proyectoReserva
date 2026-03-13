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
  
      if (response.ok) {
        console.log("Correo enviado correctamente a:", destinatario);
      } else {
        const errorData = await response.json(); // Lee la respuesta del servidor
        console.error("Error al enviar el correo a:", destinatario, errorData);
      }
    } catch (error) {
      console.error("Error en la solicitud a:", destinatario, error);
    }
}

export default function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState("TODAS");

  const fetchReservas = async () => {
      try {
        setLoading(true);
        setError(null);

        const correo = localStorage.getItem("email");
        if (!correo) throw new Error("No se encontró el correo en localStorage");
        
        console.log("Correo del usuario:", correo);

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

        console.log("Reservas encontradas:", reservasData?.length || 0);
        console.log("Datos de las reservas:", reservasData);

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
        console.log("Reservas agrupadas:", reservasAgrupadas.length);
        console.log("Detalles de las reservas agrupadas:", reservasAgrupadas);

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
    
      console.log("Reserva cancelada correctamente");
      fetchReservas();
    } catch (err) {
      console.error("Error en handleCancel:", err);
    }
  };

  const reservasFiltradas = reservas.filter(res => 
    estadoFiltro === "TODAS" || res.estado === estadoFiltro
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

        {/* Filtro por estado */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Filtrar por estado:
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="TODAS">Todas</option>
            <option value="EN_ESPERA">En Espera</option>
            <option value="APROBADA">Aprobada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </div>

        {/* Listado de reservas */}
        {reservasFiltradas.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-lg text-gray-600">
              No tienes reservas {estadoFiltro !== "TODAS" ? `con estado ${estadoFiltro}` : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservasFiltradas.map((reserva) => (
              <div key={reserva.grupoId || reserva.reservaId} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-blue-700 capitalize">
                      {reserva.motivo}
                    </h2>
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
                <div className="mt-4 space-y-2">
                  {reserva.fechas.map((f, i) => (
                    <div key={i} className="border rounded p-2 bg-gray-50">
                      <p className="text-gray-700 font-medium">Fecha: {formatFecha(f.fecha)}</p>
                      <p className="text-gray-700">Horarios: {f.horarios.join(", ")}</p>
                    </div>
                  ))}
                </div>

                {reserva.diasRepeticion > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-700 font-medium">Días de repetición:</p>
                    <p className="font-semibold">{reserva.diasRepeticion} días</p>
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
        )}
      </div>
    </div>
  );
}