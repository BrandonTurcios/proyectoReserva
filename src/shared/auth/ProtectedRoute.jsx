import { Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";

export default function ProtectedRoute({ correo }) {
    const emailADMIN_1 = import.meta.env.VITE_ADMIN_1; 
    const emailADMIN_2 = import.meta.env.VITE_ADMIN_2;
    const emailADMIN_3 = import.meta.env.VITE_ADMIN_3;

  return correo === emailADMIN_1 || correo === emailADMIN_2 || correo === emailADMIN_3 ? <Outlet /> : <Navigate to="/" />;
}

ProtectedRoute.propTypes = {
  correo: PropTypes.string.isRequired,
};
