import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import "../index.css"; 
import Select from "react-select";
import { v4 as uuidv4 } from "uuid";

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
  // Nuevo estado para controlar el estado de carga
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function verificarLimiteReservas(laboratorioId, fecha, horarioId, tipoUsuario) {
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
      .eq("reservaciones_horarios.horarios.id", horarioId);
  
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

  const handleDiasChange = (e) => {
    const { value, checked } = e.target;
    setDiasSeleccionados((prev) =>
      checked ? [...prev, value] : prev.filter((dia) => dia !== value)
    );
  };

  const handlePerfilChange = (e) => {
    const selectedPerfil = e.target.value;
    setPerfil(selectedPerfil);
    setEsEstudiante(selectedPerfil === "Estudiante")
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

  const handleClearHorarios = () => {
    setHorariosSeleccionados([]);
  };

  const handleCantidadChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setCantidadUsuarios(value);
    // Solo generar integrantes adicionales si la cantidad es mayor que 0
    setIntegrantes(
      value > 0
        ? Array.from({ length: value }, () => ({ nombre: "", numero_cuenta: "" }))
        : []
    );
  };
  
  const handleIntegranteChange = (index, field, value) => {
    const updatedIntegrantes = [...integrantes];
    updatedIntegrantes[index][field] = value;
    setIntegrantes(updatedIntegrantes);
  };

  const getDiaSemana = (fecha) => fecha.getDay(); // Devuelve el índice del día

  // Función para verificar si ya existe una reserva para el mismo laboratorio, fecha y horario
  async function existeReserva(laboratorioId, fecha, horarioId) {
    const { data, error } = await supabase
      .from("reservaciones")
      .select(`id, reservaciones_horarios!inner (horario_id)`)
      .eq("laboratorio_id", laboratorioId)
      .eq("fecha", fecha)
      .eq("reservaciones_horarios.horario_id", horarioId);
    if (error) {
      console.error("Error al verificar existencia de reserva:", error);
      return false;
    }
    return data && data.length > 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Evitar múltiples envíos si ya está en proceso
    if (isSubmitting) return;
  
    if (perfil === "Estudiante" && horariosSeleccionados.length > 2) {
      setError("Los estudiantes solo pueden seleccionar hasta 2 horarios.");
      return;
    }
    if (!reglamentoLeido || !aceptaReglamento) {
      setError2("Debes leer y aceptar el reglamento para continuar");
      return;
    }
   
    // Activar el estado de envío
    setIsSubmitting(true);
    
    try {
      // Declarar diasReservaciones aquí, antes de usarla
      let diasReservaciones = [];
  
      // Obtener las fechas de reservación
      if (esEstudiante || !repetirDias) {
        if (!fechaReservacion) {
          setError("Debes seleccionar una fecha de reservación.");
          setIsSubmitting(false); // Desactivar el estado de envío en caso de error
          return;
        }
        diasReservaciones.push(fechaReservacion);
      } else {
        // Si no es estudiante, usar fechaInicio y fechaFin
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
  grupoId = crypto.randomUUID(); // usa crypto si estás en navegador moderno
}

      // Verificar límites para cada fecha y horario seleccionado
      for (const fecha of diasReservaciones) {
        for (const horarioId of horariosSeleccionados) {
          const { limiteExcedido, mensaje } = await verificarLimiteReservas(
            laboratorioId,
            fecha,
            horarioId,
            perfil
          );
  
          if (limiteExcedido) {
            setError(mensaje);
            setIsSubmitting(false); // Desactivar el estado de envío en caso de error
            return; // No permitir la creación de la reserva
          }
        }
      }
  
      // Insertar el usuario principal
      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .insert([
          {
            nombre: nombre,
            numero_cuenta: numeroCuenta,
            correo: correo,
            tipo_usuario: perfil,
          },
        ])
        .select();
  
      if (usuarioError) {
        console.error("Error al insertar usuario:", usuarioError);
        setIsSubmitting(false); // Desactivar el estado de envío en caso de error
        throw new Error("Error al insertar usuario");
      }
  
      if (!usuarioData || usuarioData.length === 0) {
        setIsSubmitting(false); // Desactivar el estado de envío en caso de error
        throw new Error("No se pudo insertar el usuario o la respuesta está vacía");
      }
  
      const usuarioId = usuarioData[0].id;
  
      // Crear la reserva
      for (const fecha of diasReservaciones) {
        const { data: reservacionData, error: reservacionError } = await supabase
          .from("reservaciones")
          .insert({
            motivo_uso: motivoUso,
            cantidad_usuarios: cantidadUsuarios + 1, // +1 para incluir al usuario principal
            fecha: fecha,
            dias_repeticion: diasSeleccionados.join(", "),
            laboratorio_id: laboratorioId,
            grupo_id: grupoId,
          })
          .select();
  
        if (reservacionError) {
          console.error("Error al insertar reserva:", reservacionError);
          setIsSubmitting(false); // Desactivar el estado de envío en caso de error
          return;
        }
  
        if (!reservacionData || reservacionData.length === 0) {
          console.error("No se pudo insertar la reserva o la respuesta está vacía");
          setIsSubmitting(false); // Desactivar el estado de envío en caso de error
          return;
        }
  
        const reservacionId = reservacionData[0].id;
  
        const horariosInsert = horariosSeleccionados.map((horarioId) => ({
          reservacion_id: reservacionId,
          horario_id: horarioId,
        }));
  
        await supabase.from("reservaciones_horarios").insert(horariosInsert);
  
        const usuariosInsert = [{ reservacion_id: reservacionId, usuario_id: usuarioId }];
  
        // Insertar integrantes solo si hay integrantes adicionales
        if (cantidadUsuarios > 0) {
          for (const integrante of integrantes) {
            const { data: integranteData, error: integranteError } = await supabase
              .from("usuarios")
              .insert({
                nombre: integrante.nombre,
                correo: " ",
                numero_cuenta: integrante.numero_cuenta,
                tipo_usuario: "Estudiante",
              })
              .select();
  
            if (integranteError) {
              console.error("Error al insertar integrante:", integranteError);
              setIsSubmitting(false); // Desactivar el estado de envío en caso de error
              throw new Error("Error al insertar integrante");
            }
  
            if (!integranteData || integranteData.length === 0) {
              setIsSubmitting(false); // Desactivar el estado de envío en caso de error
              throw new Error("No se pudo insertar el integrante o la respuesta está vacía");
            }
  
            usuariosInsert.push({
              reservacion_id: reservacionId,
              usuario_id: integranteData[0].id,
            });
          }
        }
  
        await supabase.from("reservaciones_usuarios").insert(usuariosInsert);
      }
  
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2000);
  
      // Limpiar el formulario
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
      setLaboratorioId(0);
      setAceptaReglamento(false);
      setReglamentoLeido(false);
      
    } catch (error) {
      console.error("Error al crear la reserva:", error);
    } finally {
      // Desactivar el estado de envío cuando se completa el proceso
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-center items-center h-full min-h-screen bg-[#06065c]">
      {/* Capa superior con forma recortada */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#0f49b6] clip-custom z-0 "></div>

      {/* Contenedor del formulario con scroll */}
      <div className="z-10 max-w-lg mx-auto p-4 bg-white shadow-md rounded px-4 overflow-y-auto max-h-[100vh]">
        <h2 className="text-3xl font-bold mb-4 text-center">Crear Reserva</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block font-medium text-gray-700">
              Laboratorio Solicitado
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={laboratorioId}
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
            <label className="block font-medium text-gray-700">
              Perfil del solicitante
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
              <option value="Educación Continua">Educación Continua</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700">
              Motivos de uso
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={motivoUso}
              onChange={(e) => setMotivoUso(e.target.value)}
              required
              disabled={!habilitado || isSubmitting}
            ></textarea>
          </div>

          <div>
            <label className="block font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={nombre}
              required
              disabled={!habilitado || isSubmitting}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">
              Número de cuenta
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={numeroCuenta}
              required
              disabled={!habilitado || isSubmitting}
              onChange={(e) => setNumeroCuenta(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={correo}
              readOnly
            />
          </div>

          {perfil === "Estudiante" && (
  <div>
    <label className="block font-medium text-gray-700">
      Cantidad de integrantes adicionales
    </label>
    <input
      type="number"
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      value={cantidadUsuarios}
      required
      disabled={isSubmitting}
      onChange={handleCantidadChange}
      min={0} // Permitir 0 como valor mínimo
      max={19}
    />
    {cantidadUsuarios > 0 && (
      <>
        {integrantes.map((_, index) => (
          <div key={index} className="flex flex-wrap gap-2 mt-2">
            <input
              type="text"
              placeholder={`Nombre del integrante ${index + 1}`}
              className="w-full sm:w-auto flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              disabled={isSubmitting}
              onChange={(e) =>
                handleIntegranteChange(index, "nombre", e.target.value)
              }
            />
            <input
              type="text"
              placeholder="Número de cuenta"
              className="w-full sm:w-auto flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              disabled={isSubmitting}
              onChange={(e) =>
                handleIntegranteChange(index, "numero_cuenta", e.target.value)
              }
            />
           
          </div>
        ))}
      </>
    )}
  </div>
)}
     
     {!esEstudiante && ( // Mostrar solo si no es estudiante
  <div>
    <label className="block font-medium text-gray-700">
      <input
        type="checkbox"
        checked={repetirDias}
        disabled={!habilitado || isSubmitting}
        onChange={(e) => setRepetirDias(e.target.checked)}
        className="mr-2"
      />
      ¿Repetir días?
    </label>
  </div>
)}
  {!esEstudiante && repetirDias &&( // Mostrar solo si no es estudiante
       <>
          <div>
            <label className="block font-medium text-gray-700">
              Días de Repetición
            </label>
            <div className="flex flex-wrap gap-3">
  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((dia) => (
    <label key={dia} className="flex items-center cursor-pointer space-x-2">
      <input
        type="checkbox"
        value={dia}
        checked={diasSeleccionados.includes(dia)}
        onChange={handleDiasChange}
        disabled={!habilitado || isSubmitting}
        className="peer hidden"
      />
      <div className="w-5 h-5 flex items-center justify-center border-2 border-gray-400 rounded-md 
                      peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all duration-200
                      peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
        <svg
          className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 00-1.414 0L7 13.586 4.707 11.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l9-9a1 1 0 000-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <span className="text-gray-800 peer-disabled:text-gray-400">{dia}</span>
    </label>
  ))}
</div>

          </div>
          
         
 
    <div>
      <label className="block font-medium text-gray-700">
        Fecha de Inicio
      </label>
      <input
        type="date"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
        disabled={!habilitado || isSubmitting}
      />
    </div>

    <div>
      <label className="block font-medium text-gray-700">
        Fecha de Finalización
      </label>
      <input
        type="date"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        value={fechaFin}
        disabled={!habilitado || isSubmitting}
        onChange={(e) => setFechaFin(e.target.value)}
      />
    </div>
  </>
)}
        {!repetirDias &&( 
          <div>
            <label className="block font-medium text-gray-700">
              Fecha de reservación
            </label>
            <input
              type="date"
              disabled={!habilitado || isSubmitting}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={fechaReservacion}
              onChange={(e) => setFechaReservacion(e.target.value)}
            />
          </div>
        )}
          <div>
            <div>
              <label className="block font-medium text-gray-700">Horario</label>
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
              />

              {error && <p className="text-red-500">{error}</p>}
            </div>
          </div>
          


          <div className="mt-4">
  <div className="relative flex items-start">
    {/* Checkbox (siempre visible pero controlado) */}
    <div className="flex items-center h-5">
      <input
        id="acepto-reglamento"
        name="acepto-reglamento"
        type="checkbox"
        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
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
    </div>
    
    {/* Texto del label - completamente independiente */}
    <div className="ml-3 text-sm">
      <div className="flex items-center">
        <span className="font-medium text-gray-700 mr-1">Acepto las</span>
        <span 
          className="text-blue-600 hover:text-blue-500 hover:underline cursor-pointer"
          onClick={() => setMostrarReglamento(true)}
        >
          politicas de uso de laboratorio 
        </span>
      </div>
      
      {/* Mensaje de error */}
      {!aceptaReglamento && error2 && (
        <p className="mt-1 text-sm text-red-600">
          Debes abrir y leer el reglamento antes de aceptar
        </p>
      )}
    </div>
  </div>
</div>



{mostrarReglamento && (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <style jsx global>{`
      body {
        overflow: hidden;
      }
    `}</style>
    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 transition-opacity" aria-hidden="true">
        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
                Reglamento para Talleres - Facultad de Ingeniería y Arquitectura
              </h3>
              <div className="mt-2 max-h-[70vh] overflow-y-auto text-sm">
                <div className="prose prose-sm max-w-none">
                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">1. Seguridad Personal:</h4>
                    <p className="font-semibold mb-1">• Uso Obligatorio del Equipo de Protección Personal (EPP):</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Todos los estudiantes deben usar el equipo de protección adecuado según la actividad que realicen, incluyendo caretas, guantes, gafas de seguridad, botas de seguridad, y ropa adecuada.</li>
                      <li><span className="font-medium">En soldadura:</span> Careta o máscara de soldador, guantes resistentes al calor, ropa de manga larga.</li>
                      <li><span className="font-medium">En pintura:</span> Respiradores adecuados, guantes, gafas de seguridad.</li>
                      <li><span className="font-medium">En construcción y biodigestores:</span> Casco, guantes resistentes, gafas de seguridad y botas con punta de acero.</li>
                    </ul>
                  </section>

                  {/* Resto del reglamento sin cambios... */}
                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">2. Uso de Herramientas y Equipos:</h4>
                    <p className="font-semibold mb-1">• Inspección Previa:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Antes de usar cualquier herramienta o equipo, todos los estudiantes deben inspeccionarlos para asegurarse de que estén en buen estado. Si se detecta algún problema, se debe informar al supervisor o docente.</li>
                    </ul>
                    <p className="font-semibold mb-1">• Uso Adecuado:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Utilizar cada herramienta solo para el propósito que fue diseñada. Por ejemplo, las soldadoras solo deben usarse para soldadura y los equipos para pintura solo deben usarse para pintura.</li>
                    </ul>
                  </section>

                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">3. Seguridad en el Área de Trabajo:</h4>
                    <p className="font-semibold mb-1">• Orden y Limpieza:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Mantener el área de trabajo limpia y ordenada. El desorden puede provocar accidentes. Cada estudiante debe limpiar su espacio al finalizar la actividad.</li>
                      <li>Asegúrese de que los cables de las herramientas estén organizados y no representen un peligro de tropiezos.</li>
                    </ul>
                    <p className="font-semibold mb-1">• Zona de Soldadura y Pintura:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Asegúrese de que las áreas de soldadura o pintura estén bien ventiladas. Evite la presencia de materiales inflamables cerca.</li>
                      <li>Para todo tipo de trabajo de soldadura y corte se requiere ventilación ya sea natural o artificial.</li>
                      <li>1. Las casetas de soldar deben mantenerse con ventilación natural por lo que está prohibido cerrarlos totalmente o almacenar cualquier tipo de objetos que no pertenezcan al área.</li>
                      <li>2. Para trabajos de soldadura dentro de un espacio confinado primeramente se recomienda hacer el trabajo fuera de este.</li>
                      <li>Asegúrese que no haya fuentes de agua cerca del área de soldadura.</li>
                    </ul>
                  </section>

                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">4. Manipulación de Materiales Peligrosos:</h4>
                    <p className="font-semibold mb-1">• Pinturas y Solventes:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Trabaje en áreas bien ventiladas cuando utilice pinturas o productos que liberen vapores.</li>
                      <li>Almacene correctamente los productos químicos y asegúrese de que las etiquetas de seguridad sean visibles.</li>
                    </ul>
                  </section>

                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">5. Prevención de Accidentes:</h4>
                    <p className="font-semibold mb-1">• Emergencias:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>En caso de accidente o quemaduras, informe inmediatamente al supervisor o docente.</li>
                    </ul>
                    <p className="font-semibold mb-1">• Prohibición de Consumo de Alcohol y Drogas:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Está prohibido consumir alcohol y drogas antes o durante las actividades en el taller.</li>
                    </ul>
                  </section>

                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">6. Normas de Conducta:</h4>
                    <p className="font-semibold mb-1">• Responsabilidad y Compromiso:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Los estudiantes deben ser responsables al manejar las herramientas y equipos.</li>
                    </ul>
                  </section>

                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">7. Mantenimiento y Uso Responsable de Herramientas:</h4>
                    <p className="font-semibold mb-1">• Mantenimiento Preventivo:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Los estudiantes deben notificar cualquier fallo o daño en las herramientas y equipos.</li>
                    </ul>
                  </section>

                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">9. Supervisión y Cumplimiento:</h4>
                    <p className="font-semibold mb-1">• Inspección Regular:</p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Los docentes realizarán inspecciones regulares para asegurar el cumplimiento de las normas.</li>
                    </ul>
                  </section>

                  <section className="mb-6">
                    <h4 className="font-bold text-lg mb-2">10. Horario de operación:</h4>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>Respetar el horario establecido por el personal administrativo del área de trabajo.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="font-bold text-lg mb-2">11. Disposición de residuos:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Se debe contar con un contenedor metálico para desperdicios y sobrantes de materiales.</li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
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
  </div>
)}

          <button
            type="submit"
            className={`w-full py-2 rounded flex items-center justify-center transition-colors ${
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
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Procesando...
              </>
            ) : (
              "Enviar"
            )}
          </button>

        </form>
        {/* Popup de Confirmación */}
        {showPopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="bg-white p-6 rounded-lg shadow-lg text-center"
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
      </div>
    </div>
  );
}