import GraficaReservas from "../components/GraficaReservas";
import PorcentajeUso from "../components/PorcentajeUso";

export default function EstadisticasAdmin() {
  return (
    <div className="space-y-6 py-4">
      <h1 className="text-2xl font-bold text-gray-800">Estadísticas</h1>
      <div className="rounded-lg bg-white p-4 shadow-md md:p-6">
        <GraficaReservas />
      </div>
      <div className="rounded-lg bg-white p-4 shadow-md md:p-6">
        <PorcentajeUso />
      </div>
    </div>
  );
}
