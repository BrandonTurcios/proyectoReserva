import { useState, useEffect } from "react";
import { supabase } from "../../shared/services/supabaseClient";
import { motion } from "framer-motion";
import Select from "react-select";
import { message } from "antd";

export default function CrearReserva() {
  const [laboratorios, setLaboratorios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [perfil, setPerfil] = useState("");
  const [cantidadUsuarios, setCantidadUsuarios] = useState(0);
  const [integrantes, setIntegrantes] = useState([]);
  const [horariosSeleccionados, setHorariosSeleccionados] = useState([]);
  const [motivoUso, setMotivoUso] = useState("");
  const [nombre, setNombre] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [correo, setCorreo] = useState("");
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [fechaReservacion, setFechaReservacion] = useState("");
  const [laboratorioId, setLaboratorioId] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState("");
  const [error2, setError2] = useState("");
  const [habilitado, setHabilitado] = useState(false);
  const [esEstudiante, setEsEstudiante] = useState(false);
  const [repetirDias, setRepetirDias] = useState(false);
  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [mostrarReglamento, setMostrarReglamento] = useState(false);
  const [reglamentoLeido, setReglamentoLeido] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  useEffect(() => {
    const emailFromStorage = localStorage.getItem("email");
    if (emailFromStorage) {
      setCorreo(emailFromStorage);
    }
    const fetchData = async () => {
      const { data: laboratoriosData, error: laboratoriosError } =
        await supabase.from("laboratorios").select("id, nombre");

      if (laboratoriosError) {
        console.error("Error fetching laboratorios:", laboratoriosError);
      } else {
        setLaboratorios(laboratoriosData);
      }

      const { data: horariosData, error: horariosError } = await supabase
        .from("horarios")
        .select("id, horario");

      if (horariosError) {
        console.error("Error fetching horarios:", horariosError);
      } else {
        setHorarios(horariosData);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (mostrarReglamento) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [mostrarReglamento]);

  async function verificarLimiteReservas(
    laboratorioId,
    fecha,
    horarioId,
    tipoUsuario,
  ) {
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
      .eq("reservaciones_horarios.horarios.id", horarioId);

    if (error) {
      console.error("Error al verificar el límite de reservas:", error);
      return { limiteExcedido: false, mensaje: "" };
    }

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
      return { limiteExcedido: false, mensaje: "" };
    }

    return { limiteExcedido: false, mensaje: "" };
  }

  const handleDiasChange = (e) => {
    const { value, checked } = e.target;
    setDiasSeleccionados((prev) =>
      checked ? [...prev, value] : prev.filter((dia) => dia !== value),
    );
  };

  const handlePerfilChange = (e) => {
    const selectedPerfil = e.target.value;
    setPerfil(selectedPerfil);
    setEsEstudiante(selectedPerfil === "Estudiante");
    setHabilitado(e.target.value !== "");

    if (selectedPerfil === "Estudiante") {
      setCantidadUsuarios(0);
    }

    setIntegrantes([]);
    setHorariosSeleccionados([]);
  };

  const handleHorarioChange = (selectedOptions) => {
    const selectedHorarioIds = selectedOptions.map((option) => option.value);
    if (perfil === "Estudiante" && selectedHorarioIds.length > 2) {
      setError("Los estudiantes solo pueden seleccionar hasta 2 horarios.");
      return;
    }
    setError("");
    setHorariosSeleccionados(selectedHorarioIds);
  };

  const handleCantidadChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setCantidadUsuarios(value);
    setIntegrantes(
      value > 0
        ? Array.from({ length: value }, () => ({
            nombre: "",
            numero_cuenta: "",
          }))
        : [],
    );
  };

  const handleIntegranteChange = (index, field, value) => {
    const updatedIntegrantes = [...integrantes];
    updatedIntegrantes[index][field] = value;
    setIntegrantes(updatedIntegrantes);
  };

  const getDiaSemana = (fecha) => fecha.getDay();

  async function createUser({
    nombre,
    numero_cuenta,
    correo,
    tipo_usuario,
  }) {
    const { data: newUser, error } = await supabase
      .from("usuarios")
      .insert([{ nombre, numero_cuenta, correo: correo || " ", tipo_usuario }])
      .select();

    if (error || !newUser || newUser.length === 0) {
      throw new Error("Error al crear usuario");
    }

    return newUser[0].id;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (perfil === "Estudiante" && horariosSeleccionados.length > 2) {
      setError("Los estudiantes solo pueden seleccionar hasta 2 horarios.");
      return;
    }
    if (!reglamentoLeido || !aceptaReglamento) {
      setError2("Debes leer y aceptar el reglamento para continuar");
      return;
    }

    setIsSubmitting(true);

    try {
      let diasReservaciones = [];

      if (esEstudiante || !repetirDias) {
        if (!fechaReservacion) {
          setError("Debes seleccionar una fecha de reservación.");
          setIsSubmitting(false);
          return;
        }
        diasReservaciones.push(fechaReservacion);
      } else {
        const diasSeleccionadosIndices = diasSeleccionados.map((dia) => {
          const mapping = {
            Lunes: 0,
            Martes: 1,
            Miércoles: 2,
            Jueves: 3,
            Viernes: 4,
            Sábado: 5,
            Domingo: 6,
          };
          return mapping[dia];
        });

        let fechaActual = new Date(fechaInicio);
        const fechaFinal = new Date(fechaFin);

        while (fechaActual <= fechaFinal) {
          const diaSemana = getDiaSemana(fechaActual);
          if (diasSeleccionadosIndices.includes(diaSemana)) {
            diasReservaciones.push(fechaActual.toISOString().split("T")[0]);
          }
          fechaActual.setDate(fechaActual.getDate() + 1);
        }
      }

      let grupoId = null;
      if (!esEstudiante && repetirDias && diasReservaciones.length > 1) {
        grupoId = crypto.randomUUID();
      }

      for (const fecha of diasReservaciones) {
        for (const horarioId of horariosSeleccionados) {
          const { limiteExcedido, mensaje } = await verificarLimiteReservas(
            laboratorioId,
            fecha,
            horarioId,
            perfil,
          );

          if (perfil !== "Estudiante" && limiteExcedido) {
            message.warning(
              "Ya hay reservas en ese horario. Tu solicitud será enviada y el administrador evaluará el caso.",
            );
            continue;
          }

          if (limiteExcedido) {
            setError(mensaje);
            setIsSubmitting(false);
            return;
          }
        }
      }

      const usuarioId = await createUser({
        nombre,
        numero_cuenta: numeroCuenta,
        correo,
        tipo_usuario: perfil,
      });

      for (const fecha of diasReservaciones) {
        const { data: reservacionData, error: reservacionError } =
          await supabase
            .from("reservaciones")
            .insert({
              motivo_uso: motivoUso,
              cantidad_usuarios: cantidadUsuarios + 1,
              fecha: fecha,
              dias_repeticion: diasSeleccionados.join(", "),
              laboratorio_id: laboratorioId,
              grupo_id: grupoId,
            })
            .select();

        if (reservacionError) {
          console.error("Error al insertar reserva:", reservacionError);
          setIsSubmitting(false);
          return;
        }

        if (!reservacionData || reservacionData.length === 0) {
          console.error(
            "No se pudo insertar la reserva o la respuesta está vacía",
          );
          setIsSubmitting(false);
          return;
        }

        const reservacionId = reservacionData[0].id;

        const horariosInsert = horariosSeleccionados.map((horarioId) => ({
          reservacion_id: reservacionId,
          horario_id: horarioId,
        }));

        await supabase.from("reservaciones_horarios").insert(horariosInsert);

        const usuariosInsert = [
          { reservacion_id: reservacionId, usuario_id: usuarioId },
        ];

        if (cantidadUsuarios > 0) {
          for (const integrante of integrantes) {
            const integranteId = await createUser({
              nombre: integrante.nombre,
              numero_cuenta: integrante.numero_cuenta,
              correo: " ",
              tipo_usuario: "Estudiante",
            });

            usuariosInsert.push({
              reservacion_id: reservacionId,
              usuario_id: integranteId,
            });
          }
        }

        await supabase.from("reservaciones_usuarios").insert(usuariosInsert);
      }

      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2000);

      setPerfil("");
      setCantidadUsuarios(0);
      setIntegrantes([]);
      setHorariosSeleccionados([]);
      setMotivoUso("");
      setNombre("");
      setNumeroCuenta("");
      setDiasSeleccionados([]);
      setFechaInicio("");
      setFechaFin("");
      setFechaReservacion("");
      setLaboratorioId(null);
      setAceptaReglamento(false);
      setReglamentoLeido(false);
      setHabilitado(false);
    } catch (error) {
      console.error("Error al crear la reserva:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitle =
    "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3";

  return (
    <div className="min-h-screen bg-[#06065c] flex justify-center px-3 py-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-gray-800">
            Crear Reserva
          </h2>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Sección 1: Laboratorio y Perfil */}
            <section>
              <h3 className={sectionTitle}>Información de la reserva</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Laboratorio Solicitado</label>
                  <select
                    className={inputClass}
                    value={laboratorioId || ""}
                    required
                    disabled={isSubmitting}
                    onChange={(e) => setLaboratorioId(e.target.value)}
                  >
                    <option value="">Seleccione un laboratorio</option>
                    {laboratorios.map((lab) => (
                      <option key={lab.id} value={lab.id}>
                        {lab.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Perfil del solicitante</label>
                  <select
                    className={inputClass}
                    value={perfil}
                    onChange={handlePerfilChange}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Seleccione un perfil</option>
                    <option value="Estudiante">Estudiante</option>
                    <option value="Docente">Docente</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Prospección">Prospección</option>
                    <option value="Educación Continua">
                      Educación Continua
                    </option>
                  </select>
                </div>
              </div>
            </section>

            {/* Sección 2: Datos del solicitante */}
            <section>
              <h3 className={sectionTitle}>Datos del solicitante</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={nombre}
                    required
                    disabled={!habilitado || isSubmitting}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Número de cuenta</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={numeroCuenta}
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={20}
                    disabled={!habilitado || isSubmitting}
                    onChange={(e) =>
                      setNumeroCuenta(e.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Correo electrónico</label>
                <input
                  type="email"
                  className={`${inputClass} bg-gray-50`}
                  value={correo}
                  readOnly
                />
              </div>
              <div className="mt-4">
                <label className={labelClass}>Motivos de uso</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={motivoUso}
                  onChange={(e) => setMotivoUso(e.target.value)}
                  required
                  disabled={!habilitado || isSubmitting}
                />
              </div>
            </section>

            {/* Sección 3: Integrantes (solo estudiantes) */}
            {perfil === "Estudiante" && (
              <section>
                <h3 className={sectionTitle}>Integrantes adicionales</h3>
                <div>
                  <label className={labelClass}>
                    Cantidad de integrantes (máx. 19)
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={cantidadUsuarios}
                    required
                    disabled={isSubmitting}
                    onChange={handleCantidadChange}
                    min={0}
                    max={19}
                  />
                </div>
                {cantidadUsuarios > 0 && (
                  <div className="mt-3 space-y-2">
                    {integrantes.map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      >
                        <input
                          type="text"
                          placeholder={`Nombre del integrante ${index + 1}`}
                          className={inputClass}
                          disabled={isSubmitting}
                          onChange={(e) =>
                            handleIntegranteChange(
                              index,
                              "nombre",
                              e.target.value,
                            )
                          }
                        />
                        <input
                          type="text"
                          placeholder="Número de cuenta"
                          className={inputClass}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={20}
                          disabled={isSubmitting}
                          onChange={(e) =>
                            handleIntegranteChange(
                              index,
                              "numero_cuenta",
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Sección 4: Fechas y Horarios */}
            <section>
              <h3 className={sectionTitle}>Fechas y horarios</h3>

              {/* Repetir días (solo no estudiantes) */}
              {!esEstudiante && (
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repetirDias}
                    disabled={!habilitado || isSubmitting}
                    onChange={(e) => setRepetirDias(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">¿Repetir días?</span>
                </label>
              )}

              {/* Fechas recurrentes */}
              {!esEstudiante && repetirDias && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Días de Repetición</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                      ].map((dia) => (
                        <label
                          key={dia}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            value={dia}
                            checked={diasSeleccionados.includes(dia)}
                            onChange={handleDiasChange}
                            disabled={!habilitado || isSubmitting}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{dia}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Fecha de Inicio</label>
                      <input
                        type="date"
                        className={inputClass}
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        disabled={!habilitado || isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Fecha de Finalización
                      </label>
                      <input
                        type="date"
                        className={inputClass}
                        value={fechaFin}
                        disabled={!habilitado || isSubmitting}
                        onChange={(e) => setFechaFin(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha única */}
              {(!esEstudiante ? !repetirDias : true) && (
                <div className="mt-4">
                  <label className={labelClass}>Fecha de reservación</label>
                  <input
                    type="date"
                    disabled={!habilitado || isSubmitting}
                    className={inputClass}
                    value={fechaReservacion}
                    onChange={(e) => setFechaReservacion(e.target.value)}
                  />
                </div>
              )}

              {/* Horario */}
              <div className="mt-4">
                <label className={labelClass}>Horario</label>
                <Select
                  options={horarios.map((horario) => ({
                    value: horario.id,
                    label: horario.horario,
                  }))}
                  isMulti
                  onChange={handleHorarioChange}
                  isSearchable={false}
                  isDisabled={!habilitado || isSubmitting}
                  value={horariosSeleccionados
                    .map((id) => {
                      const horario = horarios.find((h) => h.id === id);
                      return horario
                        ? { value: horario.id, label: horario.horario }
                        : null;
                    })
                    .filter(Boolean)}
                  className="text-sm"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: state.isDisabled ? "#d1d5db" : "#d1d5db",
                      borderRadius: "0.5rem",
                      minHeight: "42px",
                      boxShadow: state.isFocused ? "0 0 0 2px #3b82f6" : "none",
                      "&:hover": {},
                      backgroundColor: state.isDisabled ? "#f3f4f6" : "#fff",
                    }),
                  }}
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
            </section>

            {/* Sección 5: Reglamento */}
            <section>
              <h3 className={sectionTitle}>Reglamento</h3>
              <div className="flex items-start gap-3">
                <input
                  id="acepto-reglamento"
                  name="acepto-reglamento"
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={aceptaReglamento}
                  onChange={(e) => {
                    if (!reglamentoLeido) {
                      setMostrarReglamento(true);
                      e.preventDefault();
                      return;
                    }
                    setAceptaReglamento(e.target.checked);
                  }}
                  disabled={!reglamentoLeido || isSubmitting}
                />
                <div className="text-sm">
                  <span className="text-gray-700">Acepto las </span>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-500 hover:underline"
                    onClick={() => setMostrarReglamento(true)}
                  >
                    políticas de uso de laboratorio
                  </button>
                  {!aceptaReglamento && error2 && (
                    <p className="mt-1 text-sm text-red-600">{error2}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Botón enviar */}
            <button
              type="submit"
              className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition-colors ${
                isSubmitting
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Procesando...
                </>
              ) : (
                "Enviar solicitud"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Popup de confirmación */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="bg-white p-6 rounded-lg shadow-lg text-center mx-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-500 text-white rounded-full"
            >
              ✓
            </motion.div>
            <h3 className="text-lg font-semibold">Reserva Creada</h3>
            <p className="text-gray-600">
              Tu reserva ha sido realizada con éxito.
            </p>
          </motion.div>
        </div>
      )}

      {/* Modal Reglamento */}
      {mostrarReglamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75"
            onClick={() => setMostrarReglamento(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Reglamento para Talleres - Facultad de Ingeniería y Arquitectura
              </h3>
            </div>
            <div className="px-4 sm:px-6 py-4 overflow-y-auto text-sm space-y-6">
              <section>
                <h4 className="font-bold text-base mb-1">
                  1. Seguridad Personal:
                </h4>
                <p className="font-semibold">
                  Uso Obligatorio del Equipo de Protección Personal (EPP):
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Todos los estudiantes deben usar el equipo de protección
                    adecuado según la actividad que realicen, incluyendo
                    caretas, guantes, gafas de seguridad, botas de seguridad, y
                    ropa adecuada.
                  </li>
                  <li>
                    <span className="font-medium">En soldadura:</span> Careta o
                    máscara de soldador, guantes resistentes al calor, ropa de
                    manga larga.
                  </li>
                  <li>
                    <span className="font-medium">En pintura:</span>{" "}
                    Respiradores adecuados, guantes, gafas de seguridad.
                  </li>
                  <li>
                    <span className="font-medium">
                      En construcción y biodigestores:
                    </span>{" "}
                    Casco, guantes resistentes, gafas de seguridad y botas con
                    punta de acero.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  2. Uso de Herramientas y Equipos:
                </h4>
                <p className="font-semibold">Inspección Previa:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Antes de usar cualquier herramienta o equipo, todos los
                    estudiantes deben inspeccionarlos para asegurarse de que
                    estén en buen estado. Si se detecta algún problema, se debe
                    informar al supervisor o docente.
                  </li>
                </ul>
                <p className="font-semibold mt-2">Uso Adecuado:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Utilizar cada herramienta solo para el propósito que fue
                    diseñada. Por ejemplo, las soldadoras solo deben usarse para
                    soldadura y los equipos para pintura solo deben usarse para
                    pintura.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  3. Seguridad en el Área de Trabajo:
                </h4>
                <p className="font-semibold">Orden y Limpieza:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Mantener el área de trabajo limpia y ordenada. El desorden
                    puede provocar accidentes. Cada estudiante debe limpiar su
                    espacio al finalizar la actividad.
                  </li>
                  <li>
                    Asegúrese de que los cables de las herramientas estén
                    organizados y no representen un peligro de tropiezos.
                  </li>
                </ul>
                <p className="font-semibold mt-2">
                  Zona de Soldadura y Pintura:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Asegúrese de que las áreas de soldadura o pintura estén bien
                    ventiladas. Evite la presencia de materiales inflamables
                    cerca.
                  </li>
                  <li>
                    Para todo tipo de trabajo de soldadura y corte se requiere
                    ventilación ya sea natural o artificial.
                  </li>
                  <li>
                    Las casetas de soldar deben mantenerse con ventilación
                    natural por lo que está prohibido cerrarlos totalmente o
                    almacenar cualquier tipo de objetos que no pertenezcan al
                    área.
                  </li>
                  <li>
                    Para trabajos de soldadura dentro de un espacio confinado
                    primeramente se recomienda hacer el trabajo fuera de este.
                  </li>
                  <li>
                    Asegúrese que no haya fuentes de agua cerca del área de
                    soldadura.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  4. Manipulación de Materiales Peligrosos:
                </h4>
                <p className="font-semibold">Pinturas y Solventes:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Trabaje en áreas bien ventiladas cuando utilice pinturas o
                    productos que liberen vapores.
                  </li>
                  <li>
                    Almacene correctamente los productos químicos y asegúrese de
                    que las etiquetas de seguridad sean visibles.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  5. Prevención de Accidentes:
                </h4>
                <p className="font-semibold">Emergencias:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    En caso de accidente o quemaduras, informe inmediatamente al
                    supervisor o docente.
                  </li>
                </ul>
                <p className="font-semibold mt-2">
                  Prohibición de Consumo de Alcohol y Drogas:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Está prohibido consumir alcohol y drogas antes o durante las
                    actividades en el taller.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  6. Normas de Conducta:
                </h4>
                <p className="font-semibold">Responsabilidad y Compromiso:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Los estudiantes deben ser responsables al manejar las
                    herramientas y equipos.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  7. Mantenimiento y Uso Responsable de Herramientas:
                </h4>
                <p className="font-semibold">Mantenimiento Preventivo:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Los estudiantes deben notificar cualquier fallo o daño en
                    las herramientas y equipos.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  9. Supervisión y Cumplimiento:
                </h4>
                <p className="font-semibold">Inspección Regular:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Los docentes realizarán inspecciones regulares para asegurar
                    el cumplimiento de las normas.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  10. Horario de operación:
                </h4>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Respetar el horario establecido por el personal
                    administrativo del área de trabajo.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-base mb-1">
                  11. Disposición de residuos:
                </h4>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    Se debe contar con un contenedor metálico para desperdicios
                    y sobrantes de materiales.
                  </li>
                </ul>
              </section>
            </div>
            <div className="px-4 sm:px-6 py-3 border-t bg-gray-50 flex justify-end">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setMostrarReglamento(false);
                  setReglamentoLeido(true);
                  setAceptaReglamento(true);
                }}
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
