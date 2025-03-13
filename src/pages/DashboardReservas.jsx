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
        "id, motivo_uso, cantidad_usuarios, fecha, estado, laboratorio_id, " +
        "laboratorios(nombre), " +
        "reservaciones_usuarios(usuario_id, usuarios(correo, nombre, tipo_usuario)), " +
        "reservaciones_horarios(horarios(horario))"
      )
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
  
    // Contar reservas de alumnos y docentes
    let reservasAlumnos = 0;
    let reservasDocentes = 0;
    let reservasAdministrativo=0;
  
    data.forEach((reserva) => {
      const tipoUsuarioReserva = reserva.reservaciones_usuarios[0]?.usuarios?.tipo_usuario;
      if (tipoUsuarioReserva === "Estudiante") {
        reservasAlumnos++;
      } else if (tipoUsuarioReserva === "Docente") {
        reservasDocentes++;
      }
      else if (tipoUsuarioReserva === "Administrativo") {
        reservasAdministrativo++;
      }
    });
  
    // Verificar límites
    if (reservasAlumnos >= 20) {
      return {
        limiteExcedido: true,
        mensaje: "Ya hay 20 reservas de alumnos aprobadas para este horario y laboratorio.",
      };
    }
  
    if (reservasDocentes >= 1) {
      return {
        limiteExcedido: true,
        mensaje: "Ya hay una reserva de docente aprobada para este horario y laboratorio.",
      };
    }
    if (reservasAdministrativo >= 1) {
      return {
        limiteExcedido: true,
        mensaje: "Ya hay una reserva de personal administrativo aprobada para este horario y laboratorio.",
      };
    }
  
    return { limiteExcedido: false, mensaje: "" }; // No se ha alcanzado ningún límite
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
    const agrupadas = reservas.reduce((acc, reserva) => {
      const correos =
        reserva.reservaciones_usuarios
          ?.map((ru) => ru.usuarios?.correo)
          .filter(correo => correo && correo.trim() !== "") // Filtra correos vacíos o con solo espacios
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
  );
}