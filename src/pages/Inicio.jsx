import { useState } from "react";
import { useNavigate } from "react-router-dom";
import fondoImg from "./fondo2.webp"; // Asegúrate de cambiar esta ruta por la ruta correcta a tu imagen

export default function Inicio({ setCorreo }) {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@unitec\.edu(\.hn)?$/;
    if (!emailRegex.test(email)) {
      setAlertMessage("Por favor, ingresa un correo institucional válido.");
      setIsOpen(true);
      return;
    }
     
    const emailADMIN_1 = import.meta.env.VITE_ADMIN_1; 
    const emailADMIN_2 = import.meta.env.VITE_ADMIN_2;// Correo del admin desde variables de entorno
    if (email === emailADMIN_1 || email === emailADMIN_2) {
      setShowPasswordField(true); // Mostrar campo de contraseña
      return;
    }

    // Guardar el correo en localStorage
    localStorage.setItem("email", email);
    setCorreo(email);

    // Redirigir al layout principal
    navigate("/");
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD; // Contraseña desde variables de entorno

    if (password === correctPassword) {
      // Guardar el correo en localStorage
      localStorage.setItem("email", email);
      setCorreo(email);

      // Redirigir a una página específica (no a la de inicio)
      navigate("/admin"); // Cambia "/admin" por la ruta que desees
    } else {
      setAlertMessage("Contraseña incorrecta. Inténtalo de nuevo.");
      setIsOpen(true);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setAlertMessage("");
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-[#07065d] px-4"
      style={{ backgroundImage: `url(${fondoImg})` }}
    >
      <h1 className="text-6xl font-extrabold text-white mb-8 text-center shadow-lg leading-tight">
        Reservas de Laboratorio
      </h1>
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
          Bienvenido 👋
        </h2>
        <p className="text-lg text-gray-600 text-center mb-6">
          Por favor, ingresa tu correo electrónico institucional para continuar.
        </p>
        <form
          onSubmit={showPasswordField ? handlePasswordSubmit : handleSubmit}
          className="space-y-4"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            className="w-full p-3 border border-gray-300 text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06065c]"
          />
          {showPasswordField && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full p-3 border border-gray-300 text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06065c]"
            />
          )}
          <button
            type="submit"
            className="w-full bg-[#06065c] text-lg text-white py-3 rounded-lg hover:bg-[#0f49b6] transition-all duration-300"
          >
            {showPasswordField ? "Verificar Contraseña" : "Continuar"}
          </button>
        </form>
      </div>

      {/* Popup Alert */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-bold text-red-600 mb-4">Error</h3>
            <p className="text-gray-800">{alertMessage}</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={closeModal}
                className="bg-[#06065c] text-white px-4 py-2 rounded-lg hover:bg-[#0f49b6] transition-all duration-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}