import medidasImg from "./medidas.png";

const Home = () => {
  return (
    <div className="relative flex flex-col justify-center items-center h-full min-h-screen bg-[#06065c]">
      {/* Capa superior con forma recortada */}
      <div className="absolute top-0 left-0 w-full h-1/2 h-full bg-[#0f49b6] clip-custom"></div>

      {/* Imagen centrada correctamente */}
      <img
        src={medidasImg}
        alt="Página de inicio"
        className="relative z-10 max-w-full md:max-w-lg lg:max-w-md shadow-lg opacity-90"
      />
    </div>
  );
};

export default Home;
