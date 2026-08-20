import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../shared/services/supabaseClient";
import {
  FiMenu,
  FiLayout,
  FiBook,
  FiCalendar,
  FiBarChart2,
  FiAlertTriangle,
  FiUsers,
  FiLogOut,
  FiX,
} from "react-icons/fi";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: FiLayout, end: true },
  { to: "/admin/reservas", label: "Reservas", icon: FiBook },
  { to: "/admin/calendario", label: "Calendario", icon: FiCalendar },
  { to: "/admin/estadisticas", label: "Estadísticas", icon: FiBarChart2 },
  { to: "/admin/incidentes", label: "Incidentes", icon: FiAlertTriangle },
  { to: "/admin/usuarios", label: "Usuarios", icon: FiUsers },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [colapsado, setColapsado] = useState(true);
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
    navigate("/login");
  };

  const claseTexto = (contraido) =>
    `overflow-hidden whitespace-nowrap transition-[width,opacity] duration-300 ${
      contraido ? "w-0 opacity-0" : "w-auto opacity-100"
    }`;

  const estilosEnlace = (isActive) =>
    `flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-white/15 text-white"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  const sidebarContenido = (contraido) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/UT2.png"
            alt="Logo UT2"
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p
              className={`truncate text-lg font-bold text-white ${claseTexto(
                contraido
              )}`}
            >
              Panel Admin
            </p>
            <p
              className={`truncate text-xs text-white/60 ${claseTexto(
                contraido
              )}`}
            >
              Reservas de Laboratorio
            </p>
          </div>
        </div>
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
            className={({ isActive }) => estilosEnlace(isActive)}
            title={contraido ? item.label : undefined}
            onClick={() => setMenuMovilAbierto(false)}
          >
            <item.icon size={20} className="shrink-0" />
            <span className={`truncate ${claseTexto(contraido)}`}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={() => setPerfilAbierto(true)}
          className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          title={contraido ? perfil?.nombre || perfil?.email || "Mi perfil" : undefined}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
            {perfil?.nombre
              ? perfil.nombre
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()
              : (perfil?.email || "U").slice(0, 2).toUpperCase()}
          </span>
          <span
            className={`flex min-w-0 flex-col items-start text-left ${
              contraido ? "w-0 overflow-hidden" : ""
            }`}
          >
            <span className={`truncate text-sm font-medium text-white ${claseTexto(contraido)}`}>
              {perfil?.nombre || "Mi perfil"}
            </span>
            <span className={`truncate text-xs text-white/60 ${claseTexto(contraido)}`}>
              {perfil?.correo || perfil?.email || ""}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-100"
          title={contraido ? "Cerrar sesión" : undefined}
        >
          <FiLogOut size={20} className="shrink-0" />
          <span className={`truncate ${claseTexto(contraido)}`}>
            Cerrar sesión
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Espaciador que reserva el ancho del sidebar contraído (no cubre contenido) */}
      <div className="hidden w-16 shrink-0 md:block" />

      {/* Sidebar escritorio (overlay que se expande al hover) */}
      <aside
        onMouseEnter={() => setColapsado(false)}
        onMouseLeave={() => setColapsado(true)}
        className={`fixed inset-y-0 left-0 z-40 hidden overflow-y-auto bg-[#06065c] transition-all duration-300 md:block ${
          colapsado ? "w-16" : "w-64"
        }`}
      >
        {sidebarContenido(colapsado)}
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
              {sidebarContenido(false)}
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
