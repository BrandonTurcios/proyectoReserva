import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import fondoImg from "../../assets/fondo2.webp";
import { supabase } from "../services/supabaseClient";

export default function Login({ setCorreo }) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const navigate = useNavigate();

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

      setLoginPassword("");
      navigate("/admin");
    } catch (error) {
      setAlertMessage(error.message || "Error al iniciar sesión.");
      await supabase.auth.signOut();
    } finally {
      setLoginLoading(false);
    }
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
        </form>
        {alertMessage && (
          <p className="mt-4 text-center text-sm text-red-600">{alertMessage}</p>
        )}
        <Link
          to="/inicio"
          className="mt-4 block w-full text-center text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors"
        >
          ← Volver a la vista de usuario
        </Link>
      </div>
    </div>
  );
}

Login.propTypes = {
  setCorreo: PropTypes.func.isRequired,
};
