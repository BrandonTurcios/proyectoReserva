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
          fecha,
          laboratorio:laboratorio_id(nombre),
          reservaciones_horarios(horario:horario_id(horario)),
          estado
        `)
        .eq("estado", "APROBADA");

      if (error) {
        console.error("Error al obtener datos:", error);
      } else {
        console.log("Datos obtenidos:", data);

        const eventosFormateados = data.map((reserva) => {
          const laboratorio = reserva.laboratorio?.nombre || "Laboratorio desconocido";

          return reserva.reservaciones_horarios.map((h) => {
            const horarioTexto = h.horario.horario;
            const [horaInicio, horaFin] = horarioTexto.split(" - ");

            const inicio = parse(
              `${reserva.fecha} ${horaInicio}`,
              "yyyy-MM-dd hh:mm a",
              new Date()
            );
            const fin = parse(
              `${reserva.fecha} ${horaFin}`,
              "yyyy-MM-dd hh:mm a",
              new Date()
            );

            return {
              id: reserva.id,
              title: laboratorio,
              start: inicio,
              end: fin,
              horarioOriginal: horarioTexto,
              fecha: reserva.fecha,
              estado: reserva.estado,
            };
          });
        });

        setEventos(eventosFormateados.flat());
      }
    };

    obtenerReservas();
  }, []);

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
    <div className="relative flex flex-col justify-center items-center h-full min-h-screen bg-[#06065c]">
    {/* Capa superior con forma recortada */}
    <div className="absolute top-0 left-0 w-full h-1/2 bg-[#0f49b6] clip-custom z-0"></div>
  
    <div className="relative max-w-6xl w-full mx-auto p-4 md:p-6 bg-white shadow-2xl border border-gray-300 rounded-2xl z-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-[#0f49b6]">
        Calendario de Reservaciones
      </h1>
  
      <div className="w-full overflow-x-auto md:overflow-visible md:p-2 rounded-xl">
  <Calendar
    localizer={localizer}
    events={eventos}
    startAccessor="start"
    endAccessor="end"
    style={{ height: "80vh", minHeight: "500px", width: "100%" }} 
    className="shadow-lg  rounded-lg"
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
  
    {/* MODAL PARA MOSTRAR DETALLES */}
    {eventoSeleccionado && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm md:max-w-md lg:max-w-lg shadow-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Detalles de la Reservación</h2>
          <p><strong>Laboratorio:</strong> {eventoSeleccionado.title}</p>
          <p><strong>Fecha:</strong> {eventoSeleccionado.fecha}</p>
          <p><strong>Horario:</strong> {eventoSeleccionado.horarioOriginal}</p>
  
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
