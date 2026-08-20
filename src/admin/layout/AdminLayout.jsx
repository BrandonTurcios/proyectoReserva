import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../shared/services/supabaseClient";
import {
  FiMenu,
  FiLayout,
  FiCalendar,
  FiBarChart2,
  FiAlertTriangle,
  FiUsers,
  FiUser,
  FiLogOut,
  FiX,
} from "react-icons/fi";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: FiLayout, end: true },
  { to: "/admin/reservas", label: "Reservas", icon: FiCalendar },
  { to: "/admin/estadisticas", label: "Estadísticas", icon: FiBarChart2 },
  { to: "/admin/incidentes", label: "Incidentes", icon: FiAlertTriangle },
  { to: "/admin/usuarios", label: "Usuarios", icon: FiUsers },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [colapsado, setColapsado] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    const cargarPerfil = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfilDb } = await supabase
        .from("perfiles")
        .select("nombre, correo, rol, created_at")
        .eq("id", user.id)
        .single();

      setPerfil({ ...(perfilDb || {}), email: user.email });
    };

    cargarPerfil();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("email");
    navigate("/inicio");
  };

  const estilosEnlace = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-white/15 text-white"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    } ${colapsado ? "justify-center px-0" : ""}`;

  const sidebarContenido = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-5">
        {!colapsado && (
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">
              Panel Admin
            </p>
            <p className="truncate text-xs text-white/60">
              Reservas de Laboratorio
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setColapsado((v) => !v)}
          className="hidden rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:block"
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          <FiMenu size={20} />
        </button>
        <button
          type="button"
          onClick={() => setMenuMovilAbierto(false)}
          className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Cerrar menú"
        >
          <FiX size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={estilosEnlace}
            title={colapsado ? item.label : undefined}
            onClick={() => setMenuMovilAbierto(false)}
          >
            <item.icon size={20} className="shrink-0" />
            {!colapsado && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={() => setPerfilAbierto(true)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white ${
            colapsado ? "justify-center px-0" : ""
          }`}
          title={colapsado ? "Mi perfil" : undefined}
        >
          <FiUser size={20} className="shrink-0" />
          {!colapsado && <span className="truncate">Mi perfil</span>}
        </button>
        <button
          type="button"
          onClick={cerrarSesion}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-100 ${
            colapsado ? "justify-center px-0" : ""
          }`}
          title={colapsado ? "Cerrar sesión" : undefined}
        >
          <FiLogOut size={20} className="shrink-0" />
          {!colapsado && <span className="truncate">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar escritorio */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 self-start overflow-y-auto bg-[#06065c] transition-all duration-300 md:block ${
          colapsado ? "w-16" : "w-64"
        }`}
      >
        {sidebarContenido}
      </aside>

      {/* Drawer móvil */}
      <AnimatePresence>
        {menuMovilAbierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuMovilAbierto(false)}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-[#06065c] md:hidden"
            >
              {sidebarContenido}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Barra superior móvil */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 bg-[#0f49b6] px-3 py-3 text-white md:hidden">
        <button
          type="button"
          onClick={() => setMenuMovilAbierto(true)}
          className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
          aria-label="Abrir menú"
        >
          <FiMenu size={22} />
        </button>
        <span className="text-sm font-semibold">Panel Admin</span>
      </div>

      {/* Contenido */}
      <main className="flex-1 overflow-x-hidden px-4 pb-8 pt-16 md:pt-0">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Modal de perfil */}
      <AnimatePresence>
        {perfilAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPerfilAbierto(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Mi perfil</h2>
                <button
                  type="button"
                  onClick={() => setPerfilAbierto(false)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Cerrar modal de perfil"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Nombre
                  </p>
                  <p className="mt-1 text-gray-800">{perfil?.nombre || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Correo
                  </p>
                  <p className="mt-1 break-words text-gray-800">
                    {perfil?.correo || perfil?.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Rol
                  </p>
                  <p className="mt-1 capitalize text-gray-800">
                    {perfil?.rol || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Miembro desde
                  </p>
                  <p className="mt-1 text-gray-800">
                    {perfil?.created_at
                      ? new Date(perfil.created_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400">
                  Cambio de contraseña disponible próximamente.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
