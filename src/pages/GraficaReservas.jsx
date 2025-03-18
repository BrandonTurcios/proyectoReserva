import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function GraficaReservas() {
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Array de colores para las barras
  const colores = [
    "#4A90E2", "#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9", "#92A8D1", 
    "#955251", "#B565A7", "#009B77", "#DD4124", "#D65076", "#45B8AC", 
    "#EFC050", "#5B5EA6", "#9B2335", "#DFCFBE", "#55B4B0", "#E15D44", 
    "#7FCDCD", "#BC243C", "#C3447A", "#98B4D4", "#FF6F61", "#6B5B95", 
    "#88B04B", "#F7CAC9", "#92A8D1", "#955251", "#B565A7", "#009B77"
  ];

  useEffect(() => {
    obtenerReservasAprobadas();
  }, []);

  async function obtenerReservasAprobadas() {
    const { data, error } = await supabase
      .from("reservaciones")
      .select("id, estado, laboratorio_id, laboratorios(nombre)")
      .eq("estado", "APROBADA");

    if (error) {
      console.error("Error al obtener reservas aprobadas:", error);
      return;
    }

    const conteo = data.reduce((acc, reserva) => {
      const nombreLab = reserva.laboratorios?.nombre || "Desconocido";
      acc[nombreLab] = (acc[nombreLab] || 0) + 1;
      return acc;
    }, {});

    const datos = Object.keys(conteo).map((lab, index) => ({
      laboratorio: lab,
      reservas: conteo[lab],
      color: colores[index % colores.length], // Asignar un color único a cada barra
    }));

    setDatosGrafica(datos);
  }

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      const elem = document.querySelector(".grafica-container");
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { // Chrome, Safari y Opera
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) { // Chrome, Safari y Opera
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  return (
    <div className={`p-4 bg-white rounded-lg shadow-md grafica-container ${isFullScreen ? "w-screen h-screen fixed top-0 left-0 z-50" : ""}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Reservas Aprobadas por Laboratorio</h2>
        <button
          onClick={toggleFullScreen}
          className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition text-sm"
        >
          {isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={isFullScreen ? "90%" : 600}>
        <BarChart data={datosGrafica} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="laboratorio"
            angle={-45} // Rotar las etiquetas del eje X
            textAnchor="end"
            interval={0} // Mostrar todas las etiquetas
            height={70} // Ajustar la altura del eje X para que quepan las etiquetas rotadas
          />
          <YAxis />
          <Tooltip />
          <Bar
            dataKey="reservas"
            fillOpacity={1}
            shape={(props) => {
              const { x, y, width, height, index } = props;
              const fillColor = datosGrafica[index].color; // Obtener el color correspondiente
              return <rect x={x} y={y} width={width} height={height} fill={fillColor} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}