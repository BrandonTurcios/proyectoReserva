import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import fondoImg from "../../assets/fondo2.webp";
import { supabase } from "../services/supabaseClient";

export default function Inicio({ setCorreo }) {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@unitec\.edu(\.hn)?$/;
    if (!emailRegex.test(email)) {
      setAlertMessage("Por favor, ingresa un correo institucional válido.");
      setIsOpen(true);
      return;
    }

    // Guardar el correo en localStorage
    localStorage.setItem("email", email);
    setCorreo(email);

    // Redirigir al layout principal
    navigate("/");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (loginLoading) return;

    setLoginLoading(true);
    setAlertMessage("");

    try {
      const { data: sesion, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });

      if (loginError) throw loginError;

      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", sesion.user.id)
        .single();

      if (perfilError) throw perfilError;

      if (perfil.rol !== "admin" && perfil.rol !== "colaborador") {
        throw new Error("Tu cuenta no tiene permisos de administrador.");
      }

      // Guardar el correo para que el layout funcione igual que el flujo normal
      localStorage.setItem("email", loginEmail.trim().toLowerCase());
      setCorreo(loginEmail.trim().toLowerCase());

      setShowLogin(false);
      setLoginPassword("");
      navigate("/admin");
    } catch (error) {
      setAlertMessage(error.message || "Error al iniciar sesión.");
      setIsOpen(true);
      await supabase.auth.signOut();
    } finally {
      setLoginLoading(false);
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
      {/* Botón de inicio de sesión (esquina superior derecha) */}
      <button
        type="button"
        onClick={() => setShowLogin(true)}
        className="absolute top-4 right-4 z-20 bg-white/10 text-white border border-white/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-all duration-300"
      >
        Iniciar sesión
      </button>

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            className="w-full p-3 border border-gray-300 text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06065c]"
          />
          <button
            type="submit"
            className="w-full bg-[#06065c] text-lg text-white py-3 rounded-lg hover:bg-[#0f49b6] transition-all duration-300"
          >
            Continuar
          </button>
        </form>
      </div>

      {/* Modal de inicio de sesión */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75"
            onClick={() => !loginLoading && setShowLogin(false)}
          />
          <div className="relative bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
              Acceso Administrador
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Ingresa tus credenciales para administrar las reservas.
            </p>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06065c]"
                disabled={loginLoading}
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06065c]"
                disabled={loginLoading}
              />
              <button
                type="submit"
                className="w-full bg-[#06065c] text-lg text-white py-3 rounded-lg hover:bg-[#0f49b6] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loginLoading}
              >
                {loginLoading ? "Iniciando..." : "Iniciar sesión"}
              </button>
              <button
                type="button"
                onClick={() => !loginLoading && setShowLogin(false)}
                className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors"
              >
                ← Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Popup Alert */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
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

Inicio.propTypes = {
  setCorreo: PropTypes.func.isRequired,
};
