import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import logo from "../pages/UT2.png";

export default function Layout({ correo, setCorreo }) {
  const navigate = useNavigate();
  const location = useLocation(); // Obtener la ubicación actual

  useEffect(() => {
    // Verificar si el correo ya está en localStorage
    const email = localStorage.getItem("email");
    if (email) {
      setCorreo(email); // Mantener el correo en el estado global
    } else {
      navigate("/inicio"); // Redirigir si no hay correo almacenado
    }
  }, [setCorreo, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("email"); // Eliminar el correo del localStorage
    setCorreo(""); // Limpiar el estado global
    navigate("/inicio"); // Redirigir al inicio
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#0f49b6] text-white p-3 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Logo que redirige a Home */}
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Logo"
              className="h-9 w-15" // Ajusta el tamaño del logo
            />
            <span className="text-xl font-bold"></span>
          </Link>
          <div className="flex items-center">
            <span className="mr-4 text-lg">{correo}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 px-4 py-2 rounded-lg text-white hover:bg-red-700 transition-all duration-300"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-0"> {/* Eliminar padding para que el fondo ocupe todo */}
        <Outlet /> {/* Aquí se renderizan las subrutas */}
      </main>

      {/* Footer navigation */}
      <footer className="bg-[#06065c] text-white flex justify-around items-center p-4 shadow-lg">
        <Link 
          to="/crear-reserva" 
          className={`flex flex-col items-center text-center p-2 rounded-lg ${location.pathname === "/crear-reserva" ? "bg-[#0f49b6]" : ""}`} // Azul del header
        >
          <span className={`text-3xl mb-1 ${location.pathname === "/crear-reserva" ? "text-white" : "text-white"}`}>➕</span>
          <span className={`text-sm ${location.pathname === "/crear-reserva" ? "text-white" : "text-white"}`}>Crear Reserva</span>
        </Link>
        
        <div className="border-l border-gray-300 mx-2 h-8"></div> {/* Separador */}

        <Link 
          to="/mis-reservas" 
          className={`flex flex-col items-center text-center p-2 rounded-lg ${location.pathname === "/mis-reservas" ? "bg-[#0f49b6]" : ""}`} // Azul del header
        >
          <span className={`text-3xl mb-1 ${location.pathname === "/mis-reservas" ? "text-white" : "text-white"}`}>📝</span>
          <span className={`text-sm ${location.pathname === "/mis-reservas" ? "text-white" : "text-white"}`}>Mis Reservas</span>
        </Link>
        
        <div className="border-l border-gray-300 mx-2 h-8"></div> {/* Separador */}

        <Link 
          to="/calendario" 
          className={`flex flex-col items-center text-center p-2 rounded-lg ${location.pathname === "/calendario" ? "bg-[#0f49b6]" : ""}`} // Azul del header
        >
          <span className={`text-3xl mb-1 ${location.pathname === "/calendario" ? "text-white" : "text-white"}`}>📆</span>
          <span className={`text-sm ${location.pathname === "/calendario" ? "text-white" : "text-white"}`}>Calendario</span>
        </Link>
        
        <div className="border-l border-gray-300 mx-2 h-8"></div> {/* Separador */}

        <Link 
          to="/incidente" 
          className={`flex flex-col items-center text-center p-2 rounded-lg ${location.pathname === "/incidente" ? "bg-[#0f49b6]" : ""}`} // Azul del header
        >
          <span className={`text-3xl mb-1 ${location.pathname === "/incidente" ? "text-white" : "text-white"}`}>⚠️</span>
          <span className={`text-sm ${location.pathname === "/incidente" ? "text-white" : "text-white"}`}>Incidente</span>
        </Link>
      </footer>
    </div>
  );
}
