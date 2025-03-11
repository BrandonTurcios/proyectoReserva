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

        // Agrupar reservas por motivo y nombre de laboratorio
        const reservasAgrupadas = data.reduce((acc, item) => {
          const reserva = item.reservaciones;
          const clave = `${reserva.motivo_uso}-${reserva.laboratorios.nombre}`;

          if (!acc[clave]) {
            acc[clave] = {
              motivo_uso: reserva.motivo_uso,
              laboratorio: reserva.laboratorios.nombre,
              estado: reserva.estado,
              fechas: [],
              horarios: [],
            };
          }

          // Agregar fechas y horarios únicos
          if (!acc[clave].fechas.includes(reserva.fecha)) {
            acc[clave].fechas.push(reserva.fecha);
          }

          reserva.reservaciones_horarios.forEach((h) => {
            if (!acc[clave].horarios.includes(h.horarios.horario)) {
              acc[clave].horarios.push(h.horarios.horario);
            }
          });

          return acc;
        }, {});

        // Convertir el objeto agrupado en un array
        const reservasMapeadas = Object.values(reservasAgrupadas);

        setReservas(reservasMapeadas);
      } catch (error) {
        console.error("Error obteniendo las reservas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservas();
  }, []);

  const reservasFiltradas = reservas.filter(
    (reserva) => reserva.estado === estadoFiltro
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
          <div className="max-h-[500px] overflow-y-auto space-y-6">
            {reservasFiltradas.length > 0 ? (
              reservasFiltradas.map((reserva, index) => (
                <div
                  key={index}
                  className="p-6 bg-gray-100 rounded-xl shadow-md border-l-4 border-[#0f49b6]"
                >
                  <h3 className="text-xl font-semibold text-[#0f49b6] capitalize">
                    Motivo de uso: {reserva.motivo_uso}
                  </h3>
                  <h2
                    className={`text-lg font-semibold ${
                      reserva.estado === "EN_ESPERA"
                        ? "text-yellow-600"
                        : reserva.estado === "APROBADA"
                        ? "text-green-600"
                        : "text-red-600"
                    } capitalize`}
                  >
                    Estado: {reserva.estado}
                  </h2>

                  <p className="text-gray-800 font-medium">
                    Laboratorio:{" "}
                    <span className="font-semibold text-black">
                      {reserva.laboratorio}
                    </span>
                  </p>

                  <p className="text-gray-800 font-medium">
                    Fechas:{" "}
                    <span className="font-semibold text-black">
                      {reserva.fechas.join(", ")}
                    </span>
                  </p>

                  <p className="text-gray-800 font-medium">Horarios:</p>
                  {reserva.horarios.length > 1 ? (
                    <ul className="list-disc list-inside mt-1 ml-6 text-black">
                      {reserva.horarios.map((horario, index) => (
                        <li key={index} className="font-semibold">
                          {horario}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="ml-2 font-semibold text-black">
                      {reserva.horarios[0]}
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