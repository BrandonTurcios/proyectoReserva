import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState("EN_ESPERA");

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const correo = localStorage.getItem("email");
        if (!correo) {
          console.error("No se encontró el correo en localStorage");
          return;
        }

        const { data, error } = await supabase
          .from("reservaciones_usuarios")
          .select(
            `
              reservaciones (
                id,
                motivo_uso,
                cantidad_usuarios,
                fecha,
                dias_repeticion,
                laboratorios: laboratorio_id (nombre),
                reservaciones_horarios (horarios: horario_id (horario)),
                estado
              ),
              usuarios!inner (correo)
            `
          )
          .eq("usuarios.correo", correo);

        if (error) throw error;

        setReservas(data || []);
      } catch (error) {
        console.error("Error obteniendo las reservas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservas();
  }, []);

  const reservasFiltradas = reservas.filter(
    (reserva) => reserva.reservaciones.estado === estadoFiltro
  );

  return (
    <div className="relative flex flex-col justify-center items-center h-full min-h-screen bg-[#06065c]">
    {/* Capa superior con forma recortada */}
    <div className="absolute top-0 left-0 w-full h-1/2 bg-[#0f49b6] clip-custom z-0"></div>

      <div className="relative max-w-3xl mx-auto p-8 bg-white shadow-2xl rounded-2xl z-10">
        <h2 className="text-3xl font-bold text-[#0f49b6] text-center mb-6">
          Mis Reservas
        </h2>

        {/* Filtro por estado */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-700">
            Filtrar por estado:
          </label>
          <select
            className="mt-2 p-3 border-2 border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#0f49b6]"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="EN_ESPERA">En Espera</option>
            <option value="APROBADA">Aprobada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-600 text-lg">Cargando reservas...</p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto space-y-6"> {/* Ajustamos el alto máximo y agregamos scroll */}
            {reservasFiltradas.length > 0 ? (
              reservasFiltradas.map((reserva) => (
                <div
                  key={reserva.reservaciones.id}
                  className="p-6 bg-gray-100 rounded-xl shadow-md border-l-4 border-[#0f49b6]"
                >
                  <h3 className="text-xl font-semibold text-[#0f49b6] capitalize">
                    Motivo de uso: {reserva.reservaciones.motivo_uso}
                  </h3>
                  <h2
                    className={`text-lg font-semibold ${
                      reserva.reservaciones.estado === "EN_ESPERA"
                        ? "text-yellow-600"
                        : reserva.reservaciones.estado === "APROBADA"
                        ? "text-green-600"
                        : "text-red-600"
                    } capitalize`}
                  >
                    Estado: {reserva.reservaciones.estado}
                  </h2>

                  <p className="text-gray-800 font-medium">
                    Laboratorio:{" "}
                    <span className="font-semibold text-black">
                      {reserva.reservaciones.laboratorios.nombre}
                    </span>
                  </p>

                  <p className="text-gray-800 font-medium">
                    Fecha:{" "}
                    <span className="font-semibold text-black">
                      {reserva.reservaciones.fecha}
                    </span>
                  </p>

                  <p className="text-gray-800 font-medium">Horarios:</p>
                  {reserva.reservaciones.reservaciones_horarios.length > 1 ? (
                    <ul className="list-disc list-inside mt-1 ml-6 text-black">
                      {reserva.reservaciones.reservaciones_horarios.map(
                        (h, index) => (
                          <li key={index} className="font-semibold">
                            {h.horarios.horario}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <span className="ml-2 font-semibold text-black">
                      {reserva.reservaciones.reservaciones_horarios[0]?.horarios
                        .horario}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 text-lg">
                No hay reservas con este estado.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
