import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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

  async function obtenerReservas() {
    const { data, error } = await supabase
      .from("reservaciones")
      .select(
        `id, motivo_uso, cantidad_usuarios, fecha, estado, 
        laboratorios(nombre), 
        reservaciones_usuarios(usuario_id, usuarios(correo, nombre, tipo_usuario)),
        reservaciones_horarios(horarios(horario))`
      )
      .order("id", { ascending: true });

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
      .select("nombre");

    if (error) {
      console.error("Error al obtener laboratorios:", error);
    } else {
      setLaboratorios(data);
    }
  }

  async function actualizarEstadoGrupo(ids, nuevoEstado) {
    const { error } = await supabase
      .from("reservaciones")
      .update({ estado: nuevoEstado })
      .in("id", ids); // Actualiza solo las reservas cuyo id esté en el array `ids`
  
    if (error) {
      console.error("Error al actualizar el estado de la reserva:", error);
    } else {
      console.log("Reservas actualizadas correctamente");
      obtenerReservas(); // Vuelve a cargar las reservas con los nuevos estados
    }
  }
  
  function agruparReservas(reservas) {
    const agrupadas = reservas.reduce((acc, reserva) => {
      const correos =
        reserva.reservaciones_usuarios
          ?.map((ru) => ru.usuarios?.correo)
          .filter(Boolean)
          .sort()
          .join(", ") || "N/A";

      const tiposUsuarios =
        reserva.reservaciones_usuarios
          ?.map((ru) => ru.usuarios?.tipo_usuario)
          .filter(Boolean)
          .join(", ") || "N/A";

      const nombresUsuarios =
        reserva.reservaciones_usuarios
          ?.map((ru) => ru.usuarios?.nombre)
          .filter(Boolean)
          .join(", ") || "Desconocido";

      const horarios =
        reserva.reservaciones_horarios
          ?.map((rh) => rh.horarios?.horario)
          .filter(Boolean)
          .join(", ") || "No asignado";

      const key = `${reserva.motivo_uso}-${correos}-${horarios}`;

      if (!acc[key]) {
        acc[key] = {
          ...reserva,
          correos,
          horarios,
          nombresUsuarios,
          tiposUsuarios,
          fechas: [new Date(reserva.fecha)],
          ids: [reserva.id],
        };
      } else {
        acc[key].fechas.push(new Date(reserva.fecha));
        acc[key].ids.push(reserva.id);
      }
      return acc;
    }, {});

    setReservasAgrupadas(Object.values(agrupadas));
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
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Dashboard de Reservas
      </h1>

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

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-lg rounded-lg border border-gray-300">
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th className="px-6 py-3 border-b">Nombre</th>
              <th className="px-6 py-3 border-b">Tipo</th>
              <th className="px-6 py-3 border-b">Laboratorio</th>
              <th className="px-6 py-3 border-b">Motivo</th>
              <th className="px-6 py-3 border-b">Correos</th>
              <th className="px-6 py-3 border-b">Horarios</th>
              <th className="px-6 py-3 border-b">Estado</th>
              <th className="px-6 py-3 border-b">Acciones</th>
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
                    className="border-t hover:bg-gray-200 transition-colors cursor-pointer"
                    onClick={() => toggleReserva(grupo)}
                  >
                    <td className="px-6 py-4">{grupo.nombresUsuarios}</td>
                    <td className="px-6 py-4">{grupo.tiposUsuarios}</td>
                    <td className="px-6 py-4">{grupo.laboratorios?.nombre || "N/A"}</td>
                    <td className="px-6 py-4">{grupo.motivo_uso}</td>
                    <td className="px-6 py-4">{grupo.correos}</td>
                    <td className="px-6 py-4">{grupo.horarios}</td>
                    <td className="px-6 py-4 font-semibold">{grupo.estado}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      {grupo.estado === "EN_ESPERA" && (
                        <>
                          <button
                            onClick={() => actualizarEstadoGrupo(grupo.ids, "APROBADA")}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => actualizarEstadoGrupo(grupo.ids, "RECHAZADA")}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {reservaExpandida === grupo && (
                    <tr className="bg-gray-50">
                      <td colSpan="8" className="px-6 py-4">
                        <strong>Fechas:</strong>
                        <div className="flex justify-center items-center mt-4">
                          <Calendar
                            key={reservaExpandida ? reservaExpandida.id : "default"}
                            value={fechaInicialCalendario}
                            locale="es"
                            tileClassName={({ date }) => {
                              const isMarked = fechasMarcadas.some(
                                (f) =>
                                  f instanceof Date &&
                                  f.toDateString() === date.toDateString()
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
  );
}
