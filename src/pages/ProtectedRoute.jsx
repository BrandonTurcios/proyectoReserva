import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ correo }) {
    const emailADMIN_1 = import.meta.env.VITE_ADMIN_1; 
    const emailADMIN_2 = import.meta.env.VITE_ADMIN_2;

  return correo === emailADMIN_1 || correo === emailADMIN_2 ? <Outlet /> : <Navigate to="/" />;
}
