import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Suspense, lazy } from "react";
import Layout from "./shared/components/Layout";
import ProtectedRoute from "./shared/auth/ProtectedRoute";
import AdminLayout from "./admin/layout/AdminLayout";
import "./index.css";

const CrearReserva = lazy(() => import("./usuarios/pages/CrearReserva"));
const MisReservas = lazy(() => import("./usuarios/pages/MisReservas"));
const Calendario = lazy(() => import("./usuarios/pages/Calendario"));
const Incidente = lazy(() => import("./usuarios/pages/Incidente"));
const Home = lazy(() => import("./usuarios/pages/Home"));
const Inicio = lazy(() => import("./shared/auth/Inicio"));
const Login = lazy(() => import("./shared/auth/Login"));
const DashboardAdmin = lazy(() => import("./admin/pages/DashboardAdmin"));
const ReservasAdmin = lazy(() => import("./admin/pages/ReservasAdmin"));
const EstadisticasAdmin = lazy(() => import("./admin/pages/EstadisticasAdmin"));
const CalendarioAdmin = lazy(() => import("./admin/pages/CalendarioAdmin"));
const IncidentesAdmin = lazy(() => import("./admin/pages/IncidentesAdmin"));
const UsuariosAdmin = lazy(() => import("./admin/pages/UsuariosAdmin"));
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#06065c]">
      <div className="text-white text-xl animate-pulse">Cargando...</div>
    </div>
  );
}

function App() {
  const [correo, setCorreo] = useState(localStorage.getItem("email") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const images = ["/assets/fondo2.webp", "/assets/UT2.png", "/assets/medidas.webp"];

    const preloadImages = images.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(preloadImages).then(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/inicio" element={<Inicio setCorreo={setCorreo} />} />
          <Route path="/login" element={<Login setCorreo={setCorreo} />} />
          <Route path="/" element={<Layout correo={correo} setCorreo={setCorreo} />}>
            <Route index element={<Home />} />
            <Route path="crear-reserva" element={<CrearReserva />} />
            <Route path="mis-reservas" element={<MisReservas />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="incidente" element={<Incidente />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardAdmin />} />
              <Route path="reservas" element={<ReservasAdmin />} />
              <Route path="estadisticas" element={<EstadisticasAdmin />} />
              <Route path="calendario" element={<CalendarioAdmin />} />
              <Route path="incidentes" element={<IncidentesAdmin />} />
              <Route path="usuarios" element={<UsuariosAdmin />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
