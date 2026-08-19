import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function ProtectedRoute() {
  const [estado, setEstado] = useState("cargando");
  const [esAutorizado, setEsAutorizado] = useState(false);

  useEffect(() => {
    const verificarAcceso = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setEstado("listo");
        return;
      }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (
        perfil?.rol === "admin" ||
        perfil?.rol === "colaborador"
      ) {
        setEsAutorizado(true);
      }
      setEstado("listo");
    };

    verificarAcceso();
  }, []);

  if (estado === "cargando") return null;

  if (!esAutorizado) return <Navigate to="/inicio" />;

  return <Outlet />;
}
