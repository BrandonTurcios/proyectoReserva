import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import GraficaReservas from "./GraficaReservas"
import PorcentajeUso
 from "./PorcentajeUso";
import IncidentesTabla from "./IncidentesTabla";

export default function DashboardReservas() {
  const [reservas, setReservas] = useState([]);
  const [reservasAgrupadas, setReservasAgrupadas] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("EN_ESPERA");
  const [tipoUsuarioFiltro, setTipoUsuarioFiltro] = useState("TODOS");
  const [laboratorioFiltro, setLaboratorioFiltro] = useState("TODOS");
  const [laboratorios, setLaboratorios] = useState([]);
  const [reservaExpandida, setReservaExpandida] = useState(null);
  const [fechasMarcadas, setFechasMarcadas] = useState([]);
  const [fechaInicialCalendario, setFechaInicialCalendario] = useState(new Date());

  
  useEffect(() => {
    obtenerReservas();
    obtenerLaboratorios();
  }, []);

  const DIAS_SEMANA = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
  };
  

    const [showStats, setShowStats] = useState(false);
    const [showStatsGr, setShowStatsGr] = useState(false);
    const [showStatsIn, setShowStatsIn] = useState(false);
    
    // Memoizamos el componente para preservar su estado
    const memoizedStats = useMemo(() => (
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <PorcentajeUso />
      </div>
      
    )
    , []);

    const memoizedStatsGr = useMemo(() => (
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <GraficaReservas />
      </div>
      
    )
    , []);

    const memoizedStatsIn = useMemo(() => (
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <IncidentesTabla />
      </div>
      
    )
    , []);


    async function obtenerReservas() {
      const { data, error } = await supabase
        .from("reservaciones")
        .select(`
          id,
          motivo_uso,
          cantidad_usuarios,
          fecha,
          estado,
          laboratorio_id,
          grupo_id,
          laboratorios(nombre),
          reservaciones_usuarios(usuario_id, usuarios(correo, nombre, tipo_usuario)),
          reservaciones_horarios(horarios(horario))
        `)
        .order("id", { ascending: false });
    
      if (error) {
        console.error("Error al obtener reservas:", error);
      } else {
        setReservas(data);
        agruparReservas(data);
      }
    }

  async function obtenerLaboratorios() {
    const { data, error } = await supabase
      .from("laboratorios")
      .select("id, nombre");

    if (error) {
      console.error("Error al obtener laboratorios:", error);
    } else {
      setLaboratorios(data);
    }
  }

  async function verificarLimiteReservas(laboratorioId, fecha, horario, tipoUsuario) {
    // Obtener todas las reservas aprobadas para el laboratorio, fecha y horario específicos
    const { data, error } = await supabase
      .from("reservaciones")
      .select(`
        id,
        reservaciones_horarios!inner (
          horarios!inner (
            horario
          )
        ),
        reservaciones_usuarios!inner (
          usuarios!inner (
            tipo_usuario
          )
        )
      `)
      .eq("laboratorio_id", laboratorioId)
      .eq("fecha", fecha)
      .eq("estado", "APROBADA")
      .eq("reservaciones_horarios.horarios.horario", horario);

    if (error) {
      console.error("Error al verificar el límite de reservas:", error);
      return { limiteExcedido: false, mensaje: "" };
    }

    // Contar reservas de alumnos y docentes/administrativos
    let reservasAlumnos = 0;
    let reservasDocentes = 0;
    let reservasAdministrativo = 0;

    data.forEach((reserva) => {
      const tipoUsuarioReserva = reserva.reservaciones_usuarios[0]?.usuarios?.tipo_usuario;
      if (tipoUsuarioReserva === "Estudiante") {
        reservasAlumnos++;
      } else if (tipoUsuarioReserva === "Docente") {
        reservasDocentes++;
      } else if (tipoUsuarioReserva === "Administrativo") {
        reservasAdministrativo++;
      }
    });

    // Lógica de exclusividad y límites
    if (tipoUsuario === "Estudiante") {
      if (reservasDocentes > 0 || reservasAdministrativo > 0) {
        return {
          limiteExcedido: true,
          mensaje: "No puedes reservar porque ya hay una reserva de docente o administrativo para este horario y laboratorio.",
        };
      }
      if (reservasAlumnos >= 20) {
        return {
          limiteExcedido: true,
          mensaje: "Ya hay 20 reservas de alumnos aprobadas para este horario y laboratorio.",
        };
      }
      // Si no hay docente/administrativo y hay menos de 20 alumnos, permitir
      return { limiteExcedido: false, mensaje: "" };
    } else if (tipoUsuario === "Docente" || tipoUsuario === "Administrativo") {
      if (reservasAlumnos > 0 || reservasDocentes > 0 || reservasAdministrativo > 0) {
        return {
          limiteExcedido: true,
          mensaje: "No puedes reservar porque ya hay una reserva de estudiante, docente o administrativo para este horario y laboratorio.",
        };
      }
      // Si no hay ninguno, permitir
      return { limiteExcedido: false, mensaje: "" };
    }

    // Por defecto, permitir
    return { limiteExcedido: false, mensaje: "" };
  }

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
  
  

  async function actualizarEstadoGrupo(ids, nuevoEstado, grupo) {
    if (nuevoEstado === "APROBADA") {
      const laboratorioId = grupo.laboratorio_id;
      const fecha = grupo.fechas[0].toISOString().split("T")[0];
      const horario = grupo.horarios.split(", ")[0];
      const tipoUsuario = grupo.tiposUsuarios; // Tipo de usuario de la reserva
  
      // Verificar si se excede el límite de reservas aprobadas
      const { limiteExcedido, mensaje } = await verificarLimiteReservas(
        laboratorioId,
        fecha,
        horario,
        tipoUsuario
      );
  
      if (limiteExcedido) {
        const confirmacion = window.confirm(
          `${mensaje}\n¿Desea autorizar esta reserva de todos modos?`
        );
  
        if (!confirmacion) {
          return; // No se aprueba la reserva
        }
      }
  
      // Continuar con la aprobación de la reserva
      const fechasFormateadas = grupo.fechas
        .map((fecha) => {
          return new Date(fecha).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        })
        .join(", ");
  
      // Enviar correo electrónico al usuario que hizo la reserva
      const destinatario = grupo.correos.split(", ")[0];
      const cuerpoCorreo = `Buen día, por este medio se le notifica que la siguiente reserva ha sido aprobada: <br>
        Laboratorio: ${grupo.laboratorios?.nombre}<br>
        Fecha: ${fechasFormateadas}<br>
        Horario: ${grupo.horarios}<br>
        Motivo: ${grupo.motivo_uso}<br>`;
        
      await enviarCorreo(destinatario, "Reserva Aprobada", cuerpoCorreo);
  
      // Enviar correo electrónico al correo estático (AIRE AC)
      const destinatarioAC = import.meta.env.VITE_CORREO_AC;
      const cuerpoCorreoAC = `Se ha aprobado una nueva solicitud de reserva para el laboratorio de ${grupo.laboratorios?.nombre} por el ${grupo.tiposUsuarios}
        ${grupo.nombresUsuarios}. La reserva es en la fecha: ${fechasFormateadas} con un horario comprendido de ${grupo.horarios}.`;
      const asuntoAC = `Solicitud de reserva de ${grupo.laboratorios?.nombre}
      `;
        
      await enviarCorreo(destinatarioAC, asuntoAC, cuerpoCorreoAC);
    }
  
    // Actualizar el estado de la reserva en la base de datos
    const { error } = await supabase
      .from("reservaciones")
      .update({ estado: nuevoEstado })
      .in("id", ids);
  
    if (error) {
      console.error("Error al actualizar el estado de la reserva:", error);
    } else {
      console.log("Reservas actualizadas correctamente");
      obtenerReservas();
    }
  }

  function agruparReservas(reservas) {
    const DIAS_SEMANA_REVERSO = {
      0: 'Domingo',
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado'
    };
  
    const agrupadas = reservas.reduce((acc, reserva) => {
      // Usar grupo_id como clave primaria de agrupación, o id si no existe grupo_id
      const groupKey = reserva.grupo_id || reserva.id;
  
      if (!acc[groupKey]) {
        // Procesar usuarios, usando id para evitar duplicados reales
        const usuariosInfo = reserva.reservaciones_usuarios || [];
        acc[groupKey] = {
          ...reserva,
          usuariosUnicos: usuariosInfo
            .map(ru => ({
              id: ru.usuario_id,
              nombre: ru.usuarios?.nombre?.trim()
            }))
            .filter(u => u.id && u.nombre),
          correos: usuariosInfo
            .map(ru => ru.usuarios?.correo?.trim())
            .filter(Boolean)
            .join(", ") || "N/A",
          horarios: (reserva.reservaciones_horarios || [])
            .map(rh => rh.horarios?.horario)
            .filter(Boolean)
            .sort()
            .join(", ") || "No asignado",
          tiposUsuarios: usuariosInfo
            .map(ru => ru.usuarios?.tipo_usuario)
            .filter(Boolean)
            .join(", ") || "N/A",
          fechas: [new Date(reserva.fecha.getTime ? reserva.fecha.getTime() : new Date(reserva.fecha).getTime() + new Date(reserva.fecha).getTimezoneOffset() * 60000)],
          ids: [reserva.id],
          diaSemana: undefined,
          laboratorios: reserva.laboratorios || { nombre: "N/A" }
        };
      } else {
        // Solo agregar si es una fecha nueva
        const fechaReserva = new Date(reserva.fecha);
        const fechaAjustada = new Date(fechaReserva.getTime() + fechaReserva.getTimezoneOffset() * 60000);
        const fechaYaExiste = acc[groupKey].fechas.some(f => 
          f.toISOString().split('T')[0] === fechaAjustada.toISOString().split('T')[0]
        );
        if (!fechaYaExiste) {
          acc[groupKey].fechas.push(fechaAjustada);
          acc[groupKey].ids.push(reserva.id);
          acc[groupKey].fechas.sort((a, b) => a - b);
        }
        // Unir usuarios únicos por id
        const nuevosUsuarios = (reserva.reservaciones_usuarios || [])
          .map(ru => ({
            id: ru.usuario_id,
            nombre: ru.usuarios?.nombre?.trim()
          }))
          .filter(u => u.id && u.nombre);
        const usuariosMap = new Map(acc[groupKey].usuariosUnicos.map(u => [u.id, u]));
        nuevosUsuarios.forEach(u => usuariosMap.set(u.id, u));
        acc[groupKey].usuariosUnicos = Array.from(usuariosMap.values());
        // Combinar correos únicos
        const usuariosInfo = reserva.reservaciones_usuarios || [];
        const nuevosCorreos = usuariosInfo
          .map(ru => ru.usuarios?.correo?.trim())
          .filter(Boolean);
        const correosExistentes = acc[groupKey].correos.split(', ');
        const todosCorreos = [...correosExistentes, ...nuevosCorreos];
        acc[groupKey].correos = [...new Set(todosCorreos)].join(', ');
      }
      return acc;
    }, {});
  
    // Ordenar por fecha más reciente
    const resultado = Object.values(agrupadas).map(grupo => ({
      ...grupo,
      nombresUsuarios: grupo.usuariosUnicos.map(u => u.nombre).join(", "),
    })).sort((a, b) => 
      b.fechas[0] - a.fechas[0]
    );
  
    setReservasAgrupadas(resultado);
  }
  const toggleReserva = (grupo) => {
    if (reservaExpandida === grupo) {
      setReservaExpandida(null);
      setFechasMarcadas([]);
    } else {
      setReservaExpandida(grupo);
      setFechasMarcadas(grupo.fechas);

      if (grupo.fechas.length > 0) {
        setFechaInicialCalendario(grupo.fechas[0]);
      }
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
    <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">
      Dashboard de Reservas
    </h1>

    {/* Contenedor de botones modificado */}
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Botón 1 - Gráfica de Reservas */}
      <div className="w-full text-center">
        <button
          onClick={() => setShowStatsGr(!showStatsGr)}
          className="w-full mb-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-[#4D4DFF] transition-colors text-lg"
        >
          {showStatsGr ? 'Ocultar Gráfica de Reservas Aprobadas' : 'Mostrar Gráfica de Reservas Aprobadas'}
        </button>
        {showStatsGr && <div className="w-full">{memoizedStatsGr}</div>}
      </div>

      {/* Botón 2 - Estadísticas */}
      <div className="w-full text-center">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full mb-2 px-6 py-3 bg-[#4B9CD3] text-white rounded-lg hover:bg-[#4D4DFF] transition-colors text-lg"
        >
          {showStats ? 'Ocultar Porcentajes de Uso' : 'Mostrar Porcentajes de Uso'}
        </button>
        {showStats && <div className="w-full">{memoizedStats}</div>}
      </div>

      {/* Botón 3 - Incidentes */}
      <div className="w-full text-center">
        <button
          onClick={() => setShowStatsIn(!showStatsIn)}
          className="w-full mb-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-[#4D4DFF] transition-colors text-lg"
        >
          {showStatsIn ? 'Ocultar Incidentes' : 'Mostrar Incidentes'}
        </button>
        {showStatsIn && <div className="w-full">{memoizedStatsIn}</div>}
      </div>
    </div>

      {/* Sección de filtros y tabla */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Gestión de Reservas</h2>

        {/* Filtros */}
        <div className="mb-4 flex justify-center space-x-4">
          <div>
            <label className="mr-2 font-semibold">Filtrar por estado:</label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EN_ESPERA">En Espera</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>

          <div>
            <label className="mr-2 font-semibold">Filtrar por tipo de usuario:</label>
            <select
              value={tipoUsuarioFiltro}
              onChange={(e) => setTipoUsuarioFiltro(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos</option>
              <option value="Docente">Docente</option>
              <option value="Estudiante">Estudiante</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Prospección">Prospección</option>
            </select>
          </div>

          <div>
            <label className="mr-2 font-semibold">Filtrar por laboratorio:</label>
            <select
              value={laboratorioFiltro}
              onChange={(e) => setLaboratorioFiltro(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos</option>
              {laboratorios.map((laboratorio) => (
                <option key={laboratorio.nombre} value={laboratorio.nombre}>
                  {laboratorio.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
             
        {/* Tabla de reservas */}
        <div className="overflow-x-auto w-full">
          <table className="w-full bg-white shadow-lg rounded-lg border border-gray-300">
            <thead>
              <tr className="bg-blue-600 text-white text-left text-sm">
                <th className="px-4 py-2 border-b whitespace-nowrap">Nombre</th>
                <th className="px-4 py-2 border-b whitespace-nowrap">Tipo</th>
                <th className="px-4 py-2 border-b whitespace-nowrap">Laboratorio</th>
                <th className="px-4 py-2 border-b whitespace-nowrap">Motivo</th>
                <th className="px-4 py-2 border-b whitespace-nowrap">Correos</th>
                <th className="px-4 py-2 border-b whitespace-nowrap">Horarios</th>
                <th className="px-4 py-2 border-b whitespace-nowrap">Estado</th>
                <th className="px-4 py-2 border-b whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservasAgrupadas
                .filter((grupo) =>
                  (estadoFiltro === "TODOS" || grupo.estado === estadoFiltro) &&
                  (tipoUsuarioFiltro === "TODOS" || grupo.tiposUsuarios.includes(tipoUsuarioFiltro)) &&
                  (laboratorioFiltro === "TODOS" || grupo.laboratorios?.nombre === laboratorioFiltro)
                )
                .map((grupo) => (
                  <React.Fragment key={grupo.ids.join("-")}>
                    <tr
                      className="border-t hover:bg-gray-200 transition-colors cursor-pointer text-sm"
                      onClick={() => toggleReserva(grupo)}
                    >
                      <td className="px-4 py-2">{grupo.nombresUsuarios}</td>
                      <td className="px-4 py-2">{grupo.tiposUsuarios}</td>
                      <td className="px-4 py-2">{grupo.laboratorios?.nombre || "N/A"}</td>
                      <td className="px-4 py-2">{grupo.motivo_uso}</td>
                      <td className="px-4 py-2">{grupo.correos}</td>
                      <td className="px-4 py-2">{grupo.horarios}</td>
                      <td className="px-4 py-2 font-semibold">{grupo.estado}</td>
                      <td className="px-4 py-2 flex space-x-2">
                        {grupo.estado === "EN_ESPERA" && (
                          <>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                actualizarEstadoGrupo(grupo.ids, "APROBADA", grupo);
                              }}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                actualizarEstadoGrupo(grupo.ids, "RECHAZADA", grupo);
                              }}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition text-xs"
                            >
                              ✗
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {reservaExpandida === grupo && (
                      <tr className="bg-gray-50">
                        <td colSpan="8" className="px-3 py-3">
                          <div className="flex justify-center items-center mt-2">
                            <Calendar
                              key={reservaExpandida ? reservaExpandida.id : "default"}
                              value={fechaInicialCalendario}
                              locale="es"
                              tileClassName={({ date }) => {
                                const isMarked = fechasMarcadas.some(
                                  (f) =>
                                    f instanceof Date && f.toDateString() === date.toDateString()
                                );
                                return isMarked
                                  ? "!bg-blue-500 text-white font-bold rounded-full opacity-80"
                                  : "";
                              }}
                              onClickDay={(date) => console.log("Fecha seleccionada:", date)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}