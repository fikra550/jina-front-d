// src/components/ProtectedRoute.jsx
// Single source of truth: App.jsx now imports this file instead of defining its own copy.
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectUser, selectIsAuthenticated } from '../Redux/store';

// Default pages per role (keep in sync with AdminLayout)
export const DEFAULT_PAGES = {
  admin: ['cars', 'matricules', 'clients', 'reservations', 'accidents', 'contacts', 'users', 'garages', 'sous-locations', 'lavage', 'products'],
  employee: ['cars', 'matricules', 'reservations', 'contacts', 'lavage', 'products'],
};

export default function ProtectedRoute({ children, pageSlug }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const myPermissions = useSelector((state) => state.permissions?.myPermissions || []);
  const permissionsLoading = useSelector((state) => state.permissions?.loading);

  // Not logged in -> login page
  if (!isAuthenticated) return <Navigate to="/admin" replace />;

  // Only staff roles may enter the admin area
  if (!user || !['admin', 'employee', 'superadmin'].includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  // Superadmin has access to everything
  if (user.role === 'superadmin') return children;

  // No pageSlug (Dashboard, Profile, layout wrapper): any staff member can enter
  if (!pageSlug) return children;

  // Wait for permissions before deciding
  if (permissionsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
        <p style={{ marginLeft: '1rem' }}>Chargement des permissions...</p>
      </div>
    );
  }

  // Pages every user of this role can open
  if ((DEFAULT_PAGES[user.role] || []).includes(pageSlug)) return children;

  // Explicit permission granted by a superadmin
  const hasPermission =
    Array.isArray(myPermissions) &&
    myPermissions.some((p) => (typeof p === 'object' ? p.page_slug === pageSlug : p === pageSlug));
  if (hasPermission) return children;

  // No permission -> dashboard
  return <Navigate to="/dashboard" replace />;
}