import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import "../index.css"; // Asegúrate de que contiene la clase `clip-custom`


export default function CrearReserva() {
  const [laboratorios, setLaboratorios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [perfil, setPerfil] = useState("");
  const [cantidadUsuarios, setCantidadUsuarios] = useState(1);
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
  const [showPopup, setShowPopup]= useState(false);

  useEffect(() => {
    const emailFromStorage = localStorage.getItem("email");
    if (emailFromStorage) {
      setCorreo(emailFromStorage);
    }
    const fetchData = async () => {
      const { data: laboratoriosData, error: laboratoriosError } = await supabase
        .from("laboratorios")
        .select("id, nombre");

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

  const handleDiasChange = (e) => {
    const { value, checked } = e.target;
    setDiasSeleccionados((prev) =>
      checked ? [...prev, value] : prev.filter((dia) => dia !== value)
    );
  };
  
  const handlePerfilChange = (e) => {
    const selectedPerfil = e.target.value;
    setPerfil(selectedPerfil);

    if (selectedPerfil === "Estudiante") {
      setCantidadUsuarios(0);
    } else {
      setCantidadUsuarios(1);
    }

    setIntegrantes([]);
    setHorariosSeleccionados([]);
  };

  const handleHorarioChange = (e) => {
    const selectedHorario = e.target.value;
    setHorariosSeleccionados((prev) =>
      prev.includes(selectedHorario)
        ? prev.filter((horario) => horario !== selectedHorario)
        : [...prev, selectedHorario]
    );
  };

  const handleCantidadChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setCantidadUsuarios(value);
    setIntegrantes(Array(value).fill({ nombre: "", correo: "" }));
  };

  const handleIntegranteChange = (index, field, value) => {
    const updatedIntegrantes = [...integrantes];
    updatedIntegrantes[index][field] = value;
    setIntegrantes(updatedIntegrantes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const { data: usuarioData, error: usuarioError } = await supabase
      .from("usuarios")
      .insert(
        [
          {
            nombre: nombre,
            numero_cuenta: numeroCuenta,
            correo: correo,
            tipo_usuario: perfil,
          },
        ],
        { returning: "minimal" } // Cambiar a "representation" si necesitas los datos insertados
      )
      .select();
    
    if (usuarioError) {
      console.error("Error al insertar usuario:", usuarioError);
      throw new Error("Error al insertar usuario");
    }
    
    if (!usuarioData || usuarioData.length === 0) {
      throw new Error("No se pudo insertar el usuario o la respuesta está vacía");
    }
    
    const usuarioId = usuarioData[0].id;
    
  
      let fechaActual = new Date(fechaInicio);
      const fechaFinal = new Date(fechaFin);
      const diasReservaciones = [];
  
      while (fechaActual <= fechaFinal) {
        const diaSemana = fechaActual.toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase();
        if (diasSeleccionados.map(d => d.toLowerCase()).includes(diaSemana)) {
          diasReservaciones.push(new Date(fechaActual).toISOString().split("T")[0]);
        }
        
        fechaActual.setDate(fechaActual.getDate() + 1);
      }
  
      for (const fecha of diasReservaciones) {
        const { data: reservacionData, error: reservacionError } = await supabase
  .from("reservaciones")
  .insert({
    motivo_uso: motivoUso,
    cantidad_usuarios: cantidadUsuarios,
    fecha: fecha,
    dias_repeticion: diasSeleccionados.join(", "),
    laboratorio_id: laboratorioId,
  })
  .select();

if (reservacionError) {
  console.error("Error al insertar reserva:", reservacionError);
  return; // Detiene la ejecución si hay un error
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
        for (const integrante of integrantes) {
          const integranteData = await supabase
            .from("usuarios")
            .insert({
              nombre: integrante.nombre,
              correo: integrante.correo,
              tipo_usuario: "Estudiante",
            })
            .select();
  
          if (!integranteData) throw new Error("Error al insertar integrante");
  
          usuariosInsert.push({
            reservacion_id: reservacionId,
            usuario_id: integranteData[0].id,
          });
        }
  
        await supabase.from("reservaciones_usuarios").insert(usuariosInsert);
      }
  
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2000);
  
      setPerfil("");
      setCantidadUsuarios(1);
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
    <div className="absolute top-0 left-0 w-full h-1/2 bg-[#0f49b6] clip-custom z-0"></div>
    <div className="z-10 max-w-lg mx-auto p-4 bg-white shadow-md rounded px-4">
      
      <h2 className="text-3xl font-bold mb-4 text-center">Crear Reserva</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium text-gray-700">Laboratorio Solicitado</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={laboratorioId}
            required
            onChange={(e) => setLaboratorioId(e.target.value)}
          >
            <option value="">Seleccione un laboratorio</option>
            {laboratorios.map((lab) => (
              <option key={lab.id} value={lab.id}>{lab.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium text-gray-700">Motivos de uso</label>
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={motivoUso}
            onChange={(e) => setMotivoUso(e.target.value)}
            required
          ></textarea>
        </div>

        <div>
          <label className="block font-medium text-gray-700">Perfil del solicitante</label>
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
          <label className="block font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={nombre}
            required
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Número de cuenta</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={numeroCuenta}
            required
            onChange={(e) => setNumeroCuenta(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Correo electrónico</label>
          <input
            type="email"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={correo}
            
            readOnly // Hacer el campo de solo lectura
          />
        </div>

        {perfil === "Estudiante" && (
          <div>
            <label className="block font-medium text-gray-700">
              Cantidad de integrantes
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={cantidadUsuarios}
              required
              onChange={handleCantidadChange}
              max={19}
            />
            {integrantes.map((_, index) => (
              <div key={index} className="flex space-x-2 mt-2">
                <input
                  type="text"
                  placeholder={`Nombre del integrante ${index + 1}`}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                  onChange={(e) =>
                    handleIntegranteChange(index, "nombre", e.target.value)
                  }
                />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                  onChange={(e) =>
                    handleIntegranteChange(index, "correo", e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        )}

<div>
  <label className="block font-medium text-gray-700">Días de Repetición</label>
  <div className="flex flex-wrap gap-2">
    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((dia) => (
      <label key={dia} className="flex items-center space-x-2">
        <input
          type="checkbox"
          value={dia}
          checked={diasSeleccionados.includes(dia)}
          onChange={handleDiasChange}
          className="form-checkbox"
        />
        <span>{dia}</span>
      </label>
    ))}
  </div>
</div>

<div>
  <label className="block font-medium text-gray-700">Fecha de Inicio</label>
  <input
    type="date"
    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
    value={fechaInicio}
    onChange={(e) => setFechaInicio(e.target.value)}
    required
  />
</div>

<div>
  <label className="block font-medium text-gray-700">Fecha de Finalización</label>
  <input
    type="date"
    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
    value={fechaFin}
    onChange={(e) => setFechaFin(e.target.value)}
  />
</div>


        <div>
          <label className="block font-medium text-gray-700">Fecha de reservación</label>
          <input
            type="date"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={fechaReservacion}
            onChange={(e) => setFechaReservacion(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Horario</label>
          <select
            multiple
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={horariosSeleccionados}
            onChange={(e) => handleHorarioChange(e)}
          >
            {horarios.map((horario) => (
              <option key={horario.id} value={horario.id}>
                {horario.horario}
              </option>
            ))}
          </select>
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
            <p className="text-gray-600">Tu reserva ha sido realizada con éxito.</p>
          </motion.div>
        </div>
      )}
    </div>
    </div>
  );
}
