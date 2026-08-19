import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Suspense, lazy } from "react";
import Layout from "./shared/components/Layout";
import ProtectedRoute from "./shared/auth/ProtectedRoute";
import "./index.css";

const CrearReserva = lazy(() => import("./usuarios/pages/CrearReserva"));
const MisReservas = lazy(() => import("./usuarios/pages/MisReservas"));
const Calendario = lazy(() => import("./usuarios/pages/Calendario"));
const Incidente = lazy(() => import("./usuarios/pages/Incidente"));
const Home = lazy(() => import("./usuarios/pages/Home"));
const Inicio = lazy(() => import("./shared/auth/Inicio"));
const Dashboard = lazy(() => import("./admin/pages/DashboardReservas"));
const PorcentajeUso = lazy(() => import("./admin/components/PorcentajeUso"));
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
          <Route path="/" element={<Layout correo={correo} setCorreo={setCorreo} />}>
            <Route index element={<Home />} />
            <Route path="crear-reserva" element={<CrearReserva />} />
            <Route path="mis-reservas" element={<MisReservas />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="incidente" element={<Incidente />} />
            <Route path="uso" element={<PorcentajeUso />} />
            <Route element={<ProtectedRoute />}>
              <Route path="admin" element={<Dashboard />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
