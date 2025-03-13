import React from "react";

export default function Incidente() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06065c] animate-gradient-x">
      <div className="text-center bg-white p-8 rounded-lg shadow-2xl transform transition-all hover:scale-105">
        <div className="flex justify-center">
          <svg
            className="w-20 h-20 text-yellow-500 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            ></path>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mt-4">
          Página en Construcción
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Estamos trabajando duro para traerte algo increíble. ¡Vuelve pronto!
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    </div>
  );
}