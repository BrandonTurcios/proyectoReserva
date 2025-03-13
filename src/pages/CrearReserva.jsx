import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import "../index.css"; 
import Select from "react-select";

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
  const [habilitado,setHabilitado] = useState(false);
  const [esEstudiante, setEsEstudiante] = useState(false);
  const [repetirDias, setRepetirDias] = useState(false);

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
  
    // Contar reservas de alumnos y docentes
    let reservasAlumnos = 0;
    let reservasDocentes = 0;
    let reservasAdministrativo = 0;
  
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
        ? Array(value).fill({ nombre: "", numero_cuenta: ""})
        : []
    );
  };
  const handleIntegranteChange = (index, field, value) => {
    const updatedIntegrantes = [...integrantes];
    updatedIntegrantes[index][field] = value;
    setIntegrantes(updatedIntegrantes);
  };

  const getDiaSemana = (fecha) => fecha.getDay(); // Devuelve el índice del día


  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (perfil === "Estudiante" && horariosSeleccionados.length > 2) {
      setError("Los estudiantes solo pueden seleccionar hasta 2 horarios.");
      return;
    }
  
    try {
      // Declarar diasReservaciones aquí, antes de usarla
      let diasReservaciones = [];
  
      // Obtener las fechas de reservación
      if (esEstudiante || !repetirDias) {
        if (!fechaReservacion) {
          setError("Debes seleccionar una fecha de reservación.");
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
        throw new Error("Error al insertar usuario");
      }
  
      if (!usuarioData || usuarioData.length === 0) {
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
          })
          .select();
  
        if (reservacionError) {
          console.error("Error al insertar reserva:", reservacionError);
          return;
        }
  
        if (!reservacionData || reservacionData.length === 0) {
          console.error("No se pudo insertar la reserva o la respuesta está vacía");
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
              throw new Error("Error al insertar integrante");
            }
  
            if (!integranteData || integranteData.length === 0) {
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
    } catch (error) {
      console.error("Error al crear la reserva:", error);
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
              disabled={!habilitado}
            ></textarea>
          </div>

          <div>
            <label className="block font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={nombre}
              required
              disabled={!habilitado}
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
              disabled={!habilitado}
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
              onChange={(e) =>
                handleIntegranteChange(index, "nombre", e.target.value)
              }
            />
            <input
              type="text"
              placeholder="Número de cuenta"
              className="w-full sm:w-auto flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
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
        disabled={!habilitado}
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
        disabled={!habilitado}
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
        disabled={!habilitado}
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
              
              disabled={!habilitado}
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
                isDisabled={!habilitado}
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

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Enviar
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
