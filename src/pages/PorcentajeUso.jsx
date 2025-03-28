import React, { useEffect, useState } from 'react';
import ReactSpeedometer from 'react-d3-speedometer';
import { supabase } from '../supabaseClient';

const PorcentajeUso = () => {
  const [laboratorios, setLaboratorios] = useState([]);
  const [selectedLab, setSelectedLab] = useState('');
  const [horasMax, setHorasMax] = useState(15);
  const [rangoFechas, setRangoFechas] = useState({ inicio: '', final: '' });
  const [trimestre, setTrimestre] = useState('');
  const [uso, setUso] = useState({ diario: 0, semanal: 0, trimestral: 0 });
  const [trimestres, setTrimestres] = useState({
    Q1: { inicio: '', final: '' },
    Q2: { inicio: '', final: '' },
    Q3: { inicio: '', final: '' },
    Q4: { inicio: '', final: '' },
  });

  // Cargar trimestres desde la tabla fechas_Q al inicio
  useEffect(() => {
    obtenerTrimestres();
    obtenerLaboratorios();
  }, []);

  // Obtener los trimestres desde Supabase
  async function obtenerTrimestres() {
    const { data, error } = await supabase.from('fechas_Q').select('*');
    if (error) {
      console.error('Error al obtener trimestres:', error);
      return;
    }

    // Convertir los datos de la tabla a un objeto de trimestres
    const nuevosTrimestres = data.reduce((acc, row) => {
      acc[row.id] = { inicio: row.inicio || '', final: row.final || '' };
      return acc;
    }, {});

    // Asegurarse de que todos los trimestres estén definidos
    setTrimestres((prev) => ({
      Q1: { inicio: '', final: '' },
      Q2: { inicio: '', final: '' },
      Q3: { inicio: '', final: '' },
      Q4: { inicio: '', final: '' },
      ...nuevosTrimestres, // Sobrescribir con los datos de Supabase
    }));
  }

  // Guardar un trimestre en la tabla fechas_Q
  async function guardarTrimestre(trimestreKey, inicio, final) {
    // Validar que las fechas no estén vacías
    if (!inicio || !final) {
      console.error(`Las fechas para el trimestre ${trimestreKey} no pueden estar vacías.`);
      return;
    }

    const { error } = await supabase
      .from('fechas_Q')
      .upsert([{ id: trimestreKey, inicio, final }], { onConflict: 'id' });

    if (error) {
      console.error('Error al guardar trimestre:', error);
      return;
    }

    console.log(`Trimestre ${trimestreKey} guardado correctamente.`);
  }

  // Guardar todos los trimestres en la base de datos
  const guardarTrimestresEnDB = async () => {
    let hayErrores = false;

    for (const [key, value] of Object.entries(trimestres)) {
      if (!value.inicio || !value.final) {
        console.error(`Las fechas para el trimestre ${key} no pueden estar vacías.`);
        hayErrores = true;
      } else {
        await guardarTrimestre(key, value.inicio, value.final);
      }
    }

    if (hayErrores) {
      alert('Algunos trimestres no se guardaron porque sus fechas están vacías.');
    } else {
      alert('Trimestres actualizados correctamente.');
    }
  };

  // Actualizar los trimestres en el estado
  const actualizarTrimestre = (trimestreKey, inicio, final) => {
    const nuevosTrimestres = { ...trimestres, [trimestreKey]: { inicio, final } };
    setTrimestres(nuevosTrimestres);
  };

  async function obtenerLaboratorios() {
    const { data, error } = await supabase.from('laboratorios').select('*');
    if (error) {
      console.error('Error al obtener laboratorios:', error);
      return;
    }
    setLaboratorios(data);
  }

  async function calcularUso() {
    if (!selectedLab || (!rangoFechas.inicio && !trimestre)) {
      alert('Selecciona un laboratorio y un rango de fechas o un trimestre');
      return;
    }

    // Si se selecciona un trimestre, usar sus fechas
    const fechas = trimestre ? trimestres[trimestre] : rangoFechas;

    // Validar que las fechas del trimestre estén definidas
    if (trimestre && (!fechas?.inicio || !fechas?.final)) {
      alert(`Por favor, define las fechas para el trimestre ${trimestre}`);
      return;
    }

    console.log('Calculando uso para:', selectedLab, 'Fechas:', fechas);

    // Obtener todas las reservas aprobadas del laboratorio en el rango de fechas
    const { data: reservas, error } = await supabase
      .from('reservaciones_horarios')
      .select('horario_id, reservaciones!inner(id, laboratorio_id, estado, fecha)')
      .eq('reservaciones.laboratorio_id', selectedLab)
      .eq('reservaciones.estado', 'APROBADA')
      .gte('reservaciones.fecha', fechas.inicio)
      .lte('reservaciones.fecha', fechas.final);

    if (error) {
      console.error('Error obteniendo reservas:', error);
      return;
    }

    console.log('Reservas obtenidas:', reservas);

    // Filtrar horarios únicos que tienen al menos una reserva aprobada
    const horariosOcupados = new Set(reservas.map(r => r.horario_id));
    const totalHorariosReservados = horariosOcupados.size;

    // Convertir horarios reservados a horas (1 horario = 1.33 horas)
    const horasReservadas = totalHorariosReservados * 1.33;

    // Calcular porcentajes basados en las horas máximas establecidas por el usuario
    const porcentajeDiario = horasReservadas / horasMax;
    const porcentajeSemanal = horasReservadas / (horasMax * 5.5);
    const porcentajeTrimestral = horasReservadas / (horasMax * 60);

    setUso({
      diario: (porcentajeDiario * 100).toFixed(2),
      semanal: (porcentajeSemanal * 100).toFixed(2),
      trimestral: (porcentajeTrimestral * 100).toFixed(2),
    });

    console.log('Uso actualizado:', {
      diario: (porcentajeDiario * 100).toFixed(2),
      semanal: (porcentajeSemanal * 100).toFixed(2),
      trimestral: (porcentajeTrimestral * 100).toFixed(2),
    });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Porcentaje de Uso por Laboratorio</h2>

      <label className="block mb-2">Selecciona un laboratorio:</label>
      <select
        className="border p-2 mb-4 w-full"
        value={selectedLab}
        onChange={(e) => setSelectedLab(e.target.value)}
      >
        <option value="">Seleccione...</option>
        {laboratorios.map((lab) => (
          <option key={lab.id} value={lab.id}>{lab.nombre}</option>
        ))}
      </select>

      <label className="block mb-2">Horas máximas por día:</label>
      <input
        type="number"
        className="border p-2 mb-4 w-full"
        value={horasMax}
        min="1"
        max="15"
        onChange={(e) => setHorasMax(Number(e.target.value))}
      />

      <label className="block mb-2">Selecciona un trimestre:</label>
      <select
        className="border p-2 mb-4 w-full"
        value={trimestre}
        onChange={(e) => setTrimestre(e.target.value)}
      >
        <option value="">Seleccione...</option>
        <option value="Q1">Q1</option>
        <option value="Q2">Q2</option>
        <option value="Q3">Q3</option>
        <option value="Q4">Q4</option>
      </select>

      {/* Formulario para actualizar los rangos de los trimestres */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Definir Rangos de Trimestres</h3>
        {Object.keys(trimestres).map((key) => (
          <div key={key} className="mb-4">
            <label className="block mb-2">{key}:</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="border p-2 w-full"
                value={trimestres[key].inicio}
                onChange={(e) =>
                  actualizarTrimestre(key, e.target.value, trimestres[key].final)
                }
              />
              <input
                type="date"
                className="border p-2 w-full"
                value={trimestres[key].final}
                onChange={(e) =>
                  actualizarTrimestre(key, trimestres[key].inicio, e.target.value)
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* Botón para guardar los trimestres en la base de datos */}
      <button
        className="bg-green-500 text-white px-4 py-2 rounded mb-4"
        onClick={guardarTrimestresEnDB}
      >
        Actualizar Trimestres
      </button>

      <label className="block mb-2">O selecciona un rango de fechas:</label>
      <div className="flex gap-2 mb-4">
        <input
          type="date"
          className="border p-2 w-full"
          value={rangoFechas.inicio}
          onChange={(e) => setRangoFechas({ ...rangoFechas, inicio: e.target.value })}
        />
        <input
          type="date"
          className="border p-2 w-full"
          value={rangoFechas.final}
          onChange={(e) => setRangoFechas({ ...rangoFechas, final: e.target.value })}
        />
      </div>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={calcularUso}
      >
        Calcular Uso
      </button>

      {uso.diario > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Resultados</h3>
          <p>Diario: {uso.diario}%</p>
          <p>Semanal: {uso.semanal}%</p>
          <p>Trimestral: {uso.trimestral}%</p>
          <ReactSpeedometer
            value={uso.diario}
            maxValue={100}
            needleColor="orange"
            startColor="red"
            endColor="green"
            textColor="#000"
            fontSize={20}
            segments={10}
            textFormatter={(value) => `${Math.round(value)}%`}
          />
        </div>
      )}
    </div>
  );
};

export default PorcentajeUso;