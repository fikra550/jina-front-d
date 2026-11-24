// src/components/ProtectedRoute.jsx
// Single source of truth: App.jsx now imports this file instead of defining its own copy.
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectUser, selectIsAuthenticated } from '../Redux/store';

// Default pages per role. Single source of truth: AdminLayout imports this too.
// 'lavage', 'laveurs', 'products', 'payments': superadmin only, others need an explicit permission.
export const DEFAULT_PAGES = {
  admin: ['cars', 'matricules', 'clients', 'reservations', 'accidents', 'contacts', 'users', 'garages', 'sous-locations'],
  employee: ['cars', 'matricules', 'reservations', 'contacts'],
};

export default function ProtectedRoute({ children, pageSlug }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const myPermissions = useSelector((state) => state.permissions?.myPermissions || []);
  const loadedFor = useSelector((state) => state.permissions?.loadedFor);

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

  // Wait until THIS user's permissions have been fetched at least once.
  // (Without this, a refresh / direct link to a page granted by permission
  // is redirected to /dashboard before the permissions arrive.)
  const permissionsReady = loadedFor != null && String(loadedFor) === String(user.id);
  if (!permissionsReady && !(DEFAULT_PAGES[user.role] || []).includes(pageSlug)) {
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