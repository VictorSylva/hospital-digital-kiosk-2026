import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user } = useAuth();

  // AUTH DISABLED FOR TESTING - ALL ROUTES ALLOWED
  // Bypass all authentication and role checks
  return children;
};

export default ProtectedRoute;
