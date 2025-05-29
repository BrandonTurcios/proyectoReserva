import React, { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";

const Incidente = () => {
  const [archivos, setArchivos] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const PWAPPS = import.meta.env.VITE_POWERAPPS_INCIDENTE;
  // Obtener email y laboratorios al cargar el componente
  useEffect(() => {
    const email = localStorage.getItem("email");
    if (email) setUserEmail(email);

    const fetchLaboratorios = async () => {
      try {
        const { data, error } = await supabase
          .from("laboratorios")
          .select("id, nombre");
        
        if (error) throw error;
        
        setLaboratorios(data.map(lab => ({
          id: lab.id.toString(),
          nombre: lab.nombre
        })));
      } catch (error) {
        console.error("Error cargando laboratorios:", error);
        alert("Error al cargar la lista de laboratorios");
      }
    };

    fetchLaboratorios();
  }, []);

  const comprimirImagen = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with reduced quality
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            },
            'image/jpeg',
            0.7 // Quality: 0.7 = 70% quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const manejarCambioArchivos = async (e) => {
    if (isSubmitting) return;
    
    if (e.target.files.length > 5) {
      alert("Máximo 5 imágenes permitidas");
      return;
    }

    try {
      const archivosComprimidos = await Promise.all(
        Array.from(e.target.files).map(comprimirImagen)
      );
      setArchivos(archivosComprimidos);
    } catch (error) {
      console.error("Error al comprimir imágenes:", error);
      alert("Error al procesar las imágenes");
    }
  };

  const manejarEnvio = async () => {
    if (isSubmitting) return;
    
    if (!laboratorioSeleccionado) return alert("Selecciona un laboratorio");
    if (!descripcion.trim()) return alert("Escribe una descripción del incidente");
    if (archivos.length === 0) return alert("Selecciona al menos una imagen");

    setIsLoading(true);
    setIsSubmitting(true);

    try {
      const labSeleccionado = laboratorios.find(
        lab => lab.id === laboratorioSeleccionado.toString()
      );

      if (!labSeleccionado) {
        throw new Error("Laboratorio no encontrado");
      }

      const { error: supabaseError } = await supabase
        .from('incidentes')
        .insert({
          laboratorio_id: labSeleccionado.id,
          laboratorio_nombre: labSeleccionado.nombre,
          descripcion: descripcion.trim(),
          usuario_email: userEmail
        });

      if (supabaseError) throw supabaseError;

      const convertirImagen = (archivo) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              nombre: archivo.name,
              tipo: archivo.type,
              contenido: reader.result.split(",")[1]
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(archivo);
        });
      };

      const imagenesPromesas = Array.from(archivos).map(convertirImagen);
      const imagenesBase64 = await Promise.all(imagenesPromesas);

      const datos = {
        laboratorioId: labSeleccionado.id,
        laboratorioNombre: labSeleccionado.nombre,
        descripcion: descripcion.trim(),
        usuarioEmail: userEmail,
        imagenes: imagenesBase64
      };

      const response = await axios.post(PWAPPS, datos);
      const reporteLink = response.data?.link; // Asumiendo que el endpoint devuelve el link en la respuesta

      // Actualizar el incidente con el link del reporte
      if (reporteLink) {
        const { error: updateError } = await supabase
          .from('incidentes')
          .update({ reporte_link: reporteLink })
          .eq('laboratorio_id', labSeleccionado.id)
          .eq('usuario_email', userEmail)
          .order('fecha_hora', { ascending: false })
          .limit(1);

        if (updateError) {
          console.error("Error al actualizar el link del reporte:", updateError);
        }
      }

      setShowSuccessPopup(true);
      setLaboratorioSeleccionado("");
      setDescripcion("");
      setArchivos([]);

      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);

    } catch (error) {
      console.error("Error al enviar el reporte:", error);
      alert(`❌ Error al enviar: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md relative">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Reportar Incidente</h1>
      
      {/* Selector de Laboratorio */}
      <div className="mb-4">
        <label htmlFor="laboratorio" className="block text-sm font-medium text-gray-700 mb-1">
          Laboratorio *
        </label>
        <select
          id="laboratorio"
          value={laboratorioSeleccionado}
          onChange={(e) => !isSubmitting && setLaboratorioSeleccionado(e.target.value)}
          disabled={isSubmitting}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          required
        >
          <option value="">Selecciona un laboratorio</option>
          {laboratorios.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.nombre}
            </option>
          ))}
        </select>
      </div>
      
      {/* Campo de Descripción */}
      <div className="mb-4">
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción del Incidente *
        </label>
        <textarea
          id="descripcion"
          rows="4"
          value={descripcion}
          onChange={(e) => !isSubmitting && setDescripcion(e.target.value)}
          disabled={isSubmitting}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          placeholder="Describe el incidente con detalle..."
          required
        />
      </div>
      
      {/* Selector de Imágenes - Ahora bloqueado durante envío */}
      <div className="mb-6">
        <label htmlFor="imagenes" className="block text-sm font-medium text-gray-700 mb-1">
          Imágenes del Incidente (Máx. 5) *
        </label>
        <div className={`relative ${isSubmitting ? 'opacity-50' : ''}`}>
          <input
            type="file"
            id="imagenes"
            multiple
            accept="image/*"
            onChange={manejarCambioArchivos}
            disabled={isSubmitting}
            className={`block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              ${isSubmitting ? 'cursor-not-allowed' : ''}`}
            required
          />
          {isSubmitting && (
            <div className="absolute inset-0 bg-gray-100 bg-opacity-50 cursor-not-allowed"></div>
          )}
        </div>
        {archivos.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              {archivos.length} {archivos.length === 1 ? 'imagen seleccionada' : 'imágenes seleccionadas'}:
            </p>
            <ul className="mt-1 text-sm text-gray-700">
              {Array.from(archivos).map((archivo, index) => (
                <li key={index} className="truncate">
                  {archivo.name} ({Math.round(archivo.size / 1024)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Botón de Envío con Indicador de Proceso */}
      <button
        onClick={manejarEnvio}
        disabled={isSubmitting}
        className={`w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
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
          </span>
        ) : (
          "Enviar Reporte"
        )}
      </button>

      <p className="mt-3 text-xs text-gray-500">* Campos obligatorios</p>

      {/* Popup de Confirmación */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-500 text-white rounded-full"
            >
              ✓
            </motion.div>
            <h3 className="text-lg font-semibold">Reporte Enviado</h3>
            <p className="text-gray-600 mb-4">
              Tu reporte ha sido enviado exitosamente.
            </p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Aceptar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Incidente;