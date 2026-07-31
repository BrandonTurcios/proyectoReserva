import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PropTypes from "prop-types";
import logo from "../assets/UT2.png";

const navItems = [
  { to: "/crear-reserva", icon: "➕", label: "Crear Reserva" },
  { to: "/mis-reservas", icon: "📝", label: "Mis Reservas" },
  { to: "/calendario", icon: "📆", label: "Calendario" },
  { to: "/incidente", icon: "⚠️", label: "Incidente" },
];

export default function Layout({ correo, setCorreo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("email");
    if (email) {
      setCorreo(email);
    } else {
      navigate("/inicio");
    }
  }, [setCorreo, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("email");
    setCorreo("");
    navigate("/inicio");
  };

  const handleNavClick = () => {
    setMenuOpen(false);
  };

  const isActive = (path) =>
    location.pathname === path
      ? "bg-white/20 text-white"
      : "text-white/80 hover:text-white hover:bg-white/10";

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-[#0f49b6] text-white shadow-lg sticky top-0 z-50">
        <div className="relative flex items-center justify-between px-3 py-2">
          <Link to="/" className="flex items-center shrink-0">
            <img src={logo} alt="Logo" className="h-8 sm:h-9 w-auto" />
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${isActive(item.to)}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline text-sm whitespace-nowrap">
              {correo}
            </span>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Menú"
            >
              <svg
                className={`w-6 h-6 transition-transform duration-300 ${menuOpen ? "rotate-90" : "rotate-0"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1.5 rounded-lg text-sm text-white hover:bg-red-700 transition-colors shrink-0"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden overflow-hidden border-t border-white/20 bg-[#0f49b6]"
            >
              <div className="px-3 py-2 space-y-1">
                <div className="text-sm text-white/70 px-3 py-1 truncate">{correo}</div>
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.to)}`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

Layout.propTypes = {
  correo: PropTypes.string.isRequired,
  setCorreo: PropTypes.func.isRequired,
};
