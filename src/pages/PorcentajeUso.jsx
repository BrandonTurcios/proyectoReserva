import React, { useEffect, useState ,memo} from 'react';
import ReactSpeedometer from 'react-d3-speedometer';
import { supabase } from '../supabaseClient';

const PorcentajeUso = memo(() => {
  const [laboratorios, setLaboratorios] = useState([]);
  const [horasMax, setHorasMax] = useState(15);
  const [rangoFechas, setRangoFechas] = useState({ inicio: '', final: '' });
  const [trimestre, setTrimestre] = useState('');
  const [usoLaboratorios, setUsoLaboratorios] = useState({});
  const [trimestres, setTrimestres] = useState({
    Q1: { inicio: '', final: '' },
    Q2: { inicio: '', final: '' },
    Q3: { inicio: '', final: '' },
    Q4: { inicio: '', final: '' },
  });
  const [cargando, setCargando] = useState(false);

  // Cargar trimestres y laboratorios al inicio
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

    const nuevosTrimestres = data.reduce((acc, row) => {
      acc[row.id] = { inicio: row.inicio || '', final: row.final || '' };
      return acc;
    }, {});

    setTrimestres((prev) => ({
      Q1: { inicio: '', final: '' },
      Q2: { inicio: '', final: '' },
      Q3: { inicio: '', final: '' },
      Q4: { inicio: '', final: '' },
      ...nuevosTrimestres,
    }));
  }

  // Guardar un trimestre en la tabla fechas_Q
  async function guardarTrimestre(trimestreKey, inicio, final) {
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
    
    // Inicializar el estado de uso para cada laboratorio
    const inicialUso = data.reduce((acc, lab) => {
      acc[lab.id] = { diario: 0, semanal: 0, trimestral: 0 };
      return acc;
    }, {});
    setUsoLaboratorios(inicialUso);
  }

  async function calcularUsoParaTodos() {
    if ((!rangoFechas.inicio && !trimestre) || laboratorios.length === 0) {
      alert('Selecciona un rango de fechas o un trimestre');
      return;
    }

    // Si se selecciona un trimestre, usar sus fechas
    const fechas = trimestre ? trimestres[trimestre] : rangoFechas;

    // Validar que las fechas del trimestre estén definidas
    if (trimestre && (!fechas?.inicio || !fechas?.final)) {
      alert(`Por favor, define las fechas para el trimestre ${trimestre}`);
      return;
    }

    setCargando(true);
    console.log('Calculando uso para todos los laboratorios. Fechas:', fechas);

    try {
      // Obtener todas las reservas aprobadas en el rango de fechas para todos los laboratorios
      const { data: reservas, error } = await supabase
        .from('reservaciones_horarios')
        .select('horario_id, reservaciones!inner(id, laboratorio_id, estado, fecha)')
        .eq('reservaciones.estado', 'APROBADA')
        .gte('reservaciones.fecha', fechas.inicio)
        .lte('reservaciones.fecha', fechas.final);

      if (error) throw error;

      console.log('Reservas obtenidas:', reservas.length);

      // Procesar las reservas por laboratorio
      const usoPorLab = {};

      // Inicializar todos los laboratorios
      laboratorios.forEach(lab => {
        usoPorLab[lab.id] = { diario: 0, semanal: 0, trimestral: 0 };
      });

      // Agrupar horarios por laboratorio
      const horariosPorLab = reservas.reduce((acc, r) => {
        const labId = r.reservaciones.laboratorio_id;
        if (!acc[labId]) acc[labId] = new Set();
        acc[labId].add(r.horario_id);
        return acc;
      }, {});

      // Calcular porcentajes para cada laboratorio
      Object.keys(horariosPorLab).forEach(labId => {
        const totalHorariosReservados = horariosPorLab[labId].size;
        const horasReservadas = totalHorariosReservados * 1.33;

        const porcentajeDiario = horasReservadas / horasMax;
        const porcentajeSemanal = horasReservadas / (horasMax * 5.5);
        const porcentajeTrimestral = horasReservadas / (horasMax * 60);

        usoPorLab[labId] = {
          diario: parseFloat((porcentajeDiario * 100).toFixed(2)),
          semanal: parseFloat((porcentajeSemanal * 100).toFixed(2)),
          trimestral: parseFloat((porcentajeTrimestral * 100).toFixed(2))
        };
      });

      setUsoLaboratorios(usoPorLab);
      console.log('Uso actualizado:', usoPorLab);

    } catch (error) {
      console.error('Error calculando uso:', error);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Porcentaje de Uso de Laboratorios</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Configuración</h3>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Horas máximas por día:</label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              value={horasMax}
              min="1"
              max="15"
              onChange={(e) => setHorasMax(Number(e.target.value))}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Selecciona un trimestre:</label>
            <select
              className="border p-2 w-full rounded"
              value={trimestre}
              onChange={(e) => setTrimestre(e.target.value)}
            >
              <option value="">Seleccione...</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">O selecciona un rango de fechas:</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="border p-2 w-full rounded"
                value={rangoFechas.inicio}
                onChange={(e) => setRangoFechas({ ...rangoFechas, inicio: e.target.value })}
              />
              <input
                type="date"
                className="border p-2 w-full rounded"
                value={rangoFechas.final}
                onChange={(e) => setRangoFechas({ ...rangoFechas, final: e.target.value })}
              />
            </div>
          </div>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
            onClick={calcularUsoParaTodos}
            disabled={cargando}
          >
            {cargando ? 'Calculando...' : 'Calcular Uso para Todos'}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Definir Rangos de Trimestres</h3>
          {Object.keys(trimestres).map((key) => (
            <div key={key} className="mb-4">
              <label className="block mb-1 font-medium">{key}:</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="border p-2 w-full rounded"
                  value={trimestres[key].inicio}
                  onChange={(e) =>
                    actualizarTrimestre(key, e.target.value, trimestres[key].final)
                  }
                />
                <input
                  type="date"
                  className="border p-2 w-full rounded"
                  value={trimestres[key].final}
                  onChange={(e) =>
                    actualizarTrimestre(key, trimestres[key].inicio, e.target.value)
                  }
                />
              </div>
            </div>
          ))}
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full mt-2"
            onClick={guardarTrimestresEnDB}
          >
            Actualizar Trimestres
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {laboratorios.map((lab) => (
        <div key={lab.id} className="bg-white p-4 rounded-lg shadow" style={{ minHeight: '500px' }}>
            <h3 className="text-xl font-bold mb-4 text-center" style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            padding: '0 8px',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color:'blue'
          }}>
            {lab.nombre}
          </h3>
            
          <div className="space-y-8">
            {/* Velocímetro Diario */}
            <div className="text-center">
              <h4 className="text-md font-semibold mb-2">Uso Diario</h4>
              <div className="relative" style={{ height: '160px' ,paddingLeft:'20%'}}>
                <ReactSpeedometer
                  width={220}
                  height={160}
                  value={usoLaboratorios[lab.id]?.diario || 0}
                  maxValue={100}
                  customSegmentStops={[0, 25, 50, 75, 100]}
                  segmentColors={['#FF471A', '#FFB01A', '#FFEA1A', '#A2FF1A', '#1AFF4F']}
                  needleColor="#5A5A5A"
                  needleTransitionDuration={2000}
                  needleTransition="easeElastic"
                  textColor="#000"
                  valueFormat=".0f"
                  currentValueText="Valor: ${value}%"

                />
                
              </div>
            </div>
            
            {/* Velocímetro Semanal */}
            <div className="text-center">
              <h4 className="text-md font-semibold mb-2">Uso Semanal</h4>
              <div className="relative" style={{ height: '160px' ,paddingLeft:'20%'}}>
                <ReactSpeedometer
                  width={220}
                  height={160}
                  value={usoLaboratorios[lab.id]?.semanal || 0}
                  maxValue={100}
                  customSegmentStops={[0, 25, 50, 75, 100]}
                  segmentColors={['#FF471A', '#FFB01A', '#FFEA1A', '#A2FF1A', '#1AFF4F']}
                  needleColor="#5A5A5A"
                  needleTransitionDuration={2000}
                  needleTransition="easeElastic"
                  textColor="#000"
                  valueFormat=".0f"
                  currentValueText="Valor: ${value}%"

                />
                
              </div>
            </div>
            
            {/* Velocímetro Trimestral */}
            <div className="text-center">
              <h4 className="text-md font-semibold mb-2">Uso Trimestral</h4>
              <div className="relative" style={{ height: '160px' ,paddingLeft:'20%'}}>
                <ReactSpeedometer
                  width={220}
                  height={160}
                  value={usoLaboratorios[lab.id]?.trimestral || 0}
                  maxValue={100}
                  customSegmentStops={[0, 25, 50, 75, 100]}
                  segmentColors={['#FF471A', '#FFB01A', '#FFEA1A', '#A2FF1A', '#1AFF4F']}
                  needleColor="#5A5A5A"
                  needleTransitionDuration={2000}
                  needleTransition="easeElastic"
                  textColor="#000"
                  valueFormat=".0f"
                  currentValueText="Valor: ${value}%"
                />
               
              </div>
            </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default PorcentajeUso;