import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import es from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "../../shared/services/supabaseClient";

const locales = { es };

const localizer = dateFnsLocalizer({
  format: (date, formatStr, options) =>
    format(date, formatStr, { ...options, locale: es }),
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales,
});

const mensajes = {
  allDay: "Todo el día",
  previous: "Anterior",
  next: "Siguiente",
  today: "Hoy",
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "No hay eventos en este rango.",
  showMore: (cantidad) => `+ Ver más (${cantidad})`,
};

function normalizarFechaReserva(fecha) {
  const [anio, mes, dia] = String(fecha).split("T")[0].split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFechaISO(fecha) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function obtenerHorariosReserva(reserva) {
  return (reserva.reservaciones_horarios || [])
    .map((rh) => rh.horarios?.horario)
    .filter(Boolean)
    .sort();
}

const MiCalendario = () => {
  const [eventos, setEventos] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState("month");

  useEffect(() => {
    const obtenerReservas = async () => {
      const { data, error } = await supabase
        .from("reservaciones")
        .select(`
          id,
          grupo_id,
          fecha,
          motivo_uso,
          cantidad_usuarios,
          dias_repeticion,
          estado,
          laboratorio_id,
          laboratorios(nombre),
          reservaciones_usuarios(usuario_id, usuarios(id, nombre, correo, tipo_usuario)),
          reservaciones_horarios(horarios(id, horario))
        `)
        .eq("estado", "APROBADA")
        .order("id", { ascending: false });
  
      if (error) {
        console.error("Error al obtener datos:", error);
        return;
      }
  
      // Usar la misma lógica de agrupación del dashboard
      const reservasAgrupadas = agruparReservas(data);
      
      // Convertir a eventos del calendario
      const eventos = convertirAEventos(reservasAgrupadas);
      setEventos(eventos);
    };
  
    obtenerReservas();
  }, []);

  function agruparReservas(reservas) {
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
          fechas: [normalizarFechaReserva(reserva.fecha)],
          horariosPorFecha: [
            {
              fecha: normalizarFechaReserva(reserva.fecha),
              horarios: obtenerHorariosReserva(reserva),
            },
          ],
          ids: [reserva.id],
          laboratorios: reserva.laboratorios || { nombre: "N/A" }
        };
      } else {
        // Solo agregar si es una fecha nueva
        const fechaAjustada = normalizarFechaReserva(reserva.fecha);
        const horariosDeReserva = obtenerHorariosReserva(reserva);
        const fechaTexto = formatearFechaISO(fechaAjustada);
        const fechaYaExiste = acc[groupKey].fechas.some(
          (fecha) => formatearFechaISO(fecha) === fechaTexto,
        );
        if (!fechaYaExiste) {
          acc[groupKey].fechas.push(fechaAjustada);
          acc[groupKey].horariosPorFecha.push({
            fecha: fechaAjustada,
            horarios: horariosDeReserva,
          });
          acc[groupKey].ids.push(reserva.id);
          acc[groupKey].fechas.sort((a, b) => a - b);
          acc[groupKey].horariosPorFecha.sort((a, b) => a.fecha - b.fecha);
        } else {
          const fechaConHorarios = acc[groupKey].horariosPorFecha.find(
            (fechaInfo) =>
              formatearFechaISO(fechaInfo.fecha) === fechaTexto,
          );
          fechaConHorarios.horarios = [
            ...new Set([...fechaConHorarios.horarios, ...horariosDeReserva]),
          ].sort();
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
        
        // Combinar horarios únicos
        const nuevosHorarios = (reserva.reservaciones_horarios || [])
          .map(rh => rh.horarios?.horario)
          .filter(Boolean);
        const horariosExistentes = acc[groupKey].horarios.split(', ');
        const todosHorarios = [...horariosExistentes, ...nuevosHorarios];
        acc[groupKey].horarios = [...new Set(todosHorarios)].sort().join(', ');
      }
      return acc;
    }, {});

    // Ordenar por fecha más reciente y agregar nombres de usuarios
    const resultado = Object.values(agrupadas).map(grupo => ({
      ...grupo,
      nombresUsuarios: grupo.usuariosUnicos.map(u => u.nombre).join(", "),
    })).sort((a, b) => 
      b.fechas[0] - a.fechas[0]
    );

    return resultado;
  }

  function convertirAEventos(reservasAgrupadas) {
    const eventos = [];

    reservasAgrupadas.forEach(grupo => {
      grupo.horariosPorFecha.forEach(({ fecha, horarios }) => {
        const horariosDeLaFecha = horarios.filter(
          (horario) => horario && horario !== "No asignado",
        );

        horariosDeLaFecha.forEach(horarioTexto => {
          if (horarioTexto.includes(' - ')) {
            const [horaInicio, horaFin] = horarioTexto.split(' - ');
            
            // Formatear la fecha como YYYY-MM-DD
            const fechaFormateada = formatearFechaISO(fecha);
            
            try {
              const inicio = parse(
                `${fechaFormateada} ${horaInicio}`,
                "yyyy-MM-dd hh:mm a",
                new Date()
              );
              const fin = parse(
                `${fechaFormateada} ${horaFin}`,
                "yyyy-MM-dd hh:mm a",
                new Date()
              );

              // Verificar que las fechas sean válidas
              if (!isNaN(inicio.getTime()) && !isNaN(fin.getTime())) {
                eventos.push({
                  id: `${grupo.ids.join("-")}-${fechaFormateada}-${horarioTexto}`,
                  title: grupo.laboratorios?.nombre || "Laboratorio N/A",
                  start: inicio,
                  end: fin,
                  horarioOriginal: horarioTexto,
                  fecha: fechaFormateada,
                  motivo_uso: grupo.motivo_uso,
                  cantidad_usuarios: grupo.cantidad_usuarios,
                  dias_repeticion: grupo.dias_repeticion,
                  usuarios: grupo.nombresUsuarios,
                  correos: grupo.correos,
                  tiposUsuarios: grupo.tiposUsuarios
                });
              }
            } catch (error) {
              console.error(`Error parseando horario ${horarioTexto} para fecha ${fechaFormateada}:`, error);
            }
          }
        });
      });
    });

    return eventos;
  }

  const handleEventoClick = (event) => {
    if (vistaActual !== "agenda") {
      setEventoSeleccionado(event);
      document.body.classList.add("overflow-hidden");
    }
  };

  const cerrarModal = () => {
    setEventoSeleccionado(null);
    document.body.classList.remove("overflow-hidden");
  };

  return (
    <div className="min-h-screen bg-[#06065c] px-3 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl bg-white p-4 shadow-2xl sm:p-6 md:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="4.5" width="18" height="16" rx="2" />
                <path strokeLinecap="round" d="M16 2.5v4M8 2.5v4M3 9.5h18" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">
              Calendario de Reservaciones
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Consulta la disponibilidad de los laboratorios y sus horarios.
            </p>
          </div>

          <div className="reservation-calendar w-full overflow-x-auto overscroll-x-contain rounded-xl border border-gray-100 bg-gray-50 p-2 sm:p-3">
          <Calendar
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            style={{
              height: "80vh",
              minHeight: "500px",
              width: "100%",
              minWidth: "780px",
            }}
            className="rounded-lg"
            messages={mensajes}
            onView={(view) => setVistaActual(view)}
            onSelectEvent={handleEventoClick}
            components={{
              agenda: {
                time: ({ event }) => <span>{event.horarioOriginal}</span>,
                event: ({ event }) => <span>{event.title}</span>,
              },
            }}
            />
          </div>
        </div>
      </div>
  
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Detalle de reserva
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-800">
                  {eventoSeleccionado.title}
                </h2>
              </div>
              <button
                onClick={cerrarModal}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar detalles"
              >
                <span aria-hidden="true">&#10005;</span>
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
              <p><strong className="font-medium text-gray-700">Fecha:</strong> {eventoSeleccionado.fecha}</p>
              <p><strong className="font-medium text-gray-700">Horario:</strong> {eventoSeleccionado.horarioOriginal}</p>
              <p><strong className="font-medium text-gray-700">Usuario(s):</strong> {eventoSeleccionado.usuarios}</p>
              <p><strong className="font-medium text-gray-700">Tipo(s):</strong> {eventoSeleccionado.tiposUsuarios}</p>
              <p><strong className="font-medium text-gray-700">Motivo:</strong> {eventoSeleccionado.motivo_uso}</p>
            </div>
    
            <button
              onClick={cerrarModal}
              className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiCalendario;
