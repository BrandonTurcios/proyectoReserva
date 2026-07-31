import medidasImg from "../assets/medidas.webp";

const Home = () => {
  return (
    <div className="relative flex flex-col justify-center items-center h-full min-h-screen bg-[#06065c] p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-[#0f49b6] clip-custom"></div>

      <img
        src={medidasImg}
        alt="Medidas de seguridad"
        className="relative z-10 max-h-[85vh] w-auto max-w-full shadow-lg opacity-90 rounded-3xl"
      />
    </div>
  );
};

export default Home;
