import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../shared/services/supabaseClient";
import {
  FiCheck,
  FiX,
  FiCalendar,
  FiMapPin,
  FiAlertTriangle,
  FiTrendingUp,
} from "react-icons/fi";
import { message } from "antd";

function fechaISO(d) {
  return d.toISOString().split("T")[0];
}

function trimestreActual(filas) {
  const hoy = new Date();
  const hoyISO = fechaISO(hoy);

  const fila = filas.find((f) => {
    if (!f.inicio || !f.final) return false;
    return hoyISO >= String(f.inicio).slice(0, 10) && hoyISO <= String(f.final).slice(0, 10);
  });

  return fila || null;
}

function formatearFechaCorta(fecha) {
  if (!fecha) return "N/A";
  const partesFecha = String(fecha).split("T")[0].split("-");
  if (partesFecha.length === 3 && partesFecha.every(Boolean)) {
    const [anio, mes, dia] = partesFecha;
    return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio.slice(-2)}`;
  }
  return "N/A";
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState({
    totalReservas: 0,
    totalLaboratorios: 0,
    incidentesSemana: 0,
  });
  const [topLaboratorios, setTopLaboratorios] = useState([]);
  const [porAprobar, setPorAprobar] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDashboard();
    // Las consultas solo deben ejecutarse al montar el dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarDashboard() {
    setCargando(true);

    const ahora = new Date();
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - ahora.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 7);

    const [
      totalReservas,
      totalLaboratorios,
      incidentesSemana,
      trimestres,
      porAprobarData,
    ] = await Promise.all([
      supabase.from("reservaciones").select("id", { count: "exact", head: true }),
      supabase.from("laboratorios").select("id", { count: "exact", head: true }),
      supabase
        .from("incidentes")
        .select("id", { count: "exact", head: true })
        .gte("fecha_hora", inicioSemana.toISOString())
        .lt("fecha_hora", finSemana.toISOString()),
      supabase.from("fechas_q").select("id, inicio, final"),
      supabase
        .from("reservaciones")
        .select(
          `
          id,
          motivo_uso,
          fecha,
          estado,
          grupo_id,
          created_at,
          solicitante_nombre,
          solicitante_tipo,
          solicitante_correo,
          laboratorio_id,
          laboratorios(nombre),
          reservaciones_integrantes(nombre, numero_cuenta),
          reservaciones_horarios(horarios(horario))
        `,
        )
        .eq("estado", "EN_ESPERA")
        .order("id", { ascending: false })
        .limit(50),
    ]);

    setMetricas({
      totalReservas: totalReservas.count || 0,
      totalLaboratorios: totalLaboratorios.count || 0,
      incidentesSemana: incidentesSemana.count || 0,
    });

    setPorAprobar(agruparPorAprobar(porAprobarData.data || []));

    // Top 3 laboratorios más reservados en el trimestre actual
    const trimestre = trimestreActual(trimestres.data || []);
    if (trimestre) {
      const { data: reservasTrimestre } = await supabase
        .from("reservaciones")
        .select("laboratorio_id, laboratorios(nombre)")
        .eq("estado", "APROBADA")
        .gte("fecha", String(trimestre.inicio).slice(0, 10))
        .lte("fecha", String(trimestre.final).slice(0, 10));

      const conteo = {};
      (reservasTrimestre || []).forEach((r) => {
        const nombre = r.laboratorios?.nombre || "Desconocido";
        conteo[nombre] = (conteo[nombre] || 0) + 1;
      });

      const top = Object.entries(conteo)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 3);

      setTopLaboratorios(top);
    }

    setCargando(false);
  }

  function agruparPorAprobar(reservas) {
    const agrupadas = reservas.reduce((acc, reserva) => {
      const groupKey = reserva.grupo_id || reserva.id;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          ...reserva,
          ids: [reserva.id],
          idMaximo: reserva.id,
          usuarios: (reserva.reservaciones_integrantes || [])
            .map((ri) => ri.nombre?.trim())
            .filter(Boolean)
            .join(", ") || reserva.solicitante_nombre || "N/A",
          horarios:
            (reserva.reservaciones_horarios || [])
              .map((rh) => rh.horarios?.horario)
              .filter(Boolean)
              .sort()
              .join(", ") || "No asignado",
        };
      } else {
        acc[groupKey].ids.push(reserva.id);
        acc[groupKey].idMaximo = Math.max(acc[groupKey].idMaximo, reserva.id);
        const nuevosUsuarios = (reserva.reservaciones_integrantes || [])
          .map((ri) => ri.nombre?.trim())
          .filter(Boolean);
        const existentes = new Set(acc[groupKey].usuarios.split(", "));
        nuevosUsuarios.forEach((n) => existentes.add(n));
        acc[groupKey].usuarios = Array.from(existentes).join(", ");
      }

      return acc;
    }, {});

    return Object.values(agrupadas)
      .sort((a, b) => b.idMaximo - a.idMaximo)
      .slice(0, 10);
  }

  const aprobarReserva = async (grupo) => {
    if (!import.meta.env.VITE_SERVICE_ROLE) {
      message.error("Falta VITE_SERVICE_ROLE en el entorno. Reinicia el servidor de desarrollo.");
      return;
    }
    const cliente = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SERVICE_ROLE,
    );
    const { error } = await cliente
      .from("reservaciones")
      .update({ estado: "APROBADA", descripcion: "" })
      .in("id", grupo.ids);
    if (error) {
      console.error("Error al aprobar:", error);
      message.error("Error al aprobar la reserva.");
      return;
    }
    message.success("Reserva aprobada.");
    cargarDashboard();
  };

  const rechazarReserva = async (grupo) => {
    const descripcion = window.prompt("Motivo del rechazo:");
    if (descripcion === null) return;
    if (!descripcion.trim()) {
      message.warning("El motivo del rechazo es obligatorio.");
      return;
    }
    if (!import.meta.env.VITE_SERVICE_ROLE) {
      message.error("Falta VITE_SERVICE_ROLE en el entorno. Reinicia el servidor de desarrollo.");
      return;
    }
    const cliente = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SERVICE_ROLE,
    );
    const { error } = await cliente
      .from("reservaciones")
      .update({ estado: "RECHAZADA", descripcion: descripcion.trim() })
      .in("id", grupo.ids);
    if (error) {
      console.error("Error al rechazar:", error);
      message.error("Error al rechazar la reserva.");
      return;
    }
    message.success("Reserva rechazada.");
    cargarDashboard();
  };

  const tarjetas = useMemo(
    () => [
      {
        label: "Total de Reservas",
        valor: metricas.totalReservas,
        icono: FiCalendar,
        color: "bg-blue-600",
      },
      {
        label: "Laboratorios",
        valor: metricas.totalLaboratorios,
        icono: FiMapPin,
        color: "bg-green-600",
      },
      {
        label: "Incidentes esta semana",
        valor: metricas.incidentesSemana,
        icono: FiAlertTriangle,
        color: "bg-amber-500",
      },
    ],
    [metricas],
  );

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.label}
            className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-md"
          >
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white ${tarjeta.color}`}
            >
              <tarjeta.icono size={26} />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-gray-800">{tarjeta.valor}</p>
              <p className="truncate text-sm font-medium text-gray-500">
                {tarjeta.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Top 3 laboratorios */}
      <div className="rounded-xl bg-white p-5 shadow-md">
        <div className="mb-4 flex items-center gap-2">
          <FiTrendingUp className="text-blue-600" size={22} />
          <h2 className="text-lg font-bold text-gray-800">
            Laboratorios más reservados del trimestre
          </h2>
        </div>
        {topLaboratorios.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay reservas aprobadas en el trimestre actual.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topLaboratorios.map((lab, index) => (
              <div
                key={lab.nombre}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-800">
                    {lab.nombre}
                  </p>
                  <p className="text-sm text-gray-500">
                    {lab.cantidad} reservas
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reservas por aprobar */}
      <div className="rounded-xl bg-white p-5 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            Reservas generadas recientemente
          </h2>
          <button
            type="button"
            onClick={() => navigate("/admin/reservas")}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Ver todas →
          </button>
        </div>

        {porAprobar.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay reservas en espera de aprobación.
          </p>
        ) : (
          <div className="space-y-3">
            {porAprobar.map((grupo) => (
              <div
                key={grupo.ids.join("-")}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-800">
                    {grupo.usuarios}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {grupo.laboratorios?.nombre || "N/A"} ·{" "}
                    {grupo.horarios}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    Fecha: {formatearFechaCorta(grupo.fecha)} ·{" "}
                    {grupo.motivo_uso}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => aprobarReserva(grupo)}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <FiCheck size={16} />
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => rechazarReserva(grupo)}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    <FiX size={16} />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
