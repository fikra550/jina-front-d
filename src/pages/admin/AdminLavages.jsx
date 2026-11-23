// src/pages/admin/AdminLavages.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  fetchLavages, createLavage, updateLavage, deleteLavage,
  startLavage, completeLavage, cancelLavage,
  addLavagePayment, removeLavagePayment,
  addLavageProducts, removeLavageProduct,
  selectLavages, selectLavagesStats,
  fetchCars, fetchProducts, fetchUtilisateurs,
  selectProducts,
} from '../../Redux/store';
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import { printInvoice } from '../../utils/printInvoice';
import {
  Droplet, Plus, Pencil, Trash2, X, Play, CheckCircle2, Ban,
  CreditCard, Package, RefreshCw, Clock, Calendar, Car, User,
  Save, Sparkles, Tag, Image as ImageIcon, FileText, ChevronDown,
  Check, List, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown, Search,
  AlertCircle, Wallet, TrendingUp, Timer, Settings, Receipt,
} from 'lucide-react';

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

/* Facture : voir src/utils/printInvoice.js (même style que ContractLocation) */

const lavageClient = (l) => {
  const n = (l.client_name || '').trim();
  if (n) return n;
  if (l.client) return `${l.client.prenom || ''} ${l.client.nom || ''}`.trim();
  return '';
};

const lavageInvoice = (l) => {
  let services = l.services;
  if (typeof services === 'string') { try { services = JSON.parse(services); } catch { services = []; } }
  services = Array.isArray(services) ? services.filter((s) => s && s.name) : [];
  const price = Number(l.price) || 0;
  const lines = services.length
    ? services.map((s) => {
        const qty = Number(s.quantity) || 1;
        const unit = Number(s.price) || 0;
        return { label: s.name, qty, unit, total: qty * unit };
      })
    : [{ label: `Lavage ${l.type || ''}`.trim(), qty: 1, unit: price, total: price }];
  printInvoice({
    number: `FAC-L-${String(l.id).padStart(5, '0')}`,
    date: l.date_lavage,
    clientName: lavageClient(l) || '—',
    lines,
    subtotal: lines.reduce((s, x) => s + x.total, 0),
    discount: Number(l.discount_amount) || 0,
    tva: Number(l.tva_amount) || 0,
    total: price,
    paid: Number(l.amount_paid) || 0,
    notes: l.notes || '',
  });
};

const CONFIRM_META = {
  delete:  { title: 'Confirmer la suppression', icon: Trash2, btn: 'Supprimer',
             msg: 'Êtes-vous sûr de vouloir supprimer le lavage', warn: 'Le stock produit sera restauré.' },
  cancel:  { title: 'Annuler le lavage', icon: Ban, btn: 'Annuler le lavage',
             msg: 'Voulez-vous annuler le lavage', warn: 'Le stock produit sera restauré.' },
  payment: { title: 'Supprimer le paiement', icon: Trash2, btn: 'Supprimer',
             msg: 'Voulez-vous supprimer ce paiement du lavage', warn: '' },
  product: { title: 'Retirer le produit', icon: Trash2, btn: 'Retirer',
             msg: 'Voulez-vous retirer ce produit du lavage', warn: 'Le stock sera restauré.' },
};

const EMPTY = {
  client_name: '', reservation_id: '',
  date_lavage: new Date().toISOString().slice(0, 10),
  time_lavage: '', type: 'externe',
  services: [], price: 50, discount_amount: 0, tva_amount: 0,
  status: 'pending', payment_status: 'unpaid', amount_paid: 0,
  washer_name: '', assigned_to: '', bay: '',
  vehicle_condition_before: '', notes: '',
  photos_before: [], photos_after: [],
  products: [],
};

const SORT_OPTIONS = [
  { value: 'date_lavage', label: 'Date' },
  { value: 'client', label: 'Client' },
  { value: 'type', label: 'Type' },
  { value: 'price', label: 'Prix' },
  { value: 'status', label: 'Statut' },
  { value: 'amount_paid', label: 'Payé' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

const STATUS_LABEL = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const getStatusBadge = (status) => {
  const map = {
    pending:     { cls: 'badge-amber',   label: 'En attente', icon: Clock },
    in_progress: { cls: 'badge-blue',    label: 'En cours',   icon: Play },
    completed:   { cls: 'badge-success', label: 'Terminé',    icon: CheckCircle2 },
    cancelled:   { cls: 'badge-danger',  label: 'Annulé',     icon: Ban },
  };
  const c = map[status] || map.pending;
  const Icon = c.icon;
  return <span className={`badge ${c.cls}`}><Icon size={12} /> {c.label}</span>;
};

const getPaymentBadge = (l) => {
  const paid = Number(l.amount_paid) || 0;
  const price = Number(l.price) || 0;
  if (paid >= price && price > 0) {
    return <span className="badge badge-success"><CheckCircle2 size={12} /> Payé</span>;
  }
  if (paid > 0) {
    return <span className="badge badge-amber"><AlertCircle size={12} /> Partiel</span>;
  }
  return <span className="badge badge-danger"><X size={12} /> Impayé</span>;
};

export default function AdminLavages() {
  const dispatch = useDispatch();
  const lavages  = useSelector(selectLavages);
  const stats    = useSelector(selectLavagesStats);
  const products = useSelector(selectProducts);

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm]   = useState({ amount: 0, date: new Date().toISOString().slice(0,10), method: 'cash', notes: '' });

  const [confirmDlg, setConfirmDlg] = useState(null);

  const [productModal, setProductModal] = useState(null);
  const [productForm, setProductForm]   = useState({ products: [{ product_id: '', quantity: 1 }] });

  // Sorting & view state
  const [sortField, setSortField] = useState('date_lavage');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  useEffect(() => {
    dispatch(fetchLavages(true));
    dispatch(fetchCars());
    dispatch(fetchProducts());
    dispatch(fetchUtilisateurs());
  }, [dispatch]);

  useResetScrollOnOpen([
  showModal,
  paymentModal,
  productModal,
  confirmDlg,
]);

  const productById = useMemo(() => {
    const map = {};
    (products || []).forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  /* ---- services / products / photos helpers ---- */
  const addService    = () => setForm(f => ({ ...f, services: [...f.services, { id: Date.now().toString(), name: '', price: 0, quantity: 1 }] }));
  const updateService = (idx, key, value) => setForm(f => { const s = [...f.services]; s[idx] = { ...s[idx], [key]: value }; return { ...f, services: s }; });
  const removeService = (idx) => setForm(f => ({ ...f, services: f.services.filter((_, i) => i !== idx) }));

  const servicesTotal = useMemo(() => (form.services || []).reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.quantity) || 1), 0), [form.services]);
  const productsTotal = useMemo(() => (form.products || []).reduce((s, p) => {
    const prod = productById[p.product_id];
    const unit = Number(p.unit_cost ?? prod?.purchase_price ?? 0);
    return s + unit * (Number(p.quantity) || 0);
  }, 0), [form.products, productById]);

  const onPhotoChange = (field, files) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, [field]: [...(f[field] || []), reader.result] }));
      reader.readAsDataURL(file);
    });
  };
  const removePhoto = (field, idx) => setForm(f => ({ ...f, [field]: (f[field] || []).filter((_, i) => i !== idx) }));

  const addProductRow    = () => setForm(f => ({ ...f, products: [...f.products, { product_id: '', quantity: 1, unit_cost: '' }] }));
  const updateProductRow = (idx, key, value) => setForm(f => {
    const rows = [...f.products];
    const row = { ...rows[idx], [key]: value };
    if (key === 'product_id') { const prod = productById[value]; if (prod) row.unit_cost = prod.purchase_price; }
    rows[idx] = row;
    return { ...f, products: rows };
  });
  const removeProductRow = (idx) => setForm(f => ({ ...f, products: f.products.filter((_, i) => i !== idx) }));

  /* ---- CRUD ---- */
  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, date_lavage: new Date().toISOString().slice(0, 10) }); setShowModal(true); };
  const openEdit = (l) => {
    setEditing(l);
    setForm({
      client_name: lavageClient(l), reservation_id: l.reservation_id || '',
      date_lavage: (l.date_lavage || '').slice(0, 10),
      time_lavage: l.time_lavage || '', type: l.type || 'externe',
      services: l.services || [], price: Number(l.price) || 0,
      discount_amount: Number(l.discount_amount) || 0, tva_amount: Number(l.tva_amount) || 0,
      status: l.status || 'pending', payment_status: l.payment_status || 'unpaid',
      amount_paid: Number(l.amount_paid) || 0,
      washer_name: l.washer_name || '', assigned_to: l.assigned_to || '', bay: l.bay || '',
      vehicle_condition_before: l.vehicle_condition_before || '', notes: l.notes || '',
      photos_before: l.photos_before || [], photos_after: l.photos_after || [],
      products: (l.lavage_products || []).map(p => ({ product_id: p.product_id, quantity: p.quantity, unit_cost: p.unit_cost })),
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      client_name: (form.client_name || '').trim(),
      price: Number(form.price),
      discount_amount: Number(form.discount_amount) || 0,
      tva_amount: Number(form.tva_amount) || 0,
      amount_paid: Number(form.amount_paid) || 0,
      services: form.services.map(s => ({ ...s, price: Number(s.price), quantity: Number(s.quantity) || 1 })),
      products: form.products.filter(p => p.product_id && p.quantity > 0)
        .map(p => ({ ...p, quantity: Number(p.quantity), unit_cost: Number(p.unit_cost) || undefined })),
    };
    if (!payload.client_name && !editing) delete payload.client_name;
    if (!payload.reservation_id) delete payload.reservation_id;
    if (!payload.assigned_to)    delete payload.assigned_to;
    if (payload.products.length === 0 && editing) payload.products = [];

    const action = editing ? updateLavage({ id: editing.id, data: payload }) : createLavage(payload);
    const res = await dispatch(action);
    setSubmitting(false);
    if (res.error) {
      toast.error(res.payload || 'Erreur');
    } else {
      toast.success(editing ? 'Lavage mis à jour' : 'Lavage créé');
      setShowModal(false);
      if (payload.products.length > 0) dispatch(fetchProducts(true));
    }
  };

  const remove      = (id) => setConfirmDlg({ kind: 'delete', id });
  const onCancel    = (id) => setConfirmDlg({ kind: 'cancel', id });
  const undoPayment = (lavageId, paymentId) => setConfirmDlg({ kind: 'payment', id: lavageId, paymentId });
  const undoProduct = (lavageId, lpId) => setConfirmDlg({ kind: 'product', id: lavageId, lpId });

  const confirmAction = async () => {
    const d = confirmDlg;
    if (!d) return;
    try {
      let r;
      if (d.kind === 'delete') {
        r = await dispatch(deleteLavage(d.id));
        if (!r.error) { toast.success('Lavage supprimé'); dispatch(fetchProducts(true)); }
      } else if (d.kind === 'cancel') {
        r = await dispatch(cancelLavage(d.id));
        if (!r.error) { toast.success('Lavage annulé'); dispatch(fetchProducts(true)); }
      } else if (d.kind === 'payment') {
        r = await dispatch(removeLavagePayment({ id: d.id, payment_id: d.paymentId }));
        if (!r.error) {
          toast.success('Paiement supprimé');
          if (r.payload?.lavage) setPaymentModal(r.payload.lavage);
        }
      } else if (d.kind === 'product') {
        r = await dispatch(removeLavageProduct({ id: d.id, lavage_product_id: d.lpId }));
        if (!r.error) {
          toast.success('Produit retiré');
          dispatch(fetchProducts(true));
          if (r.payload?.lavage) setProductModal(r.payload.lavage);
        }
      }
      if (r?.error) toast.error(r.payload || 'Erreur');
    } finally {
      setConfirmDlg(null);
    }
  };

  const onStart    = async (id) => { const r = await dispatch(startLavage(id));               if (r.error) toast.error(r.payload); else toast.success('Lavage démarré'); };
  const onComplete = async (id) => { const r = await dispatch(completeLavage({ id, data: {} })); if (r.error) toast.error(r.payload); else toast.success('Lavage terminé'); };

  const openPayment = (l) => {
    setPaymentModal(l);
    setPaymentForm({ amount: Math.max(0, Number(l.price) - Number(l.amount_paid)), date: new Date().toISOString().slice(0, 10), method: 'cash', notes: '' });
  };
  const submitPayment = async (e) => {
    e.preventDefault();
    const r = await dispatch(addLavagePayment({ id: paymentModal.id, data: paymentForm }));
    if (r.error) toast.error(r.payload);
    else { toast.success('Paiement enregistré'); setPaymentModal(null); }
  };

  /* ---- multi-product add ---- */
  const openProductModal = (l) => {
    setProductModal(l);
    setProductForm({ products: [{ product_id: '', quantity: 1 }] });
  };
  const addProductFormRow    = () => setProductForm(f => ({ products: [...f.products, { product_id: '', quantity: 1 }] }));
  const updateProductFormRow = (idx, key, value) => setProductForm(f => {
    const rows = [...f.products];
    rows[idx] = { ...rows[idx], [key]: value };
    return { ...f, products: rows };
  });
  const removeProductFormRow = (idx) => setProductForm(f => ({ products: f.products.filter((_, i) => i !== idx) }));

  const submitProduct = async (e) => {
    e.preventDefault();
    const rows = productForm.products.filter(r => r.product_id && Number(r.quantity) > 0);
    if (rows.length === 0) return toast.error('Sélectionnez au moins un produit');

    const merged = {};
    rows.forEach(r => { const id = Number(r.product_id); merged[id] = (merged[id] || 0) + Number(r.quantity); });

    for (const [id, qty] of Object.entries(merged)) {
      const prod = productById[id];
      if (prod && prod.stock_quantity != null && qty > prod.stock_quantity) {
        return toast.error(`Stock insuffisant pour "${prod.name}" (dispo: ${prod.stock_quantity})`);
      }
    }

    const payload = {
      id: productModal.id,
      products: Object.entries(merged).map(([product_id, quantity]) => ({ product_id: Number(product_id), quantity })),
    };

    const r = await dispatch(addLavageProducts(payload));
    if (r.error) toast.error(r.payload);
    else { toast.success('Produits ajoutés'); dispatch(fetchProducts(true)); setProductModal(null); }
  };


  /* ---- Filter / Sort / Paginate ---- */
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

  const filteredLavages = useMemo(() => {
    let filtered = lavages;
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(l =>
        (l.matricule?.matricule_code || '').toLowerCase().includes(term) ||
        lavageClient(l).toLowerCase().includes(term) ||
        (l.washer_name || '').toLowerCase().includes(term) ||
        (l.vehicle_condition_before || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter) filtered = filtered.filter(l => l.status === statusFilter);

    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'date_lavage':
          aVal = new Date(a.date_lavage).getTime(); bVal = new Date(b.date_lavage).getTime(); break;
        case 'client':
          aVal = lavageClient(a).toLowerCase();
          bVal = lavageClient(b).toLowerCase(); break;
        case 'type':
          aVal = a.type || ''; bVal = b.type || ''; break;
        case 'price':
          aVal = Number(a.price) || 0; bVal = Number(b.price) || 0; break;
        case 'status':
          aVal = a.status || ''; bVal = b.status || ''; break;
        case 'amount_paid':
          aVal = Number(a.amount_paid) || 0; bVal = Number(b.amount_paid) || 0; break;
        default:
          aVal = a.id; bVal = b.id;
      }
      if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [lavages, search, statusFilter, sortField, sortDirection]);

  const itemsPerView = viewMode === 'list' ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredLavages.length / itemsPerView);
  const paginated = filteredLavages.slice((currentPage - 1) * itemsPerView, currentPage * itemsPerView);

  const anyModalOpen = showModal || paymentModal || productModal;

  const statCards = [
    { label: "Total",        value: stats.total       || 0, icon: <Droplet size={20} />,      color: "blue"   },
    { label: "En attente",   value: stats.pending     || 0, icon: <Clock size={20} />,         color: "violet" },
    { label: "En cours",     value: stats.in_progress || 0, icon: <Play size={20} />,          color: "cyan"   },
    { label: "Terminés",     value: stats.completed   || 0, icon: <CheckCircle2 size={20} />,  color: "green"  },
    { label: "Revenu",       value: `${Number(stats.total_revenue || 0).toFixed(0)} DH`, icon: <Wallet size={20} />, color: "blue" },
    { label: "Durée moy.",   value: stats.avg_duration ? `${Math.round(stats.avg_duration)} min` : '—', icon: <Timer size={20} />, color: "violet" },
  ];

  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === 'list' ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredLavages.length}
      />
    </div>
  );

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="rv">
      {/* ============ MAIN FORM (inline, like AdminCars) ============ */}
      {showModal && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editing ? <Sparkles size={28} /> : <Droplet size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editing ? 'Modifier lavage' : 'Nouveau lavage'}</h2>
              <p>{editing ? `Lavage #${editing.id}` : 'Enregistrer une nouvelle prestation de lavage'}</p>
            </div>
            <button type="button" className="inline-form-close" onClick={() => setShowModal(false)} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={submit} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Calendar size={18} /><h3>Détails du lavage</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Date *</label>
                      <input type="date" required className="inline-input" value={form.date_lavage}
                             onChange={e => setForm({ ...form, date_lavage: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Heure</label>
                      <input type="time" className="inline-input" value={form.time_lavage || ''}
                             onChange={e => setForm({ ...form, time_lavage: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Type *</label>
                      <select required className="inline-select" value={form.type}
                              onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="externe">Externe</option>
                        <option value="interne">Interne</option>
                        <option value="complet">Complet</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Prix (DH) *</label>
                      <input type="number" min="0" step="0.01" required className="inline-input" value={form.price}
                             onChange={e => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <select className="inline-select" value={form.status}
                              onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="pending">En attente</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Baie</label>
                      <input className="inline-input" value={form.bay || ''}
                             onChange={e => setForm({ ...form, bay: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Car size={18} /><h3>Véhicule & Client</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Client</label>
                      <input className="inline-input" placeholder="Saisir le nom du client"
                             value={form.client_name || ''}
                             onChange={e => setForm({ ...form, client_name: e.target.value })} />
                    </div>
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Laveur (nom)</label>
                      <input className="inline-input" value={form.washer_name || ''}
                             onChange={e => setForm({ ...form, washer_name: e.target.value })} />
                    </div>
                  </div>
                  <div className="inline-info-msg" style={{ marginTop: 14 }}>
                    <AlertCircle size={16} />
                    <span>Le véhicule appartient au client — décrivez-le dans « État du véhicule » ci-dessous si besoin.</span>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><FileText size={18} /><h3>État & Notes</h3></div>
                  <div className="inline-field">
                    <label>État du véhicule (avant)</label>
                    <textarea rows={2} className="inline-textarea" value={form.vehicle_condition_before || ''}
                              placeholder="Ex: Clio blanche — 12345-A-6 — rayure porte avant gauche"
                              onChange={e => setForm({ ...form, vehicle_condition_before: e.target.value })} />
                  </div>
                  <div className="inline-field" style={{ marginTop: '0.75rem' }}>
                    <label>Notes</label>
                    <textarea rows={2} className="inline-textarea" value={form.notes || ''}
                              onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Tag size={18} /><h3>Services effectués</h3></div>
                  <div className="section-header-inline">
                    <span className="section-label">{form.services.length} service(s)</span>
                    <button type="button" className="add-inline-btn" onClick={addService}><Plus size={14} /> Ajouter</button>
                  </div>
                  {form.services.length === 0 && (
                    <div className="inline-empty-hint">Aucun service détaillé</div>
                  )}
                  {form.services.map((s, i) => (
                    <div key={s.id || i} className="row-grid-services">
                      <input className="inline-input" placeholder="Nom" value={s.name} onChange={e => updateService(i, 'name', e.target.value)} />
                      <input className="inline-input" type="number" min="0" step="0.01" placeholder="Prix" value={s.price} onChange={e => updateService(i, 'price', e.target.value)} />
                      <input className="inline-input" type="number" min="1" placeholder="Qté" value={s.quantity} onChange={e => updateService(i, 'quantity', e.target.value)} />
                      <button type="button" className="row-remove-btn" onClick={() => removeService(i)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {form.services.length > 0 && (
                    <div className="subtotal-text">Sous-total services : <b>{servicesTotal.toFixed(2)} DH</b></div>
                  )}
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Package size={18} /><h3>Produits consommés</h3></div>
                  <div className="section-header-inline">
                    <span className="section-label">{form.products.length} produit(s)</span>
                    <button type="button" className="add-inline-btn" onClick={addProductRow}><Plus size={14} /> Ajouter</button>
                  </div>
                  {form.products.length === 0 && (
                    <div className="inline-empty-hint">Aucun produit</div>
                  )}
                  {form.products.map((p, i) => (
                    <div key={i} className="row-grid-products">
                      <select className="inline-select" value={p.product_id} onChange={e => updateProductRow(i, 'product_id', e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        {products.map(pr => (
                          <option key={pr.id} value={pr.id}>{pr.name} ({pr.stock_quantity} {pr.unit})</option>
                        ))}
                      </select>
                      <input className="inline-input" type="number" min="1" value={p.quantity} onChange={e => updateProductRow(i, 'quantity', e.target.value)} />
                      <input className="inline-input" type="number" min="0" step="0.01" placeholder="Coût" value={p.unit_cost} onChange={e => updateProductRow(i, 'unit_cost', e.target.value)} />
                      <button type="button" className="row-remove-btn" onClick={() => removeProductRow(i)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {form.products.length > 0 && (
                    <div className="subtotal-text">Coût produits : <b>{productsTotal.toFixed(2)} DH</b></div>
                  )}
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><ImageIcon size={18} /><h3>Photos</h3></div>
                  <div className="inline-field">
                    <label>Photos avant</label>
                    <input type="file" accept="image/*" multiple onChange={e => onPhotoChange('photos_before', e.target.files)} />
                    <div className="photo-previews">
                      {(form.photos_before || []).map((p, i) => (
                        <div key={i} className="photo-preview">
                          <img src={p} alt="" />
                          <button type="button" className="photo-preview-remove" onClick={() => removePhoto('photos_before', i)}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="inline-field" style={{ marginTop: '0.75rem' }}>
                    <label>Photos après</label>
                    <input type="file" accept="image/*" multiple onChange={e => onPhotoChange('photos_after', e.target.files)} />
                    <div className="photo-previews">
                      {(form.photos_after || []).map((p, i) => (
                        <div key={i} className="photo-preview">
                          <img src={p} alt="" />
                          <button type="button" className="photo-preview-remove" onClick={() => removePhoto('photos_after', i)}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                <Save size={16} /> {submitting ? 'Enregistrement…' : (editing ? 'Mettre à jour' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ PAYMENT FORM (inline) ============ */}
      {paymentModal && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><CreditCard size={28} /></div>
            <div className="inline-form-title">
              <h2>Paiement — Lavage #{paymentModal.id}</h2>
              <p>Enregistrer un nouveau paiement</p>
            </div>
            <button type="button" className="inline-form-close" onClick={() => setPaymentModal(null)} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={submitPayment} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><CreditCard size={18} /><h3>Récapitulatif</h3></div>
                  <div className="inline-info-msg">
                    <Wallet size={16} />
                    <span>
                      Prix total : <b>{Number(paymentModal.price).toFixed(2)} DH</b> — Déjà payé : <b>{Number(paymentModal.amount_paid).toFixed(2)} DH</b> — Reste : <b>{Math.max(0, Number(paymentModal.price) - Number(paymentModal.amount_paid)).toFixed(2)} DH</b>
                    </span>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Droplet size={18} /><h3>Nouveau paiement</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Montant *</label>
                      <input type="number" min="0.01" step="0.01" required className="inline-input"
                             value={paymentForm.amount}
                             onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Date *</label>
                      <input type="date" required className="inline-input" value={paymentForm.date}
                             onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Méthode</label>
                      <select className="inline-select" value={paymentForm.method}
                              onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                        <option value="cash">Espèces</option>
                        <option value="check">Chèque</option>
                        <option value="card">Carte</option>
                        <option value="transfer">Virement</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Notes</label>
                      <input className="inline-input" value={paymentForm.notes}
                             onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Clock size={18} /><h3>Historique des paiements</h3></div>
                  {paymentModal.payment_history?.length > 0 ? (
                    paymentModal.payment_history.map(p => (
                      <div key={p.id} className="history-row">
                        <span>{new Date(p.date).toLocaleDateString('fr-FR')} — <b>{Number(p.amount).toFixed(2)} DH</b> ({p.method})</span>
                        <button type="button" className="row-remove-btn" onClick={() => undoPayment(paymentModal.id, p.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="inline-empty-hint">Aucun paiement enregistré</div>
                  )}
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => setPaymentModal(null)}>Fermer</button>
              <button type="submit" className="inline-primary-btn"><Save size={16} /> Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {/* ============ PRODUCT FORM (inline, multi-row) ============ */}
      {productModal && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><Package size={28} /></div>
            <div className="inline-form-title">
              <h2>Produits — Lavage #{productModal.id}</h2>
              <p>Consommation de produits du stock</p>
            </div>
            <button type="button" className="inline-form-close" onClick={() => setProductModal(null)} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={submitProduct} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Package size={18} /><h3>Ajouter des produits</h3></div>
                  <div className="section-header-inline">
                    <span className="section-label">{productForm.products.length} ligne(s)</span>
                    <button type="button" className="add-inline-btn" onClick={addProductFormRow}>
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>

                  {productForm.products.map((row, idx) => {
                    const prod = productById[row.product_id];
                    const unit = Number(prod?.purchase_price) || 0;
                    const line = unit * (Number(row.quantity) || 0);
                    return (
                      <div key={idx} className="row-grid-products">
                        <select className="inline-select" value={row.product_id}
                                onChange={e => updateProductFormRow(idx, 'product_id', e.target.value)}>
                          <option value="">— Sélectionner —</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.stock_quantity} {p.unit})
                            </option>
                          ))}
                        </select>
                        <input className="inline-input" type="number" min="1" value={row.quantity}
                               onChange={e => updateProductFormRow(idx, 'quantity', e.target.value)} />
                        <span className="subtotal-text" style={{ alignSelf: 'center' }}>
                          {unit ? `${line.toFixed(2)} DH` : '—'}
                        </span>
                        <button type="button" className="row-remove-btn"
                                onClick={() => removeProductFormRow(idx)}
                                disabled={productForm.products.length === 1}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Package size={18} /><h3>Produits consommés</h3></div>
                  {productModal.lavage_products?.length > 0 ? (
                    productModal.lavage_products.map(lp => (
                      <div key={lp.id} className="history-row">
                        <span>{lp.product?.name} — {lp.quantity} × {Number(lp.unit_cost).toFixed(2)} DH</span>
                        <button type="button" className="row-remove-btn" onClick={() => undoProduct(productModal.id, lp.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="inline-empty-hint">Aucun produit consommé</div>
                  )}
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => setProductModal(null)}>Fermer</button>
              <button type="submit" className="inline-primary-btn"><Plus size={16} /> Ajouter</button>
            </div>
          </form>
        </div>
      )}

      {/* ============ MAIN LIST ============ */}
      {!anyModalOpen && (
        <div className="ac-wrap">
          {/* Header */}
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><Droplet size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">Lavages</h1>
                <p className="rv-sub">{lavages.length} lavage(s) enregistré(s)</p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button type="button" className="ac-btn" onClick={() => dispatch(fetchLavages(true))}>
                <RefreshCw size={15} /><span className="ac-btn-text">Actualiser</span>
              </button>
              <button type="button" className="ac-btn ac-btn-primary" onClick={openCreate}>
                <Plus size={15} /><span className="ac-btn-text">Nouveau lavage</span>
              </button>
            </div>
          </div>

          {/* Stats */}
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

          {/* Filters */}
          <div className="ac-filters">
            <div className="ac-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Rechercher par client, laveur, description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
              {search && (
                <button
                  type="button"
                  className="ac-search-clear"
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
                  aria-label="Effacer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="ac-dd" style={{ flex: '0 0 auto', minWidth: 180 }}>
              <AcSelect
                id="ac-status-filter"
                ariaLabel="Filtrer par statut"
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                options={STATUS_FILTER_OPTIONS}
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
            <p><strong>{filteredLavages.length}</strong> lavage(s) trouvé(s)</p>
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
                        <th onClick={() => handleSort('date_lavage')} className="sortable-header">Date {getSortIcon('date_lavage')}</th>
                        <th onClick={() => handleSort('client')} className="sortable-header">Client {getSortIcon('client')}</th>
                        <th>Véhicule</th>
                        <th onClick={() => handleSort('type')} className="sortable-header">Type {getSortIcon('type')}</th>
                        <th onClick={() => handleSort('price')} className="sortable-header">Prix {getSortIcon('price')}</th>
                        <th onClick={() => handleSort('status')} className="sortable-header">Statut {getSortIcon('status')}</th>
                        <th onClick={() => handleSort('amount_paid')} className="sortable-header">Payé {getSortIcon('amount_paid')}</th>
                        <th>Produits</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="ac-empty-cell">
                            <Droplet size={40} />
                            <p>Aucun lavage trouvé</p>
                          </td>
                        </tr>
                      ) : paginated.map(l => (
                        <tr key={l.id}>
                          <td>
                            <div className="ac-strong">{new Date(l.date_lavage).toLocaleDateString('fr-FR')}</div>
                            {l.time_lavage && <div className="ac-model" style={{ fontSize: '0.72rem' }}>{l.time_lavage}</div>}
                          </td>
                          <td>
                            {lavageClient(l) ? (
                              <div className="flex items-center gap-1">
                                <User size={14} />
                                <span className="ac-strong">{lavageClient(l)}</span>
                              </div>
                            ) : <span style={{ color: 'var(--tx-3)', fontStyle: 'italic' }}>—</span>}
                          </td>
                          <td>
                            <div className="ac-model" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {l.vehicle_condition_before
                                ? l.vehicle_condition_before.split('\n')[0].slice(0, 40)
                                : (l.matricule?.matricule_code || '—')}
                            </div>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{l.type}</td>
                          <td><span className="ac-price-pill">{Number(l.price).toFixed(2)} DH</span></td>
                          <td>{getStatusBadge(l.status)}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {getPaymentBadge(l)}
                              <span style={{ fontSize: '0.72rem', color: 'var(--tx-2)' }}>
                                {Number(l.amount_paid).toFixed(2)} / {Number(l.price).toFixed(2)} DH
                              </span>
                            </div>
                          </td>
                          <td>
                            {l.lavage_products?.length > 0 ? (
                              <span className="badge badge-purple"><Package size={12} /> {l.lavage_products.length}</span>
                            ) : (<span style={{ color: 'var(--tx-3)' }}>—</span>)}
                          </td>
                          <td className="text-right">
                            <div className="ac-actions">
                              {l.status === 'pending' && (
                                <button type="button" className="ac-action-btn ac-action-primary" onClick={() => onStart(l.id)} title="Démarrer">
                                  <Play size={15} />
                                </button>
                              )}
                              {(l.status === 'pending' || l.status === 'in_progress') && (
                                <button type="button" className="ac-action-btn ac-action-edit" onClick={() => onComplete(l.id)} title="Terminer">
                                  <CheckCircle2 size={15} />
                                </button>
                              )}
                              {(l.status === 'pending' || l.status === 'in_progress') && (
                                <button type="button" className="ac-action-btn ac-action-delete" onClick={() => onCancel(l.id)} title="Annuler">
                                  <Ban size={15} />
                                </button>
                              )}
                              <button type="button" className="ac-action-btn ac-action-info" onClick={() => openPayment(l)} title="Paiement">
                                <CreditCard size={15} />
                              </button>
                              <button type="button" className="ac-action-btn ac-action-invoice" onClick={() => lavageInvoice(l)} title="Facture (PDF)">
                                <Receipt size={15} />
                              </button>
                              <button type="button" className="ac-action-btn ac-action-primary" onClick={() => openProductModal(l)} title="Produits">
                                <Package size={15} />
                              </button>
                              <button type="button" className="ac-action-btn ac-action-edit" onClick={() => openEdit(l)} title="Modifier">
                                <Pencil size={15} />
                              </button>
                              <button type="button" className="ac-action-btn ac-action-delete" onClick={() => remove(l.id)} title="Supprimer">
                                <Trash2 size={15} />
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
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    aria-label={sortDirection === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                  >
                    {sortDirection === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  </button>
                </div>

                {paginated.length === 0 ? (
                  <div className="ac-empty-card">
                    <Droplet size={40} />
                    <p>Aucun lavage trouvé</p>
                  </div>
                ) : (
                  <div className="ac-mcards">
                    {paginated.map(l => (
                      <div key={l.id} className="ac-mcard">
                        <div className="ac-mcard-head">
                          <div className="ac-mcard-avatar"><Droplet size={20} /></div>
                          <div className="ac-mcard-info">
                            <div className="ac-mcard-name">
                              {lavageClient(l) || `Lavage #${l.id}`}
                            </div>
                            <div className="ac-mcard-sub">
                              <span className="ac-id">#{l.id}</span>
                              <span style={{ marginLeft: 8 }}>
                                <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                                {new Date(l.date_lavage).toLocaleDateString('fr-FR')}
                                {l.time_lavage && ` • ${l.time_lavage}`}
                              </span>
                            </div>
                          </div>
                          <div className="ac-mcard-price">
                            {Number(l.price).toFixed(2)}<small> DH</small>
                          </div>
                        </div>

                        <div className="ac-mcard-badges">
                          {getStatusBadge(l.status)}
                          {getPaymentBadge(l)}
                          <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{l.type}</span>
                        </div>

                        <div className="ac-mcard-meta">
                          <span><Car size={13} /> {l.vehicle_condition_before
                            ? l.vehicle_condition_before.split('\n')[0].slice(0, 30)
                            : (l.matricule?.matricule_code || '—')}</span>
                          {l.washer_name && <span><User size={13} /> {l.washer_name}</span>}
                          {l.lavage_products?.length > 0 && (
                            <span><Package size={13} /> {l.lavage_products.length} produit(s)</span>
                          )}
                        </div>

                        <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                          {l.status === 'pending' && (
                            <button type="button" onClick={() => onStart(l.id)} className="ac-card-btn ac-action-primary">
                              <Play size={17} /><span>Démarrer</span>
                            </button>
                          )}
                          {(l.status === 'pending' || l.status === 'in_progress') && (
                            <button type="button" onClick={() => onComplete(l.id)} className="ac-card-btn ac-action-edit">
                              <CheckCircle2 size={17} /><span>Terminer</span>
                            </button>
                          )}
                          <button type="button" onClick={() => openPayment(l)} className="ac-card-btn ac-action-info">
                            <CreditCard size={17} /><span>Paiement</span>
                          </button>
                          <button type="button" onClick={() => lavageInvoice(l)} className="ac-card-btn ac-action-invoice">
                            <Receipt size={17} /><span>Facture</span>
                          </button>
                          <button type="button" onClick={() => openProductModal(l)} className="ac-card-btn ac-action-primary">
                            <Package size={17} /><span>Produits</span>
                          </button>
                          <button type="button" onClick={() => openEdit(l)} className="ac-card-btn ac-action-edit">
                            <Pencil size={17} /><span>Modifier</span>
                          </button>
                          <button type="button" onClick={() => remove(l.id)} className="ac-card-btn ac-action-delete">
                            <Trash2 size={17} /><span>Suppr.</span>
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
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  aria-label={sortDirection === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                >
                  {sortDirection === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
              </div>

              {paginated.length === 0 ? (
                <div className="ac-empty-card">
                  <Droplet size={40} />
                  <p>Aucun lavage trouvé</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {paginated.map(l => (
                    <div key={l.id} className="car-card lavage-card">
                      <div className="lavage-card-head">
                        <div className="lavage-avatar"><Droplet size={26} /></div>
                        <div className="lavage-head-info">
                          <div className="lavage-name">
                            {lavageClient(l) || `Lavage #${l.id}`}
                          </div>
                          <div className="lavage-meta-line">
                            <span className="ac-id">#{l.id}</span>
                            <span>
                              <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                              {new Date(l.date_lavage).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <div className="lavage-price">{Number(l.price).toFixed(0)}<small> DH</small></div>
                      </div>

                      <div className="lavage-badges">
                        {getStatusBadge(l.status)}
                        {getPaymentBadge(l)}
                        <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{l.type}</span>
                      </div>

                      <div className="lavage-details">
                        <div className="lavage-info-line">
                          <Car size={13} />
                          <span>{l.vehicle_condition_before
                            ? l.vehicle_condition_before.split('\n')[0].slice(0, 40)
                            : (l.matricule?.matricule_code || '—')}</span>
                        </div>
                        {l.washer_name && (
                          <div className="lavage-info-line"><User size={13} /> <span>{l.washer_name}</span></div>
                        )}
                        {l.time_lavage && (
                          <div className="lavage-info-line"><Clock size={13} /> <span>{l.time_lavage}</span></div>
                        )}
                        {l.lavage_products?.length > 0 && (
                          <div className="lavage-info-line">
                            <Package size={13} /> <span>{l.lavage_products.length} produit(s) — {Number(l.amount_paid).toFixed(0)}/{Number(l.price).toFixed(0)} DH payé</span>
                          </div>
                        )}
                      </div>

                      <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {l.status === 'pending' && (
                          <button type="button" onClick={() => onStart(l.id)} className="ac-card-btn ac-action-primary">
                            <Play size={17} /><span>Démarrer</span>
                          </button>
                        )}
                        {(l.status === 'pending' || l.status === 'in_progress') && (
                          <button type="button" onClick={() => onComplete(l.id)} className="ac-card-btn ac-action-edit">
                            <CheckCircle2 size={17} /><span>Terminer</span>
                          </button>
                        )}
                        <button type="button" onClick={() => openPayment(l)} className="ac-card-btn ac-action-info">
                          <CreditCard size={17} /><span>Paiement</span>
                        </button>
                          <button type="button" onClick={() => lavageInvoice(l)} className="ac-card-btn ac-action-invoice">
                            <Receipt size={17} /><span>Facture</span>
                          </button>
                        <button type="button" onClick={() => openProductModal(l)} className="ac-card-btn ac-action-primary">
                          <Package size={17} /><span>Produits</span>
                        </button>
                        <button type="button" onClick={() => openEdit(l)} className="ac-card-btn ac-action-edit">
                          <Pencil size={17} /><span>Modifier</span>
                        </button>
                        <button type="button" onClick={() => remove(l.id)} className="ac-card-btn ac-action-delete">
                          <Trash2 size={17} /><span>Suppr.</span>
                        </button>
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

      {/* ============ MODAL CONFIRMATION (style produits) ============ */}
      {confirmDlg && (() => {
        const meta = CONFIRM_META[confirmDlg.kind];
        const Icon = meta.icon;
        return (
          <div className="modal-overlay" onClick={() => setConfirmDlg(null)}>
            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-icon"><Icon size={32} /></div>
              <h3 className="delete-title">{meta.title}</h3>
              <p className="delete-message">
                {meta.msg} <br />
                <span className="reservation-id">Lavage #{confirmDlg.id}</span> ?<br />
                {meta.warn && (
                  <><span style={{ color: '#dc2626', fontSize: '0.8rem' }}>⚠️ {meta.warn}</span><br /></>
                )}
                Cette action est irréversible.
              </p>
              <div className="delete-actions">
                <button type="button" onClick={() => setConfirmDlg(null)}
                  className="modal-btn modal-btn-cancel">Retour</button>
                <button type="button" onClick={confirmAction} className="modal-btn btn-delete">
                  {meta.btn}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

/* ---------- Inline form ---------- */
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
.rv .inline-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.rv .inline-form-col { display: flex; flex-direction: column; gap: 22px; min-width: 0; }

.rv .inline-section {
    background: var(--surface-2); border: 1.5px solid var(--line);
    border-radius: 20px; padding: 20px; min-width: 0;
}
.rv .inline-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.rv .inline-section-header svg {
    width: 30px; height: 30px; padding: 6px; border-radius: 50%;
    background: var(--acc); color: #0a0a0a; flex-shrink: 0;
}
.rv .inline-section-header h3 {
    margin: 0; font-size: 0.82rem; font-weight: 900;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--tx); white-space: nowrap;
}
.rv .inline-section-header::after {
    content: ""; flex: 1; border-bottom: 2px dotted var(--tx-3);
    transform: translateY(4px); min-width: 12px;
}

.rv .inline-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.rv .inline-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.rv .inline-field label {
    font-size: 0.66rem; font-weight: 900; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--tx-2);
}
.rv .inline-input,
.rv .inline-select,
.rv .inline-textarea {
    width: 100%; min-height: 44px; padding: 10px 14px;
    border: 1.5px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--tx);
    font-size: 0.9rem; font-family: inherit; transition: border-color 0.15s;
}
.rv .inline-textarea { resize: vertical; min-height: 70px; }
.rv .inline-select {
    appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 38px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23a16207' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
}
.rv .inline-input:focus,
.rv .inline-select:focus,
.rv .inline-textarea:focus { outline: none; border-color: var(--blue); }
.rv .inline-input::placeholder,
.rv .inline-textarea::placeholder { color: var(--tx-3); }

.rv .inline-info-msg {
    display: flex; align-items: center; gap: 10px;
    margin-top: 14px; padding: 11px 14px; border-radius: 12px;
    font-size: 0.78rem; font-weight: 700; border: 1.5px solid;
    background: rgba(29,161,232,0.12); border-color: var(--blue); color: var(--blue-d);
}
.rv .inline-info-msg svg { flex-shrink: 0; }
.rv .inline-empty-hint { font-size: 0.78rem; color: var(--tx-3); font-style: italic; }

.rv .inline-primary-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 46px; padding: 0 26px; border-radius: 999px;
    border: 1.5px solid var(--line-strong); background: var(--acc); color: #0a0a0a;
    font-size: 0.9rem; font-weight: 800; cursor: pointer;
    transition: transform 0.1s, background 0.15s;
}
.rv .inline-primary-btn:hover:not(:disabled) { background: var(--acc-d); transform: translateY(-1px); }
.rv .inline-primary-btn:active:not(:disabled) { transform: translateY(3px); }
.rv .inline-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rv .inline-secondary-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 46px; padding: 0 22px; border-radius: 999px;
    border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
    font-size: 0.88rem; font-weight: 800; cursor: pointer;
    transition: transform 0.1s, background 0.15s;
}
.rv .inline-secondary-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
.rv .inline-secondary-btn:active { transform: translateY(2px); }

.rv .inline-form-footer {
    display: flex; justify-content: flex-end; gap: 14px;
    margin-top: 24px; padding-top: 22px; border-top: 2px dotted var(--line);
}

/* Form row helpers */
.rv .section-header-inline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.rv .section-label { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); }
.rv .add-inline-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 12px; border-radius: 8px; border: 0;
    background: var(--acc); color: #0a0a0a; font-size: 0.72rem; font-weight: 800; cursor: pointer;
}
.rv .add-inline-btn:hover { background: var(--acc-d); }
.rv .row-grid-services,
.rv .row-grid-products { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.rv .row-remove-btn {
    width: 38px; height: 38px; border: 0; border-radius: 10px;
    background: rgba(220,38,38,0.12); color: var(--danger);
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background 0.15s;
}
.rv .row-remove-btn:hover { background: rgba(220,38,38,0.2); }
.rv .row-remove-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.rv .subtotal-text { font-size: 0.78rem; color: var(--tx-2); margin-top: 4px; text-align: right; }
.rv .subtotal-text b { color: var(--acc-tx); font-weight: 900; }

.rv .photo-previews { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.rv .photo-preview { position: relative; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); }
.rv .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.rv .photo-preview-remove {
    position: absolute; top: 2px; right: 2px;
    background: rgba(0,0,0,0.7); color: #fff; border: none; border-radius: 50%;
    width: 20px; height: 20px; font-size: 14px; line-height: 1; cursor: pointer;
}
.rv .history-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 0.82rem; gap: 10px;
}
.rv .history-row:last-child { border-bottom: none; }

/* ---------- Modal confirmation (style produits) ---------- */
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
.rv .modal-btn {
    flex: 1; height: 46px; border-radius: 999px;
    border: 1.5px solid var(--line-strong);
    font-size: 0.88rem; font-weight: 800; cursor: pointer; transition: transform 0.1s;
}
.rv .modal-btn:active { transform: translateY(3px); }
.rv .modal-btn-cancel { background: var(--surface); color: var(--tx); }
.rv .btn-delete { background: var(--danger); color: #fff; }
.rv .delete-modal { max-width: 420px; padding: 28px 22px 22px; text-align: center; }
.rv .delete-icon {
    width: 72px; height: 72px; margin: 0 auto 14px; border-radius: 50%;
    background: #fde6e8; border: 2px solid var(--danger); color: var(--danger);
    display: flex; align-items: center; justify-content: center;
}
.rv .delete-title { font-size: 1.25rem; font-weight: 900; margin: 0 0 8px; }
.rv .delete-message { font-size: 0.88rem; color: var(--tx-2); margin: 0 0 12px; line-height: 1.5; }
.rv .reservation-id {
    display: inline-block; background: var(--ink); color: #fff;
    padding: 2px 12px; border-radius: 8px; font-weight: 900;
    font-style: italic; letter-spacing: 0.05em; margin: 4px 0;
}
.rv .delete-actions { display: flex; gap: 0.75rem; padding-top: 8px; }
@media (prefers-color-scheme: dark) {
    .rv .delete-icon { background: rgba(220, 38, 38, 0.18); }
    .rv .reservation-id { background: #f2f3f5; color: #0a0a0a; }
}

/* ---------- Bouton facture ---------- */
.rv .ac-action-invoice { color: #8b5cf6; }
.rv .ac-action-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:active { background: #f3e8ff; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:active { background: #4c1d95; }
}

/* ---------- Page wrap ---------- */
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
.rv .ac-btn-primary {
    background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; border-color: transparent;
    box-shadow: 0 4px 14px -4px rgba(15, 23, 42, 0.4);
}
.rv .ac-btn-primary:hover { background: linear-gradient(135deg, #0f172a, #1e293b); border-color: transparent; box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.5); }

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
.rv .ac-table { width: 100%; min-width: 1100px; border-collapse: collapse; font-size: 0.82rem; }
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
.rv .ac-table td .flex { font-size: 0.8rem; color: var(--tx-2); white-space: nowrap; }
.rv .ac-table td .flex svg { color: var(--tx-3); flex-shrink: 0; }
.rv .ac-table tbody tr td:first-child { box-shadow: inset 3px 0 0 transparent; transition: box-shadow 0.15s, background 0.15s; }
.rv .ac-table tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 #eab308; }
.rv .ac-empty-cell { text-align: center; padding: 48px 20px !important; color: var(--tx-3) !important; }
.rv .ac-empty-cell p { margin: 8px 0 0; font-size: 0.85rem; }
.rv .ac-empty-card {
    text-align: center; padding: 40px 20px; color: var(--tx-3);
    background: var(--surface); border: 1px dashed var(--line); border-radius: 14px;
}
.rv .ac-empty-card p { margin: 8px 0 0; font-size: 0.85rem; }

.rv .flex { display: flex; }
.rv .items-center { align-items: center; }
.rv .gap-1 { gap: 0.25rem; }

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
.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }
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
.rv .ac-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); margin-top: 12px; }
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

/* ---------- Mobile cards ---------- */
.rv .ac-mcards { display: flex; flex-direction: column; gap: 10px; }
.rv .ac-mcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
.rv .ac-mcard-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .ac-mcard-avatar {
    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff;
    display: flex; align-items: center; justify-content: center;
}
.rv .ac-mcard-info { flex: 1; min-width: 0; }
.rv .ac-mcard-name { font-weight: 800; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .ac-mcard-sub { margin-top: 4px; font-size: 0.72rem; color: var(--tx-2); display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.rv .ac-mcard-price { font-weight: 800; font-size: 1rem; white-space: nowrap; color: var(--acc-tx); }
.rv .ac-mcard-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rv .ac-mcard-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; font-size: 0.75rem; color: var(--tx-2); }
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; overflow-wrap: anywhere; }

/* ---------- Cards view ---------- */
.rv .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }
.rv .car-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
    display: flex; flex-direction: column;
}
.rv .car-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18); }
.rv .lavage-card { padding: 16px; }
.rv .lavage-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .lavage-avatar {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 18px -6px rgba(245, 158, 11, 0.5);
}
.rv .lavage-head-info { min-width: 0; flex: 1; }
.rv .lavage-name { font-weight: 800; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .lavage-meta-line { margin-top: 4px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.72rem; color: var(--tx-2); }
.rv .lavage-price { font-weight: 900; font-size: 1.1rem; color: var(--acc-tx); white-space: nowrap; }
.rv .lavage-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
.rv .lavage-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.rv .lavage-details {
    background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px;
    padding: 10px 12px; margin-bottom: 4px; display: flex; flex-direction: column; gap: 6px;
}
.rv .lavage-info-line { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--tx-2); overflow-wrap: anywhere; }
.rv .lavage-info-line svg { color: var(--tx-3); flex-shrink: 0; }

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

/* ---------- Dropdown ---------- */
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

/* ---------- Responsive ---------- */
.rv .ac-mobile-only { display: none; }
@media (max-width: 1024px) {
    .rv .inline-form-grid { grid-template-columns: 1fr; gap: 22px; }
}
@media (max-width: 768px) {
    .rv .ac-wrap { padding: 1rem; }
    .rv .rv-head { flex-direction: column; }
    .rv .rv-head-actions { width: 100%; gap: 6px; }
    .rv .rv-head-actions .ac-btn { flex: 1; height: 40px; padding: 0 10px; }
    .rv .ac-btn-text { display: none; }
    .rv .ac-btn-primary .ac-btn-text { display: inline; }
    .rv .ac-btn-primary { flex: 2; }
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
    .rv .inline-input,
    .rv .inline-select,
    .rv .inline-textarea { font-size: 16px; }

    .rv .inline-form-container { margin: 0.6rem; border-radius: 22px; }
    .rv .inline-form-header { padding: 18px 64px 18px 18px; gap: 14px; }
    .rv .inline-form-icon { width: 48px; height: 48px; border-radius: 14px; }
    .rv .inline-form-title h2 { font-size: 1.2rem; }
    .rv .inline-form-close { right: 14px; width: 40px; height: 40px; }
    .rv .inline-form { padding: 16px; }
    .rv .inline-section { padding: 16px; border-radius: 18px; }
    .rv .inline-grid-2 { grid-template-columns: 1fr; }
    .rv .inline-form-footer { flex-direction: column-reverse; padding-bottom: calc(0px + env(safe-area-inset-bottom, 0px)); }
    .rv .inline-form-footer > * { width: 100%; }
    .rv .inline-section-header h3 { white-space: normal; font-size: 0.76rem; }
    .rv .modal-overlay { align-items: flex-end; padding: 0; }
    .rv .modal {
        max-width: 100% !important; max-height: 92vh;
        border-radius: 24px 24px 0 0; border-bottom: 0;
        animation: rvSheet 0.28s ease;
    }
    .rv .delete-actions { flex-direction: column-reverse; }
    .rv .delete-actions { gap: 10px; }
    .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }
    .rv .delete-modal { padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }
    .rv .row-grid-services,
    .rv .row-grid-products { grid-template-columns: 1fr; }
}
@media (max-width: 380px) {
    .rv .inline-form-container { margin: 0.4rem; }
    .rv .inline-form-header { padding: 14px 56px 14px 14px; }
    .rv .inline-form-icon { width: 42px; height: 42px; }
    .rv .inline-form-title h2 { font-size: 1.05rem; }
    .rv .inline-form { padding: 12px; }
}
@media (prefers-reduced-motion: reduce) {
    .rv *, .rv *::before, .rv *::after { animation: none !important; transition: none !important; }
}
    `}</style>
  );
}