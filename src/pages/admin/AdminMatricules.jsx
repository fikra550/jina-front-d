// src/pages/admin/AdminMatricules.jsx
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  fetchMatricules, fetchCars, createMatricule, updateMatricule, deleteMatricule,
  refreshMatricules,
  fetchReservations, createAccident,
  fetchProducts, addMaintenanceWithQuantity,
  selectMatricules, selectCars, selectMatriculesLoading, selectReservations,
  selectProducts,
  fetchClients, selectClients
} from "../../Redux/store";
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Search, RefreshCw, Car, Tag, Gauge, Calendar,
  CheckCircle, XCircle, AlertCircle, Save, Sparkles, Star, Info,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, Droplet, Filter, Wind, CircleStop,
  Droplets, PlusCircle, History, Clock, Wrench, FileText, AlertTriangle,
  Loader2, User, Scale, Gavel, Package, List, LayoutGrid, Check, ChevronDown,
  CarFront
} from "lucide-react";

/* Produits liquides : stock suivi en litres (contenance par unité) */
const isLiquid = (p) => Number(p?.volume_per_unit) > 0;
const roundL = (n) => Number(Number(n || 0).toFixed(2));
const availableOf = (p) => {
  if (!p) return 0;
  if (!isLiquid(p)) return Number(p.stock_quantity) || 0;
  return roundL(p.total_volume ?? (Number(p.stock_quantity) || 0) * Number(p.volume_per_unit) + Number(p.open_volume || 0));
};
const unitLabelOf = (p) => (isLiquid(p) ? 'L' : (p?.unit || ''));
const defaultCostOf = (p) =>
  p ? (isLiquid(p) ? roundL(Number(p.purchase_price) / Number(p.volume_per_unit)) : Number(p.purchase_price)) : '';

/* Product filter hints per maintenance type */
const PRODUCT_HINTS = {
  oil:              ['huile', 'oil', 'moteur'],
  ad_blue:          ['adblue', 'ad blue', 'urée', 'uree'],
  filter_oil:       ['filtre', 'huile', 'oil'],
  filter_air:       ['filtre', 'air'],
  paquets_de_frein: ['frein', 'plaquette', 'brake'],
};

/* Metadata for the simple "Ajouter maintenance" modal */
const MAINT_TYPE_META = {
  oil:              { label: 'Vidange (Huile)',   icon: Droplet,    unit: 'L', needsQty: true  },
  ad_blue:          { label: 'AdBlue',            icon: Droplets,   unit: 'L', needsQty: true  },
  filter_oil:       { label: 'Filtre à huile',    icon: Filter,     unit: 'u', needsQty: false },
  filter_air:       { label: 'Filtre à air',      icon: Wind,       unit: 'u', needsQty: false },
  paquets_de_frein: { label: 'Plaquettes frein',  icon: CircleStop, unit: 'u', needsQty: false },
};

const SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "matricule", label: "Plaque" },
  { value: "car", label: "Voiture" },
  { value: "kilometrage", label: "Kilométrage" },
  { value: "status", label: "Statut" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tous statuts" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
  { value: "sold", label: "Vendus" },
];

// Menu déroulant personnalisé (remplace le <select> natif, non stylable sur mobile)
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

export default function AdminMatricules() {
  const dispatch = useDispatch();
  const matricules = useSelector(selectMatricules);
  const cars = useSelector(selectCars);
  const loading = useSelector(selectMatriculesLoading);
  const reservations = useSelector(selectReservations);
  const clients = useSelector(selectClients);
  const products = useSelector(selectProducts) || [];

  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const focusId = searchParams.get('focus');

  const [showMatriculeForm, setShowMatriculeForm] = useState(false);
  const [showMatriculeDetails, setShowMatriculeDetails] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [matriculeToDelete, setMatriculeToDelete] = useState(null);
  const [selectedMatricule, setSelectedMatricule] = useState(null);
  const [editingMatricule, setEditingMatricule] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'

  /* ----- Simple "Ajouter maintenance" modal state ----- */
  const [addMaintMatricule, setAddMaintMatricule] = useState(null);
  const [addMaintForm, setAddMaintForm] = useState({
    type: 'oil', quantity: '', date: new Date().toISOString().slice(0, 10),
    productId: '', unitCost: '',
  });

  const [showAccidentForm, setShowAccidentForm] = useState(false);
  const [selectedMatriculeForAccident, setSelectedMatriculeForAccident] = useState(null);
  const [accidentSubmitting, setAccidentSubmitting] = useState(false);
  const [reservationsForMatricule, setReservationsForMatricule] = useState([]);
  const [accidentFormData, setAccidentFormData] = useState({
    matricule_id: '', car_id: '', client_id: '', reservation_id: '',
    date_accident: new Date().toISOString().slice(0, 10),
    amount_of_losses: 0, amount_assurance: 0, nom_expert: '',
    status: 'open', accident_type: 'grave', procedure_type: 'classic',
    expert_decision: 'pending', expert_amount: 0, expert_notes: '', notes: ''
  });

  const [reservationSearchTerm, setReservationSearchTerm] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filteredReservations, setFilteredReservations] = useState([]);

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState('required');
  const [showAddForm, setShowAddForm] = useState(null);
  const [showHistoryFor, setShowHistoryFor] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [maintProductId, setMaintProductId] = useState('');
  const [maintUnitCost, setMaintUnitCost] = useState('');
  const [additionalItemName, setAdditionalItemName] = useState('');
  const [additionalItemQuantity, setAdditionalItemQuantity] = useState('');
  const [additionalItemRequired, setAdditionalItemRequired] = useState(false);
  const [additionalItemType, setAdditionalItemType] = useState('quantity');
  const [additionalItemNotes, setAdditionalItemNotes] = useState('');

  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);
  const [carSearchTerm, setCarSearchTerm] = useState("");
  const [selectedCar, setSelectedCar] = useState(null);
  const [filteredCars, setFilteredCars] = useState([]);

  const [formData, setFormData] = useState({
    matricule_code: "", car_id: "", status: "active", kilometrage: 0,
    visit_tech: "", date_assurance: "", date_taxe_voiture: "", vidange_status: "not done"
  });

  useEffect(() => {
    loadData();
    dispatch(fetchReservations());
    dispatch(fetchProducts());
  }, [dispatch]);
  
  useResetScrollOnOpen([
  showMatriculeForm,
  showMatriculeDetails,
  showAccidentForm,
  addMaintMatricule,   // object or null — coerced to boolean by `.some(Boolean)`
  showHistoryFor,      // id / null — same
  deleteModalOpen,
]);

  useEffect(() => {
    if (focusId && matricules.length > 0) {
      const found = matricules.find(m => m.id === parseInt(focusId));
      if (found) {
        setSearchTerm(found.matricule_code);
        setCurrentPage(1);
        setSelectedMatricule(found);
        setShowMatriculeDetails(true);
        setSearchParams({});
      } else {
        toast.warning(`Matricule #${focusId} non trouvé`);
        setSearchParams({});
      }
    }
  }, [focusId, matricules, setSearchParams]);

  const loadData = async () => {
    await Promise.all([dispatch(fetchMatricules()), dispatch(fetchCars()), dispatch(fetchClients())]);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await dispatch(refreshMatricules());
    await dispatch(fetchCars());
    await dispatch(fetchClients());
    await dispatch(fetchReservations());
    await dispatch(fetchProducts(true));
    setRefreshing(false);
    toast.success("Données actualisées");
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try { const d = new Date(dateString); if (isNaN(d)) return ""; return d.toISOString().slice(0, 10); } catch { return ""; }
  };

  const updateLocalMatricule = (updatedData) => setSelectedMatricule(prev => ({ ...prev, ...updatedData }));

  const hasMatriculeNotification = (mat) => {
    const vt = mat.visit_tech ? new Date(mat.visit_tech) : null;
    const ass = mat.date_assurance ? new Date(mat.date_assurance) : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const vtExp = vt && vt < today;
    const vtSoon = vt && (vt - today) / (1000 * 60 * 60 * 24) <= 7 && vt >= today;
    const assExp = ass && ass < today;
    const assSoon = ass && (ass - today) / (1000 * 60 * 60 * 24) <= 7 && ass >= today;
    return vtExp || vtSoon || assExp || assSoon;
  };

  /* ==================== PRODUCT HELPERS ==================== */
  const getSuggestedProducts = (type) => {
    if (!products.length) return [];
    const hints = PRODUCT_HINTS[type] || [];
    const filtered = products.filter(p => {
      const cat = (p.category?.name || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const ref = (p.reference || '').toLowerCase();
      return hints.some(h => cat.includes(h) || name.includes(h) || ref.includes(h));
    });
    return filtered.length ? filtered : products;
  };

  const pickProduct = (productId) => {
    setMaintProductId(productId);
    const p = products.find(x => String(x.id) === String(productId));
    setMaintUnitCost(defaultCostOf(p));
  };

  const resetMaintProduct = () => {
    setMaintProductId('');
    setMaintUnitCost('');
  };

  /* ==================== SIMPLE AJOUTER-MAINTENANCE MODAL ==================== */
  const openAddMaint = (mat) => {
    setAddMaintMatricule(mat);
    setAddMaintForm({
      type: 'oil', quantity: '',
      date: new Date().toISOString().slice(0, 10),
      productId: '', unitCost: '',
    });
  };

  const closeAddMaint = () => {
    setAddMaintMatricule(null);
    setAddMaintForm({ type: 'oil', quantity: '', date: '', productId: '', unitCost: '' });
  };

  const submitAddMaintenance = async () => {
    if (!addMaintMatricule) return;
    const meta = MAINT_TYPE_META[addMaintForm.type];
    const quantity = meta.needsQty ? parseFloat(addMaintForm.quantity) : 1;
    if (meta.needsQty && (!addMaintForm.quantity || quantity <= 0)) {
      toast.error(`Veuillez saisir une quantité (${meta.unit})`); return;
    }
    if (!addMaintForm.date) { toast.error("Veuillez saisir une date"); return; }

    const payload = { type: addMaintForm.type, date: addMaintForm.date, quantity };
    if (addMaintForm.productId) {
      payload.product_id = Number(addMaintForm.productId);
      if (addMaintForm.unitCost !== '') payload.unit_cost = Number(addMaintForm.unitCost);
    }
    try {
      setSubmitting(true);
      await dispatch(addMaintenanceWithQuantity({ id: addMaintMatricule.id, data: payload })).unwrap();
      toast.success("Maintenance enregistrée");
      closeAddMaint();
      dispatch(fetchMatricules());
      dispatch(fetchProducts(true));
    } catch (err) {
      toast.error(err?.payload || err?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  /* ==================== ACCIDENT ==================== */
  const handleOpenAccidentForm = (mat) => {
    const matReservations = reservations.filter(r => r.matricule_id === mat.id);
    setReservationsForMatricule(matReservations);
    setSelectedMatriculeForAccident(mat);
    setReservationSearchTerm(""); setSelectedReservation(null); setFilteredReservations([]);
    setAccidentFormData({
      matricule_id: mat.id, car_id: mat.car_id, client_id: '', reservation_id: '',
      date_accident: new Date().toISOString().slice(0, 10),
      amount_of_losses: 0, amount_assurance: 0, nom_expert: '',
      status: 'open', accident_type: 'grave', procedure_type: 'classic',
      expert_decision: 'pending', expert_amount: 0, expert_notes: '', notes: ''
    });
    setShowAccidentForm(true);
  };

  const handleReservationSearch = (term) => {
    setReservationSearchTerm(term);
    if (term.trim() === "") { setFilteredReservations([]); return; }
    const lower = term.toLowerCase().trim();
    const filtered = reservationsForMatricule.filter(res => {
      const c = clients.find(c => c.id === res.client_id);
      const cn = c ? `${c.prenom} ${c.nom}`.toLowerCase() : "";
      const sd = new Date(res.start_date).toLocaleDateString("fr-FR");
      const ed = new Date(res.end_date).toLocaleDateString("fr-FR");
      return res.id.toString().includes(lower) || cn.includes(lower) || sd.includes(lower) || ed.includes(lower);
    });
    setFilteredReservations(filtered.slice(0, 10));
  };

  const handleReservationSelect = (reservation) => {
    const c = clients.find(c => c.id === reservation.client_id);
    setSelectedReservation(reservation);
    setReservationSearchTerm(
      `#${reservation.id} - ${new Date(reservation.start_date).toLocaleDateString("fr-FR")} → ${new Date(reservation.end_date).toLocaleDateString("fr-FR")} - Client: ${c?.prenom} ${c?.nom || 'N/A'}`
    );
    setAccidentFormData({ ...accidentFormData, reservation_id: reservation.id, client_id: reservation.client_id });
    setFilteredReservations([]);
  };

  const clearReservationSelection = () => {
    setSelectedReservation(null); setReservationSearchTerm("");
    setAccidentFormData(prev => ({ ...prev, reservation_id: "", client_id: "" }));
    setFilteredReservations([]);
  };

  const handleSubmitAccident = async (e) => {
    e.preventDefault();
    if (!accidentFormData.client_id) { toast.error("Veuillez sélectionner une réservation"); return; }
    if (!accidentFormData.amount_of_losses || accidentFormData.amount_of_losses <= 0) {
      toast.error("Veuillez saisir le montant des pertes"); return;
    }
    try {
      setAccidentSubmitting(true);
      const accidentData = {
        matricule_id: accidentFormData.matricule_id, car_id: accidentFormData.car_id,
        client_id: accidentFormData.client_id, reservation_id: accidentFormData.reservation_id || null,
        date_accident: accidentFormData.date_accident, time_accident: "", location: "", description: "",
        police_report_number: "", amount_of_losses: accidentFormData.amount_of_losses,
        amount_assurance: accidentFormData.amount_assurance || 0,
        nom_expert: accidentFormData.nom_expert || null, status: accidentFormData.status || "open",
        accident_type: accidentFormData.accident_type || "grave",
        procedure_type: accidentFormData.procedure_type || "classic",
        expert_decision: accidentFormData.expert_decision || "pending",
        expert_amount: accidentFormData.expert_amount || 0,
        expert_notes: accidentFormData.expert_notes || null, notes: accidentFormData.notes || null,
        garage_id: null, inspection_notes: null, estimated_cost: 0, total_repair_cost: 0, franchise_amount: 0,
        insurance_paid: 0, client_paid: 0, total_paid: 0, remaining_amount: 0, internal_notes: null, closed_at: null,
        estimate_items: [], estimate_total_ht: 0, estimate_tva: 0, estimate_total_ttc: 0, estimate_status: "draft",
        repair_start_date: null, repair_end_date: null, repair_notes: null, invoice_number: null,
        invoice_items: [], invoice_total_ht: 0, invoice_tva: 0, invoice_total_ttc: 0, payments: [],
        img_accident: [], img_evaluation_expert: [], img_fixed: [], image_facture: []
      };
      await dispatch(createAccident(accidentData)).unwrap();
      toast.success("Accident créé avec succès");
      setShowAccidentForm(false); setSelectedMatriculeForAccident(null);
      await refreshData();
    } catch (err) {
      toast.error(err?.payload || err?.message || "Erreur lors de la création");
    } finally { setAccidentSubmitting(false); }
  };

  const resetAccidentForm = () => {
    setAccidentFormData({
      matricule_id: '', car_id: '', client_id: '', reservation_id: '',
      date_accident: new Date().toISOString().slice(0, 10),
      amount_of_losses: 0, amount_assurance: 0, nom_expert: '',
      status: 'open', accident_type: 'grave', procedure_type: 'classic',
      expert_decision: 'pending', expert_amount: 0, expert_notes: '', notes: ''
    });
    setSelectedMatriculeForAccident(null); setReservationsForMatricule([]);
    setReservationSearchTerm(""); setSelectedReservation(null); setFilteredReservations([]);
  };

  const closeAccidentForm = () => { setShowAccidentForm(false); resetAccidentForm(); };

  /* ==================== HELPERS ==================== */
  const statusConfig = {
    active: { label: "Actif", bg: "badge-success", icon: CheckCircle },
    inactive: { label: "Inactif", bg: "badge-danger", icon: XCircle },
    sold: { label: "Vendu", bg: "badge-sold", icon: AlertCircle },
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try { const dt = new Date(d); if (isNaN(dt)) return d; return dt.toLocaleDateString("fr-FR"); } catch { return d; }
  };

  const isDateExpired = (d) => { if (!d) return false; return new Date(d) < new Date(); };
  const isDateExpiringSoon = (d, days = 30) => {
    if (!d) return false;
    const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
    return diff <= days && diff > 0;
  };
  const getDateStatusInfo = (d) => {
    if (!d) return null;
    if (isDateExpired(d)) return { class: 'date-expired', icon: AlertTriangle, text: 'Expiré' };
    if (isDateExpiringSoon(d)) return { class: 'date-soon', icon: Clock, text: 'Expire bientôt' };
    return { class: 'date-ok', icon: CheckCircle, text: 'Valide' };
  };

  const calculateRequiredTasksProgress = (mat) => {
    let requiredTasks = ['Huile', 'Filtre à Huile'];
    let completed = 0;
    if (mat.oil === 'yes') completed++;
    if (mat.filter_oil === 'yes') completed++;
    (mat.additional_maintenance || []).forEach(item => {
      if (item.required_for_vidange) {
        requiredTasks.push(item.name);
        let isCompleted = false;
        if (item.type === 'quantity') isCompleted = (item.value && item.value > 0);
        else if (item.type === 'note') isCompleted = !item.needs_attention;
        if (isCompleted) completed++;
      }
    });
    const total = requiredTasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, percentage, isVidangeDone: total > 0 && completed === total };
  };

  /* ==================== DETAILS-VIEW MAINTENANCE ACTIONS ==================== */
  const openAddForm = (key) => {
    resetMaintProduct();
    setNewQuantity('');
    setNewDate(new Date().toISOString().slice(0, 10));
    setShowAddForm(showAddForm === key ? null : key);
  };

  const submitMaintenanceAction = async (type) => {
    if (!selectedMatricule) return;
    const quantity = (type === 'oil' || type === 'ad_blue') ? parseFloat(newQuantity) : 1;
    if ((type === 'oil' || type === 'ad_blue') && (!newQuantity || quantity <= 0)) {
      toast.error("Quantité invalide"); return;
    }
    const payload = { type, date: newDate, quantity };
    if (maintProductId) {
      payload.product_id = Number(maintProductId);
      if (maintUnitCost !== '') payload.unit_cost = Number(maintUnitCost);
    }
    try {
      setSubmitting(true);
      const updated = await dispatch(addMaintenanceWithQuantity({ id: selectedMatricule.id, data: payload })).unwrap();
      if (updated) setSelectedMatricule(updated);
      toast.success("Maintenance enregistrée");
      setShowAddForm(null); setNewQuantity(''); resetMaintProduct();
      setNewDate(new Date().toISOString().slice(0, 10));
      dispatch(fetchMatricules());
      dispatch(fetchProducts(true));
    } catch (err) {
      toast.error(err?.payload || err?.message || "Erreur");
    } finally { setSubmitting(false); }
  };

  const handleAddOil = () => submitMaintenanceAction('oil');
  const handleAddFilterOil = () => submitMaintenanceAction('filter_oil');
  const handleAddFilterAir = () => submitMaintenanceAction('filter_air');
  const handleAddBrakePads = () => submitMaintenanceAction('paquets_de_frein');
  const handleAddAdBlue = () => submitMaintenanceAction('ad_blue');

  const handleAddAdditionalItem = async () => {
    if (!selectedMatricule || !additionalItemName.trim()) { toast.error("Nom requis"); return; }
    const additionalMaintenance = selectedMatricule.additional_maintenance || [];
    const newItem = {
      id: Date.now().toString(), name: additionalItemName, type: additionalItemType,
      value: additionalItemType === 'quantity' ? (parseFloat(additionalItemQuantity) || 0) : '',
      required_for_vidange: additionalItemRequired,
      needs_attention: additionalItemType === 'note',
      notes: additionalItemNotes,
      history: additionalItemType === 'quantity' && additionalItemQuantity
        ? [{ id: Date.now().toString(), quantity: parseFloat(additionalItemQuantity), date: newDate,
             created_at: new Date().toISOString(), kilometrage: selectedMatricule.kilometrage }] : [],
      last_done_date: additionalItemType === 'quantity' && additionalItemQuantity ? newDate : null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    const newList = [...additionalMaintenance, newItem];
    try {
      setSubmitting(true);
      await dispatch(updateMatricule({ id: selectedMatricule.id, data: { additional_maintenance: newList } })).unwrap();
      updateLocalMatricule({ additional_maintenance: newList });
      toast.success("Élément ajouté");
      setShowAddForm(null); setAdditionalItemName(''); setAdditionalItemQuantity('');
      setAdditionalItemRequired(false); setAdditionalItemNotes('');
    } catch (err) { toast.error(err.payload || err.message || "Erreur"); } finally { setSubmitting(false); }
  };

  const getMaintenanceStatus = (mat, type) => {
    switch (type) {
      case 'oil': return mat.oil === 'yes';
      case 'filter_oil': return mat.filter_oil === 'yes';
      case 'filter_air': return mat.filter_air === 'yes';
      case 'paquets_de_frein': return mat.paquets_de_frein === 'yes';
      case 'ad_blue': return mat.ad_blue === 'yes';
      default: return false;
    }
  };

  const getMaintenanceValue = (mat, type) => {
    switch (type) {
      case 'oil': return { total: parseFloat(mat.oil_quantity || 0), lastDate: mat.oil_date, history: mat.oil_history || [] };
      case 'filter_oil': return { total: mat.filter_oil_count || 0, lastDate: mat.filter_oil_date, history: mat.filter_oil_history || [] };
      case 'filter_air': return { total: mat.filter_air_count || 0, lastDate: mat.filter_air_date, history: mat.filter_air_history || [] };
      case 'paquets_de_frein': return { total: mat.paquets_de_frein_count || 0, lastDate: mat.paquets_de_frein_date, history: mat.paquets_de_frein_history || [] };
      case 'ad_blue': return { total: parseFloat(mat.ad_blue_quantity || 0), lastDate: mat.ad_blue_date, history: mat.ad_blue_history || [] };
      default: return { total: 0, lastDate: null, history: [] };
    }
  };

  /* ==================== SORT / FILTER ==================== */
  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  };
  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === "asc" ? <ArrowUp size={12} className="sort-icon active" /> : <ArrowDown size={12} className="sort-icon active" />;
  };

  const filteredMatricules = (matricules || []).filter(mat => {
    const car = cars.find(c => c.id === mat.car_id);
    const matchesSearch = searchTerm === '' ||
      mat.matricule_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mat.status === statusFilter;
    let matchesNotification = true;
    if (filterParam === 'notifications') matchesNotification = hasMatriculeNotification(mat);
    return matchesSearch && matchesStatus && matchesNotification;
  }).sort((a, b) => {
    let av, bv;
    switch (sortField) {
      case "id": av = a.id; bv = b.id; break;
      case "matricule": av = a.matricule_code?.toLowerCase() || ""; bv = b.matricule_code?.toLowerCase() || ""; break;
      case "car": {
        const ac = cars.find(c => c.id === a.car_id);
        const bc = cars.find(c => c.id === b.car_id);
        av = ac ? `${ac.brand} ${ac.model}`.toLowerCase() : "";
        bv = bc ? `${bc.brand} ${bc.model}`.toLowerCase() : "";
        break;
      }
      case "kilometrage": av = a.kilometrage || 0; bv = b.kilometrage || 0; break;
      case "status": av = a.status || ""; bv = b.status || ""; break;
      default: av = a.id; bv = b.id;
    }
    return sortDirection === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const itemsPerView = viewMode === 'list' ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredMatricules.length / itemsPerView);
  const paginatedMatricules = filteredMatricules.slice((currentPage - 1) * itemsPerView, currentPage * itemsPerView);

  /* ==================== CRUD ==================== */
  const handleCreateMatricule = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(createMatricule(data)).unwrap();
      toast.success("Matricule ajouté");
      setShowMatriculeForm(false); setEditingMatricule(null); await loadData(); resetForm();
    } catch (err) { toast.error(err.payload || err.message || "Erreur"); } finally { setSubmitting(false); }
  };

  const handleUpdateMatricule = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(updateMatricule({ id: editingMatricule.id, data })).unwrap();
      toast.success("Matricule modifié");
      setShowMatriculeForm(false); setEditingMatricule(null); await loadData(); resetForm();
    } catch (err) { toast.error(err.payload || err.message || "Erreur"); } finally { setSubmitting(false); }
  };

  const handleEdit = (mat) => {
    setEditingMatricule(mat);
    setFormData({
      matricule_code: mat.matricule_code, car_id: mat.car_id || "", status: mat.status,
      kilometrage: mat.kilometrage || 0, visit_tech: formatDateForInput(mat.visit_tech),
      date_assurance: formatDateForInput(mat.date_assurance),
      date_taxe_voiture: formatDateForInput(mat.date_taxe_voiture),
      vidange_status: mat.vidange_status || "not done"
    });
    if (mat.car_id) {
      const car = cars.find(c => c.id === mat.car_id);
      if (car) { setSelectedCar(car); setCarSearchTerm(`${car.brand} ${car.model} (${car.year})`); }
    } else { setSelectedCar(null); setCarSearchTerm(""); }
    setShowMatriculeForm(true);
  };

  const handleAddNew = () => {
    setEditingMatricule(null); resetForm(); setSelectedCar(null); setCarSearchTerm("");
    setShowMatriculeForm(true);
  };

  const resetForm = () => {
    setFormData({ matricule_code: "", car_id: "", status: "active", kilometrage: 0,
      visit_tech: "", date_assurance: "", date_taxe_voiture: "", vidange_status: "not done" });
    setSelectedCar(null); setCarSearchTerm("");
  };

  const closeMatriculeForm = () => { setShowMatriculeForm(false); setEditingMatricule(null); resetForm(); };

  const handleDeleteClick = (mat) => { setMatriculeToDelete(mat); setDeleteModalOpen(true); };
  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await runDelete();
    } finally {
      setDeleting(false);
    }
  };

  const runDelete = async () => {
    if (!matriculeToDelete) return;
    const result = await dispatch(deleteMatricule(matriculeToDelete.id));
    if (result.error) toast.error(result.payload);
    else { toast.success("Matricule supprimé"); await loadData(); }
    setDeleteModalOpen(false); setMatriculeToDelete(null);
  };

  const handleViewDetails = (mat) => {
    setSelectedMatricule(mat); setShowMatriculeDetails(true);
    setActiveMaintenanceTab('required'); setShowAddForm(null); setShowHistoryFor(null);
  };

  /* Wrench button opens the SIMPLE modal (not the details view) */
  const handleAddMaintenance = (mat) => openAddMaint(mat);

  const handleCarSearch = (term) => {
    setCarSearchTerm(term);
    if (term.trim() === "") { setFilteredCars([]); return; }
    const lower = term.toLowerCase().trim();
    setFilteredCars(cars.filter(c => `${c.brand} ${c.model} ${c.year}`.toLowerCase().includes(lower)).slice(0, 10));
  };
  const handleCarSelect = (car) => {
    setSelectedCar(car); setCarSearchTerm(`${car.brand} ${car.model} (${car.year})`);
    setFormData(prev => ({ ...prev, car_id: car.id })); setFilteredCars([]);
  };
  const clearCarSelection = () => {
    setSelectedCar(null); setCarSearchTerm("");
    setFormData(prev => ({ ...prev, car_id: "" })); setFilteredCars([]);
  };

  const handleExport = () => {
    const headers = ['ID','Plaque','Voiture','Kilométrage','Visite Tech','Assurance','Vignette','Vidange','Statut'];
    const csvData = filteredMatricules.map(mat => {
      const car = cars.find(c => c.id === mat.car_id);
      return [mat.id, `"${mat.matricule_code}"`, `"${car ? `${car.brand} ${car.model}` : 'N/A'}"`,
        mat.kilometrage || 0, mat.visit_tech || '', mat.date_assurance || '', mat.date_taxe_voiture || '',
        mat.vidange_status || 'not done', mat.status].join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `matricules_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success("Export CSV effectué");
  };

  const stats = {
    total: matricules?.length || 0,
    active: matricules?.filter(m => m.status === 'active').length || 0,
    inactive: matricules?.filter(m => m.status === 'inactive').length || 0,
    totalKm: matricules?.reduce((s, m) => s + (Number(m.kilometrage) || 0), 0) || 0,
    alerts: (matricules || []).filter(m => hasMatriculeNotification(m)).length
  };

  if (loading && !showMatriculeDetails && !showMatriculeForm && !showAccidentForm) return (
    <div className="rv">
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des matricules...</p>
      </div>
      <Styles />
    </div>
  );

  const statCards = [
    { label: "Total matricules", value: stats.total, icon: <Tag size={20} />, color: "blue" },
    { label: "Actifs", value: stats.active, icon: <CheckCircle size={20} />, color: "green" },
    { label: "Inactifs", value: stats.inactive, icon: <XCircle size={20} />, color: "red" },
    { label: "Kilométrage total", value: `${stats.totalKm.toLocaleString()} km`, icon: <Gauge size={20} />, color: "cyan" },
    { label: "Alertes documents", value: stats.alerts, icon: <AlertTriangle size={20} />, color: "violet" },
  ];

  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === 'list' ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredMatricules.length}
      />
    </div>
  );

  /* ---------- petits helpers d'affichage (liste / cartes) ---------- */
  const getCar = (mat) => cars.find(c => c.id === mat.car_id);
  const getCarName = (mat) => { const c = getCar(mat); return c ? `${c.brand} ${c.model}` : "—"; };
  const getCarImage = (mat) => { const c = getCar(mat); return c ? (c.image_url || c.image) : null; };

  const getStatusBadge = (mat) => {
    const status = statusConfig[mat.status] || statusConfig.active;
    const StatusIcon = status.icon;
    return <span className={`badge ${status.bg}`}><StatusIcon size={12} /> {status.label}</span>;
  };

  const getVidangeBadge = (mat) => (
    <span className={`badge ${mat.vidange_status === 'done' ? 'badge-success' : 'badge-warning'}`}>
      <Wrench size={12} /> {mat.vidange_status === 'done' ? "Vidange effectuée" : "Vidange à faire"}
    </span>
  );

  const renderTechAlert = (mat) => {
    if (!mat.visit_tech) return "—";
    const st = getDateStatusInfo(mat.visit_tech);
    const Icon = st?.icon;
    return (
      <span className={`date-alert ${st?.class || ''}`}>
        {Icon && <Icon size={12} />}
        {formatDate(mat.visit_tech)}
      </span>
    );
  };

  const docItem = (label, d) => {
    const st = getDateStatusInfo(d);
    return (
      <span className={`ac-doc ${st?.class || ''}`} title={st?.text || ''}>
        {label}: {d ? formatDate(d) : '—'}
      </span>
    );
  };

  const rowActions = (mat) => (
    <div className="ac-actions">
      <button type="button" onClick={() => handleAddMaintenance(mat)} className="ac-action-btn ac-action-maint" title="Ajouter maintenance"><Wrench size={15} /></button>
      <button type="button" onClick={() => handleViewDetails(mat)} className="ac-action-btn ac-action-view" title="Détails"><Eye size={15} /></button>
      <button type="button" onClick={() => handleEdit(mat)} className="ac-action-btn ac-action-edit" title="Modifier"><Edit2 size={15} /></button>
      <button type="button" onClick={() => handleOpenAccidentForm(mat)} className="ac-action-btn ac-action-accident" title="Signaler un accident"><AlertTriangle size={15} /></button>
      <button type="button" onClick={() => handleDeleteClick(mat)} className="ac-action-btn ac-action-delete" title="Supprimer"><Trash2 size={15} /></button>
    </div>
  );

  const cardActions = (mat) => (
    <div className="ac-card-btns five">
      <button type="button" onClick={() => handleAddMaintenance(mat)} className="ac-card-btn ac-action-maint">
        <Wrench size={17} /><span>Entretien</span>
      </button>
      <button type="button" onClick={() => handleViewDetails(mat)} className="ac-card-btn ac-action-view">
        <Eye size={17} /><span>Détails</span>
      </button>
      <button type="button" onClick={() => handleEdit(mat)} className="ac-card-btn ac-action-edit">
        <Edit2 size={17} /><span>Modifier</span>
      </button>
      <button type="button" onClick={() => handleOpenAccidentForm(mat)} className="ac-card-btn ac-action-accident">
        <AlertTriangle size={17} /><span>Accident</span>
      </button>
      <button type="button" onClick={() => handleDeleteClick(mat)} className="ac-card-btn ac-action-delete">
        <Trash2 size={17} /><span>Suppr.</span>
      </button>
    </div>
  );

  const sortBar = (
    <div className="ac-sortbar">
      <label htmlFor="ac-sort">Trier</label>
      <AcSelect id="ac-sort" ariaLabel="Trier par" value={sortField} onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
      <button
        type="button"
        className="ac-sortdir"
        onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
        aria-label={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
      >
        {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
      </button>
    </div>
  );

  /* === Product picker used in details-view add forms === */
  const renderProductPicker = (type, showQty) => (
    <>
      <select
        className="small-input"
        style={{ minWidth: 180 }}
        value={maintProductId}
        onChange={(e) => pickProduct(e.target.value)}
      >
        <option value="">— Produit du stock (optionnel) —</option>
        {getSuggestedProducts(type).map(p => (
          <option key={p.id} value={p.id} disabled={availableOf(p) <= 0}>
            {p.name}{p.reference ? ` — ${p.reference}` : ''} · {availableOf(p)} {unitLabelOf(p)}
            {availableOf(p) <= 0 ? ' (rupture)' : ''}
          </option>
        ))}
      </select>
      {maintProductId && (
        <>
          <input
            type="number" min="0" step="0.01" className="small-input"
            style={{ width: 90 }} placeholder={isLiquid(products.find(x => String(x.id) === String(maintProductId))) ? 'Coût/L' : 'Coût/u'}
            value={maintUnitCost}
            onChange={(e) => setMaintUnitCost(e.target.value)}
          />
          {showQty && maintUnitCost !== '' && (
            <span className="cost-total-inline">
              = {(Number(maintUnitCost) * (Number(newQuantity) || 0)).toFixed(2)} DH
            </span>
          )}
        </>
      )}
    </>
  );

  /* === Carte de maintenance (détails) === */
  const renderMaintCard = ({ type, formKey, title, Icon, required, qty, onSubmit }) => {
    const val = getMaintenanceValue(selectedMatricule, type);
    const done = getMaintenanceStatus(selectedMatricule, type);
    return (
      <div className="maintenance-card" key={type}>
        <div className="maintenance-card-header">
          <div className="maintenance-title">
            <Icon size={20} /> {title} {required && <span className="required-badge">* Requis</span>}
          </div>
          <div className={`status-badge ${done ? 'status-success' : 'status-warning'}`}>
            {done ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {done ? " Effectué" : " Non effectué"}
          </div>
        </div>
        <div className="maintenance-card-body">
          <div className="maintenance-info">
            <span>Total: <strong>{qty ? `${val.total.toFixed(1)} L` : val.total}</strong></span>
            <span>Dernier: {val.lastDate ? formatDate(val.lastDate) : "—"}</span>
          </div>
          <div className="maintenance-actions">
            <button type="button" onClick={() => openAddForm(formKey)} className="action-btn-small primary">
              <PlusCircle size={14} /> Ajouter
            </button>
            <button type="button" onClick={() => setShowHistoryFor(showHistoryFor === type ? null : type)} className="action-btn-small secondary">
              <History size={14} /> Historique
            </button>
          </div>
          {showAddForm === formKey && (
            <div className="add-form">
              {qty && (
                <input type="number" step="0.1" placeholder="Quantité (L)" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="small-input" />
              )}
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
              {renderProductPicker(type, !!qty)}
              <button type="button" onClick={onSubmit} disabled={submitting} className="confirm-btn">
                {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const historyTitle = () => {
    if (!selectedMatricule) return '';
    return showHistoryFor === 'oil' ? 'Huile' :
      showHistoryFor === 'filter_oil' ? 'Filtre à Huile' :
        showHistoryFor === 'filter_air' ? 'Filtre à Air' :
          showHistoryFor === 'paquets_de_frein' ? 'Paquets de Frein' :
            showHistoryFor === 'ad_blue' ? 'Ad Blue' :
              (selectedMatricule.additional_maintenance || []).find(i => i.id === showHistoryFor)?.name || 'Maintenance';
  };

  const detailsVisible = showMatriculeDetails && selectedMatricule && !showAccidentForm && !showMatriculeForm;
  const listVisible = !showMatriculeForm && !showMatriculeDetails && !showAccidentForm;

  return (
    <div className="rv">
      {/* ==================== ACCIDENT FORM ==================== */}
      {showAccidentForm && selectedMatriculeForAccident && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><AlertTriangle size={28} /></div>
            <div className="inline-form-title">
              <h2>Signaler un accident</h2>
              <p>Pour le matricule {selectedMatriculeForAccident.matricule_code}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={closeAccidentForm} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitAccident} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Car size={18} /><h3>Informations véhicule</h3></div>
                  <div className="inline-field">
                    <label>Matricule</label>
                    <input type="text" value={selectedMatriculeForAccident.matricule_code} className="inline-input matricule-input" disabled />
                  </div>
                  <div className="inline-field">
                    <label>Voiture</label>
                    <input type="text" className="inline-input" disabled
                      value={`${cars.find(c => c.id === selectedMatriculeForAccident.car_id)?.brand || ''} ${cars.find(c => c.id === selectedMatriculeForAccident.car_id)?.model || ''}`} />
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><User size={18} /><h3>Informations client</h3></div>
                  <div className="inline-search-section">
                    <div className="inline-search-input-wrapper">
                      <Search size={18} />
                      <input type="text" className="inline-input" value={reservationSearchTerm}
                        onChange={(e) => handleReservationSearch(e.target.value)}
                        placeholder="Rechercher une réservation (ID, client, dates)..." />
                      {selectedReservation && (
                        <button type="button" className="clear-search-btn" onClick={clearReservationSelection} aria-label="Effacer">
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {filteredReservations.length > 0 && (
                      <div className="inline-results">
                        {filteredReservations.map(res => {
                          const c = clients.find(c => c.id === res.client_id);
                          return (
                            <div key={res.id} className="inline-result-item" onClick={() => handleReservationSelect(res)}>
                              <div className="inline-result-avatar"><Calendar size={20} /></div>
                              <div className="inline-result-info">
                                <strong>#{res.id}</strong>
                                <div className="inline-result-details">
                                  <span>{formatDate(res.start_date)} → {formatDate(res.end_date)}</span>
                                  <span>Client: {c ? `${c.prenom} ${c.nom}` : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedReservation && (
                      <div className="inline-selected">
                        <CheckCircle size={20} />
                        <div>
                          <strong>Réservation sélectionnée</strong>
                          <p>#{selectedReservation.id} - {formatDate(selectedReservation.start_date)} → {formatDate(selectedReservation.end_date)}</p>
                        </div>
                      </div>
                    )}

                    {!selectedReservation && reservationSearchTerm.trim() !== "" && filteredReservations.length === 0 && (
                      <div className="inline-no-results">
                        Aucune réservation trouvée pour ce matricule.
                      </div>
                    )}

                    {reservationsForMatricule.length === 0 && (
                      <div className="inline-error-msg">
                        <AlertTriangle size={16} />
                        <span>Aucune réservation trouvée pour ce matricule</span>
                      </div>
                    )}
                  </div>

                  <div className="inline-field">
                    <label>Client</label>
                    <input type="text" className="inline-input" disabled
                      value={(() => { const c = clients.find(c => c.id === accidentFormData.client_id); return c ? `${c.prenom} ${c.nom}` : ''; })()} />
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Calendar size={18} /><h3>Date et montants</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Date de l'accident *</label>
                      <input type="date" required value={accidentFormData.date_accident} onChange={(e) => setAccidentFormData({ ...accidentFormData, date_accident: e.target.value })} className="inline-input" />
                    </div>
                    <div className="inline-field">
                      <label>Montant pertes (DH) *</label>
                      <input type="number" step="0.01" required value={accidentFormData.amount_of_losses} onChange={(e) => setAccidentFormData({ ...accidentFormData, amount_of_losses: parseFloat(e.target.value) || 0 })} className="inline-input" />
                    </div>
                    <div className="inline-field">
                      <label>Montant assurance (DH)</label>
                      <input type="number" step="0.01" value={accidentFormData.amount_assurance} onChange={(e) => setAccidentFormData({ ...accidentFormData, amount_assurance: parseFloat(e.target.value) || 0 })} className="inline-input" />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Scale size={18} /><h3>Type et procédure</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Type d'accident</label>
                      <select value={accidentFormData.accident_type} onChange={(e) => setAccidentFormData({ ...accidentFormData, accident_type: e.target.value })} className="inline-select">
                        <option value="grave">Grave</option>
                        <option value="non_grave">Non-grave</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Procédure</label>
                      <select value={accidentFormData.procedure_type} onChange={(e) => setAccidentFormData({ ...accidentFormData, procedure_type: e.target.value })} className="inline-select">
                        <option value="classic">Classique</option>
                        <option value="forphie">Forphie</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <select value={accidentFormData.status} onChange={(e) => setAccidentFormData({ ...accidentFormData, status: e.target.value })} className="inline-select">
                        <option value="open">Ouvert</option>
                        <option value="pending">Signalé</option>
                        <option value="evaluation_owner">Évaluation propriétaire</option>
                        <option value="contact expert">Contact expert</option>
                        <option value="evaluation_expert">Évaluation expert</option>
                        <option value="fixed">Réparé</option>
                        <option value="waiting">Attente paiement</option>
                        <option value="completed">Terminé</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Gavel size={18} /><h3>Expert</h3></div>
                  <div className="inline-field">
                    <label>Nom de l'expert</label>
                    <input type="text" value={accidentFormData.nom_expert} onChange={(e) => setAccidentFormData({ ...accidentFormData, nom_expert: e.target.value })} className="inline-input" placeholder="Expert automobile" />
                  </div>
                  <div className="inline-field">
                    <label>Notes expert</label>
                    <textarea rows={2} value={accidentFormData.expert_notes} onChange={(e) => setAccidentFormData({ ...accidentFormData, expert_notes: e.target.value })} className="inline-textarea" placeholder="Rapport d'expertise..." />
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><FileText size={18} /><h3>Notes générales</h3></div>
                  <div className="inline-field">
                    <textarea rows={2} value={accidentFormData.notes} onChange={(e) => setAccidentFormData({ ...accidentFormData, notes: e.target.value })} className="inline-textarea" placeholder="Description détaillée de l'accident..." />
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={closeAccidentForm}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={accidentSubmitting}>
                <AlertTriangle size={16} />
                {accidentSubmitting ? "Traitement..." : "Créer l'accident"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== SIMPLE AJOUTER-MAINTENANCE MODAL ==================== */}
      {addMaintMatricule && (
        <div className="modal-overlay" onClick={closeAddMaint}>
          <div className="modal add-maint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ajouter une maintenance</h3>
              <button type="button" className="modal-close" onClick={closeAddMaint} aria-label="Fermer"><X size={18} /></button>
            </div>

            <div className="modal-body">
              <div className="maint-plaque">
                {addMaintMatricule.matricule_code}
                {(addMaintMatricule.car || getCar(addMaintMatricule)) && (
                  <span className="maint-plaque-sub">
                    {' — '}{(addMaintMatricule.car || getCar(addMaintMatricule)).brand} {(addMaintMatricule.car || getCar(addMaintMatricule)).model}
                  </span>
                )}
              </div>

              {/* Type picker */}
              <div className="maint-type-section">
                <label className="maint-label">Type de maintenance *</label>
                <div className="icon-picker">
                  {Object.entries(MAINT_TYPE_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`icon-pick-btn ${addMaintForm.type === key ? 'active' : ''}`}
                        onClick={() => setAddMaintForm(f => ({ ...f, type: key, productId: '', unitCost: '' }))}
                        title={meta.label}
                        aria-label={meta.label}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
                <div className="picked-type-label">{MAINT_TYPE_META[addMaintForm.type].label}</div>
              </div>

              {/* Date + quantity */}
              <div className="maint-fields-grid">
                {MAINT_TYPE_META[addMaintForm.type].needsQty && (
                  <div className="inline-field">
                    <label>Quantité ({MAINT_TYPE_META[addMaintForm.type].unit}) *</label>
                    <input
                      type="number" min="0.01" step="0.01" className="inline-input"
                      value={addMaintForm.quantity}
                      onChange={(e) => setAddMaintForm(f => ({ ...f, quantity: e.target.value }))}
                      placeholder={MAINT_TYPE_META[addMaintForm.type].unit === 'L' ? 'Ex: 5' : 'Ex: 1'}
                    />
                  </div>
                )}
                <div className="inline-field">
                  <label>Date *</label>
                  <input
                    type="date" className="inline-input"
                    value={addMaintForm.date}
                    onChange={(e) => setAddMaintForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Product picker */}
              <div className="inline-field maint-block">
                <label><Package size={12} className="label-icon" /> Produit du stock (optionnel)</label>
                <select
                  className="inline-select"
                  value={addMaintForm.productId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const p = products.find(x => String(x.id) === String(id));
                    setAddMaintForm(f => ({ ...f, productId: id, unitCost: defaultCostOf(p) }));
                  }}
                >
                  <option value="">— Aucun produit (saisie manuelle) —</option>
                  {getSuggestedProducts(addMaintForm.type).map(p => (
                    <option key={p.id} value={p.id} disabled={availableOf(p) <= 0}>
                      {p.name}{p.reference ? ` — ${p.reference}` : ''} · Stock: {availableOf(p)} {unitLabelOf(p)}
                      {availableOf(p) <= 0 ? ' (rupture)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {addMaintForm.productId && (() => {
                const p = products.find(x => String(x.id) === String(addMaintForm.productId));
                if (!p) return null;
                const meta = MAINT_TYPE_META[addMaintForm.type];
                const needed = meta.needsQty ? (Number(addMaintForm.quantity) || 0) : 1;
                const avail = availableOf(p);
                const lbl = unitLabelOf(p);
                const insufficient = avail < needed - 0.001;
                return (
                  <div className={`maint-stock-hint ${insufficient ? 'bad' : 'ok'}`}>
                    <b>Stock :</b> {avail} {lbl}
                    {isLiquid(p) && ` (${p.stock_quantity} × ${Number(p.volume_per_unit)} L${Number(p.open_volume) > 0 ? ` + ${Number(p.open_volume)} L entamé` : ''})`}
                    {insufficient ? ' — Quantité insuffisante' : ` · après: ${roundL(avail - needed)} ${lbl}`}
                  </div>
                );
              })()}

              {addMaintForm.productId && (
                <div className="inline-field maint-block">
                  <label>{isLiquid(products.find(x => String(x.id) === String(addMaintForm.productId))) ? 'Coût par litre (DH/L)' : 'Coût unitaire (DH)'}</label>
                  <input
                    type="number" min="0" step="0.01" className="inline-input"
                    value={addMaintForm.unitCost}
                    onChange={(e) => setAddMaintForm(f => ({ ...f, unitCost: e.target.value }))}
                  />
                  {addMaintForm.unitCost !== '' && MAINT_TYPE_META[addMaintForm.type].needsQty && (
                    <div className="maint-cost-total">
                      Total : <b>{(Number(addMaintForm.unitCost) * (Number(addMaintForm.quantity) || 0)).toFixed(2)} DH</b>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={closeAddMaint}>Annuler</button>
              <button type="button" className="modal-btn btn-primary" onClick={submitAddMaintenance} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="spin" /> : <Wrench size={14} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DETAILS ==================== */}
      {detailsVisible && (
        <div className="inline-details-container">
          <div className="inline-details-header">
            <div className="inline-details-icon"><Tag size={28} /></div>
            <div className="inline-details-title">
              <h2>Détails du matricule</h2>
              <p>{selectedMatricule.matricule_code}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={() => { setShowMatriculeDetails(false); setSelectedMatricule(null); }} className="inline-details-close">
              <X size={24} />
            </button>
          </div>

          <div className="inline-details-content">
            <div className="details-actions-bar">
              <button type="button" onClick={() => setShowMatriculeDetails(false)} className="back-btn">← Retour à la liste</button>
              <div className="details-action-buttons">
                <button type="button" onClick={() => { setShowMatriculeDetails(false); handleEdit(selectedMatricule); }} className="action-edit-btn">
                  <Edit2 size={16} /> Modifier
                </button>
                <button type="button" onClick={() => handleOpenAccidentForm(selectedMatricule)} className="action-accident-btn">
                  <AlertTriangle size={16} /> Signaler un accident
                </button>
              </div>
            </div>

            <div className="matricule-header-card">
              <div className="matricule-plaque">{selectedMatricule.matricule_code}</div>
              <div className="matricule-stats-grid">
                <div className="stat-item-detail">
                  <div className="stat-value">{selectedMatricule.kilometrage?.toLocaleString()} km</div>
                  <div className="stat-label-detail">Kilométrage</div>
                </div>
                <div className="stat-item-detail">
                  <div className="stat-value">{cars.find(c => c.id === selectedMatricule.car_id)?.brand} {cars.find(c => c.id === selectedMatricule.car_id)?.model}</div>
                  <div className="stat-label-detail">Voiture</div>
                </div>
                <div className="stat-item-detail">
                  <div className={`status-badge-large ${statusConfig[selectedMatricule.status]?.bg || 'badge-warning'}`}>
                    {(() => { const Icon = statusConfig[selectedMatricule.status]?.icon; return Icon ? <Icon size={14} /> : null; })()}
                    {statusConfig[selectedMatricule.status]?.label || selectedMatricule.status}
                  </div>
                </div>
              </div>
            </div>

            <div className="details-sections-grid">
              <div className="detail-card">
                <div className="detail-card-title"><Calendar size={16} /> Documents & Échéances</div>
                <div className="detail-card-content">
                  <div className="info-row">
                    <span className="info-label">Visite technique</span>
                    <span className={`info-value ${getDateStatusInfo(selectedMatricule.visit_tech)?.class || ''}`}>
                      {selectedMatricule.visit_tech ? formatDate(selectedMatricule.visit_tech) : "—"}
                      {getDateStatusInfo(selectedMatricule.visit_tech) && ` (${getDateStatusInfo(selectedMatricule.visit_tech).text})`}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Assurance</span>
                    <span className={`info-value ${getDateStatusInfo(selectedMatricule.date_assurance)?.class || ''}`}>
                      {selectedMatricule.date_assurance ? formatDate(selectedMatricule.date_assurance) : "—"}
                      {getDateStatusInfo(selectedMatricule.date_assurance) && ` (${getDateStatusInfo(selectedMatricule.date_assurance).text})`}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Vignette (Taxe voiture)</span>
                    <span className={`info-value ${getDateStatusInfo(selectedMatricule.date_taxe_voiture)?.class || ''}`}>
                      {selectedMatricule.date_taxe_voiture ? formatDate(selectedMatricule.date_taxe_voiture) : "—"}
                      {getDateStatusInfo(selectedMatricule.date_taxe_voiture) && ` (${getDateStatusInfo(selectedMatricule.date_taxe_voiture).text})`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="details-tabs-full" role="tablist">
              <button type="button" className={`details-tab-full ${activeMaintenanceTab === 'required' ? 'active' : ''}`} onClick={() => setActiveMaintenanceTab('required')}>
                <CheckCircle size={16} /> Maintenance Requise
              </button>
              <button type="button" className={`details-tab-full ${activeMaintenanceTab === 'optional' ? 'active' : ''}`} onClick={() => setActiveMaintenanceTab('optional')}>
                <Wrench size={16} /> Éléments Optionnels
              </button>
              <button type="button" className={`details-tab-full ${activeMaintenanceTab === 'additional' ? 'active' : ''}`} onClick={() => setActiveMaintenanceTab('additional')}>
                <PlusCircle size={16} /> Maintenance Additionnelle
              </button>
            </div>

            {(() => {
              const progress = calculateRequiredTasksProgress(selectedMatricule);
              return (
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-title">Statut de la Maintenance Requise pour la Vidange</span>
                    <span className={`progress-status ${progress.isVidangeDone ? 'status-done' : 'status-pending'}`}>
                      {progress.isVidangeDone ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {progress.isVidangeDone ? " Vidange effectuée" : " Vidange requise"}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress.percentage}%` }}></div>
                  </div>
                  <div className="progress-text">
                    {progress.completed}/{progress.total} tâches REQUISES terminées ({Math.round(progress.percentage)}%)
                  </div>
                </div>
              );
            })()}

            {activeMaintenanceTab === 'required' && (
              <div className="tab-content-full">
                <div className="maintenance-items-grid">
                  {renderMaintCard({ type: 'oil', formKey: 'oil', title: 'Huile', Icon: Droplet, required: true, qty: true, onSubmit: handleAddOil })}
                  {renderMaintCard({ type: 'filter_oil', formKey: 'filter_oil', title: 'Filtre à Huile', Icon: Filter, required: true, qty: false, onSubmit: handleAddFilterOil })}
                </div>
              </div>
            )}

            {activeMaintenanceTab === 'optional' && (
              <div className="tab-content-full">
                <div className="maintenance-items-grid">
                  {renderMaintCard({ type: 'filter_air', formKey: 'filter_air', title: 'Filtre à Air', Icon: Wind, required: false, qty: false, onSubmit: handleAddFilterAir })}
                  {renderMaintCard({ type: 'paquets_de_frein', formKey: 'brake_pads', title: 'Paquets de Frein', Icon: CircleStop, required: false, qty: false, onSubmit: handleAddBrakePads })}
                  {renderMaintCard({ type: 'ad_blue', formKey: 'ad_blue', title: 'Ad Blue', Icon: Droplets, required: false, qty: true, onSubmit: handleAddAdBlue })}
                </div>
              </div>
            )}

            {activeMaintenanceTab === 'additional' && (
              <div className="tab-content-full">
                <div className="additional-header">
                  <h4>Maintenance Additionnelle</h4>
                  <button type="button" onClick={() => openAddForm('additional')} className="btn-add-additional">
                    <PlusCircle size={16} /> Ajouter un Élément
                  </button>
                </div>

                {showAddForm === 'additional' && (
                  <div className="additional-form">
                    <div className="additional-form-row">
                      <input type="text" placeholder="Nom de l'élément" value={additionalItemName} onChange={(e) => setAdditionalItemName(e.target.value)} className="form-input" />
                      <select value={additionalItemType} onChange={(e) => setAdditionalItemType(e.target.value)} className="form-select">
                        <option value="quantity">Quantité (suivi cumulé)</option>
                        <option value="note">Note (simple)</option>
                      </select>
                    </div>
                    {additionalItemType === 'quantity' && (
                      <input type="number" step="0.1" placeholder="Quantité initiale" value={additionalItemQuantity} onChange={(e) => setAdditionalItemQuantity(e.target.value)} className="form-input" />
                    )}
                    {additionalItemType === 'note' && (
                      <input type="text" placeholder="Note / description" value={additionalItemNotes} onChange={(e) => setAdditionalItemNotes(e.target.value)} className="form-input" />
                    )}
                    <div className="additional-form-row">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={additionalItemRequired} onChange={(e) => setAdditionalItemRequired(e.target.checked)} />
                        Requis pour la vidange
                      </label>
                    </div>
                    <div className="additional-form-actions">
                      <button type="button" onClick={() => setShowAddForm(null)} className="cancel-btn">Annuler</button>
                      <button type="button" onClick={handleAddAdditionalItem} disabled={submitting} className="confirm-btn">
                        {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Ajouter
                      </button>
                    </div>
                  </div>
                )}

                <div className="additional-items-list">
                  {(selectedMatricule.additional_maintenance || []).length === 0 ? (
                    <div className="empty-state-small"><Info size={32} /><p>Aucun élément de maintenance additionnelle</p></div>
                  ) : (
                    (selectedMatricule.additional_maintenance || []).map((item, idx) => (
                      <div key={item.id || idx} className="additional-item-card">
                        <div className="additional-item-header">
                          <div className="additional-item-title">
                            <strong>{item.name}</strong>
                            {item.required_for_vidange && <span className="required-badge-small">Requis pour vidange</span>}
                            <span className="item-type-badge">{item.type === 'quantity' ? 'Quantité' : 'Note'}</span>
                          </div>
                          <div className={`status-badge-small ${item.type === 'quantity' ? (item.value > 0 ? 'status-success' : 'status-warning') : (!item.needs_attention ? 'status-success' : 'status-warning')}`}>
                            {item.type === 'quantity'
                              ? (item.value > 0 ? <CheckCircle size={12} /> : <XCircle size={12} />)
                              : (!item.needs_attention ? <CheckCircle size={12} /> : <XCircle size={12} />)}
                            {item.type === 'quantity'
                              ? (item.value > 0 ? " Effectué" : " Non effectué")
                              : (!item.needs_attention ? " Effectué" : " À faire")}
                          </div>
                        </div>
                        <div className="additional-item-body">
                          {item.type === 'quantity' && (
                            <div className="additional-item-info">
                              <span>Total: <strong>{item.value} {item.name.includes('Huile') || item.name.includes('Ad Blue') ? 'L' : ''}</strong></span>
                              <span>Dernier: {item.last_done_date ? formatDate(item.last_done_date) : "—"}</span>
                            </div>
                          )}
                          {item.notes && <div className="additional-item-notes">Notes: {item.notes}</div>}
                          <div className="additional-item-actions">
                            <button type="button" onClick={() => {
                              setShowAddForm(showAddForm === item.id ? null : item.id);
                              setNewDate(new Date().toISOString().slice(0, 10));
                              setNewQuantity('');
                              resetMaintProduct();
                            }} className="action-btn-small primary">
                              <PlusCircle size={14} /> Ajouter
                            </button>
                            <button type="button" onClick={() => setShowHistoryFor(showHistoryFor === item.id ? null : item.id)} className="action-btn-small secondary">
                              <History size={14} /> Historique
                            </button>
                          </div>
                          {showAddForm === item.id && (
                            <div className="add-form">
                              {item.type === 'quantity' && (
                                <input type="number" step="0.1" placeholder="Quantité" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="small-input" />
                              )}
                              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
                              <button type="button" onClick={async () => {
                                if (!selectedMatricule) return;
                                if (item.type === 'quantity' && (!newQuantity || parseFloat(newQuantity) <= 0)) {
                                  toast.error("Quantité invalide"); return;
                                }
                                const list = selectedMatricule.additional_maintenance || [];
                                const idx2 = list.findIndex(i => i.id === item.id);
                                if (idx2 === -1) return;
                                const updated = { ...list[idx2] };
                                const qty = parseFloat(newQuantity);
                                const newValue = (updated.value || 0) + (item.type === 'quantity' ? qty : 0);
                                const historyEntry = { id: Date.now().toString(),
                                  quantity: item.type === 'quantity' ? qty : undefined,
                                  date: newDate, created_at: new Date().toISOString(),
                                  kilometrage: selectedMatricule.kilometrage };
                                updated.value = newValue;
                                updated.history = [...(updated.history || []), historyEntry];
                                updated.last_done_date = newDate;
                                updated.needs_attention = false;
                                updated.updated_at = new Date().toISOString();
                                const newList = [...list]; newList[idx2] = updated;
                                try {
                                  setSubmitting(true);
                                  await dispatch(updateMatricule({ id: selectedMatricule.id,
                                    data: { additional_maintenance: newList } })).unwrap();
                                  updateLocalMatricule({ additional_maintenance: newList });
                                  toast.success(`${updated.name} mis à jour`);
                                  setShowAddForm(null); setNewQuantity('');
                                  setNewDate(new Date().toISOString().slice(0, 10));
                                } catch (err) { toast.error(err.payload || "Erreur"); }
                                finally { setSubmitting(false); }
                              }} disabled={submitting} className="confirm-btn">
                                {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="inline-details-footer">
            <button type="button" onClick={() => setShowMatriculeDetails(false)} className="inline-secondary-btn">Fermer</button>
          </div>
        </div>
      )}

      {/* ==================== HISTORY MODAL ==================== */}
      {showHistoryFor && selectedMatricule && (
        <div className="modal-overlay history-overlay" onClick={() => setShowHistoryFor(null)}>
          <div className="modal history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Historique - {historyTitle()}</h3>
              <button type="button" className="modal-close" onClick={() => setShowHistoryFor(null)} aria-label="Fermer"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {(() => {
                let list = [];
                if (showHistoryFor === 'oil') list = getMaintenanceValue(selectedMatricule, 'oil').history;
                else if (showHistoryFor === 'filter_oil') list = getMaintenanceValue(selectedMatricule, 'filter_oil').history;
                else if (showHistoryFor === 'filter_air') list = getMaintenanceValue(selectedMatricule, 'filter_air').history;
                else if (showHistoryFor === 'paquets_de_frein') list = getMaintenanceValue(selectedMatricule, 'paquets_de_frein').history;
                else if (showHistoryFor === 'ad_blue') list = getMaintenanceValue(selectedMatricule, 'ad_blue').history;
                else { const it = (selectedMatricule.additional_maintenance || []).find(i => i.id === showHistoryFor); list = it?.history || []; }
                if (list.length === 0) return <div className="empty-history">Aucun historique disponible</div>;
                return (
                  <div className="history-scroll">
                    <table className="history-table">
                      <thead><tr><th>Date</th><th>Quantité</th><th>Produit utilisé</th><th>Coût</th><th>Km</th></tr></thead>
                      <tbody>
                        {[...list].reverse().map((entry, idx) => (
                          <tr key={idx}>
                            <td>{formatDate(entry.date)}</td>
                            <td>{entry.quantity ? `${entry.quantity} ${showHistoryFor === 'oil' || showHistoryFor === 'ad_blue' ? 'L' : ''}` : '—'}</td>
                            <td>
                              {entry.product_name ? (
                                <span className="badge badge-blue">
                                  <Package size={12} /> {entry.product_name}
                                  {entry.product_reference ? ` (${entry.product_reference})` : ''}
                                </span>
                              ) : (
                                <span className="muted">— manuel —</span>
                              )}
                            </td>
                            <td>
                              {entry.total_cost !== undefined && entry.total_cost !== null
                                ? `${Number(entry.total_cost).toFixed(2)} DH`
                                : entry.unit_cost ? `${Number(entry.unit_cost).toFixed(2)} DH` : '—'}
                            </td>
                            <td>{entry.kilometrage?.toLocaleString() || '—'} km</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MATRICULE FORM ==================== */}
      {showMatriculeForm && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">{editingMatricule ? <Sparkles size={28} /> : <Star size={28} />}</div>
            <div className="inline-form-title">
              <h2>{editingMatricule ? "Modifier le matricule" : "Nouveau matricule"}</h2>
              <p>{editingMatricule ? "Modifiez les informations du matricule" : "Ajoutez une nouvelle plaque d'immatriculation"}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={closeMatriculeForm} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault();
            if (editingMatricule) handleUpdateMatricule(formData); else handleCreateMatricule(formData);
          }} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Tag size={18} /><h3>Informations du matricule</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Plaque d'immatriculation *</label>
                      <input type="text" className="inline-input matricule-input" value={formData.matricule_code}
                        onChange={(e) => setFormData({ ...formData, matricule_code: e.target.value.toUpperCase() })}
                        required placeholder="Ex: AB-123-CD" />
                    </div>
                    <div className="inline-field">
                      <label>Kilométrage actuel *</label>
                      <input type="number" className="inline-input" value={formData.kilometrage}
                        onChange={(e) => setFormData({ ...formData, kilometrage: parseFloat(e.target.value) || 0 })} required />
                    </div>
                    <div className="inline-field">
                      <label>Statut *</label>
                      <select className="inline-select" value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option value="active">✅ Actif</option>
                        <option value="inactive">❌ Inactif</option>
                        <option value="sold">💸 Vendu</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Car size={18} /><h3>Voiture associée</h3></div>
                  <div className="inline-search-section">
                    <div className="inline-search-input-wrapper">
                      <Search size={18} />
                      <input type="text" className="inline-input" value={carSearchTerm}
                        onChange={(e) => handleCarSearch(e.target.value)}
                        placeholder="Rechercher une voiture (marque, modèle, année)..." />
                      {selectedCar && (
                        <button type="button" className="clear-search-btn" onClick={clearCarSelection} aria-label="Effacer">
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {filteredCars.length > 0 && (
                      <div className="inline-results">
                        {filteredCars.map(car => (
                          <div key={car.id} className="inline-result-item" onClick={() => handleCarSelect(car)}>
                            <div className="inline-result-avatar"><Car size={20} /></div>
                            <div className="inline-result-info">
                              <strong>{car.brand} {car.model} ({car.year})</strong>
                              <div className="inline-result-details">
                                <span>{car.color || "N/C"} - {car.fuel_type || "N/C"}</span>
                                <span>{car.price_per_day} DH/jour</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedCar && (
                      <div className="inline-selected">
                        <CheckCircle size={20} />
                        <div>
                          <strong>Voiture sélectionnée</strong>
                          <p>{selectedCar.brand} {selectedCar.model} ({selectedCar.year}) - {selectedCar.color || "N/C"} - {selectedCar.price_per_day} DH/jour</p>
                        </div>
                      </div>
                    )}

                    {!selectedCar && carSearchTerm.trim() !== "" && filteredCars.length === 0 && (
                      <div className="inline-no-results">
                        Aucune voiture trouvée.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Calendar size={18} /><h3>Documents et échéances</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Visite technique *</label>
                      <input type="date" className="inline-input" value={formData.visit_tech}
                        onChange={(e) => setFormData({ ...formData, visit_tech: e.target.value })} required />
                    </div>
                    <div className="inline-field">
                      <label>Assurance</label>
                      <input type="date" className="inline-input" value={formData.date_assurance}
                        onChange={(e) => setFormData({ ...formData, date_assurance: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Vignette (Taxe voiture)</label>
                      <input type="date" className="inline-input" value={formData.date_taxe_voiture}
                        onChange={(e) => setFormData({ ...formData, date_taxe_voiture: e.target.value })} />
                    </div>
                  </div>
                  <div className="inline-info-msg">
                    <Info size={16} />
                    <span>Les dates de visite technique et d'assurance déclenchent des alertes 7 jours avant l'expiration</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={closeMatriculeForm}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {editingMatricule ? <Save size={16} /> : <Plus size={16} />}
                {submitting ? "Traitement..." : (editingMatricule ? "Mettre à jour" : "Créer le matricule")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MAIN LIST ==================== */}
      {listVisible && (
        <div className="ac-wrap">
          {/* Header */}
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><Tag size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">Gestion des Matricules</h1>
                <p className="rv-sub">Suivi des plaques d'immatriculation, documents et maintenance</p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button type="button" onClick={refreshData} className="ac-btn" disabled={refreshing}>
                <RefreshCw size={15} className={refreshing ? "spin" : ""} /><span className="ac-btn-text">Actualiser</span>
              </button>
              <button type="button" onClick={handleExport} className="ac-btn">
                <Save size={15} /><span className="ac-btn-text">Exporter</span>
              </button>
              <button type="button" onClick={handleAddNew} className="ac-btn ac-btn-primary">
                <Plus size={15} /><span className="ac-btn-text">Nouveau matricule</span>
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
                placeholder="Rechercher par plaque, marque, modèle..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button type="button" className="ac-search-clear" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="ac-filter-select">
              <AcSelect
                id="ac-status"
                ariaLabel="Filtrer par statut"
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                options={STATUS_OPTIONS}
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

          {filterParam === 'notifications' && (
            <div className="filter-indicator">
              <span className="filter-indicator-text"><AlertTriangle size={15} /> Affichage des notifications uniquement</span>
              <button type="button" onClick={() => setSearchParams({})} className="clear-filter-btn">
                <X size={14} /> Effacer le filtre
              </button>
            </div>
          )}

          <div className="ac-meta">
            <p><strong>{filteredMatricules.length}</strong> matricule(s) trouvé(s)</p>
            <p>Page {currentPage} / {totalPages || 1}</p>
          </div>

          {viewMode === 'list' ? (
            <div className="ac-listwrap">
              {/* Desktop table */}
              <div className="ac-tablecard ac-desktop-only">
                <div className="ac-scroll">
                  <table className="ac-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                        <th onClick={() => handleSort("matricule")} className="sortable-header">Plaque {getSortIcon("matricule")}</th>
                        <th onClick={() => handleSort("car")} className="sortable-header">Voiture {getSortIcon("car")}</th>
                        <th onClick={() => handleSort("kilometrage")} className="sortable-header">Kilométrage {getSortIcon("kilometrage")}</th>
                        <th>Visite tech</th>
                        <th>Vidange</th>
                        <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMatricules.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="ac-empty-cell">
                            <Tag size={40} />
                            <p>Aucun matricule trouvé</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedMatricules.map(mat => (
                          <tr key={mat.id} id={`matricule-${mat.id}`}>
                            <td><span className="ac-id">#{mat.id}</span></td>
                            <td><span className="ac-plate">{mat.matricule_code}</span></td>
                            <td className="ac-strong">{getCarName(mat)}</td>
                            <td><div className="flex items-center gap-1"><Gauge size={14} /> {mat.kilometrage?.toLocaleString()} km</div></td>
                            <td>{renderTechAlert(mat)}</td>
                            <td>{getVidangeBadge(mat)}</td>
                            <td>{getStatusBadge(mat)}</td>
                            <td className="text-right">{rowActions(mat)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="ac-mobile-only">
                {sortBar}
                {paginatedMatricules.length === 0 ? (
                  <div className="ac-empty-card">
                    <Tag size={40} />
                    <p>Aucun matricule trouvé</p>
                  </div>
                ) : (
                  <div className="ac-mcards">
                    {paginatedMatricules.map(mat => {
                      const img = getCarImage(mat);
                      return (
                        <div key={mat.id} id={`matricule-m-${mat.id}`} className="ac-mcard">
                          <div className="ac-mcard-head">
                            {img ? (
                              <img
                                src={img}
                                alt={getCarName(mat)}
                                className="ac-mcard-thumb"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            ) : (
                              <div className="ac-mcard-thumb ac-mcard-thumb-empty"><Tag size={22} /></div>
                            )}
                            <div className="ac-mcard-info">
                              <div className="ac-mcard-name ac-mcard-plate">{mat.matricule_code}</div>
                              <div className="ac-mcard-sub">
                                <span className="ac-id">#{mat.id}</span> <span className="ac-mcard-car">{getCarName(mat)}</span>
                              </div>
                            </div>
                            <div className="ac-mcard-price">{mat.kilometrage?.toLocaleString() || 0}<small> km</small></div>
                          </div>

                          <div className="ac-mcard-badges">
                            {getStatusBadge(mat)}
                            {getVidangeBadge(mat)}
                          </div>

                          <div className="ac-mcard-meta">
                            {docItem("Visite", mat.visit_tech)}
                            {docItem("Assurance", mat.date_assurance)}
                            {docItem("Vignette", mat.date_taxe_voiture)}
                          </div>

                          {cardActions(mat)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {pagination}
            </div>
          ) : (
            <>
              {sortBar}
              {paginatedMatricules.length === 0 ? (
                <div className="ac-empty-card">
                  <Tag size={40} />
                  <p>Aucun matricule trouvé</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {paginatedMatricules.map(mat => {
                    const img = getCarImage(mat);
                    return (
                      <div key={mat.id} id={`matricule-c-${mat.id}`} className="car-card">
                        <div className="card-image">
                          {img ? (
                            <img
                              src={img}
                              alt={getCarName(mat)}
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          ) : (
                            <CarFront size={64} style={{ color: 'var(--tx-3)' }} />
                          )}
                          <div className="card-plate">{mat.matricule_code}</div>
                          <div className="card-status">{getStatusBadge(mat)}</div>
                        </div>
                        <div className="card-content">
                          <div className="card-title">
                            <span>{getCarName(mat)}</span>
                            <span className="card-price">{mat.kilometrage?.toLocaleString() || 0}<small>km</small></span>
                          </div>
                          <div className="card-details">
                            <div className="detail-item">{docItem("Visite", mat.visit_tech)}</div>
                            <div className="detail-item">{docItem("Assur.", mat.date_assurance)}</div>
                            <div className="detail-item">{docItem("Vignette", mat.date_taxe_voiture)}</div>
                            <div className="detail-item">{getVidangeBadge(mat)}</div>
                          </div>
                          {cardActions(mat)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {pagination}
            </>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && matriculeToDelete && (
            <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
              <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
                <div className="delete-icon"><Trash2 size={32} /></div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">
                  Êtes-vous sûr de vouloir supprimer le matricule <br />
                  <span className="reservation-id">{matriculeToDelete.matricule_code}</span> ?<br />
                  Cette action est irréversible.
                </p>
                {matriculeToDelete.status === "active" && (
                  <p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                    ⚠️ Ce matricule est actif. La suppression affectera les réservations associées.
                  </p>
                )}
                <div className="delete-actions">
                  <button disabled={deleting} type="button" onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
                  <button disabled={deleting} type="button" onClick={confirmDelete} className="modal-btn btn-delete">{deleting ? (<><span className="btn-spinner" /> Suppression...</>) : "Supprimer"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style>{`
@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap");

            /* ============================================================
               PAGE MATRICULES — même design que la page Voitures
               Tout est limité à .rv
               ============================================================ */
            .rv {
                --acc: #eab308; --acc-d: #ca9a04; --acc-tx: #a16207;
                --danger: #dc2626; --blue: #1da1e8; --blue-d: #0f84c4; --ink: #0a0a0a;
                --bg: #f8fafc; --surface: #ffffff; --surface-2: #f4f5f8;
                --tx: #111216; --tx-2: #5b6070; --tx-3: #8a90a0;
                --line: #e1e4ea; --line-strong: #0a0a0a;
                --ok-bg: #dcfce7; --ok-tx: #166534;
                --bad-bg: #fee2e2; --bad-tx: #991b1b;
                --warn-bg: #fef3c7; --warn-tx: #92400e;
                --info-bg: #dbeafe; --info-tx: #1e40af;
                font-family: Archivo, "Segoe UI", system-ui, -apple-system, sans-serif;
                color: var(--tx);
                -webkit-tap-highlight-color: transparent;
            }
            @media (prefers-color-scheme: dark) {
                .rv {
                    --bg: #0f172a; --surface: #15171c; --surface-2: #1b1e25;
                    --tx: #f2f3f5; --tx-2: #a4aab8; --tx-3: #747b8c;
                    --line: #2a2e37; --line-strong: #3b404c; --acc-tx: #facc15;
                    --ok-bg: #14532d; --ok-tx: #4ade80;
                    --bad-bg: #7f1d1d; --bad-tx: #fca5a5;
                    --warn-bg: #422006; --warn-tx: #fde68a;
                    --info-bg: #1e3a5f; --info-tx: #60a5fa;
                }
            }
            .rv *, .rv *::before, .rv *::after { box-sizing: border-box; }
            .rv button { font-family: inherit; }

            @keyframes rvFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes rvPop { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
            @keyframes rvSheet { from { transform: translateY(100%); } to { transform: none; } }

            /* ---------- Modals ---------- */
            .rv .modal-overlay {
                position: fixed; inset: 0; z-index: 1000;
                display: flex; align-items: center; justify-content: center;
                padding: 16px;
                background: rgba(10, 10, 10, 0.62);
                backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
                animation: rvFade 0.18s ease;
            }
            .rv .history-overlay { z-index: 1100; }
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
            .rv .modal-close:hover:not(:disabled) { background: var(--acc); border-color: var(--acc); color: #0a0a0a; }
            .rv .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
            .rv .modal-body { padding: 20px; color: var(--tx); }
            .rv .modal-actions-footer { display: flex; gap: 0.75rem; padding: 14px 20px; border-top: 2px dotted var(--line); }
            .rv .modal-btn {
                flex: 1; height: 46px; border-radius: 999px;
                border: 1.5px solid var(--line-strong);
                display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                font-size: 0.88rem; font-weight: 800; cursor: pointer; transition: transform 0.1s;
            }
            .rv .modal-btn:active { transform: translateY(3px); }
            .rv .modal-btn:disabled { opacity: 0.55; cursor: not-allowed; }
            .rv .modal-btn-cancel { background: var(--surface); color: var(--tx); }
            .rv .modal-btn.btn-primary { background: var(--acc); color: #0a0a0a; }
            .rv .btn-delete { background: var(--danger); color: #fff; }

            .rv .delete-modal { max-width: 420px; padding: 28px 22px 22px; text-align: center; }
            .rv .delete-icon {
                width: 72px; height: 72px; margin: 0 auto 14px; border-radius: 50%;
                background: #fde6e8; border: 2px solid var(--danger); color: var(--danger);
                display: flex; align-items: center; justify-content: center;
            }
            .rv .delete-title { font-size: 1.25rem; font-weight: 900; margin: 0 0 8px; text-align: center; }
            .rv .delete-message { font-size: 0.88rem; color: var(--tx-2); margin: 0 0 12px; text-align: center; line-height: 1.5; }
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

            /* modal "Ajouter maintenance" */
            .rv .add-maint-modal { max-width: 520px; padding: 0; }
            .rv .maint-plaque {
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800;
                color: var(--acc-tx); font-size: 0.95rem; letter-spacing: 0.06em;
                padding: 10px 14px; background: rgba(234, 179, 8, 0.12);
                border: 1.5px solid rgba(234, 179, 8, 0.45); border-radius: 12px; margin-bottom: 16px;
            }
            .rv .maint-plaque-sub { font-family: Archivo, system-ui, sans-serif; font-weight: 600; color: var(--tx-2); font-size: 0.8rem; letter-spacing: 0; }
            .rv .maint-type-section { margin-bottom: 12px; }
            .rv .maint-label { display: block; font-size: 0.66rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); margin-bottom: 8px; }
            .rv .icon-picker { display: flex; gap: 8px; flex-wrap: wrap; }
            .rv .icon-pick-btn {
                width: 48px; height: 48px; border-radius: 14px;
                border: 1.5px solid var(--line); background: var(--surface); color: var(--tx-2);
                display: inline-flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.15s;
            }
            .rv .icon-pick-btn:hover { border-color: var(--acc); color: var(--tx); }
            .rv .icon-pick-btn.active { background: var(--acc); border-color: var(--line-strong); color: #0a0a0a; }
            .rv .picked-type-label { font-size: 0.82rem; color: var(--tx-2); font-weight: 700; margin-top: 8px; }
            .rv .maint-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px; }
            .rv .maint-block { margin-top: 14px; }
            .rv .label-icon { display: inline; vertical-align: middle; margin-right: 4px; }
            .rv .maint-stock-hint { margin-top: 10px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid; font-size: 0.8rem; }
            .rv .maint-stock-hint.ok { background: var(--ok-bg); color: var(--ok-tx); border-color: var(--ok-tx); }
            .rv .maint-stock-hint.bad { background: var(--bad-bg); color: var(--bad-tx); border-color: var(--bad-tx); }
            .rv .maint-cost-total { font-size: 0.78rem; color: var(--tx-2); margin-top: 4px; }

            /* modal historique */
            .rv .history-modal { max-width: 800px; }
            .rv .history-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            .rv .history-table { width: 100%; min-width: 560px; font-size: 0.8rem; border-collapse: collapse; }
            .rv .history-table th {
                text-align: left; padding: 10px 12px; background: var(--surface-2); color: var(--tx-2);
                font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
            }
            .rv .history-table td { padding: 10px 12px; border-top: 1px solid var(--line); vertical-align: middle; }
            .rv .empty-history { text-align: center; padding: 2rem; color: var(--tx-3); }
            .rv .muted { color: var(--tx-3); }

            /* ---------- Form ---------- */
            .rv .inline-form-container,
            .rv .inline-details-container {
                position: relative; max-width: 1280px; margin: 1.5rem auto;
                background: var(--surface); border: 1.5px solid var(--line-strong);
                border-radius: 28px; overflow: hidden; overflow: clip;
            }
            .rv .inline-form-header,
            .rv .inline-details-header {
                position: relative; display: flex; align-items: center; gap: 18px;
                padding: 24px 80px 24px 28px; background: var(--ink);
            }
            .rv .inline-form-icon,
            .rv .inline-details-icon {
                width: 58px; height: 58px; border-radius: 16px;
                background: var(--acc); color: #0a0a0a;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0; transform: rotate(-5deg);
            }
            .rv .inline-form-title h2,
            .rv .inline-details-title h2 { margin: 0; color: #fff; font-size: 1.6rem; font-weight: 900; letter-spacing: -0.01em; line-height: 1.1; }
            .rv .inline-form-title p,
            .rv .inline-details-title p { margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; }
            .rv .inline-form-close,
            .rv .inline-details-close {
                position: absolute; top: 50%; right: 22px; transform: translateY(-50%);
                width: 44px; height: 44px; border-radius: 50%;
                border: 1.5px solid rgba(255,255,255,0.35); background: transparent; color: #fff;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.15s;
            }
            .rv .inline-form-close:hover,
            .rv .inline-details-close:hover { background: var(--acc); border-color: var(--acc); color: #0a0a0a; transform: translateY(-50%) rotate(90deg); }

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
            .rv .inline-section > .inline-field + .inline-field,
            .rv .inline-search-section + .inline-field { margin-top: 14px; }
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
            .rv .inline-textarea { resize: vertical; min-height: 80px; }
            .rv .inline-select {
                appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 38px;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23a16207' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
                background-repeat: no-repeat; background-position: right 14px center;
            }
            .rv .inline-input:focus,
            .rv .inline-select:focus,
            .rv .inline-textarea:focus { outline: none; border-color: var(--blue); }
            .rv .inline-input:disabled,
            .rv .inline-select:disabled,
            .rv .inline-textarea:disabled { opacity: 0.55; cursor: not-allowed; }
            .rv .inline-input::placeholder,
            .rv .inline-textarea::placeholder { color: var(--tx-3); }
            .rv .matricule-input { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; letter-spacing: 1px; }

            .rv .inline-info-msg,
            .rv .inline-error-msg,
            .rv .inline-warn-msg {
                display: flex; align-items: center; gap: 10px;
                margin-top: 14px; padding: 11px 14px; border-radius: 12px;
                font-size: 0.78rem; font-weight: 700; border: 1.5px solid;
            }
            .rv .inline-info-msg { background: rgba(29,161,232,0.12); border-color: var(--blue); color: var(--blue-d); }
            .rv .inline-error-msg { background: rgba(220,38,38,0.1); border-color: var(--danger); color: var(--danger); }
            .rv .inline-warn-msg { background: rgba(234,179,8,0.14); border-color: var(--acc); color: var(--acc-tx); }
            .rv .inline-info-msg svg, .rv .inline-error-msg svg, .rv .inline-warn-msg svg { flex-shrink: 0; }

            /* recherche + résultats (formulaires) */
            .rv .inline-search-section { position: relative; }
            .rv .inline-search-input-wrapper { position: relative; display: flex; align-items: center; }
            .rv .inline-search-input-wrapper > svg { position: absolute; left: 14px; color: var(--tx-3); z-index: 2; pointer-events: none; }
            .rv .inline-search-input-wrapper .inline-input { padding-left: 42px; padding-right: 42px; }
            .rv .clear-search-btn {
                position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 2;
                width: 28px; height: 28px; border: 0; border-radius: 50%;
                background: var(--line); color: var(--tx-2); cursor: pointer;
                display: flex; align-items: center; justify-content: center;
            }
            .rv .clear-search-btn:hover { background: var(--acc); color: #0a0a0a; }
            .rv .inline-results {
                position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 30;
                background: var(--surface); border: 1.5px solid var(--line); border-radius: 14px;
                box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.28);
                max-height: 320px; overflow-y: auto;
            }
            .rv .inline-result-item { display: flex; gap: 12px; padding: 12px; cursor: pointer; border-bottom: 1px solid var(--line); }
            .rv .inline-result-item:hover { background: var(--surface-2); }
            .rv .inline-result-item:last-child { border-bottom: 0; }
            .rv .inline-result-avatar {
                width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
                background: var(--acc); color: #0a0a0a; display: flex; align-items: center; justify-content: center;
            }
            .rv .inline-result-info { flex: 1; min-width: 0; }
            .rv .inline-result-info strong { display: block; font-size: 0.88rem; color: var(--tx); }
            .rv .inline-result-details { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 2px; font-size: 0.72rem; color: var(--tx-2); }
            .rv .inline-selected {
                display: flex; gap: 12px; align-items: flex-start; margin-top: 12px; padding: 12px 14px;
                background: var(--ok-bg); color: var(--ok-tx); border: 1.5px solid var(--ok-tx); border-radius: 12px; font-size: 0.85rem;
            }
            .rv .inline-selected svg { flex-shrink: 0; }
            .rv .inline-selected strong { display: block; font-weight: 800; }
            .rv .inline-selected p { margin: 2px 0 0; }
            .rv .inline-no-results { padding: 12px 4px 0; font-size: 0.82rem; color: var(--tx-2); }

            .rv .inline-secondary-btn {
                display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                min-height: 42px; padding: 0 18px; border-radius: 999px;
                border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
                font-size: 0.8rem; font-weight: 800; cursor: pointer;
                transition: transform 0.1s, background 0.15s;
            }
            .rv .inline-secondary-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
            .rv .inline-secondary-btn:active { transform: translateY(2px); }

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

            .rv .inline-form-footer {
                display: flex; justify-content: flex-end; gap: 14px;
                margin-top: 24px; padding-top: 22px; border-top: 2px dotted var(--line);
            }

            /* ---------- Détails du matricule ---------- */
            .rv .inline-details-content { padding: 28px; }
            .rv .inline-details-footer { display: flex; justify-content: flex-end; gap: 14px; padding: 18px 28px; border-top: 2px dotted var(--line); }
            .rv .details-actions-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
            .rv .back-btn {
                display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px;
                background: var(--surface); color: var(--tx); border: 1.5px solid var(--line-strong); border-radius: 999px;
                font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: transform 0.1s, background 0.15s;
            }
            .rv .back-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
            .rv .details-action-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
            .rv .action-edit-btn, .rv .action-accident-btn {
                display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 16px;
                border: 1.5px solid var(--line-strong); border-radius: 999px;
                font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: transform 0.1s, background 0.15s;
            }
            .rv .action-edit-btn { background: #10b981; color: #fff; }
            .rv .action-edit-btn:hover { background: #059669; transform: translateY(-1px); }
            .rv .action-accident-btn { background: var(--acc); color: #0a0a0a; }
            .rv .action-accident-btn:hover { background: var(--acc-d); transform: translateY(-1px); }

            .rv .matricule-header-card { background: var(--ink); color: #fff; border-radius: 20px; padding: 22px; margin-bottom: 20px; }
            .rv .matricule-plaque {
                display: inline-block; margin-bottom: 16px; padding: 6px 18px; border-radius: 10px;
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.5rem; font-weight: 800; letter-spacing: 3px;
                color: #0a0a0a; background: var(--acc); border: 3px solid #0a0a0a; outline: 2px solid var(--acc);
            }
            .rv .matricule-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
            .rv .stat-item-detail { background: rgba(255, 255, 255, 0.08); padding: 12px; border-radius: 14px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .rv .stat-value { font-size: 1.15rem; font-weight: 800; overflow-wrap: anywhere; }
            .rv .stat-label-detail { font-size: 0.7rem; opacity: 0.7; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
            .rv .status-badge-large { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; font-size: 0.85rem; font-weight: 700; }

            .rv .details-sections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 14px; margin-bottom: 20px; }
            .rv .detail-card { background: var(--surface-2); border: 1.5px solid var(--line); border-radius: 20px; overflow: hidden; }
            .rv .detail-card-title {
                display: flex; align-items: center; gap: 8px; padding: 12px 16px;
                font-size: 0.78rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
                border-bottom: 2px dotted var(--line);
            }
            .rv .detail-card-title svg { color: var(--acc-tx); }
            .rv .detail-card-content { padding: 6px 16px 10px; }
            .rv .info-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1.5px dotted var(--line); }
            .rv .info-row:last-child { border-bottom: 0; }
            .rv .info-label { font-size: 0.78rem; color: var(--tx-2); }
            .rv .info-value { font-size: 0.78rem; font-weight: 700; padding: 3px 10px; border-radius: 8px; text-align: right; }

            .rv .details-tabs-full {
                display: flex; gap: 3px; padding: 3px; margin-bottom: 18px; overflow-x: auto; -webkit-overflow-scrolling: touch;
                border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); width: fit-content; max-width: 100%;
            }
            .rv .details-tab-full {
                display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; flex-shrink: 0; white-space: nowrap;
                background: transparent; color: var(--tx-2); border: 0; border-radius: 9px;
                font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
            }
            .rv .details-tab-full:hover:not(.active) { color: var(--tx); }
            .rv .details-tab-full.active { background: #fef3c7; color: #92400e; }
            @media (prefers-color-scheme: dark) { .rv .details-tab-full.active { background: #422006; color: #fde68a; } }

            .rv .progress-section { background: var(--surface-2); border: 1.5px solid var(--line); border-radius: 20px; padding: 16px; margin-bottom: 20px; }
            .rv .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
            .rv .progress-title { font-size: 0.85rem; font-weight: 800; }
            .rv .progress-status { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
            .rv .status-done { background: var(--ok-bg); color: var(--ok-tx); }
            .rv .status-pending { background: var(--warn-bg); color: var(--warn-tx); }
            .rv .progress-bar-container { background: var(--line); border-radius: 999px; height: 8px; overflow: hidden; margin: 8px 0; }
            .rv .progress-bar-fill { background: #eab308; height: 100%; border-radius: 999px; transition: width 0.3s; }
            .rv .progress-text { font-size: 0.75rem; color: var(--tx-2); text-align: center; margin-top: 8px; }

            .rv .maintenance-items-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(350px, 100%), 1fr)); gap: 14px; }
            .rv .maintenance-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
            .rv .maintenance-card-header { padding: 14px 16px; background: var(--surface-2); border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
            .rv .maintenance-title { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.92rem; flex-wrap: wrap; }
            .rv .maintenance-title svg { color: var(--acc-tx); }
            .rv .required-badge, .rv .required-badge-small { background: var(--danger); color: #fff; border-radius: 999px; font-weight: 700; }
            .rv .required-badge { font-size: 0.62rem; padding: 2px 8px; }
            .rv .required-badge-small { font-size: 0.6rem; padding: 2px 8px; }
            .rv .status-badge, .rv .status-badge-small { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; border-radius: 999px; }
            .rv .status-badge { font-size: 0.72rem; padding: 4px 10px; }
            .rv .status-badge-small { font-size: 0.66rem; padding: 3px 8px; }
            .rv .status-success { background: var(--ok-bg); color: var(--ok-tx); }
            .rv .status-warning { background: var(--warn-bg); color: var(--warn-tx); }
            .rv .maintenance-card-body { padding: 16px; }
            .rv .maintenance-info { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; font-size: 0.85rem; color: var(--tx-2); }
            .rv .maintenance-info strong { color: var(--tx); }
            .rv .maintenance-actions { display: flex; gap: 8px; flex-wrap: wrap; }
            .rv .action-btn-small {
                display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 14px; border-radius: 10px;
                font-size: 0.76rem; font-weight: 700; cursor: pointer; border: 1px solid var(--line); transition: all 0.2s;
            }
            .rv .action-btn-small.primary { background: var(--acc); color: #0a0a0a; border-color: var(--acc); }
            .rv .action-btn-small.primary:hover { background: var(--acc-d); }
            .rv .action-btn-small.secondary { background: var(--surface); color: var(--tx); }
            .rv .action-btn-small.secondary:hover { background: var(--surface-2); border-color: var(--tx-3); }
            .rv .add-form { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
            .rv .small-input, .rv .form-input, .rv .form-select {
                min-height: 38px; padding: 6px 12px; border: 1.5px solid var(--line); border-radius: 10px;
                background: var(--surface); color: var(--tx); font-size: 0.8rem; font-family: inherit;
            }
            .rv .small-input:focus, .rv .form-input:focus, .rv .form-select:focus { outline: none; border-color: var(--blue); }
            .rv .cost-total-inline { font-size: 0.72rem; color: var(--tx-2); white-space: nowrap; }
            .rv .confirm-btn {
                display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 16px;
                background: #10b981; color: #fff; border: 0; border-radius: 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer;
            }
            .rv .confirm-btn:hover:not(:disabled) { background: #059669; }
            .rv .confirm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
            .rv .cancel-btn { min-height: 38px; padding: 0 16px; background: var(--danger); color: #fff; border: 0; border-radius: 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; }

            .rv .additional-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
            .rv .additional-header h4 { margin: 0; font-size: 1rem; font-weight: 800; }
            .rv .btn-add-additional {
                display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px;
                background: var(--acc); color: #0a0a0a; border: 1.5px solid var(--line-strong); border-radius: 999px;
                cursor: pointer; font-size: 0.8rem; font-weight: 800;
            }
            .rv .btn-add-additional:hover { background: var(--acc-d); }
            .rv .additional-form { background: var(--surface-2); border: 1.5px solid var(--line); border-radius: 20px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
            .rv .additional-form-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
            .rv .form-input, .rv .form-select { flex: 1; min-width: 150px; }
            .rv .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; }
            .rv .checkbox-label input { width: 18px; height: 18px; accent-color: #eab308; }
            .rv .additional-form-actions { display: flex; gap: 8px; justify-content: flex-end; }
            .rv .additional-items-list { display: flex; flex-direction: column; gap: 12px; }
            .rv .additional-item-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
            .rv .additional-item-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
            .rv .additional-item-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .rv .item-type-badge { font-size: 0.6rem; background: var(--tx-2); color: var(--surface); padding: 2px 8px; border-radius: 999px; font-weight: 700; }
            .rv .additional-item-body { display: flex; flex-direction: column; gap: 8px; }
            .rv .additional-item-info { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.78rem; color: var(--tx-2); }
            .rv .additional-item-info strong { color: var(--tx); }
            .rv .additional-item-notes { font-size: 0.72rem; color: var(--tx-2); font-style: italic; }
            .rv .additional-item-actions { display: flex; gap: 8px; flex-wrap: wrap; }
            .rv .empty-state-small { text-align: center; padding: 32px; color: var(--tx-3); }
            .rv .empty-state-small p { margin: 8px 0 0; font-size: 0.85rem; }

            /* countdown / divers hérités */
            .rv .countdown-time { background: rgba(234,179,8,0.16); color: var(--acc-tx); }

            /* Responsive formulaires */
            @media (max-width: 1024px) {
                .rv .inline-form-grid { grid-template-columns: 1fr; gap: 22px; }
            }
            @media (max-width: 640px) {
                .rv .inline-form-container, .rv .inline-details-container { margin: 0.6rem; border-radius: 22px; }
                .rv .inline-form-header, .rv .inline-details-header { padding: 18px 64px 18px 18px; gap: 14px; }
                .rv .inline-form-icon, .rv .inline-details-icon { width: 48px; height: 48px; border-radius: 14px; }
                .rv .inline-form-title h2, .rv .inline-details-title h2 { font-size: 1.2rem; }
                .rv .inline-form-close, .rv .inline-details-close { right: 14px; width: 40px; height: 40px; }
                .rv .inline-form { padding: 16px; }
                .rv .inline-details-content { padding: 16px; }
                .rv .inline-details-footer { padding: 14px 16px calc(14px + env(safe-area-inset-bottom, 0px)); }
                .rv .inline-details-footer > * { width: 100%; }
                .rv .inline-section { padding: 16px; border-radius: 18px; }
                .rv .inline-grid-2, .rv .maint-fields-grid { grid-template-columns: 1fr; }
                .rv .inline-form-footer { flex-direction: column-reverse; }
                .rv .inline-form-footer > *,
                .rv .inline-actions > * { width: 100%; }
                .rv .modal-overlay { align-items: flex-end; padding: 0; }
                .rv .modal {
                    max-width: 100% !important; max-height: 92vh;
                    border-radius: 24px 24px 0 0; border-bottom: 0;
                    animation: rvSheet 0.28s ease;
                }
                .rv .modal-actions-footer { flex-direction: column-reverse; padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)) !important; }
                .rv .modal-actions-footer button { width: 100%; }
                .rv .delete-actions { flex-direction: column-reverse; gap: 10px; }
                .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }

                /* 16px évite le zoom automatique d'iOS dans les champs */
                .rv .inline-input,
                .rv .inline-select,
                .rv .inline-textarea,
                .rv .small-input,
                .rv .form-input,
                .rv .form-select { font-size: 16px; }
                .rv .inline-form-title, .rv .inline-details-title { min-width: 0; }
                .rv .inline-form-title h2, .rv .inline-details-title h2 { overflow-wrap: anywhere; }
                .rv .inline-form-title p, .rv .inline-details-title p { font-size: 0.78rem; }
                .rv .inline-section-header h3 { white-space: normal; font-size: 0.76rem; }
                .rv .inline-primary-btn,
                .rv .inline-secondary-btn { min-height: 48px; }
                .rv .inline-form-footer { padding-bottom: calc(0px + env(safe-area-inset-bottom, 0px)); }
                .rv .modal-header { padding: 14px 16px; }
                .rv .modal-title { min-width: 0; font-size: 0.95rem; overflow-wrap: anywhere; }
                .rv .modal-body { padding: 1rem !important; }
                .rv .delete-modal { padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }

                /* détails : actions, stats, maintenance */
                .rv .details-actions-bar { flex-direction: column; align-items: stretch; }
                .rv .details-action-buttons { flex-direction: column; }
                .rv .back-btn, .rv .action-edit-btn, .rv .action-accident-btn { width: 100%; min-height: 46px; }
                .rv .matricule-header-card { padding: 16px; }
                .rv .matricule-plaque { font-size: 1.15rem; letter-spacing: 2px; }
                .rv .matricule-stats-grid { grid-template-columns: 1fr 1fr; }
                .rv .stat-value { font-size: 0.95rem; }
                .rv .details-tabs-full { width: 100%; }
                .rv .add-form { flex-direction: column; align-items: stretch; }
                .rv .add-form .small-input, .rv .add-form select { width: 100% !important; min-width: 0 !important; min-height: 46px; }
                .rv .confirm-btn, .rv .cancel-btn { min-height: 46px; justify-content: center; }
                .rv .additional-form-row { flex-direction: column; align-items: stretch; }
                .rv .additional-form-actions { flex-direction: column-reverse; }
                .rv .action-btn-small { flex: 1; justify-content: center; min-height: 42px; }
                .rv .info-row { flex-wrap: wrap; }
            }
            @media (max-width: 380px) {
                .rv .inline-form-container, .rv .inline-details-container { margin: 0.4rem; }
                .rv .inline-form-header, .rv .inline-details-header { padding: 14px 56px 14px 14px; }
                .rv .inline-form-icon, .rv .inline-details-icon { width: 42px; height: 42px; }
                .rv .inline-form-title h2, .rv .inline-details-title h2 { font-size: 1.05rem; }
                .rv .inline-form { padding: 12px; }
                .rv .matricule-stats-grid { grid-template-columns: 1fr; }
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

            /* ============================================================
               LISTE — même style que la liste Voitures / Utilisateurs
               ============================================================ */
            .rv .ac-wrap { width: 100%; max-width: none; margin: 0; padding: 1.5rem; }

            /* en-tête */
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
            .rv .ac-btn:hover:not(:disabled) { background: var(--surface-2); border-color: var(--tx-3); transform: translateY(-1px); }
            .rv .ac-btn:disabled { opacity: 0.6; cursor: not-allowed; }
            .rv .ac-btn-primary {
                background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; border-color: transparent;
                box-shadow: 0 4px 14px -4px rgba(15, 23, 42, 0.4);
            }
            .rv .ac-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #0f172a, #1e293b); border-color: transparent; box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.5); }
            .rv .spin { animation: acSpin 0.8s linear infinite; }

            /* stats */
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

            /* filtres */
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
            .rv .ac-filter-select { width: 190px; flex-shrink: 0; }
            .rv .ac-filter-select .ac-dd-trigger { height: 38px; font-size: 0.8rem; border-radius: 10px; }
            .rv .ac-seg { display: inline-flex; padding: 3px; gap: 3px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); }
            .rv .ac-seg-btn {
                display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
                border: 0; border-radius: 9px; background: transparent; color: var(--tx-2);
                font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
            }
            .rv .ac-seg-btn:hover:not(.active) { color: var(--tx); }
            .rv .ac-seg-btn.active { background: #fef3c7; color: #92400e; }
            @media (prefers-color-scheme: dark) { .rv .ac-seg-btn.active { background: #422006; color: #fde68a; } }

            /* filtre notifications */
            .rv .filter-indicator {
                display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
                margin-bottom: 1rem; padding: 12px 16px; border-radius: 14px;
                background: var(--warn-bg); border: 1.5px solid var(--acc); color: var(--warn-tx);
            }
            .rv .filter-indicator-text { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; }
            .rv .clear-filter-btn {
                display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 14px; border-radius: 999px;
                background: var(--surface); color: var(--tx); border: 1.5px solid var(--line-strong);
                font-size: 0.75rem; font-weight: 800; cursor: pointer;
            }
            .rv .clear-filter-btn:hover { background: var(--acc); color: #0a0a0a; }

            .rv .ac-meta { display: flex; justify-content: space-between; padding: 0 4px; margin-bottom: 12px; font-size: 0.78rem; color: var(--tx-2); }
            .rv .ac-meta p { margin: 0; }
            .rv .ac-meta strong { color: var(--tx); font-weight: 700; }

            /* tableau */
            .rv .ac-tablecard { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
            .rv .ac-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            .rv .ac-table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: 0.82rem; }
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
            .rv .ac-plate {
                display: inline-block; padding: 4px 10px; border-radius: 8px; white-space: nowrap;
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; font-size: 0.8rem; letter-spacing: 0.06em;
                background: rgba(234, 179, 8, 0.14); color: var(--acc-tx); border: 1px solid rgba(234, 179, 8, 0.35);
            }
            .rv .ac-table td .flex { font-size: 0.8rem; color: var(--tx-2); white-space: nowrap; }
            .rv .ac-table td .flex svg { color: var(--tx-3); flex-shrink: 0; }
            .rv .ac-table td { transition: background 0.15s; }
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

            /* badges */
            .rv .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
            .rv .badge-success { background: var(--ok-bg); color: var(--ok-tx); }
            .rv .badge-danger { background: var(--bad-bg); color: var(--bad-tx); }
            .rv .badge-warning, .rv .badge-sold { background: var(--warn-bg); color: var(--warn-tx); }
            .rv .badge-blue { background: var(--info-bg); color: var(--info-tx); }

            /* alertes de dates */
            .rv .date-alert { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 10px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
            .rv .date-expired { background: var(--bad-bg); color: var(--bad-tx); }
            .rv .date-soon { background: var(--warn-bg); color: var(--warn-tx); }
            .rv .date-ok { background: var(--ok-bg); color: var(--ok-tx); }
            .rv .ac-doc { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 8px; font-size: 0.72rem; font-weight: 600; background: var(--surface-2); color: var(--tx-2); white-space: nowrap; }

            /* boutons d'action (tableau) */
            .rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
            .rv .ac-action-btn {
                width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
                border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
            }
            .rv .ac-action-maint { color: #0d9488; }
            .rv .ac-action-view { color: #2563eb; }
            .rv .ac-action-edit { color: #10b981; }
            .rv .ac-action-accident { color: #d97706; }
            .rv .ac-action-delete { color: #ef4444; }
            .rv .ac-action-btn.ac-action-maint:hover { background: var(--ok-bg); }
            .rv .ac-action-btn.ac-action-view:hover { background: var(--info-bg); }
            .rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
            .rv .ac-action-btn.ac-action-accident:hover { background: var(--warn-bg); }
            .rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
            @media (prefers-color-scheme: dark) {
                .rv .ac-action-maint { color: #2dd4bf; }
                .rv .ac-action-view { color: #60a5fa; }
                .rv .ac-action-accident { color: #fbbf24; }
                .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
                .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
            }

            /* boutons libellés (cartes) */
            .rv .ac-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); }
            .rv .ac-card-btns.five { grid-template-columns: repeat(5, 1fr); gap: 4px; }
            .rv .ac-card-btn {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
                background: var(--surface-2); cursor: pointer; transition: all 0.2s; min-width: 0;
            }
            .rv .ac-card-btn span { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.01em; color: var(--tx-2); line-height: 1; white-space: nowrap; }
            .rv .ac-card-btn:active { transform: scale(0.96); }
            .rv .ac-card-btn.ac-action-maint:hover, .rv .ac-card-btn.ac-action-maint:active { background: var(--ok-bg); }
            .rv .ac-card-btn.ac-action-view:hover, .rv .ac-card-btn.ac-action-view:active { background: var(--info-bg); }
            .rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #ecfdf5; }
            .rv .ac-card-btn.ac-action-accident:hover, .rv .ac-card-btn.ac-action-accident:active { background: var(--warn-bg); }
            .rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #fef2f2; }
            @media (prefers-color-scheme: dark) {
                .rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #064e3b; }
                .rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #7f1d1d; }
            }

            /* cartes mobile (mode Liste) */
            .rv .ac-mcards { display: flex; flex-direction: column; gap: 10px; }
            .rv .ac-mcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
            .rv .ac-mcard-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
            .rv .ac-mcard-thumb { width: 64px; height: 48px; object-fit: cover; border-radius: 12px; border: 1px solid var(--line); flex-shrink: 0; }
            .rv .ac-mcard-thumb-empty { display: flex; align-items: center; justify-content: center; background: var(--surface-2); color: var(--tx-3); }
            .rv .ac-mcard-info { flex: 1; min-width: 0; }
            .rv .ac-mcard-name { font-weight: 700; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .rv .ac-mcard-plate { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; letter-spacing: 0.06em; color: var(--acc-tx); }
            .rv .ac-mcard-sub { margin-top: 3px; display: flex; align-items: center; gap: 6px; min-width: 0; }
            .rv .ac-mcard-car { font-size: 0.75rem; color: var(--tx-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .rv .ac-mcard-price { font-weight: 800; font-size: 1rem; white-space: nowrap; }
            .rv .ac-mcard-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
            .rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
            .rv .ac-mcard-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }

            /* vue "Cartes" */
            .rv .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
            .rv .car-card {
                background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
                overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
            }
            .rv .car-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18); }
            .rv .card-image { position: relative; height: 150px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .rv .card-image img { width: 100%; height: 100%; object-fit: cover; }
            .rv .card-plate {
                position: absolute; left: 12px; bottom: 12px; padding: 5px 12px; border-radius: 8px;
                background: var(--acc); color: #0a0a0a; border: 2px solid #0a0a0a;
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.08em;
            }
            .rv .card-status { position: absolute; top: 0.75rem; right: 0.75rem; }
            .rv .card-content { padding: 16px; }
            .rv .card-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 0.5rem; font-size: 1.05rem; font-weight: 700; }
            .rv .card-price { font-size: 1.05rem; font-weight: 800; color: var(--acc-tx); white-space: nowrap; }
            .rv .card-price small { font-size: 0.7rem; font-weight: 500; margin-left: 3px; }
            .rv .card-details {
                display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;
                margin: 0.75rem 0; padding: 0.75rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
            }
            .rv .detail-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--tx-2); min-width: 0; }
            .rv .card-details + .ac-card-btns { border-top: 0; padding-top: 0; }

            /* barre "Trier" */
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

            /* menu déroulant */
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
            @keyframes acDdIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
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

            /* pagination */
            .rv .ac-pager { margin-top: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
            .rv .pagination { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; padding: 14px; }
            .rv .page-btn {
                min-width: 38px; height: 38px; padding: 0 12px; border-radius: 10px;
                border: 1px solid var(--line); background: var(--surface); color: var(--tx);
                font-weight: 700; cursor: pointer;
            }
            .rv .page-btn:hover:not(:disabled) { background: var(--surface-2); }
            .rv .page-btn.active { background: #eab308; border-color: #eab308; color: #0a0a0a; }
            .rv .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

            /* chargement */
            .rv .loading { text-align: center; padding: 4rem 1rem; color: var(--tx-2); font-weight: 700; }
            .rv .spinner {
                display: inline-block; width: 40px; height: 40px; margin-bottom: 12px; border-radius: 50%;
                border: 4px solid var(--line); border-top-color: #eab308; animation: acSpin 0.7s linear infinite;
            }
            @keyframes acSpin { to { transform: rotate(360deg); } }

            /* responsive liste */
            .rv .ac-mobile-only { display: none; }
            @media (max-width: 768px) {
                .rv .ac-wrap { padding: 1rem; }
                .rv .rv-head { flex-direction: column; }
                .rv .rv-head-actions { width: 100%; gap: 6px; }
                .rv .rv-head-actions .ac-btn { flex: 1; height: 40px; padding: 0 10px; }
                .rv .ac-btn-text { display: none; }
                .rv .ac-btn-primary .ac-btn-text { display: inline; }
                .rv .ac-btn-primary { flex: 2; }
                .rv .rv-title { font-size: 1.45rem; }
                .rv .rv-stats { grid-template-columns: repeat(2, 1fr); }
                .rv .rv-stats .rv-stat-card:last-child:nth-child(odd) { grid-column: 1 / -1; }
                .rv .ac-filters { flex-direction: column; align-items: stretch; }
                .rv .ac-search { min-width: 100%; }
                .rv .ac-search input { font-size: 16px; }
                .rv .ac-filter-select { width: 100%; }
                .rv .ac-filter-select .ac-dd-trigger { height: 44px; font-size: 0.88rem; border-radius: 12px; }
                .rv .ac-seg { align-self: stretch; }
                .rv .ac-seg-btn { flex: 1; justify-content: center; }
                .rv .ac-desktop-only { display: none !important; }
                .rv .ac-mobile-only { display: block !important; }
                .rv .cards-grid { grid-template-columns: 1fr; }
                .rv .filter-indicator { flex-direction: column; align-items: stretch; }
                .rv .clear-filter-btn { justify-content: center; }
            }

    `}</style>
  );
}