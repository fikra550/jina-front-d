// src/components/admin/AdminLayout.jsx  (flat white sidebar with navy pill for the active page, shared design layer for cards / lists / forms / modals)
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUtilisateur, selectUser, selectIsAuthenticated, selectReservations } from "../../Redux/store";
import { fetchMyPermissions } from "../../Redux/permissionSlice";
import {
  LayoutDashboard,
  Car,
  Users,
  CalendarCheck,
  CalendarClock,
  AlertTriangle,
  CreditCard,
  LogOut,
  UserCog,
  Gauge,
  Menu,
  X,
  Building2,
  Mail,
  UserCircle,
  Tag,
  Droplet,
  Package,
  ScanLine,
  ExternalLink,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
} from "../../components/ui/sidebar";
import { NavLink } from "../../components/ui/navlink";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import NotificationBell from "../../pages/admin/NotificationBell";

// Default pages per role (no permission check required).
// 'lavage' and 'products' are NOT listed: superadmin only, others need an explicit permission.
const DEFAULT_PAGES = {
  admin:    ['cars', 'matricules', 'clients', 'reservations', 'accidents', 'contacts', 'users', 'garages', 'sous-locations'],
  employee: ['cars', 'matricules', 'reservations', 'contacts'],
};

// How the menu is listed: one section per business
const NAV_GROUPS = [
  { label: null, paths: ["/dashboard"] },
  {
    label: "Jina Business",
    paths: ["/reservations", "/reservations-status", "/cars", "/matricules", "/sous-locations",
            "/clients", "/matricules-clients", "/contacts", "/garages", "/accidents", "/payments"],
  },
  { label: "Jina Auto Service", paths: ["/lavage", "/products"] },
  { label: "Compte", paths: ["/profile", "/users"] },
];

const layoutCss = `
  :root { --sidebar-width: 16.5rem; }

  .sidebar-content-scroll { margin-right: 0 !important; }
  .sb-stripe { display: none; }

  /* ---------- desktop sidebar: flat white panel, big rounded active pill ---------- */
  .sidebar-desktop {
    position: fixed !important; top: 0 !important; left: 0 !important; bottom: 0 !important; z-index: 50 !important; height: 100vh !important; max-height: 100vh !important;
    display: none; width: var(--sidebar-width) !important; flex-direction: column;
    background: #ffffff !important; border: 0 !important; border-right: 1px solid #e8edf4 !important;
    border-radius: 0 !important; box-shadow: none !important; overflow: hidden !important;
  }
  @media (min-width: 768px) { .sidebar-desktop { display: flex !important; } }
  .sidebar-desktop .sidebar-content::before,
  .sidebar-desktop .sidebar-content::after,
  .sidebar-desktop .sidebar-header::before,
  .sidebar-desktop .sidebar-header::after,
  .sidebar-desktop .sidebar-footer::before,
  .sidebar-desktop .sidebar-footer::after { display: none !important; }

  /* force every inner container of the sidebar component to be plain white / flush (the component ships its own dark styles) */
  .sidebar-desktop, .sidebar-desktop .sidebar-content, .sidebar-desktop .sidebar-header, .sidebar-desktop .sidebar-footer, .sidebar-desktop .sidebar-content-scroll {
    background: #ffffff !important; background-image: none !important; box-shadow: none !important; backdrop-filter: none !important;
  }
  .sidebar-desktop .sidebar-content { display: flex !important; flex-direction: column !important; height: 100% !important; width: 100% !important; }
  .sidebar-desktop .sidebar-header, .sidebar-desktop .sidebar-footer { padding: 0 !important; gap: 0 !important; border: 0 !important; flex-shrink: 0; }
  .sidebar-desktop .sidebar-content-scroll { padding: 0 !important; margin: 0 !important; flex: 1 1 auto !important; min-height: 0; overflow-y: auto !important; display: flex; flex-direction: column; }
  .sidebar-desktop .sidebar-content-scroll::-webkit-scrollbar { width: 6px; }
  .sidebar-desktop .sidebar-content-scroll::-webkit-scrollbar-track { background: transparent !important; }
  .sidebar-desktop .sidebar-content-scroll::-webkit-scrollbar-thumb { background: #d5dbe5 !important; border-radius: 6px; }
  .sidebar-desktop .sidebar-content-scroll::-webkit-scrollbar-thumb:hover { background: #b6c0cf !important; }
  .sidebar-desktop .sidebar-menu, .sidebar-desktop .sidebar-menu-item, .sidebar-desktop ul, .sidebar-desktop li { background: transparent !important; }
  .sidebar-desktop .sb-nav { flex: none; overflow: visible; }

  .sb-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; padding: 1rem 1.1rem; border-bottom: 1px solid #e8edf4; background: #fff; }
  .sb-logo { display: inline-flex; background: #1a1a2e; border-radius: 14px; padding: .35rem .75rem; box-shadow: 0 0 0 1px rgba(234,179,8,.45); }
  .sb-logo-text { color: #ffffff; font-weight: 800; font-size: 1.05rem; letter-spacing: -.01em; line-height: 1.2; white-space: nowrap; padding: .2rem .15rem; }
  .sb-logo-text b { color: #eab308; font-weight: 800; }

  /* flat menu */
  .sb-nav { padding: .9rem .8rem 1rem; }
  .sb-nav ul, .sb-nav li { list-style: none; margin: 0; padding: 0; }
  .sb-nav li + li { margin-top: .2rem; }

  .sidebar-menu-button {
    position: relative; display: flex !important; align-items: center; gap: .95rem;
    height: 2.9rem; padding: 0 1.1rem !important; border-radius: 999px !important;
    color: #64748b !important; font-size: .93rem; font-weight: 500; letter-spacing: -.005em;
    text-decoration: none; transition: background .18s, color .18s, box-shadow .18s;
  }
  .sidebar-menu-button:hover { background: #f4f6fa !important; color: #1a1a2e !important; transform: none !important; padding-left: 1.1rem !important; }
  .sidebar-menu-button.active {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important; color: #ffffff !important; font-weight: 700;
    box-shadow: 0 14px 24px -12px rgba(26,26,46,.65);
  }
  .sidebar-menu-button.active::before { display: none !important; }
  .sidebar-menu-button .sidebar-menu-icon { color: #94a3b8 !important; transition: color .18s; stroke-width: 1.75; }
  .sidebar-menu-button:hover .sidebar-menu-icon { color: #1a1a2e !important; }
  .sidebar-menu-button.active .sidebar-menu-icon { color: #eab308 !important; }
  .sidebar-menu-icon { width: 1.2rem !important; height: 1.2rem !important; }
  .sidebar-menu-button .flex-1 { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* section labels */
  .sb-section + .sb-section { margin-top: .6rem; }
  .sb-section-label { padding: .9rem 1.1rem .45rem; font-size: .68rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8; }
  .sb-section-label.auto { color: #b45309; }

  .sb-foot { padding: .8rem .9rem 1rem; border-top: 1px solid #e8edf4; display: flex; flex-direction: column; gap: .6rem; background: #fff; }
  .sb-user { display: flex; align-items: center; gap: .7rem; padding: .35rem .4rem; }
  .sb-avatar { width: 2.4rem; height: 2.4rem; border-radius: 999px; background: linear-gradient(135deg, #eab308, #f59e0b); color: #1a1a2e; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
  .sb-uname { color: #1a1a2e; font-weight: 700; font-size: .86rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 10rem; }
  .sb-urole { margin-top: .1rem; display: block; font-size: .7rem; font-weight: 500; color: #64748b; }
  .sb-foot-row { display: flex; gap: .5rem; }
  .sb-site { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; gap: .4rem; height: 2.6rem; padding: 0 1rem; border-radius: 999px; background: #f4f6fa; color: #475569; font-size: .8rem; font-weight: 600; text-decoration: none; transition: background .18s, color .18s; }
  .sb-site:hover { background: #e8edf4; color: #1a1a2e; }
  .sidebar-logout-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: .55rem;
    height: 2.6rem; padding: 0 1rem; border-radius: 999px; font-size: .85rem; font-weight: 700;
    background: transparent; border: 1.5px solid #e2e8f0; color: #1a1a2e; cursor: pointer; transition: all .18s;
  }
  .sidebar-logout-btn:hover { background: #1a1a2e; border-color: #1a1a2e; color: #eab308; }

  /* badges */
  .sidebar-badge, .mobile-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 1.3rem; height: 1.3rem; padding: 0 .38rem; border-radius: 999px;
    font-size: .65rem; font-weight: 800; color: #1a1a2e; background: #eab308;
    flex-shrink: 0; cursor: pointer; transition: transform .2s;
  }
  .sidebar-badge.critical, .mobile-badge.critical { background: #ef4444; color: #fff; }
  .sidebar-badge:hover { transform: scale(1.12); }
  .reservation-badges { display: flex; align-items: center; gap: .25rem; margin-left: auto; }

  /* ---------- main area ---------- */
  @media (min-width: 768px) {
    .sidebar-main { margin-left: var(--sidebar-width); margin-right: auto; width: auto; max-width: calc(100% - var(--sidebar-width)); }
    .admin-main-content { max-width: 1320px; margin-left: auto; margin-right: auto; width: 100%; }
  }
  .admin-main-content ::selection { background: rgba(234,179,8,.3); }
  .admin-container { max-width: 1320px; margin-left: auto; margin-right: auto; width: 100%; }
  @media (max-width: 767px) { .admin-main-content { padding-top: 4.25rem; } }

  /* ---------- mobile ---------- */
  .mobile-menu-btn {
    position: fixed; top: 1rem; left: 1rem; z-index: 1001; display: flex; align-items: center; gap: .5rem;
    padding: .55rem 1.1rem; background: #1a1a2e; border: 1px solid rgba(234,179,8,.4); border-radius: 999px;
    color: #eab308; cursor: pointer; box-shadow: 0 10px 24px -10px rgba(0,0,0,.5); font-weight: 700; font-size: .85rem;
  }
  @media (min-width: 768px) { .mobile-menu-btn { display: none; } }
  .mobile-overlay { position: fixed; inset: 0; background: rgba(2,6,23,.55); backdrop-filter: blur(4px); z-index: 1000; animation: jFade .25s ease; }
  @keyframes jFade { from { opacity: 0; } to { opacity: 1; } }
  .mobile-sidebar-panel {
    position: fixed; top: 0; left: 0; bottom: 0; width: 86%; max-width: 320px; z-index: 1001;
    background: #fff; display: flex; flex-direction: column; overflow-y: auto;
    transform: translateX(-100%); transition: transform .3s ease; border-radius: 0 1.5rem 1.5rem 0;
    box-shadow: 14px 0 40px -14px rgba(0,0,0,.35);
  }
  .mobile-sidebar-panel.open { transform: translateX(0); }
  .mobile-sidebar-header { position: relative; padding: 1rem 1.1rem; border-bottom: 1px solid #e8edf4; display: flex; align-items: center; gap: .75rem; }
  .mobile-close-btn { position: absolute; right: .9rem; top: 50%; transform: translateY(-50%); background: #f4f6fa; border: 0; border-radius: 999px; padding: .45rem; cursor: pointer; color: #475569; display: flex; transition: background .18s; }
  .mobile-close-btn:hover { background: #e8edf4; }
  .mobile-nav { flex: 1; padding: .9rem .8rem 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: .2rem; }
  .mobile-nav-item { display: flex; align-items: center; justify-content: space-between; gap: .75rem; height: 2.85rem; padding: 0 1.1rem; border-radius: 999px; font-size: .93rem; font-weight: 500; color: #64748b; text-decoration: none; transition: background .18s, color .18s; }
  .mobile-nav-item:hover { background: #f4f6fa; color: #1a1a2e; }
  .mobile-nav-item.active { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; font-weight: 700; box-shadow: 0 14px 24px -12px rgba(26,26,46,.65); }
  .mobile-nav-item.active svg { color: #eab308; }
  .mobile-nav-left { display: flex; align-items: center; gap: .9rem; }
  .mobile-user-section { padding: .85rem; border-top: 1px solid #e8edf4; }
  .mobile-user-info { padding: .65rem .85rem; margin-bottom: .7rem; background: #f6f8fb; border-radius: 1rem; }
  .mobile-user-name { font-size: .875rem; color: #1a1a2e; font-weight: 700; }
  .mobile-user-role { font-size: .7rem; color: #64748b; font-weight: 500; margin-top: .15rem; }
  .mobile-user-email { font-size: .68rem; color: #94a3b8; margin-top: .25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mobile-logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: .6rem; height: 2.7rem; border-radius: 999px; font-size: .88rem; font-weight: 700; background: #1a1a2e; border: 0; color: #eab308; cursor: pointer; }

  /* scrollbars */
  .sb-nav::-webkit-scrollbar, .mobile-nav::-webkit-scrollbar { width: 4px; }
  .sb-nav::-webkit-scrollbar-track, .mobile-nav::-webkit-scrollbar-track { background: transparent; }
  .sb-nav::-webkit-scrollbar-thumb, .mobile-nav::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .sb-nav::-webkit-scrollbar-thumb:hover, .mobile-nav::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  /* notification filter banner */
  .notification-filter-banner { display: flex; justify-content: space-between; align-items: center; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 1rem; padding: .55rem 1.1rem; margin-bottom: 1rem; font-size: .875rem; color: #92400e; }
  .clear-filter-btn { display: inline-flex; align-items: center; gap: .25rem; background: transparent; border: 0; color: #dc2626; cursor: pointer; font-weight: 600; }
  .clear-filter-btn:hover { text-decoration: underline; }

  /* =====================================================================
     DESIGN LAYER – new structure for headers, cards, lists, forms, modals.
     Colors of buttons / table cells stay exactly as in the original pages.
     ===================================================================== */
  .admin-shell { background: #f3f5f9; }
  .admin-main-content { --card-shadow: 0 1px 2px rgba(15,23,42,.04), 0 10px 28px -14px rgba(15,23,42,.16); --card-line: #e8edf4; }

  /* ---- page header = hero strip with gold edge ---- */
  .admin-main-content .header {
    position: relative; overflow: hidden; background: #fff; border: 1px solid var(--card-line);
    border-radius: 1.5rem; padding: 1.25rem 1.75rem 1.25rem 2rem; box-shadow: var(--card-shadow); margin-bottom: 1.5rem;
  }
  .admin-main-content .header::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: linear-gradient(180deg, #eab308, #f59e0b); }
  .admin-main-content .header::after { content: ""; position: absolute; right: -60px; top: -60px; width: 190px; height: 190px; border-radius: 50%; background: radial-gradient(circle, rgba(234,179,8,.14), transparent 70%); pointer-events: none; }
  .admin-main-content .header > * { position: relative; z-index: 1; }
  .admin-main-content .title { font-size: 1.7rem; letter-spacing: -.02em; }
  .admin-main-content .subtitle { font-size: .85rem; }

  /* ---- stat cards ---- */
  .admin-main-content .stats-grid { gap: 1.1rem; }
  .admin-main-content .stat-card {
    position: relative; overflow: hidden; background: #fff; border: 1px solid var(--card-line);
    border-radius: 1.4rem; padding: 1.2rem 1.35rem 1.2rem 1.5rem; box-shadow: var(--card-shadow);
  }
  .admin-main-content .stat-card::before { content: ""; position: absolute; left: 0; top: 18%; bottom: 18%; width: 4px; border-radius: 0 4px 4px 0; background: #eab308; }
  .admin-main-content .stat-card:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -16px rgba(15,23,42,.28); }
  .admin-main-content .stat-number, .admin-main-content .stat-value { font-size: 2rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.1; }
  .admin-main-content .stat-label { font-size: .7rem; font-weight: 600; letter-spacing: .08em; margin-top: .2rem; }
  .admin-main-content svg.stat-icon { opacity: 1; box-sizing: content-box; padding: .7rem; border-radius: 1rem; background: #f4f6fa; width: 1.4rem; height: 1.4rem; flex-shrink: 0; }

  /* ---- search / filter bar = floating pill ---- */
  .admin-main-content .search-wrapper { border-radius: 1.4rem; padding: .85rem 1rem; box-shadow: var(--card-shadow); border: 1px solid var(--card-line); }
  .admin-main-content .search-input { border-radius: 999px; background: #f6f8fb; border-color: transparent; padding-top: .6rem; padding-bottom: .6rem; }
  .admin-main-content .search-input:focus { background: #fff; }
  .admin-main-content select.search-input, .admin-main-content .filter-select { border-radius: 999px; }

  /* ---- lists: every table row becomes its own card ---- */
  .admin-main-content .table-info { margin: 0 0 .6rem; }
  .admin-main-content .table-wrapper { background: transparent; border: 0; box-shadow: none; border-radius: 0; overflow-x: auto; padding: 0 2px 4px; }
  .admin-main-content .table { border-collapse: separate; border-spacing: 0 .55rem; }
  .admin-main-content .table th { background: transparent; border: 0; text-transform: uppercase; font-size: .66rem; letter-spacing: .09em; padding: .2rem 1rem; font-weight: 700; white-space: nowrap; }
  .admin-main-content .table tbody tr { background: #fff; transition: transform .16s ease, box-shadow .16s ease; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
  .admin-main-content .table tbody tr:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 14px 28px -16px rgba(15,23,42,.3); }
  .admin-main-content .table td { padding: .95rem 1rem; border-top: 1px solid #eef2f7; border-bottom: 1px solid #eef2f7; vertical-align: middle; }
  .admin-main-content .table td:first-child { border-left: 1px solid #eef2f7; border-radius: 1rem 0 0 1rem; box-shadow: inset 3px 0 0 #eab308; padding-left: 1.2rem; }
  .admin-main-content .table td:last-child { border-right: 1px solid #eef2f7; border-radius: 0 1rem 1rem 0; }
  .admin-main-content .table tr:last-child td { border-bottom: 1px solid #eef2f7; }
  .admin-main-content .table td[colspan] { box-shadow: none; border-radius: 1rem; }
  .admin-main-content .badge { padding: .3rem .75rem; letter-spacing: .01em; }
  .admin-main-content .action-btn { border-radius: .75rem; }
  .admin-main-content .pagination { border-top: 0; justify-content: center; gap: .4rem; padding: .75rem 0 .25rem; }
  .admin-main-content .page-btn { border-radius: .8rem; min-width: 2.25rem; }

  /* ---- add / edit forms (inline pages) ---- */
  .admin-main-content .inline-form-container { margin: 0 0 1.5rem; border-radius: 1.75rem; border: 1px solid var(--card-line); box-shadow: 0 24px 60px -28px rgba(15,23,42,.38); }
  .admin-main-content .inline-form-header { padding: 1.4rem 2rem; }
  .admin-main-content .inline-form-icon { border-radius: 1.1rem; }
  .admin-main-content .inline-form { padding: 1.75rem 2rem 0; background: #f7f9fc; }
  .admin-main-content .inline-section { background: #fff; border: 1px solid var(--card-line); border-radius: 1.4rem; box-shadow: var(--card-shadow); padding: 1.3rem 1.4rem; }
  .admin-main-content .inline-section-header { border-bottom: 1px solid #eef2f7; position: relative; padding-bottom: .85rem; }
  .admin-main-content .inline-section-header::after { content: ""; position: absolute; left: 0; bottom: -1px; width: 42px; height: 3px; border-radius: 3px; background: #eab308; }
  .admin-main-content .inline-input, .admin-main-content .inline-select, .admin-main-content .inline-textarea { background: #f6f8fb; border-color: #e6ebf2; border-radius: .85rem; }
  .admin-main-content .inline-input:focus, .admin-main-content .inline-select:focus, .admin-main-content .inline-textarea:focus { background: #fff; }
  .admin-main-content .inline-field label { letter-spacing: .06em; }
  .admin-main-content .inline-form-footer { position: sticky; bottom: 0; z-index: 3; margin: 1.5rem -2rem 0; padding: 1rem 2rem; background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border-top: 1px solid var(--card-line); }

  /* ---- modals ---- */
  body .modal-overlay { background: rgba(15,23,42,.55); backdrop-filter: blur(7px); }
  body .modal { border-radius: 1.75rem; border: 1px solid rgba(255,255,255,.5); box-shadow: 0 40px 90px -30px rgba(2,6,23,.6); overflow: hidden; }
  body .modal-header { padding: 1.25rem 1.6rem; }
  body .modal-title { letter-spacing: -.01em; }
  body .modal-close { border-radius: 999px; }
  body .modal-btn { border-radius: 999px; height: 2.8rem; font-weight: 600; }
  body .delete-icon { box-shadow: 0 0 0 9px rgba(239,68,68,.09); }
  body .delete-modal { padding: 1.75rem; }

  /* ---- dark mode keeps rows readable ---- */
  @media (prefers-color-scheme: dark) {
    .admin-shell { background: #0b1220; }
    .admin-main-content .header, .admin-main-content .stat-card, .admin-main-content .search-wrapper, .admin-main-content .inline-section { background: #1e293b; border-color: #334155; }
    .admin-main-content .table tbody tr { background: #1e293b; }
    .admin-main-content .table tbody tr:hover { background: #243247; }
    .admin-main-content .table td { border-color: #334155; }
    .admin-main-content svg.stat-icon { background: #0f172a; }
    .admin-main-content .inline-form { background: #0f172a; }
    .admin-main-content .inline-form-footer { background: rgba(30,41,59,.92); }
    .admin-main-content .search-input, .admin-main-content .inline-input, .admin-main-content .inline-select, .admin-main-content .inline-textarea { background: #0f172a; }
  }
`;

export default function AdminLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const myPermissions = useSelector((state) => state.permissions?.myPermissions || []);
  const reservations = useSelector(selectReservations);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notifications = useSelector((state) => state.notifications?.notifications || {
    matricules: { total: 0, critical: 0 },
    reservations: { total: 0, critical: 0 },
    accidents: { total: 0, critical: 0 },
    payments: { total: 0, critical: 0 },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const contactedCount = reservations.filter(r => r.status === 'contacted').length;
  const lateCount = reservations.filter(r => r.status === 'retard').length;
  const endingSoonCount = reservations.filter(r => {
    if (r.status !== 'confirmed') return false;
    const end = new Date(r.end_date);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;

  const getBadge = (pageSlug) => {
    if (!pageSlug) return null;
    const category = notifications[pageSlug];
    if (!category || category.total === 0) return null;
    return { count: category.total, isCritical: category.critical > 0 };
  };

  // Fetch permissions for both employees AND admins (but not superadmins)
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'superadmin') {
      dispatch(fetchMyPermissions());
      const interval = setInterval(() => {
        dispatch(fetchMyPermissions());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [dispatch, isAuthenticated, user]);

  const handleLogout = async () => {
    await dispatch(logoutUtilisateur());
    toast.success("Déconnecté");
    setIsMobileMenuOpen(false);
    navigate("/admin");
  };

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  // inject layout styles once (updated on hot reload)
  useEffect(() => {
    const styleId = 'admin-layout-overrides';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = layoutCss;
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  const allNavItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", pageSlug: null },
    { path: "/reservations", icon: CalendarCheck, label: "Réservations", pageSlug: "reservations" },
    { path: "/reservations-status", icon: CalendarClock, label: "Réservations (Statut)", pageSlug: "reservations" },
    { path: "/cars", icon: Car, label: "Voitures", pageSlug: "cars" },
    { path: "/matricules", icon: Gauge, label: "Matricules", pageSlug: "matricules" },
    { path: "/sous-locations", icon: Tag, label: "Sous-locations", pageSlug: "sous-locations" },
    { path: "/clients", icon: Users, label: "Clients", pageSlug: "clients" },
    { path: "/matricules-clients", icon: ScanLine, label: "Clients par matricule", pageSlug: "matricules" },
    { path: "/contacts", icon: Mail, label: "Contacts", pageSlug: "contacts" },
    { path: "/lavage", icon: Droplet, label: "Lavages", pageSlug: "lavage" },
    { path: "/garages", icon: Building2, label: "Garages", pageSlug: "garages" },
    { path: "/products", icon: Package, label: "Produits", pageSlug: "products" },
    { path: "/accidents", icon: AlertTriangle, label: "Accidents", pageSlug: "accidents" },
    { path: "/payments", icon: CreditCard, label: "Traites", pageSlug: "payments" },
    { path: "/profile", icon: UserCircle, label: "Mon Profil", pageSlug: null },
  ];

  // Add Users page for admin and superadmin only
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    allNavItems.push({ path: "/users", icon: UserCog, label: "Utilisateurs", pageSlug: "users" });
  }

  // ---- FILTERING LOGIC (unchanged) ----
  const userRole = user?.role;
  const isSuperAdmin = userRole === 'superadmin';

  const navItems = allNavItems.filter(item => {
    const pageSlug = item.pageSlug;

    if (!pageSlug) {
      return ['/dashboard', '/profile'].includes(item.path);
    }

    if (isSuperAdmin) return true;

    if (DEFAULT_PAGES[userRole]?.includes(pageSlug)) {
      return true;
    }

    let hasPerm = false;
    if (Array.isArray(myPermissions)) {
      if (myPermissions.length > 0 && typeof myPermissions[0] === 'object') {
        hasPerm = myPermissions.some(p => p.page_slug === pageSlug);
      } else {
        hasPerm = myPermissions.includes(pageSlug);
      }
    }
    return hasPerm;
  });

  // build the grouped listing from the allowed items
  const groups = NAV_GROUPS
    .map(g => ({
      label: g.label,
      items: g.paths.map(p => navItems.find(i => i.path === p)).filter(Boolean),
    }))
    .filter(g => g.items.length > 0);

  const getUserName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.Fullname) return user.Fullname;
    if (user?.name) return user.name;
    if (user?.prenom && user?.nom) return `${user.prenom} ${user.nom}`;
    return 'Administrateur';
  };

  const getUserRole = () => {
    if (user?.role === 'superadmin') return 'Super Admin';
    if (user?.role === 'admin') return 'Administrateur';
    if (user?.role === 'employee') return 'Employé';
    return user?.role || 'Utilisateur';
  };

  const handleBadgeClick = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({ pathname: path, search: '?filter=notifications' });
  };

  const goFilter = (e, url, closeMobile = false) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(url);
    if (closeMobile) setIsMobileMenuOpen(false);
  };

  // badges shared by desktop + mobile menus
  const renderBadges = (item, mobile = false) => {
    const cls = mobile ? "mobile-badge" : "sidebar-badge";
    const close = mobile;
    const wrap = (children) => <div className="reservation-badges">{children}</div>;

    if (item.path === "/reservations") {
      if (!lateCount && !endingSoonCount) return null;
      return wrap(
        <>
          {lateCount > 0 && (
            <span className={`${cls} critical`} title={`${lateCount} en retard`}
              onClick={(e) => goFilter(e, '/reservations?filter=retard', close)}>{lateCount}</span>
          )}
          {endingSoonCount > 0 && (
            <span className={cls} title={`${endingSoonCount} se terminent bientôt`}
              onClick={(e) => goFilter(e, '/reservations?filter=ending-soon', close)}>{endingSoonCount}</span>
          )}
        </>
      );
    }

    if (item.path === "/reservations-status") {
      if (!pendingCount && !contactedCount) return null;
      return wrap(
        <>
          {pendingCount > 0 && (
            <span className={`${cls} critical`} title={`${pendingCount} en attente`}
              onClick={(e) => goFilter(e, '/reservations-status?filter=pending', close)}>{pendingCount}</span>
          )}
          {contactedCount > 0 && (
            <span className={cls} title={`${contactedCount} contactés`}
              onClick={(e) => goFilter(e, '/reservations-status?filter=contacted', close)}>{contactedCount}</span>
          )}
        </>
      );
    }

    const badge = getBadge(item.pageSlug);
    if (!badge) return null;
    return (
      <span
        className={`${cls} ${badge.isCritical ? 'critical' : ''}`}
        onClick={(e) => {
          handleBadgeClick(e, item.path);
          if (close) setIsMobileMenuOpen(false);
        }}
      >
        {badge.count}
      </span>
    );
  };

  const initial = (getUserName() || 'A').trim().charAt(0).toUpperCase();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full admin-shell">
        {/* ---------- Desktop Sidebar ---------- */}
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarHeader>
            <div className="sb-head">
              <div className="sb-logo">
                <span className="sb-logo-text">Jina <b>Panel</b></span>
              </div>
              <NotificationBell />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <nav className="sb-nav">
              {groups.map((g, gi) => (
                <div className="sb-section" key={g.label || `g${gi}`}>
                  {g.label && (
                    <div className={`sb-section-label ${g.label === "Jina Auto Service" ? "auto" : ""}`}>{g.label}</div>
                  )}
                  <SidebarMenu>
                    {g.items.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === "/dashboard"}
                          className={({ isActive }) =>
                            `sidebar-menu-button ${isActive ? "active" : ""}`
                          }
                        >
                          <item.icon className="sidebar-menu-icon" />
                          <span className="flex-1">{item.label}</span>
                          {renderBadges(item)}
                        </NavLink>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              ))}
            </nav>
          </SidebarContent>

          <SidebarFooter>
            <div className="sb-foot">
              <div className="sb-user">
                <span className="sb-avatar">{initial}</span>
                <div>
                  <div className="sb-uname">{getUserName()}</div>
                  <span className="sb-urole">{getUserRole()}</span>
                </div>
              </div>
              <div className="sb-foot-row">
                <Link to="/" className="sb-site" title="Voir le site"><ExternalLink size={15} /></Link>
                <button onClick={handleLogout} className="sidebar-logout-btn">
                  <LogOut size={16} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* ---------- Mobile menu button ---------- */}
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={20} />
          Menu
        </button>

        {isMobileMenuOpen && (
          <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* ---------- Mobile Sidebar Panel ---------- */}
        <div className={`mobile-sidebar-panel ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-sidebar-header">
            <div className="sb-logo">
              <span className="sb-logo-text">Jina <b>Panel</b></span>
            </div>
            <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Fermer">
              <X size={20} />
            </button>
          </div>

          <nav className="mobile-nav">
            {groups.map((g, gi) => (
              <div key={g.label || `g${gi}`}>
                {g.label && (
                  <div className={`sb-section-label ${g.label === "Jina Auto Service" ? "auto" : ""}`}>{g.label}</div>
                )}
                {g.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    >
                      <div className="mobile-nav-left">
                        <item.icon size={19} strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </div>
                      {renderBadges(item, true)}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="mobile-user-section">
            <div className="mobile-user-info">
              <div className="mobile-user-name">{getUserName()}</div>
              <div className="mobile-user-role">{getUserRole()}</div>
              <div className="mobile-user-email">{user?.email || 'email@exemple.com'}</div>
            </div>
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* ---------- Page content ---------- */}
        <SidebarInset className="flex-1">
          <div className="p-6 lg:p-8 admin-main-content">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}