import React, { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import es from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "../supabaseClient";

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
  
      console.log("Datos crudos:", data);
      
      // Usar la misma lógica de agrupación del dashboard
      const reservasAgrupadas = agruparReservas(data);
      console.log("Reservas agrupadas:", reservasAgrupadas);
      
      // Convertir a eventos del calendario
      const eventos = convertirAEventos(reservasAgrupadas);
      console.log("Eventos generados:", eventos);
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
          fechas: [new Date(reserva.fecha.getTime ? reserva.fecha.getTime() : new Date(reserva.fecha).getTime() + new Date(reserva.fecha).getTimezoneOffset() * 60000)],
          ids: [reserva.id],
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
      const horariosArray = grupo.horarios.split(', ').filter(h => h && h !== 'No asignado');
      
      grupo.fechas.forEach(fecha => {
        horariosArray.forEach(horarioTexto => {
          if (horarioTexto.includes(' - ')) {
            const [horaInicio, horaFin] = horarioTexto.split(' - ');
            
            // Formatear la fecha como YYYY-MM-DD
            const fechaFormateada = fecha.toISOString().split('T')[0];
            
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
                  id: grupo.ids.join("-"),
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
    if (vistaActual !== "agenda" && vistaActual !== "day" && vistaActual !== "week") {
      setEventoSeleccionado(event);
      document.body.classList.add("overflow-hidden");
    }
  };

  const cerrarModal = () => {
    setEventoSeleccionado(null);
    document.body.classList.remove("overflow-hidden");
  };

  return (
    <div className="relative flex flex-col justify-center items-center h-full min-h-screen bg-blue-900">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-blue-600 z-0"></div>
  
      <div className="relative max-w-6xl w-full mx-auto p-4 md:p-6 bg-white shadow-2xl border border-gray-300 rounded-2xl z-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-blue-600">
          Calendario de Reservaciones
        </h1>
  
        <div className="w-full overflow-x-auto md:overflow-visible md:p-2 rounded-xl">
          <Calendar
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "80vh", minHeight: "500px", width: "100%" }} 
            className="shadow-lg rounded-lg"
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
  
      {eventoSeleccionado && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm md:max-w-md lg:max-w-lg shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Detalles de la Reservación</h2>
            <p><strong>Laboratorio:</strong> {eventoSeleccionado.title}</p>
            <p><strong>Fecha:</strong> {eventoSeleccionado.fecha}</p>
            <p><strong>Horario:</strong> {eventoSeleccionado.horarioOriginal}</p>
            <p><strong>Usuario(s):</strong> {eventoSeleccionado.usuarios}</p>
            <p><strong>Tipo(s):</strong> {eventoSeleccionado.tiposUsuarios}</p>
            <p><strong>Motivo:</strong> {eventoSeleccionado.motivo_uso}</p>
    
            <button
              onClick={cerrarModal}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 w-full"
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