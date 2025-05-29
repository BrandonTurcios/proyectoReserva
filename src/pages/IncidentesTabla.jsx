import React, { useState, useEffect,memo } from 'react';
import { supabase } from '../supabaseClient';
import { FiSearch, FiChevronLeft, FiChevronRight, FiAlertCircle, FiCalendar, FiUser, FiLayers, FiMaximize2 } from 'react-icons/fi';

const IncidentesTabla = memo(() => {
  const [incidentes, setIncidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDescId, setExpandedDescId] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const itemsPerPage = 8;

  // Obtener incidentes de Supabase
  useEffect(() => {
    const fetchIncidentes = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('incidentes')
          .select('*')
          .order('fecha_hora', { ascending: false });

        if (error) throw error;
        setIncidentes(data);
      } catch (error) {
        console.error('Error fetching incidentes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidentes();
  }, []);

  // Filtrar incidentes
  const filteredIncidentes = incidentes.filter(incidente => 
    incidente.laboratorio_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incidente.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incidente.usuario_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginación
  const totalPages = Math.ceil(filteredIncidentes.length / itemsPerPage);
  const currentItems = filteredIncidentes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const optionsDate = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    const optionsTime = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    };
    
    const fecha = date.toLocaleDateString('es-ES', optionsDate);
    const hora = date.toLocaleTimeString('es-ES', optionsTime);
    
    return `${fecha}, ${hora}`;
  };

  // Alternar descripción expandida
  const toggleDescription = (id) => {
    setExpandedDescId(expandedDescId === id ? null : id);
  };

  // Abrir modal con descripción completa
  const openDescriptionModal = (content) => {
    setModalContent(content);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Modal para descripción completa */}
      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Descripción completa</h3>
              <button 
                onClick={() => setModalContent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="whitespace-pre-line text-gray-700">
              {modalContent}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reporte de Incidentes</h1>
          </div>
          
          {/* Buscador */}
          <div className="relative mt-4 md:mt-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar incidentes..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Laboratorio
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha y Hora
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reporte
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((incidente) => (
                        <tr key={incidente.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FiLayers className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{incidente.laboratorio_nombre}</div>
                                <div className="text-sm text-gray-500">ID: {incidente.laboratorio_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start">
                              <FiAlertCircle className="flex-shrink-0 h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div 
                                  className={`text-sm text-gray-900 cursor-pointer ${expandedDescId === incidente.id ? '' : 'line-clamp-2'}`}
                                  onClick={() => toggleDescription(incidente.id)}
                                >
                                  {incidente.descripcion}
                                </div>
                                {incidente.descripcion.length > 150 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDescriptionModal(incidente.descripcion);
                                    }}
                                    className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                  >
                                    <FiMaximize2 className="mr-1" size={12} /> Ver completo
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FiUser className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">{incidente.usuario_email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FiCalendar className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-500">{formatDate(incidente.fecha_hora)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {incidente.reporte_link ? (
                              <a
                                href={incidente.reporte_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                              >
                                <FiMaximize2 className="mr-1" size={12} />
                                Ver Reporte
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">No disponible</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          No se encontraron incidentes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredIncidentes.length)}</span> de{' '}
                        <span className="font-medium">{filteredIncidentes.length}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Anterior</span>
                          <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Siguiente</span>
                          <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default IncidentesTabla;