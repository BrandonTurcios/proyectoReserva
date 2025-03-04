import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "brandonstm2003@gmail.com", // Cambia esto por tu correo
    pass: "pcqj qywe fxyr ecgb ", // Cambia esto por tu contraseña
  },
});

app.post("/enviar-correo", (req, res) => {
  const { destinatario, asunto, cuerpo } = req.body;

  const mailOptions = {
    from: "brandonstm2003@gmail.com",
    to: destinatario,
    subject: asunto,
    text: cuerpo,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error("Error al enviar el correo:", error);
      res.status(500).send("Error al enviar el correo");
    } else {
      console.log("Correo enviado:", info.response);
      res.status(200).send("Correo enviado correctamente");
    }
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});