// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import './lib/JinaTheme';
import ProtectedRoute from './components/ProtectedRoute';
import SiteLayout from './components/site/SiteLayout';
import AdminLayout from './components/admin/AdminLayout';
import Home from './pages/Home';
import Cars from './pages/Cars';
import CarDetails from './pages/CarDetails';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCars from './pages/admin/AdminCars';
import AdminMatricules from './pages/admin/AdminMatricules';
import AdminMatriculesClients from './pages/admin/AdminMatriculesClients';
import AdminClients from './pages/admin/AdminClients';
import AdminReservations from './pages/admin/AdminReservations';
import AdminReservationsStatus from './pages/admin/AdminReservationsStatus';
import AdminAccidents from './pages/admin/AdminAccidents';
import AdminPayments from './pages/admin/AdminPayments';
import AdminGarages from './pages/admin/AdminGarages';
import AdminContacts from './pages/admin/AdminContacts';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSousLocations from './pages/admin/AdminSousLocations';
import AdminLavages from './pages/admin/AdminLavages';
import AdminProducts from './pages/admin/AdminProducts';
import SignContract from './pages/SignContract';

const BRAND = 'Jina Business';

// Disable the browser's automatic scroll restoration once,
// so back/forward navigations always start at the top.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Scroll to top on every route change (pathname + search + hash).
// Rendered inside <BrowserRouter> so it can read useLocation().
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search, hash]);

  return null;
};

// Title Updater
const TitleUpdater = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'Location de voiture',
      '/our-cars': 'Our Cars',
      '/about': 'About',
      '/contact': 'Contact',
      '/admin': 'Admin Login',
      '/dashboard': 'Admin Dashboard',
      '/users': 'Users Management',
      '/cars': 'Cars Management',
      '/matricules': 'Matricules Management',
      '/matricules-clients': 'Clients par matricule',
      '/clients': 'Clients Management',
      '/reservations': 'Réservations',
      '/reservations-status': 'Réservations – Statut',
      '/accidents': 'Accidents Management',
      '/payments': 'Payments Management',
      '/garages': 'Garages Management',
      '/contacts': 'Contacts Management',
      '/profile': 'Mon Profil',
      '/sous-locations': 'Sous‑locations',
      '/lavage': 'Lavages',
      '/products': 'Produits',
      '/merci': 'Merci',
    };

    let pageTitle = titles[pathname];
    if (!pageTitle) {
      if (pathname.startsWith('/our-cars/')) pageTitle = 'Our Cars';
      else if (pathname.startsWith('/sign-contract')) pageTitle = 'Signature du contrat';
      else if (pathname.startsWith('/admin')) pageTitle = 'Admin';
    }

    document.title = pageTitle ? `${BRAND} - ${pageTitle}` : BRAND;
  }, [pathname]);

  return null;
};

// Keyboard shortcut: type "jina" anywhere outside a form field to open /admin
const KeyboardShortcut = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let keyBuffer = '';
    const SECRET = 'jina';

    const handleKeyDown = (e) => {
      if (typeof e.key !== 'string' || e.key.length !== 1) return;
      const activeTag = document.activeElement?.tagName.toLowerCase() || '';
      if (['input', 'textarea', 'select'].includes(activeTag)) return;
      if (document.activeElement?.isContentEditable) return;

      keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-SECRET.length);

      if (keyBuffer === SECRET) {
        keyBuffer = '';
        navigate('/admin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null;
};

// "Merci" page shown after a contract signature
const Merci = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
    <div className="j-sheet" style={{ maxWidth: '30rem', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
      <img src="/JinaLogo.png" alt="Jina Business" style={{ height: 64, margin: '0 auto 1.25rem', display: 'block' }} />
      <span className="j-stamp">Signé</span>
      <h1 className="j-disp" style={{ fontSize: '2.2rem', margin: '1.25rem 0 .5rem' }}>Merci</h1>
      <p className="j-muted">Votre signature a été enregistrée avec succès.</p>
      <Link to="/" className="j-btn red" style={{ marginTop: '1.5rem' }}>Retour à l'accueil</Link>
    </div>
  </div>
);

// Main App
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <TitleUpdater />
      <KeyboardShortcut />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="our-cars" element={<Cars />} />
          <Route path="our-cars/:id" element={<CarDetails />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        {/* Admin login */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* Admin protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />

          <Route path="users" element={<ProtectedRoute pageSlug="users"><AdminUsers /></ProtectedRoute>} />
          <Route path="cars" element={<ProtectedRoute pageSlug="cars"><AdminCars /></ProtectedRoute>} />
          <Route path="matricules" element={<ProtectedRoute pageSlug="matricules"><AdminMatricules /></ProtectedRoute>} />
          <Route path="matricules-clients" element={<ProtectedRoute pageSlug="matricules"><AdminMatriculesClients /></ProtectedRoute>} />
          <Route path="clients" element={<ProtectedRoute pageSlug="clients"><AdminClients /></ProtectedRoute>} />
          <Route path="reservations" element={<ProtectedRoute pageSlug="reservations"><AdminReservations /></ProtectedRoute>} />
          <Route path="reservations-status" element={<ProtectedRoute pageSlug="reservations"><AdminReservationsStatus /></ProtectedRoute>} />
          <Route path="accidents" element={<ProtectedRoute pageSlug="accidents"><AdminAccidents /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute pageSlug="payments"><AdminPayments /></ProtectedRoute>} />
          <Route path="garages" element={<ProtectedRoute pageSlug="garages"><AdminGarages /></ProtectedRoute>} />
          <Route path="contacts" element={<ProtectedRoute pageSlug="contacts"><AdminContacts /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
          <Route path="sous-locations" element={<ProtectedRoute pageSlug="sous-locations"><AdminSousLocations /></ProtectedRoute>} />
          <Route path="lavage" element={<ProtectedRoute pageSlug="lavage"><AdminLavages /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute pageSlug="products"><AdminProducts /></ProtectedRoute>} />
        </Route>

        {/* Signature routes */}
        <Route path="/sign-contract/:token" element={<SignContract />} />
        <Route path="/merci" element={<Merci />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;