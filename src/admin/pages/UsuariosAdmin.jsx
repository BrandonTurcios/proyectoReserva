import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import PropTypes from "prop-types";
import { message } from "antd";
import { supabase } from "../../shared/services/supabaseClient";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiSearch,
  FiX,
} from "react-icons/fi";

const ROLES = ["colaborador", "admin"];

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
  });
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const obtenerClienteAdmin = () => {
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SERVICE_ROLE,
    );
  };

  async function cargarUsuarios() {
    setCargando(true);
    const cliente = obtenerClienteAdmin();

    const [
      { data: authUsers, error: authError },
      { data: perfiles },
    ] = await Promise.all([
      cliente.auth.admin.listUsers(),
      cliente.from("perfiles").select("id, nombre, correo, rol, created_at"),
    ]);

    if (authError) {
      console.error("Error al listar usuarios:", authError);
      message.error("Error al cargar los usuarios.");
      setCargando(false);
      return;
    }

    const mapaPerfiles = new Map((perfiles || []).map((p) => [p.id, p]));

    const combinados = (authUsers?.users || []).map((u) => {
      const perfil = mapaPerfiles.get(u.id) || {};
      return {
        id: u.id,
        nombre: perfil.nombre || u.user_metadata?.nombre || "—",
        correo: u.email || "",
        rol: perfil.rol || "colaborador",
        created_at: perfil.created_at || u.created_at,
      };
    });

    setUsuarios(combinados);
    setCargando(false);
  }

  useEffect(() => {
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crearUsuario = async (e) => {
    e.preventDefault();
    if (guardando) return;

    if (
      !nuevoUsuario.nombre.trim() ||
      !nuevoUsuario.correo.trim() ||
      !nuevoUsuario.contrasena
    ) {
      message.warning("Completa nombre, correo y contraseña.");
      return;
    }

    setGuardando(true);
    const cliente = obtenerClienteAdmin();

    try {
      const { error } = await cliente.auth.admin.createUser({
        email: nuevoUsuario.correo.trim().toLowerCase(),
        password: nuevoUsuario.contrasena,
        email_confirm: true,
        user_metadata: {
          nombre: nuevoUsuario.nombre.trim(),
          rol: "colaborador",
        },
      });

      if (error) throw error;

      // El trigger manejar_nuevo_usuario crea el perfil con rol 'colaborador' y el correo

      message.success("Usuario creado correctamente.");
      setModalNuevo(false);
      setNuevoUsuario({ nombre: "", correo: "", contrasena: "" });
      cargarUsuarios();
    } catch (error) {
      console.error("Error al crear usuario:", error);
      message.error(error.message || "Error al crear el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirEditar = (usuario) => {
    setUsuarioEditar({ ...usuario });
    setModalEditar(true);
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (guardando || !usuarioEditar) return;

    setGuardando(true);
    const cliente = obtenerClienteAdmin();

    try {
      // Actualizar metadata (nombre) en auth
      const { error: authError } = await cliente.auth.admin.updateUserById(
        usuarioEditar.id,
        {
          email: usuarioEditar.correo.trim().toLowerCase(),
          user_metadata: { nombre: usuarioEditar.nombre.trim() },
        },
      );
      if (authError) throw authError;

      // Actualizar nombre y rol en perfiles con el cliente autenticado del admin
      // logueado, para que RLS valide que es admin (política Update_rol_usuarios)
      const { error: perfilError } = await supabase
        .from("perfiles")
        .update({
          nombre: usuarioEditar.nombre.trim(),
          rol: usuarioEditar.rol,
          correo: usuarioEditar.correo.trim().toLowerCase(),
        })
        .eq("id", usuarioEditar.id);
      if (perfilError) throw perfilError;

      message.success("Usuario actualizado correctamente.");
      setModalEditar(false);
      setUsuarioEditar(null);
      cargarUsuarios();
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      message.error(error.message || "Error al actualizar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (guardando || !modalEliminar) return;

    setGuardando(true);
    const cliente = obtenerClienteAdmin();

    try {
      const { error } = await cliente.auth.admin.deleteUser(modalEliminar.id);
      if (error) throw error;

      message.success("Usuario eliminado correctamente.");
      setModalEliminar(null);
      cargarUsuarios();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      message.error(error.message || "Error al eliminar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="py-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
        <button
          type="button"
          onClick={() => setModalNuevo(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f49b6] px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#06065c]"
        >
          <FiPlus size={18} />
          Agregar colaborador
        </button>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        {cargando ? (
          <div className="flex justify-center py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Correo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <FiUser className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {usuario.nombre}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {usuario.correo}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          usuario.rol === "admin"
                            ? "bg-red-100 text-red-700"
                            : usuario.rol === "colaborador"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {usuario.created_at
                        ? new Date(usuario.created_at).toLocaleDateString(
                            "es-ES",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(usuario)}
                          className="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600"
                          aria-label="Editar usuario"
                          title="Editar"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalEliminar(usuario)}
                          className="rounded-lg bg-red-500 p-2 text-white transition-colors hover:bg-red-600"
                          aria-label="Eliminar usuario"
                          title="Eliminar"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear usuario */}
      {modalNuevo && (
        <ModalBase
          titulo="Crear usuario"
          onCerrar={() => !guardando && setModalNuevo(false)}
        >
          <form onSubmit={crearUsuario} className="space-y-4">
            <Campo
              label="Nombre"
              valor={nuevoUsuario.nombre}
              onChange={(v) => setNuevoUsuario({ ...nuevoUsuario, nombre: v })}
              placeholder="Nombre completo"
              disabled={guardando}
            />
            <Campo
              label="Correo"
              tipo="email"
              valor={nuevoUsuario.correo}
              onChange={(v) => setNuevoUsuario({ ...nuevoUsuario, correo: v })}
              placeholder="usuario@unitec.edu"
              disabled={guardando}
            />
            <Campo
              label="Contraseña"
              tipo="password"
              valor={nuevoUsuario.contrasena}
              onChange={(v) =>
                setNuevoUsuario({ ...nuevoUsuario, contrasena: v })
              }
              placeholder="Contraseña temporal"
              disabled={guardando}
            />
            <BotonesModal
              onCancelar={() => !guardando && setModalNuevo(false)}
              guardando={guardando}
              texto="Crear usuario"
              textoGuardando="Creando..."
            />
          </form>
        </ModalBase>
      )}

      {/* Modal editar usuario */}
      {modalEditar && usuarioEditar && (
        <ModalBase
          titulo="Editar usuario"
          onCerrar={() => !guardando && setModalEditar(false)}
        >
          <form onSubmit={guardarEdicion} className="space-y-4">
            <Campo
              label="Nombre"
              valor={usuarioEditar.nombre}
              onChange={(v) => setUsuarioEditar({ ...usuarioEditar, nombre: v })}
              disabled={guardando}
            />
            <Campo
              label="Correo"
              tipo="email"
              valor={usuarioEditar.correo}
              onChange={(v) => setUsuarioEditar({ ...usuarioEditar, correo: v })}
              disabled={guardando}
            />
            <CampoRol
              valor={usuarioEditar.rol}
              onChange={(v) => setUsuarioEditar({ ...usuarioEditar, rol: v })}
              disabled={guardando}
            />
            <BotonesModal
              onCancelar={() => !guardando && setModalEditar(false)}
              guardando={guardando}
              texto="Guardar cambios"
              textoGuardando="Guardando..."
            />
          </form>
        </ModalBase>
      )}

      {/* Modal eliminar usuario */}
      {modalEliminar && (
        <ModalBase
          titulo="Eliminar usuario"
          onCerrar={() => !guardando && setModalEliminar(null)}
        >
          <p className="text-sm text-gray-600">
            ¿Estás seguro de que deseas eliminar a{" "}
            <strong>{modalEliminar.nombre}</strong> ({modalEliminar.correo})?
            Esta acción no se puede deshacer.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => !guardando && setModalEliminar(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarEliminar}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={guardando}
            >
              {guardando ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </ModalBase>
      )}
    </div>
  );
}

function ModalBase({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar modal"
          >
            <FiX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, tipo = "text", valor, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>
  );
}

function CampoRol({ valor, onChange, disabled }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Rol
      </label>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        {ROLES.map((rol) => (
          <option key={rol} value={rol} className="capitalize">
            {rol}
          </option>
        ))}
      </select>
    </div>
  );
}

function BotonesModal({ onCancelar, guardando, texto, textoGuardando }) {
  return (
    <div className="flex justify-end gap-3 border-t pt-4">
      <button
        type="button"
        onClick={onCancelar}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        disabled={guardando}
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={guardando}
      >
        {guardando ? textoGuardando : texto}
      </button>
    </div>
  );
}

ModalBase.propTypes = {
  titulo: PropTypes.string.isRequired,
  onCerrar: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

Campo.propTypes = {
  label: PropTypes.string.isRequired,
  tipo: PropTypes.string,
  valor: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
};

CampoRol.propTypes = {
  valor: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

BotonesModal.propTypes = {
  onCancelar: PropTypes.func.isRequired,
  guardando: PropTypes.bool.isRequired,
  texto: PropTypes.string.isRequired,
  textoGuardando: PropTypes.string.isRequired,
};
