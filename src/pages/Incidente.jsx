import { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";

const Incidente = () => {
  const [archivos, setArchivos] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const PWAPPS = import.meta.env.VITE_POWERAPPS_INCIDENTE;
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitle =
    "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3";
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06065c] flex justify-center px-3 py-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 text-blue-600">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.5m0 3h.01M10.3 4.8 2.8 18a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2l-7.5-13.2a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Reportar Incidente
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ayúdanos a mantener los laboratorios seguros y funcionando correctamente.
            </p>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className={sectionTitle}>Información del incidente</h2>
              <div>
                <label htmlFor="laboratorio" className={labelClass}>
                  Laboratorio
                </label>
                <select
                  id="laboratorio"
                  value={laboratorioSeleccionado}
                  onChange={(e) => !isSubmitting && setLaboratorioSeleccionado(e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                  required
                >
                  <option value="">Seleccione un laboratorio</option>
                  {laboratorios.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section>
              <h2 className={sectionTitle}>Descripción</h2>
              <label htmlFor="descripcion" className={labelClass}>
                Descripción del incidente
              </label>
              <textarea
                id="descripcion"
                rows="5"
                value={descripcion}
                onChange={(e) => !isSubmitting && setDescripcion(e.target.value)}
                disabled={isSubmitting}
                className={inputClass}
                placeholder="Describe el incidente con el mayor detalle posible..."
                required
              />
            </section>

            <section>
              <h2 className={sectionTitle}>Evidencia</h2>
              <label htmlFor="imagenes" className={labelClass}>
                Imágenes del incidente
              </label>
              <div className={`relative rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 transition ${isSubmitting ? "opacity-50" : "hover:border-blue-400"}`}>
                <p className="mb-2 text-sm text-gray-600">
                  Adjunta hasta 5 imágenes para ayudarnos a identificar el problema.
                </p>
                <input
                  type="file"
                  id="imagenes"
                  multiple
                  accept="image/*"
                  onChange={manejarCambioArchivos}
                  disabled={isSubmitting}
                  className={`block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 ${isSubmitting ? "cursor-not-allowed" : ""}`}
                  required
                />
                {isSubmitting && (
                  <div className="absolute inset-0 cursor-not-allowed rounded-lg bg-gray-100/50" />
                )}
              </div>
              {archivos.length > 0 && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-sm font-medium text-blue-900">
                    {archivos.length} {archivos.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {Array.from(archivos).map((archivo, index) => (
                      <li key={index} className="truncate">
                        {archivo.name} ({Math.round(archivo.size / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <div>
              <button
                onClick={manejarEnvio}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition-colors ${
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  "Enviar Reporte"
                )}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">* Campos obligatorios</p>
            </div>
          </div>
        </div>
      </div>

      {/* Popup de Confirmación */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75 p-4">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
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
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
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
