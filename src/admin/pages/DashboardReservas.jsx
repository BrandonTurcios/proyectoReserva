import { createClient } from "@supabase/supabase-js";
import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Select from "react-select";
import { supabase } from "../../shared/services/supabaseClient";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import GraficaReservas from "../components/GraficaReservas";
import PorcentajeUso from "../components/PorcentajeUso";
import IncidentesTabla from "../components/IncidentesTabla";
import * as XLSX from "xlsx";
import { message } from "antd";
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";

function formatearFechaISO(fecha) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function crearFechaLocalDesdeISO(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function crearBloqueHorario() {
  return {
    id: crypto.randomUUID(),
    horarioIds: [],
    fechas: [],
  };
}

function crearFormularioReservaGrupal() {
  return {
    laboratorioId: "",
    motivo: "",
    responsableNombre: "",
    responsableCorreo: localStorage.getItem("email") || "",
    tipoResponsable: "Docente",
    bloques: [crearBloqueHorario()],
  };
}

function formatearFechaCorta(fecha) {
  if (!fecha) {
    return "N/A";
  }

  const partesFecha = String(fecha).split("T")[0].split("-");
  if (partesFecha.length === 3 && partesFecha.every(Boolean)) {
    const [anio, mes, dia] = partesFecha;
    return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio.slice(-2)}`;
  }

  const fechaParseada = new Date(fecha);
  if (Number.isNaN(fechaParseada.getTime())) {
    return "N/A";
  }

  return `${String(fechaParseada.getDate()).padStart(2, "0")}/${String(
    fechaParseada.getMonth() + 1,
  ).padStart(2, "0")}/${String(fechaParseada.getFullYear()).slice(-2)}`;
}

export default function DashboardReservas() {
  const [reservasAgrupadas, setReservasAgrupadas] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("EN_ESPERA");
  const [tipoUsuarioFiltro, setTipoUsuarioFiltro] = useState("TODOS");
  const [laboratorioFiltro, setLaboratorioFiltro] = useState("TODOS");
  const [laboratorios, setLaboratorios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [reservaExpandida, setReservaExpandida] = useState(null);
  const [fechasMarcadas, setFechasMarcadas] = useState([]);
  const [fechaInicialCalendario, setFechaInicialCalendario] = useState(
    new Date(),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    obtenerReservas();
    obtenerLaboratorios();
    obtenerHorarios();
    // Estas consultas solo deben ejecutarse al montar el dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showStats, setShowStats] = useState(false);
  const [showStatsGr, setShowStatsGr] = useState(false);
  const [showStatsIn, setShowStatsIn] = useState(false);
  const [rechazoModalOpen, setRechazoModalOpen] = useState(false);
  const [grupoARechazar, setGrupoARechazar] = useState(null);
  const [descripcionRechazo, setDescripcionRechazo] = useState("");
  const [reservaGrupalAbierta, setReservaGrupalAbierta] = useState(false);
  const [reservaGrupal, setReservaGrupal] = useState(
    crearFormularioReservaGrupal,
  );
  const [errorReservaGrupal, setErrorReservaGrupal] = useState("");
  const [guardandoReservaGrupal, setGuardandoReservaGrupal] = useState(false);
  const [confirmacionGrupal, setConfirmacionGrupal] = useState(false);
  const [resumenReservaGrupal, setResumenReservaGrupal] = useState(null);

  const abrirModalRechazo = (grupo) => {
    setGrupoARechazar(grupo);
    setDescripcionRechazo("");
    setRechazoModalOpen(true);
  };

  const cerrarModalRechazo = () => {
    setRechazoModalOpen(false);
    setGrupoARechazar(null);
    setDescripcionRechazo("");
  };

  const confirmarRechazo = async () => {
    if (!descripcionRechazo.trim()) {
      message.warning("Por favor ingresa la descripción del rechazo.");
      return;
    }
    if (grupoARechazar) {
      await actualizarEstadoGrupo(
        grupoARechazar.ids,
        "RECHAZADA",
        grupoARechazar,
        descripcionRechazo.trim(),
      );
    }
    cerrarModalRechazo();
  };

  // Memoizamos el componente para preservar su estado
  const memoizedStats = useMemo(
    () => (
      <div className="mb-8 p-4 md:p-6 bg-white rounded-lg shadow-md">
        <PorcentajeUso />
      </div>
    ),
    [],
  );

  const memoizedStatsGr = useMemo(
    () => (
      <div className="mb-8 p-4 md:p-6 bg-white rounded-lg shadow-md">
        <GraficaReservas />
      </div>
    ),
    [],
  );

  const memoizedStatsIn = useMemo(
    () => (
      <div className="mb-8 p-4 md:p-6 bg-white rounded-lg shadow-md">
        <IncidentesTabla />
      </div>
    ),
    [],
  );

  async function obtenerReservas() {
    const { data, error } = await supabase
      .from("reservaciones")
      .select(
        `
          id,
          motivo_uso,
          cantidad_usuarios,
          fecha,
          estado,
          laboratorio_id,
          grupo_id,
          descripcion,
          laboratorios(nombre),
          reservaciones_usuarios(usuario_id, usuarios(correo, nombre, tipo_usuario)),
          reservaciones_horarios(horarios(horario))
        `,
      )
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al obtener reservas:", error);
    } else {
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

  async function obtenerHorarios() {
    const { data, error } = await supabase
      .from("horarios")
      .select("id, horario")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error al obtener horarios:", error);
    } else {
      setHorarios(data);
    }
  }

  const abrirReservaGrupal = () => {
    setReservaGrupal(crearFormularioReservaGrupal());
    setErrorReservaGrupal("");
    setReservaGrupalAbierta(true);
  };

  const cerrarReservaGrupal = () => {
    if (guardandoReservaGrupal) return;
    setReservaGrupalAbierta(false);
    setErrorReservaGrupal("");
  };

  const actualizarReservaGrupal = (campo, valor) => {
    setReservaGrupal((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarBloqueHorario = (bloqueId, campo, valor) => {
    setReservaGrupal((actual) => ({
      ...actual,
      bloques: actual.bloques.map((bloque) =>
        bloque.id === bloqueId ? { ...bloque, [campo]: valor } : bloque,
      ),
    }));
  };

  const alternarFechaBloque = (bloqueId, fecha) => {
    if (guardandoReservaGrupal) return;

    const fechaSeleccionada = formatearFechaISO(fecha);

    setReservaGrupal((actual) => ({
      ...actual,
      bloques: actual.bloques.map((bloque) => {
        if (bloque.id !== bloqueId) return bloque;

        const fechas = bloque.fechas.includes(fechaSeleccionada)
          ? bloque.fechas.filter(
              (fechaGuardada) => fechaGuardada !== fechaSeleccionada,
            )
          : [...bloque.fechas, fechaSeleccionada].sort();

        return { ...bloque, fechas };
      }),
    }));
  };

  const agregarBloqueHorario = () => {
    setReservaGrupal((actual) => ({
      ...actual,
      bloques: [...actual.bloques, crearBloqueHorario()],
    }));
  };

  const eliminarBloqueHorario = (bloqueId) => {
    setReservaGrupal((actual) => {
      if (actual.bloques.length === 1) return actual;

      return {
        ...actual,
        bloques: actual.bloques.filter((bloque) => bloque.id !== bloqueId),
      };
    });
  };

  const obtenerClienteAdministrativo = () => {
    const serviceRoleKey = import.meta.env.VITE_SERVICE_ROLE;

    if (!serviceRoleKey) return supabase;

    return createClient(import.meta.env.VITE_SUPABASE_URL, serviceRoleKey);
  };

  const generarOcurrenciasReserva = () => {
    if (
      reservaGrupal.bloques.some(
        (bloque) =>
          bloque.horarioIds.length === 0 || bloque.fechas.length === 0,
      )
    ) {
      throw new Error(
        "Cada bloque debe tener al menos un horario y fechas seleccionadas.",
      );
    }

    const horariosPorFecha = new Map();

    reservaGrupal.bloques.forEach((bloque) => {
      bloque.fechas.forEach((fecha) => {
        const horariosDeLaFecha = horariosPorFecha.get(fecha) || new Set();
        bloque.horarioIds.forEach((id) => horariosDeLaFecha.add(Number(id)));
        horariosPorFecha.set(fecha, horariosDeLaFecha);
      });
    });

    return [...horariosPorFecha.entries()]
      .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
      .map(([fecha, horariosDeLaFecha]) => ({
        fecha,
        horarios: [...horariosDeLaFecha],
      }));
  };

  async function obtenerOCrearResponsable(cliente) {
    // Crea un nuevo usuario sin importar si ya existe, esto se cambiara en el refactor del proyecto
    const { data: responsableNuevo, error: insercionError } = await cliente
      .from("usuarios")
      .insert({
        nombre: reservaGrupal.responsableNombre.trim(),
        numero_cuenta: `ADMIN-${Date.now()}`,
        correo: reservaGrupal.responsableCorreo.trim().toLowerCase(),
        tipo_usuario: reservaGrupal.tipoResponsable,
      })
      .select("id")
      .single();

    if (insercionError) throw insercionError;
    return responsableNuevo.id;
  }

  async function crearReservaGrupal(event) {
    event.preventDefault();
    if (guardandoReservaGrupal) return;

    setErrorReservaGrupal("");

    if (
      !reservaGrupal.laboratorioId ||
      !reservaGrupal.motivo.trim() ||
      !reservaGrupal.responsableNombre.trim() ||
      !reservaGrupal.responsableCorreo.trim()
    ) {
      setErrorReservaGrupal(
        "Completa el laboratorio, motivo, responsable y una cantidad válida de usuarios.",
      );
      return;
    }

    let ocurrencias;
    try {
      ocurrencias = generarOcurrenciasReserva();
    } catch (error) {
      setErrorReservaGrupal(error.message);
      return;
    }

    setGuardandoReservaGrupal(true);
    const cliente = obtenerClienteAdministrativo();
    let reservacionesCreadas = [];

    try {
      const fechas = ocurrencias.map((ocurrencia) => ocurrencia.fecha);
      const { data: reservasExistentes, error: disponibilidadError } =
        await cliente
          .from("reservaciones")
          .select("id, fecha, reservaciones_horarios!inner(horario_id)")
          .eq("laboratorio_id", reservaGrupal.laboratorioId)
          .eq("estado", "APROBADA")
          .in("fecha", fechas);

      if (disponibilidadError) throw disponibilidadError;

      const conflictos = new Set(
        (reservasExistentes || []).flatMap((reserva) =>
          (reserva.reservaciones_horarios || []).map(
            (relacion) =>
              `${String(reserva.fecha).slice(0, 10)}:${relacion.horario_id}`,
          ),
        ),
      );

      const conflictosDetectados = ocurrencias.flatMap((ocurrencia) =>
        ocurrencia.horarios
          .filter((horarioId) =>
            conflictos.has(`${ocurrencia.fecha}:${horarioId}`),
          )
          .map((horarioId) => ({ fecha: ocurrencia.fecha, horarioId })),
      );

      if (conflictosDetectados.length > 0) {
        const detalleConflictos = conflictosDetectados
          .slice(0, 3)
          .map((conflicto) => {
            const horario = horarios.find(
              (opcion) => opcion.id === conflicto.horarioId,
            );
            return `${formatearFechaCorta(conflicto.fecha)} (${horario?.horario || "horario"})`;
          })
          .join(", ");
        const sufijo = conflictosDetectados.length > 3 ? " y otros" : "";

        throw new Error(
          `Hay reservas aprobadas que coinciden: ${detalleConflictos}${sufijo}.`,
        );
      }

      const responsableId = await obtenerOCrearResponsable(cliente);
      const grupoId = crypto.randomUUID();
      const reservasParaInsertar = ocurrencias.map((ocurrencia) => ({
        motivo_uso: reservaGrupal.motivo.trim(),
        // La columna es obligatoria en la base actual; la reserva grupal no captura este dato.
        cantidad_usuarios: 1,
        fecha: ocurrencia.fecha,
        dias_repeticion: "Fechas seleccionadas manualmente",
        laboratorio_id: Number(reservaGrupal.laboratorioId),
        grupo_id: grupoId,
        estado: "APROBADA",
      }));

      const { data: reservasCreadas, error: reservaError } = await cliente
        .from("reservaciones")
        .insert(reservasParaInsertar)
        .select("id, fecha");

      if (reservaError) throw reservaError;
      reservacionesCreadas = (reservasCreadas || []).map(
        (reserva) => reserva.id,
      );
      if (!reservasCreadas || reservasCreadas.length !== ocurrencias.length) {
        throw new Error("No se pudieron crear todas las fechas de la reserva.");
      }

      const reservaPorFecha = new Map(
        reservasCreadas.map((reserva) => [
          String(reserva.fecha).slice(0, 10),
          reserva.id,
        ]),
      );

      const horariosParaInsertar = ocurrencias.flatMap((ocurrencia) =>
        ocurrencia.horarios.map((horarioId) => ({
          reservacion_id: reservaPorFecha.get(ocurrencia.fecha),
          horario_id: horarioId,
        })),
      );

      const { error: horariosError } = await cliente
        .from("reservaciones_horarios")
        .insert(horariosParaInsertar);
      if (horariosError) throw horariosError;

      const usuariosParaInsertar = reservacionesCreadas.map(
        (reservacionId) => ({
          reservacion_id: reservacionId,
          usuario_id: responsableId,
        }),
      );

      const { error: usuariosError } = await cliente
        .from("reservaciones_usuarios")
        .insert(usuariosParaInsertar);
      if (usuariosError) throw usuariosError;

      setReservaGrupalAbierta(false);
      setReservaGrupal(crearFormularioReservaGrupal());
      await obtenerReservas();
      setResumenReservaGrupal(reservacionesCreadas.length);
      setConfirmacionGrupal(true);
    } catch (error) {
      if (reservacionesCreadas.length > 0) {
        await cliente
          .from("reservaciones_usuarios")
          .delete()
          .in("reservacion_id", reservacionesCreadas);
        await cliente
          .from("reservaciones_horarios")
          .delete()
          .in("reservacion_id", reservacionesCreadas);
        await cliente
          .from("reservaciones")
          .delete()
          .in("id", reservacionesCreadas);
      }

      console.error("Error al crear la reserva grupal:", error);
      setErrorReservaGrupal(
        error.message || "No se pudo crear la reserva grupal.",
      );
    } finally {
      setGuardandoReservaGrupal(false);
    }
  }

  async function verificarLimiteReservas(
    laboratorioId,
    fecha,
    horario,
    tipoUsuario,
  ) {
    // Obtener todas las reservas aprobadas para el laboratorio, fecha y horario específicos
    const { data, error } = await supabase
      .from("reservaciones")
      .select(
        `
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
      `,
      )
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
      const tipoUsuarioReserva =
        reserva.reservaciones_usuarios[0]?.usuarios?.tipo_usuario;
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
          mensaje:
            "No puedes reservar porque ya hay una reserva de docente o administrativo para este horario y laboratorio.",
        };
      }
      if (reservasAlumnos >= 20) {
        return {
          limiteExcedido: true,
          mensaje:
            "Ya hay 20 reservas de alumnos aprobadas para este horario y laboratorio.",
        };
      }
      // Si no hay docente/administrativo y hay menos de 20 alumnos, permitir
      return { limiteExcedido: false, mensaje: "" };
    } else if (tipoUsuario === "Docente" || tipoUsuario === "Administrativo") {
      if (
        reservasAlumnos > 0 ||
        reservasDocentes > 0 ||
        reservasAdministrativo > 0
      ) {
        return {
          limiteExcedido: true,
          mensaje:
            "No puedes reservar porque ya hay una reserva de estudiante, docente o administrativo para este horario y laboratorio.",
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

  async function actualizarEstadoGrupo(
    ids,
    nuevoEstado,
    grupo,
    descripcionRechazo = "",
  ) {
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
        tipoUsuario,
      );

      if (limiteExcedido) {
        const confirmacion = window.confirm(
          `${mensaje}\n¿Desea autorizar esta reserva de todos modos?`,
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
      const destinatarioAC2 = import.meta.env.VITE_CORREO_AC2;
      const cuerpoCorreoAC = `Se ha aprobado una nueva solicitud de reserva para el laboratorio de ${grupo.laboratorios?.nombre} por el ${grupo.tiposUsuarios}
        ${grupo.nombresUsuarios}. La reserva es en la fecha: ${fechasFormateadas} con un horario comprendido de ${grupo.horarios}.`;
      const asuntoAC = `Solicitud de reserva de ${grupo.laboratorios?.nombre}
      `;

      await enviarCorreo(destinatarioAC, asuntoAC, cuerpoCorreoAC);
      await enviarCorreo(destinatarioAC2, asuntoAC, cuerpoCorreoAC);
    } else if (nuevoEstado === "RECHAZADA") {
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
      const cuerpoCorreo = `Buen día, por este medio se le notifica que la siguiente reserva ha sido rechazada: <br>
        Laboratorio: ${grupo.laboratorios?.nombre}<br>
        Fecha: ${fechasFormateadas}<br>
        Horario: ${grupo.horarios}<br>
        Motivo: ${grupo.motivo_uso}<br>
        Razón del rechazo: ${descripcionRechazo || "No especificada"}<br>`;
      await enviarCorreo(destinatario, "Reserva Rechazada", cuerpoCorreo);
    }

    // Actualizar el estado de la reserva en la base de datos
    const supabaseAdmin = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SERVICE_ROLE,
    );

    const updatePayload = { estado: nuevoEstado };
    if (nuevoEstado === "RECHAZADA") {
      updatePayload.descripcion = descripcionRechazo;
    } else {
      updatePayload.descripcion = "";
    }

    const { error } = await supabaseAdmin
      .from("reservaciones")
      .update(updatePayload)
      .in("id", ids);
    if (error) {
      console.error("Error al actualizar el estado de la reserva:", error);
      message.error("Error al actualizar la reserva. Intenta de nuevo.");
      return;
    }

    if (nuevoEstado === "APROBADA") {
      message.success("Reserva aprobada correctamente.");
    } else {
      message.success("Reserva rechazada correctamente.");
    }

    obtenerReservas();
  }

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
            .map((ru) => ({
              id: ru.usuario_id,
              nombre: ru.usuarios?.nombre?.trim(),
            }))
            .filter((u) => u.id && u.nombre),
          correos:
            usuariosInfo
              .map((ru) => ru.usuarios?.correo?.trim())
              .filter(Boolean)
              .join(", ") || "N/A",
          horarios:
            (reserva.reservaciones_horarios || [])
              .map((rh) => rh.horarios?.horario)
              .filter(Boolean)
              .sort()
              .join(", ") || "No asignado",
          tiposUsuarios:
            usuariosInfo
              .map((ru) => ru.usuarios?.tipo_usuario)
              .filter(Boolean)
              .join(", ") || "N/A",
          descripcion: reserva.descripcion || "",
          fechas: [
            new Date(
              reserva.fecha.getTime
                ? reserva.fecha.getTime()
                : new Date(reserva.fecha).getTime() +
                    new Date(reserva.fecha).getTimezoneOffset() * 60000,
            ),
          ],
          ids: [reserva.id],
          fechaCreacion: reserva.created_at || reserva.fecha,
          diaSemana: undefined,
          laboratorios: reserva.laboratorios || { nombre: "N/A" },
        };
      } else {
        // Solo agregar si es una fecha nueva
        const fechaReserva = new Date(reserva.fecha);
        const fechaAjustada = new Date(
          fechaReserva.getTime() + fechaReserva.getTimezoneOffset() * 60000,
        );
        const fechaYaExiste = acc[groupKey].fechas.some(
          (f) =>
            f.toISOString().split("T")[0] ===
            fechaAjustada.toISOString().split("T")[0],
        );
        if (!fechaYaExiste) {
          acc[groupKey].fechas.push(fechaAjustada);
          acc[groupKey].ids.push(reserva.id);
          acc[groupKey].fechas.sort((a, b) => a - b);
        }
        // Unir usuarios únicos por id
        const nuevosUsuarios = (reserva.reservaciones_usuarios || [])
          .map((ru) => ({
            id: ru.usuario_id,
            nombre: ru.usuarios?.nombre?.trim(),
          }))
          .filter((u) => u.id && u.nombre);
        const usuariosMap = new Map(
          acc[groupKey].usuariosUnicos.map((u) => [u.id, u]),
        );
        nuevosUsuarios.forEach((u) => usuariosMap.set(u.id, u));
        acc[groupKey].usuariosUnicos = Array.from(usuariosMap.values());
        // Combinar correos únicos
        const usuariosInfo = reserva.reservaciones_usuarios || [];
        const nuevosCorreos = usuariosInfo
          .map((ru) => ru.usuarios?.correo?.trim())
          .filter(Boolean);
        const correosExistentes = acc[groupKey].correos.split(", ");
        const todosCorreos = [...correosExistentes, ...nuevosCorreos];
        acc[groupKey].correos = [...new Set(todosCorreos)].join(", ");
        acc[groupKey].descripcion =
          acc[groupKey].descripcion || reserva.descripcion || "";
      }
      return acc;
    }, {});

    // Ordenar por fecha más reciente
    const resultado = Object.values(agrupadas)
      .map((grupo) => ({
        ...grupo,
        nombresUsuarios: grupo.usuariosUnicos.map((u) => u.nombre).join(", "),
      }))
      .sort((a, b) => b.fechas[0] - a.fechas[0]);

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

  const exportarAExcel = () => {
    // Usar todas las reservas sin filtrar
    const datosExcel = reservasAgrupadas.map((grupo) => ({
      Nombre: grupo.nombresUsuarios,
      "Tipo de Usuario": grupo.tiposUsuarios,
      Laboratorio: grupo.laboratorios?.nombre || "N/A",
      Motivo: grupo.motivo_uso,
      "Creada en": formatearFechaCorta(grupo.fechaCreacion),
      Correos: grupo.correos,
      Horarios: grupo.horarios,
      Estado: grupo.estado,
      Fechas: grupo.fechas
        .map((fecha) =>
          new Date(fecha).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        )
        .join(", "),
    }));

    // Crear un nuevo libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar el ancho de las columnas
    const wscols = [
      { wch: 30 }, // Nombre
      { wch: 15 }, // Tipo de Usuario
      { wch: 20 }, // Laboratorio
      { wch: 40 }, // Motivo
      { wch: 12 }, // Creada en
      { wch: 30 }, // Correos
      { wch: 20 }, // Horarios
      { wch: 15 }, // Estado
      { wch: 40 }, // Fechas
    ];
    ws["!cols"] = wscols;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, "Reservas");

    // Generar el archivo Excel
    const fechaActual = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Reservas_${fechaActual}.xlsx`);
  };

  const reservasFiltradas = reservasAgrupadas.filter(
    (grupo) =>
      (estadoFiltro === "TODOS" || grupo.estado === estadoFiltro) &&
      (tipoUsuarioFiltro === "TODOS" ||
        grupo.tiposUsuarios.includes(tipoUsuarioFiltro)) &&
      (laboratorioFiltro === "TODOS" ||
        grupo.laboratorios?.nombre === laboratorioFiltro),
  );

  const totalPages = Math.ceil(reservasFiltradas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReservas = reservasFiltradas.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <div className="px-2 py-4 md:p-6 bg-gray-100 min-h-screen">
      <h1 className="text-xl md:text-4xl font-bold mb-4 md:mb-6 text-center text-gray-800">
        Dashboard de Reservas
      </h1>

      <div className="mb-6 flex justify-center">
        <button
          type="button"
          onClick={abrirReservaGrupal}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f49b6] px-4 py-2 md:px-6 md:py-3 text-base md:text-lg font-semibold text-white shadow-md transition-colors hover:bg-[#06065c]"
        >
          <FiPlus size={20} />
          Nueva reserva grupal
        </button>
      </div>

      {/* Contenedor de botones modificado */}
      <div className="flex flex-col items-center gap-4 p-4">
        {/* Botón 1 - Gráfica de Reservas */}
        <div className="w-full text-center">
          <button
            onClick={() => setShowStatsGr(!showStatsGr)}
            className="w-full mb-2 px-4 py-2.5 md:px-6 md:py-3 bg-cyan-600 text-white rounded-lg hover:bg-[#4D4DFF] transition-colors text-base md:text-lg"
          >
            {showStatsGr
              ? "Ocultar Gráfica de Reservas Aprobadas"
              : "Mostrar Gráfica de Reservas Aprobadas"}
          </button>
          {showStatsGr && <div className="w-full">{memoizedStatsGr}</div>}
        </div>

        {/* Botón 2 - Estadísticas */}
        <div className="w-full text-center">
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full mb-2 px-4 py-2.5 md:px-6 md:py-3 bg-[#4B9CD3] text-white rounded-lg hover:bg-[#4D4DFF] transition-colors text-base md:text-lg"
          >
            {showStats
              ? "Ocultar Porcentajes de Uso"
              : "Mostrar Porcentajes de Uso"}
          </button>
          {showStats && <div className="w-full">{memoizedStats}</div>}
        </div>

        {/* Botón 3 - Incidentes */}
        <div className="w-full text-center">
          <button
            onClick={() => setShowStatsIn(!showStatsIn)}
            className="w-full mb-2 px-4 py-2.5 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-[#4D4DFF] transition-colors text-base md:text-lg"
          >
            {showStatsIn ? "Ocultar Incidentes" : "Mostrar Incidentes"}
          </button>
          {showStatsIn && <div className="w-full">{memoizedStatsIn}</div>}
        </div>
      </div>

      {/* Sección de filtros y tabla */}
      <div className="p-3 md:p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Gestión de Reservas
        </h2>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap justify-center gap-3">
          <div>
            <label className="mr-2 font-semibold text-sm md:text-base">
              Filtrar por estado:
            </label>
            <select
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EN_ESPERA">En Espera</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>

          <div>
            <label className="mr-2 font-semibold text-sm md:text-base">
              Filtrar por tipo de usuario:
            </label>
            <select
              value={tipoUsuarioFiltro}
              onChange={(e) => {
                setTipoUsuarioFiltro(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos</option>
              <option value="Docente">Docente</option>
              <option value="Estudiante">Estudiante</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Prospección">Prospección</option>
            </select>
          </div>

          <div>
            <label className="mr-2 font-semibold text-sm md:text-base">
              Filtrar por laboratorio:
            </label>
            <select
              value={laboratorioFiltro}
              onChange={(e) => {
                setLaboratorioFiltro(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos</option>
              {laboratorios.map((laboratorio) => (
                <option key={laboratorio.nombre} value={laboratorio.nombre}>
                  {laboratorio.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportarAExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm h-[38px]"
            >
              Exportar a Excel
            </button>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs md:text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-xs md:text-sm font-medium text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs md:text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}

        {/* Tabla de reservas */}
        <div className="overflow-x-auto w-full">
          <table className="w-full bg-white shadow-lg rounded-lg border border-gray-300">
            <thead>
              <tr className="bg-blue-600 text-white text-left text-xs md:text-sm">
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Nombre
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Tipo
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Laboratorio
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Motivo
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Correos
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Fecha
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Horarios
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Estado
                </th>
                <th className="px-2 py-2 md:px-4 border-b whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedReservas.map((grupo) => (
                <React.Fragment key={grupo.ids.join("-")}>
                  <tr
                    className="border-t hover:bg-gray-200 transition-colors cursor-pointer text-xs md:text-sm"
                    onClick={() => toggleReserva(grupo)}
                  >
                    <td className="px-2 py-2 md:px-4">
                      {grupo.nombresUsuarios}
                    </td>
                    <td className="px-2 py-2 md:px-4">{grupo.tiposUsuarios}</td>
                    <td className="px-2 py-2 md:px-4">
                      {grupo.laboratorios?.nombre || "N/A"}
                    </td>
                    <td className="px-2 py-2 md:px-4">{grupo.motivo_uso}</td>
                    <td className="px-2 py-2 md:px-4">{grupo.correos}</td>
                    <td className="px-2 py-2 md:px-4 whitespace-nowrap">
                      {formatearFechaCorta(grupo.fechaCreacion)}
                    </td>
                    <td className="px-2 py-2 md:px-4">{grupo.horarios}</td>
                    <td className="px-2 py-2 md:px-4 font-semibold">
                      {grupo.estado}
                    </td>
                    <td className="px-2 py-4 md:px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleReserva(grupo);
                          }}
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition text-xs flex items-center justify-center"
                          aria-label={
                            reservaExpandida === grupo
                              ? "Ocultar calendario"
                              : "Mostrar calendario"
                          }
                          title={
                            reservaExpandida === grupo
                              ? "Ocultar calendario"
                              : "Mostrar calendario"
                          }
                        >
                          {reservaExpandida === grupo ? (
                            <FiChevronUp size={16} />
                          ) : (
                            <FiChevronDown size={16} />
                          )}
                        </button>
                        {grupo.estado === "EN_ESPERA" ? (
                          <>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                actualizarEstadoGrupo(
                                  grupo.ids,
                                  "APROBADA",
                                  grupo,
                                );
                              }}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition text-xs flex items-center justify-center"
                            >
                              <FiCheck size={16} />
                            </button>

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirModalRechazo(grupo);
                              }}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition text-xs flex items-center justify-center"
                            >
                              <FiX size={16} />
                            </button>
                          </>
                        ) : grupo.estado === "APROBADA" ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirModalRechazo(grupo);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition text-xs flex items-center justify-center"
                          >
                            <FiX size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              actualizarEstadoGrupo(
                                grupo.ids,
                                "APROBADA",
                                grupo,
                              );
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition text-xs flex items-center justify-center"
                          >
                            <FiCheck size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {reservaExpandida === grupo && (
                    <tr className="bg-gray-50">
                      <td colSpan="9" className="px-3 py-3">
                        <div className="flex justify-center items-center mt-2">
                          <div className="max-w-[320px] w-full">
                            <Calendar
                              key={
                                reservaExpandida
                                  ? reservaExpandida.id
                                  : "default"
                              }
                              value={fechaInicialCalendario}
                              locale="es"
                              tileClassName={({ date }) => {
                                const isMarked = fechasMarcadas.some(
                                  (f) =>
                                    f instanceof Date &&
                                    f.toDateString() === date.toDateString(),
                                );
                                return isMarked
                                  ? "!bg-blue-500 text-white font-bold rounded-full opacity-80"
                                  : "";
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {paginatedReservas.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No hay reservas para mostrar con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reservaGrupalAbierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl sm:p-5 md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Administración
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-800">
                  Nueva reserva grupal
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Configura las fechas y horarios de una clase en un solo grupo.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarReservaGrupal}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar nueva reserva grupal"
              >
                <FiX size={22} />
              </button>
            </div>

            <form onSubmit={crearReservaGrupal} className="space-y-6">
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Información de la clase
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label
                      htmlFor="reserva-grupal-laboratorio"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Laboratorio
                    </label>
                    <select
                      id="reserva-grupal-laboratorio"
                      value={reservaGrupal.laboratorioId}
                      onChange={(event) =>
                        actualizarReservaGrupal(
                          "laboratorioId",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={guardandoReservaGrupal}
                    >
                      <option value="">Selecciona un laboratorio</option>
                      {laboratorios.map((laboratorio) => (
                        <option key={laboratorio.id} value={laboratorio.id}>
                          {laboratorio.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="reserva-grupal-responsable"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Responsable
                    </label>
                    <input
                      id="reserva-grupal-responsable"
                      type="text"
                      value={reservaGrupal.responsableNombre}
                      onChange={(event) =>
                        actualizarReservaGrupal(
                          "responsableNombre",
                          event.target.value,
                        )
                      }
                      placeholder="Nombre del responsable"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={guardandoReservaGrupal}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reserva-grupal-correo"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Correo del responsable
                    </label>
                    <input
                      id="reserva-grupal-correo"
                      type="email"
                      value={reservaGrupal.responsableCorreo}
                      onChange={(event) =>
                        actualizarReservaGrupal(
                          "responsableCorreo",
                          event.target.value,
                        )
                      }
                      placeholder="docente@unitec.edu"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={guardandoReservaGrupal}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reserva-grupal-tipo"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Tipo de responsable
                    </label>
                    <select
                      id="reserva-grupal-tipo"
                      value={reservaGrupal.tipoResponsable}
                      onChange={(event) =>
                        actualizarReservaGrupal(
                          "tipoResponsable",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={guardandoReservaGrupal}
                    >
                      <option value="Docente">Docente</option>
                      <option value="Administrativo">Administrativo</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="reserva-grupal-motivo"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Motivo de la reserva
                  </label>
                  <textarea
                    id="reserva-grupal-motivo"
                    rows="2"
                    value={reservaGrupal.motivo}
                    onChange={(event) =>
                      actualizarReservaGrupal("motivo", event.target.value)
                    }
                    placeholder="Clase de laboratorio de programación, proyecto final, etc."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    disabled={guardandoReservaGrupal}
                  />
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Bloques de horario
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Selecciona directamente en el calendario las fechas de
                      cada horario.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={agregarBloqueHorario}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    disabled={guardandoReservaGrupal}
                  >
                    <FiPlus size={16} />
                    Agregar bloque
                  </button>
                </div>

                <div className="space-y-4">
                  {reservaGrupal.bloques.map((bloque, indice) => (
                    <div
                      key={bloque.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-700">
                          Bloque {indice + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => eliminarBloqueHorario(bloque.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={
                            guardandoReservaGrupal ||
                            reservaGrupal.bloques.length === 1
                          }
                          aria-label={`Eliminar bloque ${indice + 1}`}
                        >
                          <FiTrash2 size={14} />
                          Quitar
                        </button>
                      </div>

                      <label
                        htmlFor={`reserva-grupal-horario-${bloque.id}`}
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Horarios
                      </label>
                      <Select
                        id={`reserva-grupal-horario-${bloque.id}`}
                        options={horarios.map((horario) => ({
                          value: horario.id,
                          label: horario.horario,
                        }))}
                        isMulti
                        isSearchable={false}
                        isDisabled={guardandoReservaGrupal}
                        value={bloque.horarioIds
                          .map((id) => {
                            const horario = horarios.find((h) => h.id === id);
                            return horario
                              ? { value: horario.id, label: horario.horario }
                              : null;
                          })
                          .filter(Boolean)}
                        onChange={(selectedOptions) =>
                          actualizarBloqueHorario(
                            bloque.id,
                            "horarioIds",
                            selectedOptions.map((opt) => opt.value),
                          )
                        }
                        className="text-sm"
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            borderColor: state.isDisabled
                              ? "#d1d5db"
                              : "#d1d5db",
                            borderRadius: "0.5rem",
                            minHeight: "42px",
                            boxShadow: state.isFocused
                              ? "0 0 0 2px #3b82f6"
                              : "none",
                            "&:hover": {},
                            backgroundColor: state.isDisabled
                              ? "#f3f4f6"
                              : "#fff",
                          }),
                        }}
                      />

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,auto)_1fr] md:items-start">
                        <div>
                          <p className="mb-2 text-sm font-medium text-gray-700">
                            Fechas de uso
                          </p>
                          <div className="max-w-[280px]">
                            <Calendar
                              locale="es"
                              value={null}
                              onClickDay={(fecha) =>
                                alternarFechaBloque(bloque.id, fecha)
                              }
                              tileClassName={({ date }) =>
                                bloque.fechas.includes(formatearFechaISO(date))
                                  ? "!bg-blue-600 !text-white rounded-full font-semibold"
                                  : ""
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-medium text-gray-700">
                            Fechas seleccionadas ({bloque.fechas.length})
                          </p>
                          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
                            {bloque.fechas.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                Selecciona uno o más días en el calendario.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {bloque.fechas.map((fecha) => (
                                  <button
                                    key={fecha}
                                    type="button"
                                    onClick={() =>
                                      alternarFechaBloque(
                                        bloque.id,
                                        crearFechaLocalDesdeISO(fecha),
                                      )
                                    }
                                    className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-200"
                                    title="Quitar fecha"
                                    disabled={guardandoReservaGrupal}
                                  >
                                    {formatearFechaCorta(fecha)}
                                    <span className="ml-1" aria-hidden="true">
                                      ×
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {errorReservaGrupal && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorReservaGrupal}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarReservaGrupal}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  disabled={guardandoReservaGrupal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={guardandoReservaGrupal}
                >
                  {guardandoReservaGrupal
                    ? "Creando reserva..."
                    : "Crear reserva aprobada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rechazoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Rechazar reserva
                </h2>
                <p className="text-sm text-gray-600">
                  Ingresa la descripción del rechazo antes de confirmar.
                </p>
              </div>
              <button
                onClick={cerrarModalRechazo}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <textarea
              value={descripcionRechazo}
              onChange={(e) => setDescripcionRechazo(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describir motivo del rechazo..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={cerrarModalRechazo}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRechazo}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmacionGrupal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="mx-4 rounded-lg bg-white p-6 text-center shadow-lg"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white"
            >
              ✓
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-800">
              Reserva Grupal Creada
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {resumenReservaGrupal} fechas generadas con estado APROBADA.
            </p>
            <button
              type="button"
              onClick={() => setConfirmacionGrupal(false)}
              className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Listo
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
