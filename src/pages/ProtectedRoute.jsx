import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ correo }) {
  const emailADMIN = import.meta.env.VITE_ADMIN;

  return correo === emailADMIN ? <Outlet /> : <Navigate to="/" />;
}
