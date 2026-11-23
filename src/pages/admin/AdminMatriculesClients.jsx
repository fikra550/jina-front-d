// src/pages/admin/AdminMatriculesClients.jsx
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchMatricules, fetchCars, fetchReservations, fetchClients, refreshMatricules,
  selectMatricules, selectCars, selectMatriculesLoading, selectReservations, selectClients
} from "../../Redux/store";
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import { toast } from "sonner";
import {
  Search, RefreshCw, Tag, Car, User, Users, Clock, CalendarDays,
  DollarSign, Wallet, ArrowUpDown, ArrowUp, ArrowDown, X, Check,
  ExternalLink, History, CheckCircle2, UserX, Receipt, Calendar,
  Fuel, Battery, Leaf, Settings, Gauge, ChevronDown, List, LayoutGrid,
  CarFront, AlertCircle, Info, Wrench, Hash, ArrowLeft,
  ArrowRight, AlertTriangle, XCircle, Phone, CheckCircle
} from "lucide-react";

/* ============================================================
   Menu déroulant personnalisé (identique à AdminCars)
   ============================================================ */
const AcSelect = ({ value, onChange, options, id, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (ev) => {
      if (ev.type === "keydown") { if (ev.key === "Escape") setOpen(false); return; }
      if (ref.current && !ref.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [open]);

  const current = options.find((o) => String(o.value) === String(value)) || options[0];

  return (
    <div className="ac-dd" ref={ref}>
      <button
        type="button"
        id={id}
        className={`ac-dd-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span>{current?.label}</span>
        <ChevronDown size={16} className="ac-dd-chevron" />
      </button>
      {open && (
        <ul className="ac-dd-menu" role="listbox">
          {options.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`ac-dd-item ${active ? "active" : ""}`}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                >
                  <span>{o.label}</span>
                  {active && <Check size={15} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// "12 mars 2026" -> { day: "12", mon: "mars", year: 2026 }
const dateParts = (value) => {
  const d = new Date(value);
  if (!value || isNaN(d.getTime())) return { day: "—", mon: "", year: "" };
  return {
    day: d.toLocaleDateString("fr-FR", { day: "2-digit" }),
    mon: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
    year: d.getFullYear(),
  };
};

const SORT_OPTIONS = [
  { value: "matricule", label: "Plaque" },
  { value: "car", label: "Véhicule" },
  { value: "client", label: "Client" },
  { value: "duration", label: "Durée" },
  { value: "total", label: "Total" },
  { value: "paid", label: "Payé" },
  { value: "remaining", label: "Restant" },
  { value: "totalRemaining", label: "Total dû" },
];

const CLIENT_FILTER_OPTIONS = [
  { value: "all", label: "Tous les clients" },
  { value: "current", label: "Client actuel" },
  { value: "previous", label: "Client précédent" },
  { value: "none", label: "Sans client" },
];

export default function AdminMatriculesClients() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const matricules = useSelector(selectMatricules);
  const cars = useSelector(selectCars);
  const reservations = useSelector(selectReservations);
  const clients = useSelector(selectClients);
  const loading = useSelector(selectMatriculesLoading);

  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);
  const [sortField, setSortField] = useState('matricule');
  const [sortDirection, setSortDirection] = useState('asc');
  const [historyMatricule, setHistoryMatricule] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'cards'
  const [busy, setBusy] = useState({});
  const runBusy = async (key, fn) => {
    if (busy[key]) return;
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      return await fn();
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  useEffect(() => { loadData(); }, [dispatch]);

  useResetScrollOnOpen([historyMatricule]);
  
  const loadData = async () => {
    await Promise.all([
      dispatch(fetchMatricules()),
      dispatch(fetchCars()),
      dispatch(fetchClients()),
      dispatch(fetchReservations()),
    ]);
  };

  const refreshData = async () => {
    await dispatch(refreshMatricules());
    await dispatch(fetchCars());
    await dispatch(fetchClients());
    await dispatch(fetchReservations());
    toast.success("Données actualisées");
  };

  /* ==================== HELPERS ==================== */
  const getFuelLabel = (fuel) => {
    const labels = { petrol: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride' };
    return labels[fuel] || fuel;
  };

  const getFuelIcon = (fuel) => {
    switch (fuel) {
      case 'petrol':
      case 'diesel': return <Fuel size={10} />;
      case 'electric': return <Battery size={10} />;
      case 'hybrid': return <Leaf size={10} />;
      default: return <Fuel size={10} />;
    }
  };

  const getTransmissionLabel = (t) => t === 'automatic' ? 'Automatique' : 'Manuelle';
  const getTransmissionIcon = (t) => t === 'automatic' ? <Gauge size={10} /> : <Settings size={10} />;

  const getMatriculeReservations = (matId) =>
    (reservations || [])
      .filter(r => r.matricule_id === matId)
      .filter(r => !['pending', 'cancelled', 'contacted'].includes(r.status));

  const getCurrentReservation = (matId) => {
    const allRes = getMatriculeReservations(matId);
    const retard = allRes.filter(r => r.status === 'retard');
    if (retard.length > 0) {
      return retard.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const confirmed = allRes
      .filter(r => r.status === 'confirmed' && r.end_date && new Date(r.end_date) >= today)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return confirmed.length > 0 ? confirmed[0] : null;
  };

  const getLastReservation = (matId) => {
    const list = getMatriculeReservations(matId);
    if (!list.length) return null;
    return [...list].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
  };

  const getDisplayReservation = (matId) => {
    const current = getCurrentReservation(matId);
    if (current) return { reservation: current, isCurrent: true };
    const last = getLastReservation(matId);
    return { reservation: last, isCurrent: false };
  };

  const getTotalRemainingForClient = (matId, clientId) => {
    if (!clientId) return 0;
    return getMatriculeReservations(matId)
      .filter(r => r.client_id === clientId)
      .reduce((sum, r) => sum + (parseFloat(r.remaining_amount) || 0), 0);
  };

  const calcDurationDays = (start, end) => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const formatMoney = (val) => `${(parseFloat(val) || 0).toLocaleString('fr-FR')} DH`;
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString("fr-FR");
    } catch { return dateString; }
  };

  const reservationStatusLabel = {
    pending:    { label: 'En attente', bg: 'badge-amber' },
    confirmed:  { label: 'Confirmée',  bg: 'badge-blue' },
    completed:  { label: 'Terminée',   bg: 'badge-success' },
    retard:     { label: 'En retard',  bg: 'badge-danger' },
    contacted:  { label: 'Contacté',   bg: 'badge-amber' },
    cancelled:  { label: 'Annulée',    bg: 'badge-gray' },
  };

  const getInitials = (client) => {
    if (!client) return "?";
    const letters = `${(client.prenom || "").charAt(0)}${(client.nom || "").charAt(0)}`.toUpperCase();
    return letters || "?";
  };

  const getStatusBadge = (status) => {
    const config = {
      pending:   { label: "En attente", icon: Clock },
      confirmed: { label: "Confirmée",  icon: Check },
      contacted: { label: "Contacté",   icon: Phone },
      completed: { label: "Terminée",   icon: CheckCircle },
      cancelled: { label: "Annulée",    icon: XCircle },
      retard:    { label: "En retard",  icon: AlertTriangle },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`rv-badge rv-st-${config[status] ? status : "pending"}`}>
        <Icon size={12} className="badge-icon" />
        {c.label}
      </span>
    );
  };

  /* ==================== SORT ==================== */
  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };
  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />;
  };

  /* ==================== ENRICH / FILTER / SORT ==================== */
  const enriched = (matricules || []).map(mat => {
    const car = cars.find(c => c.id === mat.car_id);
    const { reservation: dispRes, isCurrent } = getDisplayReservation(mat.id);
    const client = dispRes ? clients.find(c => c.id === dispRes.client_id) : null;
    const duration = dispRes ? calcDurationDays(dispRes.start_date, dispRes.end_date) : null;
    const totalRestantForClient = getTotalRemainingForClient(mat.id, client?.id);
    const period = dispRes
      ? `${formatDate(dispRes.start_date)} → ${formatDate(dispRes.end_date)}`
      : '—';
    return { mat, car, dispRes, isCurrent, client, duration, totalRestantForClient, period };
  });

  const filteredList = enriched.filter(({ mat, car, client, isCurrent }) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      mat.matricule_code?.toLowerCase().includes(term) ||
      car?.brand?.toLowerCase().includes(term) ||
      car?.model?.toLowerCase().includes(term) ||
      (client && `${client.prenom} ${client.nom}`.toLowerCase().includes(term));

    let matchesClientFilter = true;
    if (clientFilter === 'current') matchesClientFilter = isCurrent;
    else if (clientFilter === 'previous') matchesClientFilter = !isCurrent && !!client;
    else if (clientFilter === 'none') matchesClientFilter = !client;

    return matchesSearch && matchesClientFilter;
  }).sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'matricule':
        aVal = a.mat.matricule_code?.toLowerCase() || ''; bVal = b.mat.matricule_code?.toLowerCase() || ''; break;
      case 'car':
        aVal = a.car ? `${a.car.brand} ${a.car.model}`.toLowerCase() : '';
        bVal = b.car ? `${b.car.brand} ${b.car.model}`.toLowerCase() : '';
        break;
      case 'client':
        aVal = a.client ? `${a.client.prenom} ${a.client.nom}`.toLowerCase() : '';
        bVal = b.client ? `${b.client.prenom} ${b.client.nom}`.toLowerCase() : '';
        break;
      case 'duration':
        aVal = a.duration || 0; bVal = b.duration || 0; break;
      case 'total':
        aVal = a.dispRes ? parseFloat(a.dispRes.total_price) || 0 : 0;
        bVal = b.dispRes ? parseFloat(b.dispRes.total_price) || 0 : 0; break;
      case 'paid':
        aVal = a.dispRes ? parseFloat(a.dispRes.amount_paid) || 0 : 0;
        bVal = b.dispRes ? parseFloat(b.dispRes.amount_paid) || 0 : 0; break;
      case 'remaining':
        aVal = a.dispRes ? parseFloat(a.dispRes.remaining_amount) || 0 : 0;
        bVal = b.dispRes ? parseFloat(b.dispRes.remaining_amount) || 0 : 0; break;
      case 'totalRemaining':
        aVal = a.totalRestantForClient || 0; bVal = b.totalRestantForClient || 0; break;
      default:
        aVal = a.mat.id; bVal = b.mat.id;
    }
    if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const itemsPerView = viewMode === 'list' ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredList.length / itemsPerView);
  const paginated = filteredList.slice((currentPage - 1) * itemsPerView, currentPage * itemsPerView);

  /* ==================== STATS ==================== */
  const stats = {
    total: matricules?.length || 0,
    withCurrent: enriched.filter(e => e.isCurrent).length,
    withoutClient: enriched.filter(e => !e.client).length,
    totalDue: enriched.reduce((sum, e) => sum + getTotalRemainingForClient(e.mat.id, e.client?.id), 0),
  };

  /* ==================== ACTIONS ==================== */
  const handleOpenHistory = (mat) => setHistoryMatricule(mat);
  const handleCloseHistory = () => setHistoryMatricule(null);

  const handleGoToMatricule = (matriculeId) => {
    navigate(`/matricules?focus=${matriculeId}`);
  };

  const handleGoToReservation = (reservationId, clientName) => {
    if (!reservationId) return;
    if (clientName) navigate(`/reservations?search=${encodeURIComponent(clientName)}`);
    else navigate(`/reservations?focus=${reservationId}`);
  };

  /* ==================== LOADING ==================== */
  if (loading) {
    return (
      <div className="rv">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
        <Styles />
      </div>
    );
  }

  /* ==================== HISTORY DERIVED ==================== */
  const historyReservations = historyMatricule
    ? [...getMatriculeReservations(historyMatricule.id)].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    : [];
  const historyCar = historyMatricule ? cars.find(c => c.id === historyMatricule.car_id) : null;
  const historyTotalDue = historyReservations.reduce((sum, r) => sum + (parseFloat(r.remaining_amount) || 0), 0);

  /* ==================== STAT CARDS ==================== */
  const statCards = [
    { label: "Total Immatriculations", value: stats.total,       icon: <Tag size={20} />,       color: "blue" },
    { label: "Avec client actuel",    value: stats.withCurrent,  icon: <Users size={20} />,     color: "green" },
    { label: "Sans aucun client",     value: stats.withoutClient, icon: <UserX size={20} />,    color: "red" },
    { label: "Total dû",              value: formatMoney(stats.totalDue), icon: <Wallet size={20} />, color: "violet" },
  ];

  /* ==================== PAGINATION ==================== */
  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === 'list' ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredList.length}
      />
    </div>
  );

  /* ==================== RENDER ==================== */
  return (
    <div className="rv">
      {historyMatricule ? (
        /* ==================== HISTORY PAGE (full page, like the add form) ==================== */
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><History size={28} /></div>
            <div className="inline-form-title">
              <h2>Historique — {historyMatricule.matricule_code}</h2>
              <p>{historyCar ? `${historyCar.brand} ${historyCar.model}` : 'Véhicule non assigné'}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={handleCloseHistory} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <div className="inline-form">
            <div className="rv-stats" style={{ marginBottom: '1.25rem' }}>
              <div className="rv-stat-card">
                <div className="rv-stat-icon rv-stat-blue"><Receipt size={20} /></div>
                <div>
                  <p className="rv-stat-label">Réservations</p>
                  <p className="rv-stat-value">{historyReservations.length}</p>
                </div>
              </div>
              <div className="rv-stat-card">
                <div className="rv-stat-icon rv-stat-red"><Wallet size={20} /></div>
                <div>
                  <p className="rv-stat-label">Total dû</p>
                  <p className="rv-stat-value" style={{ color: '#dc2626' }}>{formatMoney(historyTotalDue)}</p>
                </div>
              </div>
              <div className="rv-stat-card">
                <div className="rv-stat-icon rv-stat-green"><CheckCircle2 size={20} /></div>
                <div>
                  <p className="rv-stat-label">Statut matricule</p>
                  <p className="rv-stat-value" style={{ fontSize: '1rem' }}>{historyMatricule.status}</p>
                </div>
              </div>
            </div>

            {historyReservations.length === 0 ? (
              <div className="ac-empty-card">
                <Receipt size={40} />
                <p>Aucune réservation pour ce matricule</p>
              </div>
            ) : (
              <div className="rv-cards rv-history-cards">
                {historyReservations.map((res) => {
                  const client = clients.find(c => c.id === res.client_id);
                  const duration = calcDurationDays(res.start_date, res.end_date);
                  const isLate = res.status === 'retard';

                  const total = Number(res.total_price) || 0;
                  const paid = Number(res.amount_paid) || 0;
                  const remaining = res.remaining_amount != null && res.remaining_amount !== ''
                    ? Number(res.remaining_amount) || 0
                    : Math.max(total - paid, 0);
                  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                  const settled = total > 0 && remaining <= 0;

                  const s = dateParts(res.start_date);
                  const e = dateParts(res.end_date);
                  const clientName = client ? `${client.prenom} ${client.nom}` : null;

                  return (
                    <article key={res.id} className={`rv-card ${isLate ? 'is-late' : ''}`}>
                      <div className="rv-card-top">
                        <span className="rv-card-no"><small>N°</small><b>{res.id}</b></span>
                        {getStatusBadge(res.status)}
                      </div>

                      <div className="rv-card-client">
                        <span className="rv-avatar">{getInitials(client)}</span>
                        <div>
                          <div className="rv-client-name">{clientName || '—'}</div>
                        </div>
                      </div>

                      <div className="rv-card-veh">
                        <div className="rv-veh">
                          <span className="rv-veh-name">
                            {historyCar ? `${historyCar.brand} ${historyCar.model}` : '—'}
                          </span>
                          {historyCar?.color && (
                            <span className="rv-color">
                              <span className="color-dot" style={{ backgroundColor: historyCar.color }} /> {historyCar.color}
                            </span>
                          )}
                        </div>
                        <span className="rv-plate">
                          <span className="rv-plate-strip">MA</span>
                          <span className="rv-plate-code">{historyMatricule.matricule_code || '—'}</span>
                        </span>
                      </div>

                      <div className="rv-route">
                        <div className="rv-date-block">
                          <span className="dd">{s.day}</span>
                          <span className="mm">{s.mon}</span>
                          <span className="yy">{s.year}</span>
                        </div>
                        <div className="rv-route-mid">
                          <span className="rv-chip days">
                            <CalendarDays size={13} /> {duration ?? '—'} {duration > 1 ? 'jours' : 'jour'}
                          </span>
                          <span className="line"><ArrowRight size={16} /></span>
                        </div>
                        <div className="rv-date-block end">
                          <span className="dd">{e.day}</span>
                          <span className="mm">{e.mon}</span>
                          <span className="yy">{e.year}</span>
                        </div>
                      </div>

                      <div className="rv-money">
                        <div className="rv-money-top">
                          <div>
                            <span className="lbl">Total</span>
                            <span className="tot">{formatMoney(total).replace(' DH', '')}<small>DH</small></span>
                          </div>
                          <div className={`rv-remaining ${settled ? 'ok' : remaining > 0 ? 'due' : ''}`}>
                            {settled ? 'Soldé ✓' : remaining > 0 ? `Reste ${formatMoney(remaining)}` : ''}
                            <div style={{ fontWeight: 700, fontSize: '0.72rem', marginTop: 2, color: 'var(--tx-2)' }}>
                              Payé : <span style={{ color: '#16a34a' }}>{formatMoney(paid)}</span>
                            </div>
                          </div>
                        </div>
                        {total > 0 && (
                          <div
                            className={`rv-bar ${settled ? 'full' : ''}`}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Paiement"
                          >
                            <i style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>

                      <div className="rv-perf" />
                      <div className="rv-tiles rv-tiles-one">
                        <button
                          type="button"
                          className="rv-tile primary tone-gold"
                          style={{ '--t': '#eab308' }}
                          onClick={() => handleGoToReservation(res.id, clientName)}
                        >
                          <ExternalLink size={17} />
                          <span>Voir la réservation</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={handleCloseHistory}>
                <ArrowLeft size={16} /> Retour
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="ac-wrap">
        {/* ---------- Header ---------- */}
        <div className="rv-head">
          <div className="rv-head-left">
            <div className="rv-head-icon"><Tag size={24} /></div>
            <div className="rv-head-text">
              <h1 className="rv-title">Clients par Matricule</h1>
              <p className="rv-sub">Suivi des plaques, clients et encaissements associés</p>
            </div>
          </div>
          <div className="rv-head-actions">
            <button type="button" onClick={() => runBusy("refresh", refreshData)} className="ac-btn" disabled={!!busy.refresh}>
              <RefreshCw size={15} className={busy.refresh ? "rv-spin" : ""} /><span className="ac-btn-text">Actualiser</span>
            </button>
          </div>
        </div>

        {/* ---------- Stats ---------- */}
        <div className="rv-stats">
          {statCards.map((st) => (
            <div key={st.label} className="rv-stat-card">
              <div className={`rv-stat-icon rv-stat-${st.color}`}>{st.icon}</div>
              <div>
                <p className="rv-stat-label">{st.label}</p>
                <p className="rv-stat-value">{st.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Filters ---------- */}
        <div className="ac-filters">
          <div className="ac-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rechercher par plaque, véhicule, client..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            {searchTerm && (
              <button
                type="button"
                className="ac-search-clear"
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="ac-dd" style={{ flex: '0 0 auto', minWidth: 200 }}>
            <AcSelect
              id="ac-client-filter"
              ariaLabel="Filtrer par type de client"
              value={clientFilter}
              onChange={(v) => { setClientFilter(v); setCurrentPage(1); }}
              options={CLIENT_FILTER_OPTIONS}
            />
          </div>

          <div className="ac-seg" role="group" aria-label="Affichage">
            <button
              type="button"
              className={`ac-seg-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => { setViewMode('list'); setCurrentPage(1); }}
            >
              <List size={15} /> <span>Liste</span>
            </button>
            <button
              type="button"
              className={`ac-seg-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => { setViewMode('cards'); setCurrentPage(1); }}
            >
              <LayoutGrid size={15} /> <span>Cartes</span>
            </button>
          </div>
        </div>

        <div className="ac-meta">
          <p><strong>{filteredList.length}</strong> matricule(s) trouvé(s)</p>
          <p>Page {currentPage} / {totalPages || 1}</p>
        </div>

        {/* ==================== LIST VIEW ==================== */}
        {viewMode === 'list' ? (
          <div className="ac-listwrap">
            {/* Desktop table */}
            <div className="ac-tablecard ac-desktop-only">
              <div className="ac-scroll">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("matricule")} className="sortable-header">Plaque {getSortIcon("matricule")}</th>
                      <th onClick={() => handleSort("car")} className="sortable-header">Véhicule {getSortIcon("car")}</th>
                      <th onClick={() => handleSort("client")} className="sortable-header">Client {getSortIcon("client")}</th>
                      <th>Période</th>
                      <th onClick={() => handleSort("duration")} className="sortable-header">Durée {getSortIcon("duration")}</th>
                      <th onClick={() => handleSort("total")} className="sortable-header">Total {getSortIcon("total")}</th>
                      <th onClick={() => handleSort("paid")} className="sortable-header">Payé {getSortIcon("paid")}</th>
                      <th onClick={() => handleSort("remaining")} className="sortable-header">Restant {getSortIcon("remaining")}</th>
                      <th onClick={() => handleSort("totalRemaining")} className="sortable-header">Total dû {getSortIcon("totalRemaining")}</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="ac-empty-cell">
                          <Tag size={40} />
                          <p>Aucun matricule trouvé</p>
                        </td>
                      </tr>
                    ) : paginated.map(({ mat, car, dispRes, isCurrent, client, duration, totalRestantForClient, period }) => (
                      <tr key={mat.id}>
                        <td><span className="ac-id">{mat.matricule_code}</span></td>
                        <td>
                          {car ? (
                            <div>
                              <div className="ac-strong">{car.brand} {car.model}</div>
                              <div className="ac-model" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 6px', marginTop: 2, fontSize: '0.7rem' }}>
                                <span>{car.year}</span>
                                <span>•</span>
                                <span>{car.color}</span>
                                <span>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  {getFuelIcon(car.fuel_type)} {getFuelLabel(car.fuel_type)}
                                </span>
                                <span>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  {getTransmissionIcon(car.transmission)} {getTransmissionLabel(car.transmission)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--tx-3)', fontStyle: 'italic' }}>Non assigné</span>
                          )}
                        </td>
                        <td>
                          {client ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span className={`badge ${isCurrent ? 'badge-success' : 'badge-amber'}`}>
                                {isCurrent ? 'Actuel' : 'Précédent'}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 700 }}>
                                <User size={12} /> {client.prenom} {client.nom}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--tx-3)', fontStyle: 'italic' }}>Aucun client</span>
                          )}
                        </td>
                        <td>
                          {dispRes ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--tx-2)' }}>
                              <Calendar size={12} /> {period}
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          {duration ? (
                            <span className="badge badge-gray">
                              <CalendarDays size={12} style={{ color: '#eab308' }} /> {duration} j
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {dispRes ? (
                            <span className="ac-price-pill">
                              {formatMoney(dispRes.total_price)}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {dispRes ? (
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatMoney(dispRes.amount_paid)}</span>
                          ) : <span style={{ color: 'var(--tx-3)' }}>—</span>}
                        </td>
                        <td>
                          {dispRes ? (
                            <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatMoney(dispRes.remaining_amount)}</span>
                          ) : <span style={{ color: 'var(--tx-3)' }}>—</span>}
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: totalRestantForClient > 0 ? '#dc2626' : '#16a34a' }}>
                            {formatMoney(totalRestantForClient)}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="ac-actions">
                            <button
                              type="button"
                              className="ac-action-btn ac-action-info"
                              onClick={() => handleOpenHistory(mat)}
                              title="Historique des réservations"
                            >
                              <History size={15} />
                            </button>
                            {dispRes && (
                              <button
                                type="button"
                                className="ac-action-btn ac-action-primary"
                                onClick={() => handleGoToReservation(dispRes.id, client ? `${client.prenom} ${client.nom}` : null)}
                                title="Voir la réservation"
                              >
                                <ExternalLink size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="ac-action-btn ac-action-edit"
                              onClick={() => handleGoToMatricule(mat.id)}
                              title="Ouvrir la fiche matricule"
                            >
                              <Car size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="ac-mobile-only">
              <div className="ac-sortbar">
                <label htmlFor="ac-sort">Trier</label>
                <AcSelect
                  id="ac-sort"
                  ariaLabel="Trier par"
                  value={sortField}
                  onChange={(v) => setSortField(v)}
                  options={SORT_OPTIONS}
                />
                <button
                  type="button"
                  className="ac-sortdir"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  aria-label={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
                >
                  {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
              </div>

              {paginated.length === 0 ? (
                <div className="ac-empty-card">
                  <Tag size={40} />
                  <p>Aucun matricule trouvé</p>
                </div>
              ) : (
                <div className="ac-mcards">
                  {paginated.map(({ mat, car, dispRes, isCurrent, client, duration, totalRestantForClient, period }) => (
                    <div key={mat.id} className="ac-mcard">
                      <div className="ac-mcard-head">
                        <div className="ac-mcard-info">
                          <div className="ac-mcard-name">{mat.matricule_code}</div>
                          <div className="ac-mcard-sub">
                            {car ? <span className="ac-model">{car.brand} {car.model}</span> : <span style={{ color: 'var(--tx-3)' }}>Non assigné</span>}
                          </div>
                        </div>
                        <div className="ac-mcard-price">
                          {formatMoney(totalRestantForClient).replace(' DH', '')}<small> DH dûs</small>
                        </div>
                      </div>

                      <div className="ac-mcard-badges">
                        {client ? (
                          <span className={`badge ${isCurrent ? 'badge-success' : 'badge-amber'}`}>
                            {isCurrent ? 'Client actuel' : 'Client précédent'}
                          </span>
                        ) : (
                          <span className="badge badge-gray">Sans client</span>
                        )}
                        {dispRes && (
                          <span className={`badge ${reservationStatusLabel[dispRes.status]?.bg || 'badge-blue'}`}>
                            {reservationStatusLabel[dispRes.status]?.label || dispRes.status}
                          </span>
                        )}
                      </div>

                      {client && (
                        <div className="ac-mcard-meta">
                          <span><User size={13} /> {client.prenom} {client.nom}</span>
                        </div>
                      )}

                      {dispRes && (
                        <div className="ac-mcard-meta">
                          <span><Calendar size={13} /> {period}</span>
                          <span><CalendarDays size={13} /> {duration} j</span>
                        </div>
                      )}

                      {dispRes && (
                        <div className="ac-mcard-money">
                          <div><span>Total</span><strong style={{ color: 'var(--acc-tx)' }}>{formatMoney(dispRes.total_price)}</strong></div>
                          <div><span>Payé</span><strong style={{ color: '#16a34a' }}>{formatMoney(dispRes.amount_paid)}</strong></div>
                          <div><span>Restant</span><strong style={{ color: '#dc2626' }}>{formatMoney(dispRes.remaining_amount)}</strong></div>
                        </div>
                      )}

                      <div className="ac-card-btns" style={{ gridTemplateColumns: dispRes ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                        <button type="button" onClick={() => handleOpenHistory(mat)} className="ac-card-btn ac-action-info">
                          <History size={17} /><span>Historique</span>
                        </button>
                        {dispRes && (
                          <button
                            type="button"
                            onClick={() => handleGoToReservation(dispRes.id, client ? `${client.prenom} ${client.nom}` : null)}
                            className="ac-card-btn ac-action-primary"
                          >
                            <ExternalLink size={17} /><span>Réserver</span>
                          </button>
                        )}
                        <button type="button" onClick={() => handleGoToMatricule(mat.id)} className="ac-card-btn ac-action-edit">
                          <Car size={17} /><span>Fiche</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pagination}
          </div>
        ) : (
          /* ==================== CARDS VIEW ==================== */
          <>
            <div className="ac-sortbar">
              <label htmlFor="ac-sort-cards">Trier</label>
              <AcSelect
                id="ac-sort-cards"
                ariaLabel="Trier par"
                value={sortField}
                onChange={(v) => setSortField(v)}
                options={SORT_OPTIONS}
              />
              <button
                type="button"
                className="ac-sortdir"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                aria-label={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
              >
                {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
              </button>
            </div>

            {paginated.length === 0 ? (
              <div className="ac-empty-card">
                <Tag size={40} />
                <p>Aucun matricule trouvé</p>
              </div>
            ) : (
              <div className="cards-grid">
                {paginated.map(({ mat, car, dispRes, isCurrent, client, duration, totalRestantForClient, period }) => (
                  <div key={mat.id} className="car-card">
                    <div
                      className="card-image"
                      style={{
                        height: 130,
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      }}
                    >
                      <Hash size={56} style={{ color: 'rgba(255,255,255,0.85)' }} />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          left: 12,
                          color: '#fff',
                          fontWeight: 900,
                          fontSize: '1rem',
                          letterSpacing: '0.04em',
                          fontFamily: 'ui-monospace, Menlo, monospace',
                        }}
                      >
                        {mat.matricule_code}
                      </div>
                      <div className="card-status">
                        {client ? (
                          <span className={`badge ${isCurrent ? 'badge-success' : 'badge-amber'}`}>
                            {isCurrent ? 'Actuel' : 'Précédent'}
                          </span>
                        ) : (
                          <span className="badge badge-gray">Sans client</span>
                        )}
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="card-title">
                        <span>{car ? `${car.brand} ${car.model}` : 'Véhicule non assigné'}</span>
                        <span className="card-price" style={{ color: totalRestantForClient > 0 ? '#dc2626' : '#16a34a' }}>
                          {formatMoney(totalRestantForClient)}
                        </span>
                      </div>

                      {client && (
                        <div className="ac-mcard-meta" style={{ marginTop: 6 }}>
                          <span><User size={13} /> {client.prenom} {client.nom}</span>
                        </div>
                      )}

                      {dispRes && (
                        <div className="ac-mcard-meta">
                          <span><Calendar size={13} /> {period}</span>
                          <span><CalendarDays size={13} /> {duration} j</span>
                        </div>
                      )}

                      {dispRes && (
                        <div className="ac-mcard-money" style={{ marginTop: 8 }}>
                          <div><span>Total</span><strong style={{ color: 'var(--acc-tx)' }}>{formatMoney(dispRes.total_price)}</strong></div>
                          <div><span>Payé</span><strong style={{ color: '#16a34a' }}>{formatMoney(dispRes.amount_paid)}</strong></div>
                          <div><span>Restant</span><strong style={{ color: '#dc2626' }}>{formatMoney(dispRes.remaining_amount)}</strong></div>
                        </div>
                      )}

                      <div className="ac-card-btns" style={{ gridTemplateColumns: dispRes ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                        <button type="button" onClick={() => handleOpenHistory(mat)} className="ac-card-btn ac-action-info">
                          <History size={17} /><span>Historique</span>
                        </button>
                        {dispRes && (
                          <button
                            type="button"
                            onClick={() => handleGoToReservation(dispRes.id, client ? `${client.prenom} ${client.nom}` : null)}
                            className="ac-card-btn ac-action-primary"
                          >
                            <ExternalLink size={17} /><span>Réserver</span>
                          </button>
                        )}
                        <button type="button" onClick={() => handleGoToMatricule(mat.id)} className="ac-card-btn ac-action-edit">
                          <Car size={17} /><span>Fiche</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pagination}
          </>
        )}
      </div>
      )}

      <Styles />
    </div>
  );
}

/* ============================================================
   STYLES — même design scoped .rv que AdminCars
   ============================================================ */
function Styles() {
  return (
    <style>{`
@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap");

.rv {
    --acc: #eab308; --acc-d: #ca9a04; --acc-tx: #a16207;
    --danger: #dc2626; --blue: #1da1e8; --blue-d: #0f84c4; --ink: #0a0a0a;
    --bg: #f8fafc; --surface: #ffffff; --surface-2: #f4f5f8;
    --tx: #111216; --tx-2: #5b6070; --tx-3: #8a90a0;
    --line: #e1e4ea; --line-strong: #0a0a0a;
    font-family: Archivo, "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--tx);
    -webkit-tap-highlight-color: transparent;
}
@media (prefers-color-scheme: dark) {
    .rv {
        --bg: #0f172a; --surface: #15171c; --surface-2: #1b1e25;
        --tx: #f2f3f5; --tx-2: #a4aab8; --tx-3: #747b8c;
        --line: #2a2e37; --line-strong: #3b404c; --acc-tx: #facc15;
    }
}
.rv *, .rv *::before, .rv *::after { box-sizing: border-box; }
.rv button { font-family: inherit; }

@keyframes rvFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rvPop { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes rvSheet { from { transform: translateY(100%); } to { transform: none; } }
@keyframes acDdIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes acSpin { to { transform: rotate(360deg); } }

/* ---------- Modals ---------- */
.rv .modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    background: rgba(10, 10, 10, 0.62);
    backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
    animation: rvFade 0.18s ease;
}
.rv .modal {
    position: relative; width: 100%; max-height: 90vh; overflow-y: auto;
    background: var(--surface); color: var(--tx);
    border: 1.5px solid var(--line-strong); border-radius: 24px;
    animation: rvPop 0.25s ease;
}
.rv .modal-header {
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 16px 20px; background: var(--surface);
    border-bottom: 2px dotted var(--line);
}
.rv .modal-title {
    display: flex; align-items: center; gap: 10px; margin: 0;
    font-size: 1.05rem; font-weight: 900; letter-spacing: -0.01em;
}
.rv .modal-title::before {
    content: ""; width: 6px; height: 22px; background: var(--acc);
    border-radius: 2px; transform: skewX(-14deg); flex-shrink: 0;
}
.rv .modal-close {
    width: 38px; height: 38px; border-radius: 50%;
    border: 1.5px solid var(--line); background: var(--surface-2); color: var(--tx);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; flex-shrink: 0;
}
.rv .modal-close:hover { background: var(--acc); border-color: var(--acc); color: #0a0a0a; }

/* ---------- Page wrap / header ---------- */
.rv .ac-wrap { width: 100%; max-width: none; margin: 0; padding: 1.5rem; }
.rv .rv-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.rv .rv-head-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.rv .rv-head-icon {
    width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    display: flex; align-items: center; justify-content: center; color: #fff;
    box-shadow: 0 8px 24px -6px rgba(245, 158, 11, 0.5);
}
.rv .rv-title { margin: 0; font-size: 1.75rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; color: var(--tx); }
.rv .rv-sub { margin: 2px 0 0; font-size: 0.85rem; color: var(--tx-2); }
.rv .rv-head-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.rv .ac-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    height: 38px; padding: 0 16px; border-radius: 10px;
    border: 1px solid var(--line); background: var(--surface); color: var(--tx);
    font-size: 0.8rem; font-weight: 600; white-space: nowrap; cursor: pointer;
    transition: all 0.2s ease;
}
.rv .ac-btn:hover { background: var(--surface-2); border-color: var(--tx-3); transform: translateY(-1px); }

/* ---------- Stats ---------- */
.rv .rv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
.rv .rv-stat-card {
    display: flex; align-items: center; gap: 12px; padding: 16px;
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    transition: transform 0.25s, box-shadow 0.25s;
}
.rv .rv-stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1); }
.rv .rv-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rv .rv-stat-blue { background: #dbeafe; color: #2563eb; }
.rv .rv-stat-green { background: #dcfce7; color: #16a34a; }
.rv .rv-stat-red { background: #fee2e2; color: #dc2626; }
.rv .rv-stat-cyan { background: #cffafe; color: #0891b2; }
.rv .rv-stat-violet { background: #f3e8ff; color: #8b5cf6; }
.rv .rv-stat-label { margin: 0; font-size: 0.72rem; font-weight: 600; color: var(--tx-2); text-transform: uppercase; letter-spacing: 0.05em; }
.rv .rv-stat-value { margin: 2px 0 0; font-size: 1.4rem; font-weight: 800; line-height: 1.1; color: var(--tx); }
@media (prefers-color-scheme: dark) {
    .rv .rv-stat-blue { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
    .rv .rv-stat-green { background: rgba(22, 163, 74, 0.2); color: #4ade80; }
    .rv .rv-stat-red { background: rgba(220, 38, 38, 0.2); color: #f87171; }
    .rv .rv-stat-cyan { background: rgba(8, 145, 178, 0.2); color: #22d3ee; }
    .rv .rv-stat-violet { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
}

/* ---------- Filters ---------- */
.rv .ac-filters {
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
    padding: 14px; margin-bottom: 1rem;
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.04);
}
.rv .ac-search { position: relative; flex: 1; min-width: 240px; }
.rv .ac-search > svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--tx-3); pointer-events: none; }
.rv .ac-search input {
    width: 100%; height: 38px; padding: 0 38px; border-radius: 10px;
    border: 1px solid var(--line); background: var(--surface-2); color: var(--tx);
    font-size: 0.8rem; font-family: inherit; transition: all 0.2s;
}
.rv .ac-search input::placeholder { color: var(--tx-3); }
.rv .ac-search input:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.12); background: var(--surface); }
.rv .ac-search-clear {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    width: 20px; height: 20px; border-radius: 50%; border: 0;
    background: var(--line); color: var(--tx-2);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.rv .ac-seg { display: inline-flex; padding: 3px; gap: 3px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); }
.rv .ac-seg-btn {
    display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
    border: 0; border-radius: 9px; background: transparent; color: var(--tx-2);
    font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.rv .ac-seg-btn:hover:not(.active) { color: var(--tx); }
.rv .ac-seg-btn.active { background: #fef3c7; color: #92400e; }
@media (prefers-color-scheme: dark) { .rv .ac-seg-btn.active { background: #422006; color: #fde68a; } }

.rv .ac-meta { display: flex; justify-content: space-between; padding: 0 4px; margin-bottom: 12px; font-size: 0.78rem; color: var(--tx-2); }
.rv .ac-meta p { margin: 0; }
.rv .ac-meta strong { color: var(--tx); font-weight: 700; }

/* ---------- Table ---------- */
.rv .ac-tablecard { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.rv .ac-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.rv .ac-table { width: 100%; min-width: 1000px; border-collapse: collapse; font-size: 0.82rem; }
.rv .ac-table th {
    text-align: left; padding: 12px 16px; background: var(--surface-2); color: var(--tx-2);
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.rv .ac-table td { padding: 12px 16px; border-top: 1px solid var(--line); color: var(--tx); vertical-align: middle; }
.rv .ac-table tbody tr:hover td { background: var(--surface-2); }
.rv .ac-table .text-right { text-align: right; }
.rv .sortable-header { cursor: pointer; user-select: none; transition: background 0.2s; }
.rv .sortable-header:hover { background: var(--line) !important; }
.rv .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.4; vertical-align: middle; }
.rv .sort-icon.active { opacity: 1; color: #eab308; }
.rv .ac-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.75rem; font-weight: 600;
    background: var(--surface-2); color: var(--tx-2); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--line);
}
.rv .ac-strong { font-weight: 700; }
.rv .ac-model { color: var(--tx-2); font-weight: 500; }
.rv .ac-price-pill {
    display: inline-block; padding: 4px 10px; border-radius: 8px; white-space: nowrap;
    background: rgba(234, 179, 8, 0.14); color: var(--acc-tx);
    font-weight: 800; font-size: 0.8rem;
}
.rv .ac-table tbody tr td:first-child { box-shadow: inset 3px 0 0 transparent; transition: box-shadow 0.15s, background 0.15s; }
.rv .ac-table tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 #eab308; }
.rv .ac-empty-cell { text-align: center; padding: 48px 20px !important; color: var(--tx-3) !important; }
.rv .ac-empty-cell p { margin: 8px 0 0; font-size: 0.85rem; }
.rv .ac-empty-card {
    text-align: center; padding: 40px 20px; color: var(--tx-3);
    background: var(--surface); border: 1px dashed var(--line); border-radius: 14px;
}
.rv .ac-empty-card p { margin: 8px 0 0; font-size: 0.85rem; }

/* ---------- Badges ---------- */
.rv .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
.rv .badge-success { background: #dcfce7; color: #166534; }
.rv .badge-danger { background: #fee2e2; color: #991b1b; }
.rv .badge-amber { background: #fef3c7; color: #92400e; }
.rv .badge-blue { background: #dbeafe; color: #1e40af; }
.rv .badge-emerald { background: #d1fae5; color: #065f46; }
.rv .badge-purple { background: #f3e8ff; color: #6b21a5; }
.rv .badge-gray { background: #f1f5f9; color: #475569; }
@media (prefers-color-scheme: dark) {
    .rv .badge-success { background: #14532d; color: #4ade80; }
    .rv .badge-danger { background: #7f1d1d; color: #fca5a5; }
    .rv .badge-amber { background: #78350f; color: #fde68a; }
    .rv .badge-blue { background: #1e3a5f; color: #60a5fa; }
    .rv .badge-emerald { background: #064e3b; color: #34d399; }
    .rv .badge-purple { background: #4c1d95; color: #c084fc; }
    .rv .badge-gray { background: #1e293b; color: #cbd5e1; }
}

/* ---------- Action buttons (table) ---------- */
.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
.rv .ac-action-btn {
    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
}
.rv .ac-action-edit { color: #10b981; }
.rv .ac-action-delete { color: #ef4444; }
.rv .ac-action-info { color: #1da1e8; }
.rv .ac-action-primary { color: #eab308; }
.rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
.rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
.rv .ac-action-btn.ac-action-info:hover { background: #eff6ff; }
.rv .ac-action-btn.ac-action-primary:hover { background: #fef3c7; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
    .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
    .rv .ac-action-btn.ac-action-info:hover { background: #1e3a5f; }
    .rv .ac-action-btn.ac-action-primary:hover { background: #422006; }
}

/* ---------- Card buttons ---------- */
.rv .ac-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); }
.rv .ac-card-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
    background: var(--surface-2); cursor: pointer; transition: all 0.2s;
}
.rv .ac-card-btn span { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.02em; color: var(--tx-2); line-height: 1; }
.rv .ac-card-btn:active { transform: scale(0.96); }
.rv .ac-card-btn.ac-action-edit { color: #10b981; }
.rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #ecfdf5; }
.rv .ac-card-btn.ac-action-delete { color: #ef4444; }
.rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #fef2f2; }
.rv .ac-card-btn.ac-action-info { color: #1da1e8; }
.rv .ac-card-btn.ac-action-info:hover, .rv .ac-card-btn.ac-action-info:active { background: #eff6ff; }
.rv .ac-card-btn.ac-action-primary { color: #eab308; }
.rv .ac-card-btn.ac-action-primary:hover, .rv .ac-card-btn.ac-action-primary:active { background: #fef3c7; }
@media (prefers-color-scheme: dark) {
    .rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #064e3b; }
    .rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #7f1d1d; }
    .rv .ac-card-btn.ac-action-info:hover, .rv .ac-card-btn.ac-action-info:active { background: #1e3a5f; }
    .rv .ac-card-btn.ac-action-primary:hover, .rv .ac-card-btn.ac-action-primary:active { background: #422006; }
}

/* ---------- Mobile cards (list mode) ---------- */
.rv .ac-mcards { display: flex; flex-direction: column; gap: 10px; }
.rv .ac-mcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
.rv .ac-mcard-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .ac-mcard-info { flex: 1; min-width: 0; }
.rv .ac-mcard-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 900; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: 0.02em; }
.rv .ac-mcard-sub { margin-top: 3px; font-size: 0.78rem; }
.rv .ac-mcard-price { font-weight: 800; font-size: 1rem; white-space: nowrap; color: #dc2626; }
.rv .ac-mcard-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rv .ac-mcard-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; font-size: 0.75rem; color: var(--tx-2); }
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; }
.rv .ac-mcard-money { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; padding: 10px; background: var(--surface-2); border-radius: 10px; }
.rv .ac-mcard-money > div { display: flex; flex-direction: column; gap: 2px; }
.rv .ac-mcard-money span { font-size: 0.6rem; text-transform: uppercase; color: var(--tx-3); font-weight: 700; letter-spacing: 0.04em; }
.rv .ac-mcard-money strong { font-size: 0.82rem; font-weight: 800; }

/* ---------- Cards view ---------- */
.rv .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.rv .car-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
}
.rv .car-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18); }
.rv .card-image { position: relative; height: 190px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rv .card-status { position: absolute; top: 0.75rem; right: 0.75rem; }
.rv .card-content { padding: 16px; }
.rv .card-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 0.5rem; font-size: 1.02rem; font-weight: 700; }
.rv .card-price { font-size: 1.05rem; font-weight: 800; color: var(--acc-tx); white-space: nowrap; }
.rv .card-price small { font-size: 0.7rem; font-weight: 500; margin-left: 2px; }

/* ---------- Sort bar ---------- */
.rv .ac-sortbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.rv .ac-sortbar label { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); }
.rv .ac-sortbar .ac-dd { flex: 1; min-width: 0; }
.rv .ac-sortdir {
    width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
    border: 1px solid var(--line); background: var(--surface); color: var(--tx);
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s;
}
.rv .ac-sortdir:hover { background: var(--surface-2); border-color: var(--tx-3); }
.rv .ac-sortdir:active { transform: scale(0.95); }

/* ---------- Custom dropdown ---------- */
.rv .ac-dd { position: relative; }
.rv .ac-dd-trigger {
    width: 100%; height: 44px; padding: 0 14px 0 16px;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    border: 1px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--tx);
    font-size: 0.88rem; font-weight: 600; font-family: inherit; text-align: left; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
}
.rv .ac-dd-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .ac-dd-trigger:hover { border-color: var(--tx-3); }
.rv .ac-dd-trigger.open { border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.14); }
.rv .ac-dd-chevron { flex-shrink: 0; color: var(--acc-tx); transition: transform 0.2s ease; }
.rv .ac-dd-trigger.open .ac-dd-chevron { transform: rotate(180deg); }
.rv .ac-dd-menu {
    position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 60;
    margin: 0; padding: 6px; list-style: none;
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
    box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.28);
    max-height: 300px; overflow-y: auto;
    animation: acDdIn 0.14s ease;
}
.rv .ac-dd-item {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 11px 12px; border: 0; border-radius: 10px; background: transparent; color: var(--tx);
    font-size: 0.88rem; font-weight: 600; font-family: inherit; text-align: left; cursor: pointer;
}
.rv .ac-dd-item:hover { background: var(--surface-2); }
.rv .ac-dd-item.active { background: #fef3c7; color: #92400e; font-weight: 700; }
@media (prefers-color-scheme: dark) {
    .rv .ac-dd-item.active { background: #422006; color: #fde68a; }
    .rv .ac-dd-menu { box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.6); }
}

/* ---------- Pagination ---------- */
.rv .ac-pager { margin-top: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }

/* ---------- Loading ---------- */
.rv .loading { text-align: center; padding: 4rem 1rem; color: var(--tx-2); font-weight: 700; }
.rv .spinner {
    display: inline-block; width: 40px; height: 40px; margin-bottom: 12px; border-radius: 50%;
    border: 4px solid var(--line); border-top-color: #eab308; animation: acSpin 0.7s linear infinite;
}

/* ---------- Full-page form / history (same as add form) ---------- */
.rv .inline-form-container {
    position: relative; max-width: 1280px; margin: 1.5rem auto;
    background: var(--surface); border: 1.5px solid var(--line-strong);
    border-radius: 28px; overflow: hidden; overflow: clip;
}
.rv .inline-form-header {
    position: relative; display: flex; align-items: center; gap: 18px;
    padding: 24px 80px 24px 28px; background: var(--ink);
}
.rv .inline-form-icon {
    width: 58px; height: 58px; border-radius: 16px;
    background: var(--acc); color: #0a0a0a;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transform: rotate(-5deg);
}
.rv .inline-form-title h2 { margin: 0; color: #fff; font-size: 1.6rem; font-weight: 900; letter-spacing: -0.01em; line-height: 1.1; }
.rv .inline-form-title p { margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; }
.rv .inline-form-close {
    position: absolute; top: 50%; right: 22px; transform: translateY(-50%);
    width: 44px; height: 44px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.35); background: transparent; color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s;
}
.rv .inline-form-close:hover { background: var(--acc); border-color: var(--acc); color: #0a0a0a; transform: translateY(-50%) rotate(90deg); }
.rv .inline-form { padding: 28px; }
.rv .inline-secondary-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 42px; padding: 0 18px; border-radius: 999px;
    border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
    font-size: 0.8rem; font-weight: 800; cursor: pointer;
    transition: transform 0.1s, background 0.15s;
}
.rv .inline-secondary-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
.rv .inline-secondary-btn:active { transform: translateY(2px); }
.rv .inline-form-footer {
    display: flex; justify-content: flex-end; gap: 14px;
    margin-top: 24px; padding-top: 22px; border-top: 2px dotted var(--line);
}


/* =====================================================================
   STATUS BADGES (réservations)
   ===================================================================== */
.rv .rv-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 11px 4px 9px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap;
  border: 1.5px solid currentColor; background: transparent;
}
.rv .rv-badge .badge-icon { flex-shrink: 0; }
.rv .rv-st-pending { color: #b36b00; background: #fff4d6; }
.rv .rv-st-confirmed { color: #0f8a43; background: #e3f7ea; }
.rv .rv-st-contacted { color: #5b34b8; background: #efe9fb; }
.rv .rv-st-completed { color: var(--blue-d); background: #e3f3fc; }
.rv .rv-st-cancelled { color: #5b6070; background: #eceef2; }
.rv .rv-st-retard { color: #fff; background: var(--danger); border-color: var(--danger); }
@media (prefers-color-scheme: dark) {
  .rv .rv-st-pending { background: rgba(217, 138, 0, 0.16); color: #ffc247; }
  .rv .rv-st-confirmed { background: rgba(22, 163, 74, 0.16); color: #4ade80; }
  .rv .rv-st-contacted { background: rgba(124, 77, 255, 0.18); color: #b79cff; }
  .rv .rv-st-completed { background: rgba(29, 161, 232, 0.16); color: #5cc3f5; }
  .rv .rv-st-cancelled { background: rgba(138, 144, 160, 0.16); color: #b6bccb; }
}

/* ---------- Plate / colour / chips ---------- */
.rv .rv-plate { display: inline-flex; align-items: stretch; border: 2px solid #0a0a0a; border-radius: 8px; overflow: hidden; background: #fff; color: #0a0a0a; line-height: 1; }
.rv .rv-plate-strip { background: var(--blue); color: #fff; font-size: 0.55rem; font-weight: 900; letter-spacing: 0.06em; padding: 6px 5px; display: flex; align-items: flex-end; }
.rv .rv-plate-code { padding: 6px 10px; font-weight: 900; font-size: 0.92rem; letter-spacing: 0.1em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rv .rv-color { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 600; color: var(--tx-2); }
.rv .color-dot { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid rgba(10, 10, 10, 0.35); display: inline-block; flex-shrink: 0; }
.rv .rv-chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 800; background: var(--surface-2); color: var(--tx);
  border: 1.5px solid var(--line); white-space: nowrap;
}
.rv .rv-chip svg { flex-shrink: 0; }
.rv .rv-chip.days svg { color: var(--acc-tx); }

/* ---------- Client / vehicle ---------- */
.rv .rv-avatar {
  width: 40px; height: 40px; border-radius: 12px; border: 0;
  background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 0.85rem; letter-spacing: 0.03em; flex-shrink: 0;
}
.rv .rv-client-name { font-weight: 700; }
.rv .rv-veh { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.rv .rv-veh-name { font-weight: 800; font-size: 0.88rem; }

/* =====================================================================
   RESERVATION-STYLE CARDS (historique)
   ===================================================================== */
.rv .rv-cards { display: flex; flex-direction: column; gap: 12px; }
.rv .rv-history-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.rv .rv-card {
  position: relative; background: var(--surface);
  border: 1px solid var(--line); border-radius: 14px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.25s, box-shadow 0.25s;
}
.rv .rv-card:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -14px rgba(0, 0, 0, 0.18); }
.rv .rv-card.is-late { border-color: var(--danger); }

.rv .rv-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 0; }
.rv .rv-card-no {
  display: inline-flex; align-items: baseline; gap: 4px; border: 0; border-radius: 6px;
  padding: 2px 8px; background: var(--surface-2); line-height: 1.2;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.rv .rv-card-no small { font-size: 0.55rem; font-weight: 900; letter-spacing: 0.04em; color: var(--tx-3); }
.rv .rv-card-no b { font-size: 0.78rem; font-weight: 700; color: var(--tx-2); }

.rv .rv-card-client { display: flex; align-items: center; gap: 10px; padding: 10px 14px 0; }
.rv .rv-card-client .rv-client-name { font-size: 0.98rem; line-height: 1.15; }
.rv .rv-card-veh { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 8px 14px 0; }

.rv .rv-route {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px;
  margin: 10px 14px 0; padding: 8px 10px; background: var(--surface-2); border-radius: 10px;
}
.rv .rv-date-block { display: flex; flex-direction: column; line-height: 1; }
.rv .rv-date-block.end { text-align: right; align-items: flex-end; }
.rv .rv-date-block .dd { font-size: 1.05rem; font-weight: 900; letter-spacing: -0.01em; }
.rv .rv-date-block .mm { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--acc-tx); margin-top: 2px; }
.rv .rv-date-block .yy { font-size: 0.58rem; font-weight: 600; color: var(--tx-3); margin-top: 1px; }
.rv .rv-route-mid { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; }
.rv .rv-route-mid .line { display: flex; align-items: center; width: 100%; color: var(--tx-3); }
.rv .rv-route-mid .line::before,
.rv .rv-route-mid .line::after { content: ""; flex: 1; border-top: 2px dotted var(--tx-3); }
.rv .rv-route-mid .line svg { flex-shrink: 0; color: var(--acc-tx); }

.rv .rv-money { margin: 10px 14px 12px; }
.rv .rv-money-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.rv .rv-money-top .lbl { font-size: 0.62rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: var(--tx-3); display: block; margin-bottom: 2px; }
.rv .rv-money-top .tot { font-size: 1.15rem; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
.rv .rv-money-top .tot small { font-size: 0.75rem; font-weight: 800; margin-left: 3px; color: var(--tx-2); }
.rv .rv-remaining { font-size: 0.8rem; font-weight: 800; text-align: right; }
.rv .rv-remaining.due { color: var(--danger); }
.rv .rv-remaining.ok { color: #0f8a43; }
.rv .rv-bar { height: 8px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--line); overflow: hidden; }
.rv .rv-bar i { display: block; height: 100%; border-radius: 999px; background: repeating-linear-gradient(-45deg, var(--blue) 0 8px, #5cc3f5 8px 16px); }
.rv .rv-bar.full i { background: #16a34a; }

.rv .rv-perf { border-top: 1px solid var(--line); margin: 4px 14px 0; }
.rv .rv-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 12px 14px 14px; }
.rv .rv-tiles.rv-tiles-one { grid-template-columns: 1fr; }
.rv .rv-tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
  background: rgba(127, 127, 127, 0.14);
  background: color-mix(in srgb, var(--t, #888) 14%, transparent);
  color: var(--t, var(--tx)); cursor: pointer;
  transition: transform 0.1s ease, background 0.15s ease;
}
.rv .rv-tile span { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.02em; color: var(--tx); line-height: 1; }
.rv .rv-tile:active { transform: scale(0.96); }

@media (max-width: 768px) {
  .rv .rv-history-cards { grid-template-columns: 1fr; }
}

/* ---------- Responsive ---------- */
.rv .ac-mobile-only { display: none; }
@media (max-width: 768px) {
    .rv .ac-wrap { padding: 1rem; }
    .rv .inline-form-container { margin: 0.6rem; border-radius: 22px; }
    .rv .inline-form-header { padding: 18px 64px 18px 18px; gap: 14px; }
    .rv .inline-form-icon { width: 48px; height: 48px; border-radius: 14px; }
    .rv .inline-form-title h2 { font-size: 1.2rem; overflow-wrap: anywhere; }
    .rv .inline-form-close { right: 14px; width: 40px; height: 40px; }
    .rv .inline-form { padding: 16px; }
    .rv .inline-form-footer { flex-direction: column-reverse; }
    .rv .inline-form-footer > * { width: 100%; }
    .rv .inline-secondary-btn { min-height: 48px; }
    .rv .rv-head { flex-direction: column; }
    .rv .rv-head-actions { width: 100%; gap: 6px; }
    .rv .rv-head-actions .ac-btn { flex: 1; height: 40px; padding: 0 10px; }
    .rv .ac-btn-text { display: none; }
    .rv .rv-stats { grid-template-columns: repeat(2, 1fr); }
    .rv .ac-filters { flex-direction: column; align-items: stretch; }
    .rv .ac-search { min-width: 100%; }
    .rv .ac-filters > .ac-dd { width: 100%; }
    .rv .ac-seg { align-self: stretch; }
    .rv .ac-seg-btn { flex: 1; justify-content: center; }
    .rv .ac-desktop-only { display: none !important; }
    .rv .ac-mobile-only { display: block !important; }
    .rv .cards-grid { grid-template-columns: 1fr; }

    /* iOS : 16px évite le zoom automatique */
    .rv .ac-search input { font-size: 16px; height: 42px; }
    .rv .ac-dd-trigger { font-size: 16px; height: 46px; }
    .rv .ac-sortdir { height: 46px; width: 46px; }

    .rv .modal-overlay { align-items: flex-end; padding: 0; }
    .rv .modal {
        max-width: 100% !important; max-height: 92vh;
        border-radius: 24px 24px 0 0; border-bottom: 0;
        animation: rvSheet 0.28s ease;
    }
}
.rv .btn-spinner {
  display: inline-block; width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0;
  border-radius: 50%; border: 2.5px solid currentColor; border-top-color: transparent;
  animation: btnSpin 0.6s linear infinite; vertical-align: middle;
}
.rv .btn-spinner.only { margin-right: 0; }
@keyframes btnSpin { to { transform: rotate(360deg); } }
.rv .rv-spin { animation: btnSpin 0.6s linear infinite; }
.rv .modal-btn:disabled,
.rv .ac-btn:disabled,
.rv .btn:disabled,
.rv .ac-action-btn:disabled,
.rv .ac-card-btn:disabled,
.rv .rv-ico:disabled,
.rv .rv-tile:disabled,
.rv .inline-history-delete:disabled,
.rv .pdf-action-btn:disabled,
.rv .rv-sigmenu button:disabled { opacity: 0.6; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) {
    .rv *, .rv *::before, .rv *::after { animation: none !important; transition: none !important; }
}
    `}</style>
  );
}