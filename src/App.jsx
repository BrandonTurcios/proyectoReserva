import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import "./index.css";

// Lazy loading de los componentes
const CrearReserva = lazy(() => import("./pages/CrearReserva"));
const MisReservas = lazy(() => import("./pages/MisReservas"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Incidente = lazy(() => import("./pages/Incidente"));
const Home = lazy(() => import("./pages/Home"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Dashboard = lazy(() => import("./pages/DashboardReservas"));

// Pantalla de carga
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#06065c]">
      <div className="text-white text-xl animate-pulse">Cargando...</div>
    </div>
  );
}

function App() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lista de imágenes en distintos componentes (asegúrate de incluir todas)
    const images = [
      "/pages/fondo2.webp", // Imagen de Inicio.jsx
      "../UT2.png", 
      "/pages/medidas.png"// Imagen de Home.jsx
    ];

    const preloadImages = images.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = resolve; // Evita bloqueos si una imagen falla
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
            <Route path="admin" element={<Dashboard />} />
          </Route>
          
          <Route/>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
