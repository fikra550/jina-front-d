// src/pages/admin/AdminPayments.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { fetchCars, selectCars, fetchMatricules, selectMatricules } from "../../Redux/store";
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, RefreshCw, Car, DollarSign, Calendar,
  Check, AlertCircle, CreditCard, FileText, Download,
  Save, Search, User, Building2, FileCheck, Clock, Wallet, Banknote,
  Receipt, CalendarDays, Percent, Info, CreditCard as CreditCardIcon,
  AlertTriangle, CheckCircle, XCircle, Eye, Printer, Phone, Mail,
  MapPin, IdCard, Users, Gauge, Shield, Settings, Calculator,
  PieChart, TrendingDown, Sparkles, ArrowUpDown, ArrowUp, ArrowDown,
  Activity, ArrowLeft, List, LayoutGrid, CheckCircle2, CarFront,
  ChevronDown, Wrench
} from "lucide-react";

/* ============================================================
   AcSelect — custom dropdown (styled on desktop & mobile)
   - Portal-rendered menu → never clipped by overflow:hidden parents
   - Auto-flips up when no space below
   - Repositions on scroll/resize (works inside modals too)
   - Larger tap targets + 16px font on mobile (no iOS zoom)
   ============================================================ */
const AcSelect = ({
  value, onChange, options, id, ariaLabel,
  variant = "default", placeholder = "Sélectionner…", disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Close on outside click/touch/escape
  useEffect(() => {
    if (!open) return;
    const handler = (ev) => {
      if (ev.type === "keydown") { if (ev.key === "Escape") setOpen(false); return; }
      const t = ev.target;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        menuRef.current && !menuRef.current.contains(t)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [open]);

  // Measure trigger, choose best side, constrain height
  const computePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const gap = 6;
    const idealMax = 300;

    const spaceBelow = vh - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < Math.min(idealMax, 200) && spaceAbove > spaceBelow;

    const width = Math.min(rect.width, vw - 16);
    const left = Math.max(8, Math.min(rect.left, vw - width - 8));

    setMenuStyle({
      position: "fixed",
      left,
      width,
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? vh - rect.top + gap : undefined,
      maxHeight: Math.max(120, Math.min(idealMax, openUp ? spaceAbove - 8 : spaceBelow - 8)),
    });
  };

  const toggle = () => {
    if (disabled) return;
    if (!open) computePosition();
    setOpen((o) => !o);
  };

  // Reposition on scroll/resize (page + any scrollable ancestor, e.g. modals)
  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => computePosition();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open]);

  const current = options.find((o) => String(o.value) === String(value));

  return (
    <div className={`ac-dd ac-dd-${variant}`} ref={triggerRef}>
      <button
        type="button"
        id={id}
        className={`ac-dd-trigger ${open ? "open" : ""}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span>{current?.label ?? placeholder}</span>
        <ChevronDown size={16} className="ac-dd-chevron" />
      </button>

      {open && createPortal(
        <div className="rv" style={{ display: "contents" }}>
          <ul
            className="ac-dd-menu ac-dd-menu-floating"
            role="listbox"
            style={menuStyle}
            ref={menuRef}
          >
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
        </div>,
        document.body
      )}
    </div>
  );
};

/* ============================================================
   Option constants
   ============================================================ */
const SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "dossier", label: "Dossier N°" },
  { value: "vehicle", label: "Véhicule" },
  { value: "matricule", label: "Matricule" },
  { value: "amount", label: "Montant crédit" },
  { value: "installment", label: "Mensualité" },
  { value: "progress", label: "Progression" },
  { value: "status", label: "Statut" },
];

const CREDIT_TYPE_OPTIONS = [
  { value: "vehicule_entreprise", label: "Véhicule entreprise" },
  { value: "vehicule_personnel",  label: "Véhicule personnel" },
  { value: "vehicule_utilitaire", label: "Véhicule utilitaire" },
];

const PERIODICITY_OPTIONS = [
  { value: "mensuel",     label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "semestriel",  label: "Semestriel" },
  { value: "annuel",      label: "Annuel" },
];

const FINANCING_STATUS_OPTIONS = [
  { value: "active",    label: "✅ Actif" },
  { value: "completed", label: "✔️ Terminé" },
  { value: "late",      label: "⚠️ En retard" },
  { value: "defaulted", label: "❌ Défaillant" },
];

const FILTER_STATUS_OPTIONS = [
  { value: "all",       label: "Tous les statuts" },
  { value: "active",    label: "Actif" },
  { value: "completed", label: "Terminé" },
  { value: "late",      label: "En retard" },
  { value: "defaulted", label: "Défaillant" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "bank_transfer", label: "Virement" },
  { value: "cash",          label: "Espèces" },
  { value: "check",         label: "Chèque" },
  { value: "card",          label: "Carte" },
];

export default function AdminPayments() {
  const dispatch = useDispatch();
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);

  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [financings, setFinancings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [financingToDelete, setFinancingToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFinancing, setSelectedFinancing] = useState(null);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Styled interest prompt
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [currentFinancingForSchedule, setCurrentFinancingForSchedule] = useState(null);
  const [interestRate, setInterestRate] = useState("5");
  const [tvaRate, setTvaRate] = useState("20");

  // View mode + per-page
  const [viewMode, setViewMode] = useState("list");
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  // Matricule search state
  const [matriculeSearchTerm, setMatriculeSearchTerm] = useState("");
  const [filteredMatriculesList, setFilteredMatriculesList] = useState([]);
  const [selectedMatriculeObj, setSelectedMatriculeObj] = useState(null);

  const [formData, setFormData] = useState({
    matricule_id: "",
    dossier_number: "",
    account_number: "",
    credit_type: "vehicule_entreprise",
    contract_date: new Date().toISOString().slice(0, 10),
    credit_amount: 0,
    preti_interet_ttc_differe: 0,
    duration_months: 36,
    differed_months: 0,
    periodicity: "mensuel",
    total_installments: 36,
    first_installment_date: new Date().toISOString().slice(0, 10),
    last_installment_date: "",
    bank_name: "",
    bank_account: "",
    installment_amount: 0,
    prestation_amount: 0,
    status: "active",
    notes: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    installment_number: 1,
    paid_amount: 0,
    paid_date: new Date().toISOString().slice(0, 10),
    payment_method: "bank_transfer",
    transaction_reference: "",
    payment_notes: ""
  });

  const api = axios.create({
    baseURL: "https://jina-back-d-production.up.railway.app/api",
    headers: { "Accept": "application/json", "Content-Type": "application/json" }
  });

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    } catch { return ""; }
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("fr-FR");
    } catch { return dateString; }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === "asc"
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />;
  };

  const getMatriculeInfo = (matriculeId) => {
    const matricule = matricules.find(m => m.id === matriculeId);
    if (matricule) {
      const car = cars.find(c => c.id === matricule.car_id);
      return { car, matricule_code: matricule.matricule_code };
    }
    return null;
  };

  const fetchFinancings = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get("/payments");
      setFinancings(response.data.financings || []);
    } catch (error) {
      console.error("Error fetching financings:", error);
      toast.error("Erreur lors du chargement des données");
      setFinancings([]);
    } finally {
      setLoading(false);
    }
  };

  useResetScrollOnOpen([
    showPaymentForm,
    showPaymentDetails,
    deleteModalOpen,
    interestModalOpen,
    paymentsModalOpen,
    recordPaymentModalOpen,
  ]);

  useEffect(() => {
    if (!paymentsModalOpen) return;
    setSelectedFinancing((prev) => {
      if (!prev) return prev;
      const fresh = financings.find((f) => f.id === prev.id);
      return fresh ? { ...fresh, payments: prev.payments } : prev;
    });
  }, [financings, paymentsModalOpen]);

  useEffect(() => {
    fetchFinancings();
    dispatch(fetchCars());
    dispatch(fetchMatricules());
  }, [dispatch]);

  /* ---------- CRUD ---------- */
  const saveFinancing = async (data) => {
    try {
      if (editing) {
        const response = await api.put(`/payments/${editing.id}`, data);
        toast.success("Financement modifié avec succès");
        return response.data.financing;
      } else {
        const response = await api.post("/payments", data);
        toast.success("Financement ajouté avec succès");
        return response.data.financing;
      }
    } catch (error) {
      console.error("Error saving financing:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement");
      throw error;
    }
  };

  const deleteFinancing = async (id) => {
    try {
      await api.delete(`/payments/${id}`);
      toast.success("Financement supprimé avec succès");
      return true;
    } catch (error) {
      console.error("Error deleting financing:", error);
      toast.error("Erreur lors de la suppression");
      return false;
    }
  };

  const generateSchedule = async (financingId, data) => {
    try {
      const response = await api.post(`/payments/${financingId}/generate-schedule`, data);
      toast.success(response.data.message);
      return response.data;
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la génération de l'échéancier");
      throw error;
    }
  };

  const recordPayment = async (financingId, data) => {
    try {
      const response = await api.post(`/payments/${financingId}/record-payment`, data);
      toast.success("Paiement enregistré avec succès");
      return response.data;
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement du paiement");
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = { ...formData };
    if (!payload.last_installment_date && payload.first_installment_date && payload.total_installments) {
      const startDate = new Date(payload.first_installment_date);
      const lastDate = new Date(startDate);
      lastDate.setMonth(startDate.getMonth() + payload.total_installments - 1);
      payload.last_installment_date = lastDate.toISOString().slice(0, 10);
    }

    try {
      await saveFinancing(payload);
      await fetchFinancings();
      setShowPaymentForm(false);
      setEditing(null);
      resetForm();
    } catch (error) {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      matricule_id: "", dossier_number: "", account_number: "",
      credit_type: "vehicule_entreprise",
      contract_date: new Date().toISOString().slice(0, 10),
      credit_amount: 0, preti_interet_ttc_differe: 0,
      duration_months: 36, differed_months: 0,
      periodicity: "mensuel", total_installments: 36,
      first_installment_date: new Date().toISOString().slice(0, 10),
      last_installment_date: "", bank_name: "", bank_account: "",
      installment_amount: 0, prestation_amount: 0,
      status: "active", notes: ""
    });
    setSelectedMatriculeObj(null);
    setMatriculeSearchTerm("");
    setFilteredMatriculesList([]);
  };

  const handleDeleteClick = (financing) => {
    setFinancingToDelete(financing);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!financingToDelete) return;
    const success = await deleteFinancing(financingToDelete.id);
    if (success) await fetchFinancings();
    setDeleteModalOpen(false);
    setFinancingToDelete(null);
  };

  const openSchedulePrompt = (financing) => {
    setCurrentFinancingForSchedule(financing);
    setInterestRate("5");
    setTvaRate("20");
    setInterestModalOpen(true);
  };

  const confirmGenerateSchedule = async () => {
    if (!currentFinancingForSchedule) return;
    const rate = parseFloat(interestRate);
    const tva = parseFloat(tvaRate);
    if (isNaN(rate) || rate < 0) { toast.error("Taux d'intérêt invalide"); return; }
    if (isNaN(tva) || tva < 0) { toast.error("Taux de TVA invalide"); return; }
    setGenerating(true);
    try {
      await generateSchedule(currentFinancingForSchedule.id, { interest_rate: rate, tva_rate: tva });
      await fetchFinancings({ silent: true });
      setInterestModalOpen(false);
      setCurrentFinancingForSchedule(null);
    } catch { /* handled */ }
    finally { setGenerating(false); }
  };

  const loadPayments = async (financingId) => {
    try {
      const response = await api.get(`/payments/${financingId}/payments`);
      setSelectedFinancing((prev) => ({ ...prev, payments: response.data.payments }));
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Erreur lors du chargement des paiements");
    }
  };

  const viewPayments = async (financingId) => {
    const financing = financings.find(f => f.id === financingId);
    if (!financing) return;
    // Open the page immediately with what we already have, then load payments
    setSelectedFinancing({ ...financing, payments: financing.payments || [] });
    setPaymentsModalOpen(true);
    setPaymentsLoading(true);
    try {
      const response = await api.get(`/payments/${financingId}/payments`);
      setSelectedFinancing((prev) => (prev && prev.id === financingId ? { ...prev, payments: response.data.payments } : prev));
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Erreur lors du chargement des paiements");
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await recordPayment(selectedFinancing.id, paymentForm);
      await Promise.all([loadPayments(selectedFinancing.id), fetchFinancings({ silent: true })]);
      setRecordPaymentModalOpen(false);
      setPaymentForm({
        installment_number: 1, paid_amount: 0,
        paid_date: new Date().toISOString().slice(0, 10),
        payment_method: "bank_transfer",
        transaction_reference: "", payment_notes: ""
      });
    } catch { /* handled */ }
    finally { setSubmitting(false); }
  };

  /* ---------- Matricule search ---------- */
  const handleMatriculeSearch = (term) => {
    setMatriculeSearchTerm(term);
    if (term.trim() === "") { setFilteredMatriculesList([]); return; }
    const lower = term.toLowerCase().trim();
    const filtered = matricules.filter(m => {
      if (m.status === 'sold') return false;
      const car = cars.find(c => c.id === m.car_id);
      const carStr = car ? `${car.brand} ${car.model}`.toLowerCase() : '';
      return m.matricule_code.toLowerCase().includes(lower) || carStr.includes(lower);
    });
    setFilteredMatriculesList(filtered.slice(0, 10));
  };

  const handleMatriculeSelect = (mat) => {
    setSelectedMatriculeObj(mat);
    const car = cars.find(c => c.id === mat.car_id);
    setMatriculeSearchTerm(`${mat.matricule_code} - ${car ? `${car.brand} ${car.model}` : 'N/A'}`);
    setFormData(prev => ({ ...prev, matricule_id: mat.id }));
    setFilteredMatriculesList([]);
  };

  const clearMatriculeSelection = () => {
    setSelectedMatriculeObj(null);
    setMatriculeSearchTerm("");
    setFilteredMatriculesList([]);
    setFormData(prev => ({ ...prev, matricule_id: "" }));
  };

  const handleEdit = (f) => {
    setEditing(f);
    setFormData({
      matricule_id: f.matricule_id,
      dossier_number: f.dossier_number,
      account_number: f.account_number || "",
      credit_type: f.credit_type,
      contract_date: formatDateForInput(f.contract_date),
      credit_amount: f.credit_amount,
      preti_interet_ttc_differe: f.preti_interet_ttc_differe || 0,
      duration_months: f.duration_months,
      differed_months: f.differed_months || 0,
      periodicity: f.periodicity || "mensuel",
      total_installments: f.total_installments,
      first_installment_date: formatDateForInput(f.first_installment_date),
      last_installment_date: formatDateForInput(f.last_installment_date) || "",
      bank_name: f.bank_name || "",
      bank_account: f.bank_account || "",
      installment_amount: f.installment_amount,
      prestation_amount: f.prestation_amount || 0,
      status: f.status,
      notes: f.notes || ""
    });

    if (f.matricule_id) {
      const mat = matricules.find(m => m.id === f.matricule_id);
      if (mat) {
        setSelectedMatriculeObj(mat);
        const car = cars.find(c => c.id === mat.car_id);
        setMatriculeSearchTerm(`${mat.matricule_code} - ${car ? `${car.brand} ${car.model}` : 'N/A'}`);
      }
    } else {
      setSelectedMatriculeObj(null);
      setMatriculeSearchTerm("");
    }
    setShowPaymentForm(true);
  };

  const handleViewDetails = (financing) => {
    setSelectedFinancing(financing);
    setShowPaymentDetails(true);
    loadPayments(financing.id);
  };

  const handleAddNew = () => {
    setEditing(null);
    resetForm();
    setShowPaymentForm(true);
  };

  const refreshData = () => {
    fetchFinancings();
    dispatch(fetchCars(true));
    dispatch(fetchMatricules(true));
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = ['ID', 'Dossier N°', 'Véhicule', 'Matricule', 'Montant Crédit', 'Mensualité', 'Total Échéances', 'Payé', 'Reste', 'Statut', 'Date Contrat'];
    const csvData = filteredFinancings.map(f => {
      const info = getMatriculeInfo(f.matricule_id);
      return [
        f.id,
        `"${f.dossier_number}"`,
        `"${info ? `${info.car.brand} ${info.car.model}` : '—'}"`,
        `"${info ? info.matricule_code : '—'}"`,
        f.credit_amount, f.installment_amount, f.total_installments,
        f.total_paid, f.total_remaining,
        f.status === 'active' ? 'Actif' : f.status === 'completed' ? 'Terminé' : 'En retard',
        f.contract_date
      ].join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  /* ---------- Filter & Sort ---------- */
  const filteredFinancings = useMemo(() => {
    return financings.filter(f => {
      const info = getMatriculeInfo(f.matricule_id);
      const carName = info && info.car ? `${info.car.brand} ${info.car.model}`.toLowerCase() : "";
      const matchesSearch = searchTerm === "" ||
        carName.includes(searchTerm.toLowerCase()) ||
        f.dossier_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (info && info.matricule_code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;

      let matchesNotification = true;
      if (filterParam === 'notifications') {
        let hasOverdueOrUpcoming = false;
        if (f.payments && f.payments.length > 0) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          hasOverdueOrUpcoming = f.payments.some(p => p.status !== 'paid' && new Date(p.due_date) < today) ||
            f.payments.some(p => {
              const diff = (new Date(p.due_date) - today) / (1000 * 60 * 60 * 24);
              return p.status !== 'paid' && diff >= 0 && diff <= 7;
            });
        } else if (f.status === 'late' || f.status === 'defaulted') {
          hasOverdueOrUpcoming = true;
        }
        matchesNotification = hasOverdueOrUpcoming;
      }
      return matchesSearch && matchesStatus && matchesNotification;
    }).sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "id": aVal = a.id; bVal = b.id; break;
        case "dossier": aVal = a.dossier_number?.toLowerCase() || ""; bVal = b.dossier_number?.toLowerCase() || ""; break;
        case "vehicle": {
          const ai = getMatriculeInfo(a.matricule_id); const bi = getMatriculeInfo(b.matricule_id);
          aVal = ai?.car ? `${ai.car.brand} ${ai.car.model}`.toLowerCase() : "";
          bVal = bi?.car ? `${bi.car.brand} ${bi.car.model}`.toLowerCase() : "";
          break;
        }
        case "matricule": {
          const am = getMatriculeInfo(a.matricule_id); const bm = getMatriculeInfo(b.matricule_id);
          aVal = am?.matricule_code || ""; bVal = bm?.matricule_code || ""; break;
        }
        case "amount": aVal = a.credit_amount || 0; bVal = b.credit_amount || 0; break;
        case "installment": aVal = a.installment_amount || 0; bVal = b.installment_amount || 0; break;
        case "progress":
          aVal = (a.current_installment_number || 0) / (a.total_installments || 1);
          bVal = (b.current_installment_number || 0) / (b.total_installments || 1);
          break;
        case "status": aVal = a.status || ""; bVal = b.status || ""; break;
        default: aVal = a.id; bVal = b.id;
      }
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [financings, searchTerm, statusFilter, sortField, sortDirection, matricules, cars, filterParam]);

  const itemsPerView = viewMode === 'list' ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredFinancings.length / itemsPerView);
  const paginated = filteredFinancings.slice((currentPage - 1) * itemsPerView, currentPage * itemsPerView);

  const stats = {
    total: financings.length,
    active: financings.filter(f => f.status === 'active').length,
    completed: financings.filter(f => f.status === 'completed').length,
    totalRemaining: financings.reduce((sum, f) => sum + (parseFloat(f.total_remaining) || 0), 0)
  };

  const statCards = [
    { label: "Total financements", value: stats.total, icon: <FileText size={20} />, color: "blue" },
    { label: "Actifs", value: stats.active, icon: <Activity size={20} />, color: "green" },
    { label: "Terminés", value: stats.completed, icon: <CheckCircle2 size={20} />, color: "cyan" },
    { label: "Reste total", value: formatCurrency(stats.totalRemaining), icon: <Wallet size={20} />, color: "red" },
  ];

  const getStatusBadge = (status) => {
    if (status === 'active') return <span className="badge badge-success"><CheckCircle size={12} /> Actif</span>;
    if (status === 'completed') return <span className="badge badge-blue"><CheckCircle2 size={12} /> Terminé</span>;
    if (status === 'late' || status === 'defaulted') return <span className="badge badge-danger"><AlertTriangle size={12} /> En retard</span>;
    return <span className="badge">{status}</span>;
  };

  const getProgressPct = (f) => {
    const total = Number(f.total_installments) || 0;
    const cur = Number(f.current_installment_number) || 0;
    if (!total) return 0;
    return Math.min(100, Math.round((cur / total) * 100));
  };

  const closeForm = () => { setShowPaymentForm(false); setEditing(null); resetForm(); };

  if (loading) return (
    <div className="rv">
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des financements...</p>
      </div>
      <Styles />
    </div>
  );

  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === 'list' ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredFinancings.length}
      />
    </div>
  );

  return (
    <div className="rv">
      {showPaymentForm ? (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editing ? <Sparkles size={28} /> : <DollarSign size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editing ? "Modifier le financement" : "Nouveau financement"}</h2>
              <p>{editing ? "Modifiez les informations du financement" : "Ajoutez un nouveau financement automobile"}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={closeForm} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="inline-form">
            <div className="inline-form-grid">
              {/* Left Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Car size={18} />
                    <h3>Informations véhicule</h3>
                  </div>
                  <div className="inline-field" style={{ marginBottom: 14 }}>
                    <label>Véhicule (matricule) *</label>
                    <div className="inline-search-section">
                      <div className="inline-search-input-wrapper">
                        <Search size={18} />
                        <input
                          type="text"
                          className="inline-input"
                          value={matriculeSearchTerm}
                          onChange={(e) => handleMatriculeSearch(e.target.value)}
                          placeholder="Rechercher un matricule (plaque, marque, modèle)..."
                          required
                        />
                        {selectedMatriculeObj && (
                          <button type="button" className="clear-search-btn" onClick={clearMatriculeSelection} title="Effacer">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      {filteredMatriculesList.length > 0 && (
                        <div className="inline-search-results">
                          {filteredMatriculesList.map((mat) => {
                            const car = cars.find(c => c.id === mat.car_id);
                            return (
                              <button
                                key={mat.id}
                                type="button"
                                className="inline-search-result-item"
                                onClick={() => handleMatriculeSelect(mat)}
                              >
                                <span className="mat-code">{mat.matricule_code}</span>
                                {car && <span className="mat-car">{car.brand} {car.model}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>N° Dossier *</label>
                      <input type="text" className="inline-input" value={formData.dossier_number}
                        onChange={(e) => setFormData({ ...formData, dossier_number: e.target.value })} required />
                    </div>
                    <div className="inline-field">
                      <label>N° Compte</label>
                      <input type="text" className="inline-input" value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Type de crédit</label>
                      <AcSelect
                        value={formData.credit_type}
                        onChange={(v) => setFormData({ ...formData, credit_type: v })}
                        options={CREDIT_TYPE_OPTIONS}
                        ariaLabel="Type de crédit"
                        variant="inline"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Date du contrat</label>
                      <input type="date" className="inline-input" value={formData.contract_date}
                        onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Calculator size={18} />
                    <h3>Détails du financement</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Montant crédit (DH) *</label>
                      <input type="number" step="0.01" className="inline-input" value={formData.credit_amount}
                        onChange={(e) => setFormData({ ...formData, credit_amount: parseFloat(e.target.value) || 0 })} required />
                    </div>
                    <div className="inline-field">
                      <label>Prêt + intérêts TTC différé</label>
                      <input type="number" step="0.01" className="inline-input" value={formData.preti_interet_ttc_differe}
                        onChange={(e) => setFormData({ ...formData, preti_interet_ttc_differe: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="inline-field">
                      <label>Durée (mois)</label>
                      <input type="number" className="inline-input" value={formData.duration_months}
                        onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="inline-field">
                      <label>Mois différés</label>
                      <input type="number" className="inline-input" value={formData.differed_months}
                        onChange={(e) => setFormData({ ...formData, differed_months: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="inline-field">
                      <label>Périodicité</label>
                      <AcSelect
                        value={formData.periodicity}
                        onChange={(v) => setFormData({ ...formData, periodicity: v })}
                        options={PERIODICITY_OPTIONS}
                        ariaLabel="Périodicité"
                        variant="inline"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Total échéances</label>
                      <input type="number" className="inline-input" value={formData.total_installments}
                        onChange={(e) => setFormData({ ...formData, total_installments: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="inline-field">
                      <label>1ère échéance</label>
                      <input type="date" className="inline-input" value={formData.first_installment_date}
                        onChange={(e) => setFormData({ ...formData, first_installment_date: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Dernière échéance</label>
                      <input type="date" className="inline-input" value={formData.last_installment_date || ""}
                        onChange={(e) => setFormData({ ...formData, last_installment_date: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Building2 size={18} />
                    <h3>Banque et montants</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Banque</label>
                      <input type="text" className="inline-input" value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Compte bancaire</label>
                      <input type="text" className="inline-input" value={formData.bank_account}
                        onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Mensualité (DH)</label>
                      <input type="number" step="0.01" className="inline-input" value={formData.installment_amount}
                        onChange={(e) => setFormData({ ...formData, installment_amount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="inline-field">
                      <label>Prestation (DH)</label>
                      <input type="number" step="0.01" className="inline-input" value={formData.prestation_amount}
                        onChange={(e) => setFormData({ ...formData, prestation_amount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <AcSelect
                        value={formData.status}
                        onChange={(v) => setFormData({ ...formData, status: v })}
                        options={FINANCING_STATUS_OPTIONS}
                        ariaLabel="Statut du financement"
                        variant="inline"
                      />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <FileCheck size={18} />
                    <h3>Notes</h3>
                  </div>
                  <div className="inline-field">
                    <textarea className="inline-input" rows={4} value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes internes..." />
                  </div>
                </div>

                <div className="inline-info-msg">
                  <Info size={16} />
                  <span>Vous pourrez générer l'échéancier depuis la liste une fois le financement créé.</span>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={closeForm}>
                Annuler
              </button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {editing ? <Save size={16} /> : <Plus size={16} />}
                {submitting ? "Traitement..." : (editing ? "Mettre à jour" : "Créer le financement")}
              </button>
            </div>
          </form>
        </div>
      ) : paymentsModalOpen && selectedFinancing ? (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><CreditCard size={28} /></div>
            <div className="inline-form-title">
              <h2>Paiements — Dossier {selectedFinancing.dossier_number}</h2>
              <p>Suivi des échéances et des paiements du financement</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={() => setPaymentsModalOpen(false)} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <div className="inline-form">
            <div className="rv-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="rv-stat-card">
                <div className="rv-stat-icon rv-stat-blue"><DollarSign size={18} /></div>
                <div>
                  <p className="rv-stat-label">Montant</p>
                  <p className="rv-stat-value">{formatCurrency(selectedFinancing.credit_amount)}</p>
                </div>
              </div>
              <div className="rv-stat-card">
                <div className="rv-stat-icon rv-stat-green"><CheckCircle size={18} /></div>
                <div>
                  <p className="rv-stat-label">Payé</p>
                  <p className="rv-stat-value">{formatCurrency(selectedFinancing.total_paid)}</p>
                </div>
              </div>
              <div className="rv-stat-card">
                <div className="rv-stat-icon rv-stat-red"><Wallet size={18} /></div>
                <div>
                  <p className="rv-stat-label">Reste</p>
                  <p className="rv-stat-value">{formatCurrency(selectedFinancing.total_remaining)}</p>
                </div>
              </div>
            </div>

            <div className="ac-scroll" style={{ marginTop: 16 }}>
              <table className="ac-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Échéance</th>
                    <th>Montant</th>
                    <th>Payé le</th>
                    <th>Méthode</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(!selectedFinancing.payments || selectedFinancing.payments.length === 0) ? (
                    <tr>
                      <td colSpan="6" className="ac-empty-cell">
                        {paymentsLoading ? "Chargement des paiements…" : "Aucun paiement enregistré"}
                      </td>
                    </tr>
                  ) : (
                    selectedFinancing.payments.map((p) => (
                      <tr key={p.id}>
                        <td><span className="ac-id">#{p.installment_number}</span></td>
                        <td>{formatDate(p.due_date)}</td>
                        <td>{formatCurrency(p.amount_due)}</td>
                        <td>{p.paid_date ? formatDate(p.paid_date) : '—'}</td>
                        <td>{p.payment_method || '—'}</td>
                        <td>
                          {p.status === 'paid'
                            ? <span className="badge badge-success"><CheckCircle size={12} /> Payé</span>
                            : <span className="badge badge-amber"><Clock size={12} /> En attente</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => setPaymentsModalOpen(false)}>
                <ArrowLeft size={16} /> Retour
              </button>
              <button type="button" className="inline-primary-btn" onClick={() => setRecordPaymentModalOpen(true)}>
                <Plus size={16} /> Enregistrer un paiement
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="ac-wrap">
          {/* Header */}
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><CreditCard size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">Gestion des Financements</h1>
                <p className="rv-sub">Suivez les financements et les paiements de votre flotte</p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button type="button" onClick={refreshData} className="ac-btn">
                <RefreshCw size={15} /><span className="ac-btn-text">Actualiser</span>
              </button>
              <button type="button" onClick={handleExport} className="ac-btn">
                <Download size={15} /><span className="ac-btn-text">Exporter</span>
              </button>
              <button type="button" onClick={handleAddNew} className="ac-btn ac-btn-primary">
                <Plus size={15} /><span className="ac-btn-text">Nouveau financement</span>
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
                placeholder="Rechercher par dossier, véhicule, matricule..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button type="button" className="ac-search-clear" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ width: 200, flexShrink: 0 }}>
              <AcSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                options={FILTER_STATUS_OPTIONS}
                ariaLabel="Filtrer par statut"
                variant="inline"
              />
            </div>
            <div className="ac-seg" role="group" aria-label="Affichage">
              <button type="button" className={`ac-seg-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => { setViewMode('list'); setCurrentPage(1); }}>
                <List size={15} /> <span>Liste</span>
              </button>
              <button type="button" className={`ac-seg-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => { setViewMode('cards'); setCurrentPage(1); }}>
                <LayoutGrid size={15} /> <span>Cartes</span>
              </button>
            </div>
          </div>

          <div className="ac-meta">
            <p><strong>{filteredFinancings.length}</strong> financement(s) trouvé(s)</p>
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
                        <th onClick={() => handleSort("dossier")} className="sortable-header">Dossier {getSortIcon("dossier")}</th>
                        <th onClick={() => handleSort("vehicle")} className="sortable-header">Véhicule {getSortIcon("vehicle")}</th>
                        <th onClick={() => handleSort("matricule")} className="sortable-header">Matricule {getSortIcon("matricule")}</th>
                        <th onClick={() => handleSort("amount")} className="sortable-header">Montant {getSortIcon("amount")}</th>
                        <th onClick={() => handleSort("installment")} className="sortable-header">Mensualité {getSortIcon("installment")}</th>
                        <th onClick={() => handleSort("progress")} className="sortable-header">Progression {getSortIcon("progress")}</th>
                        <th>Reste</th>
                        <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="ac-empty-cell">
                            <FileText size={40} />
                            <p>Aucun financement trouvé</p>
                          </td>
                        </tr>
                      ) : (
                        paginated.map(f => {
                          const info = getMatriculeInfo(f.matricule_id);
                          return (
                            <tr key={f.id}>
                              <td><span className="ac-id">#{f.id}</span></td>
                              <td className="ac-strong">{f.dossier_number}</td>
                              <td>
                                {info && info.car
                                  ? <div className="ac-strong">{info.car.brand} {info.car.model}</div>
                                  : <span style={{ color: 'var(--tx-3)' }}>—</span>}
                              </td>
                              <td>
                                {info
                                  ? <span className="ac-id">{info.matricule_code}</span>
                                  : <span style={{ color: 'var(--tx-3)' }}>—</span>}
                              </td>
                              <td><span className="ac-price-pill">{formatCurrency(f.credit_amount)}</span></td>
                              <td>{formatCurrency(f.installment_amount)}</td>
                              <td>
                                <div className="ac-progress">
                                  <div className="ac-progress-bar">
                                    <div className="ac-progress-fill" style={{ width: `${getProgressPct(f)}%` }} />
                                  </div>
                                  <span className="ac-progress-label">
                                    {f.current_installment_number || 0}/{f.total_installments}
                                  </span>
                                </div>
                              </td>
                              <td>{formatCurrency(f.total_remaining)}</td>
                              <td>{getStatusBadge(f.status)}</td>
                              <td className="text-right">
                                <div className="ac-actions">
                                  <button type="button" onClick={() => viewPayments(f.id)} className="ac-action-btn" title="Paiements">
                                    <Eye size={15} />
                                  </button>
                                  <button type="button" onClick={() => openSchedulePrompt(f)} className="ac-action-btn" title="Générer l'échéancier">
                                    <Calculator size={15} />
                                  </button>
                                  <button type="button" onClick={() => handleEdit(f)} className="ac-action-btn ac-action-edit" title="Modifier">
                                    <Edit2 size={15} />
                                  </button>
                                  <button type="button" onClick={() => handleDeleteClick(f)} className="ac-action-btn ac-action-delete" title="Supprimer">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="ac-mobile-only">
                <div className="ac-sortbar">
                  <label htmlFor="ac-sort">Trier</label>
                  <AcSelect id="ac-sort" ariaLabel="Trier par" value={sortField}
                    onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
                  <button type="button" className="ac-sortdir"
                    onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
                    {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  </button>
                </div>
                {paginated.length === 0 ? (
                  <div className="ac-empty-card">
                    <FileText size={40} />
                    <p>Aucun financement trouvé</p>
                  </div>
                ) : (
                  <div className="ac-mcards">
                    {paginated.map(f => {
                      const info = getMatriculeInfo(f.matricule_id);
                      return (
                        <div key={f.id} className="ac-mcard">
                          <div className="ac-mcard-head">
                            <div className="ac-mcard-thumb ac-mcard-thumb-empty">
                              <CreditCard size={22} />
                            </div>
                            <div className="ac-mcard-info">
                              <div className="ac-mcard-name">Dossier {f.dossier_number}</div>
                              <div className="ac-mcard-sub">
                                <span className="ac-id">#{f.id}</span>
                              </div>
                            </div>
                            <div className="ac-mcard-price">
                              {formatCurrency(f.credit_amount)}
                            </div>
                          </div>

                          <div className="ac-mcard-badges">{getStatusBadge(f.status)}</div>

                          <div className="ac-mcard-meta">
                            {info && info.car && (
                              <span><Car size={13} /> {info.car.brand} {info.car.model}</span>
                            )}
                            {info && <span><FileText size={13} /> {info.matricule_code}</span>}
                            <span><DollarSign size={13} /> {formatCurrency(f.installment_amount)}/mois</span>
                            <span><Calendar size={13} /> {formatDate(f.contract_date)}</span>
                          </div>

                          <div className="ac-progress" style={{ marginBottom: 12 }}>
                            <div className="ac-progress-bar">
                              <div className="ac-progress-fill" style={{ width: `${getProgressPct(f)}%` }} />
                            </div>
                            <span className="ac-progress-label">
                              {f.current_installment_number || 0}/{f.total_installments}
                            </span>
                          </div>

                          <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <button type="button" onClick={() => viewPayments(f.id)} className="ac-card-btn">
                              <Eye size={16} /><span>Voir</span>
                            </button>
                            <button type="button" onClick={() => openSchedulePrompt(f)} className="ac-card-btn">
                              <Calculator size={16} /><span>Échéancier</span>
                            </button>
                            <button type="button" onClick={() => handleEdit(f)} className="ac-card-btn ac-action-edit">
                              <Edit2 size={16} /><span>Modifier</span>
                            </button>
                            <button type="button" onClick={() => handleDeleteClick(f)} className="ac-card-btn ac-action-delete">
                              <Trash2 size={16} /><span>Suppr.</span>
                            </button>
                          </div>
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
              <div className="ac-sortbar">
                <label htmlFor="ac-sort">Trier</label>
                <AcSelect id="ac-sort" ariaLabel="Trier par" value={sortField}
                  onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
                <button type="button" className="ac-sortdir"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
                  {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
              </div>
              {paginated.length === 0 ? (
                <div className="ac-empty-card">
                  <FileText size={40} />
                  <p>Aucun financement trouvé</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {paginated.map(f => {
                    const info = getMatriculeInfo(f.matricule_id);
                    return (
                      <div key={f.id} className="car-card">
                        <div className="card-image" style={{ height: 120 }}>
                          <div style={{ textAlign: 'center' }}>
                            <CreditCard size={48} style={{ color: 'var(--tx-3)' }} />
                            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--tx-2)' }}>
                              Dossier {f.dossier_number}
                            </p>
                          </div>
                          <div className="card-status">{getStatusBadge(f.status)}</div>
                        </div>
                        <div className="card-content">
                          <div className="card-title">
                            <span>{info && info.car ? `${info.car.brand} ${info.car.model}` : `#${f.id}`}</span>
                            <span className="card-price">{formatCurrency(f.installment_amount)}<small>/mois</small></span>
                          </div>
                          <div className="card-details">
                            <div className="detail-item"><FileText size={14} /> {info ? info.matricule_code : '—'}</div>
                            <div className="detail-item"><DollarSign size={14} /> {formatCurrency(f.credit_amount)}</div>
                            <div className="detail-item"><Calendar size={14} /> {formatDate(f.contract_date)}</div>
                            <div className="detail-item"><Activity size={14} /> {f.current_installment_number || 0}/{f.total_installments}</div>
                          </div>
                          <div className="ac-progress" style={{ marginBottom: 12 }}>
                            <div className="ac-progress-bar">
                              <div className="ac-progress-fill" style={{ width: `${getProgressPct(f)}%` }} />
                            </div>
                            <span className="ac-progress-label">{getProgressPct(f)}%</span>
                          </div>
                          <div className="card-real-status">
                            <Wallet size={12} />
                            <span>Reste : {formatCurrency(f.total_remaining)}</span>
                          </div>
                          <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <button type="button" onClick={() => viewPayments(f.id)} className="ac-card-btn">
                              <Eye size={16} /><span>Voir</span>
                            </button>
                            <button type="button" onClick={() => openSchedulePrompt(f)} className="ac-card-btn">
                              <Calculator size={16} /><span>Éch.</span>
                            </button>
                            <button type="button" onClick={() => handleEdit(f)} className="ac-card-btn ac-action-edit">
                              <Edit2 size={16} /><span>Modif.</span>
                            </button>
                            <button type="button" onClick={() => handleDeleteClick(f)} className="ac-card-btn ac-action-delete">
                              <Trash2 size={16} /><span>Suppr.</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {pagination}
            </>
          )}

          {/* ============ DELETE MODAL ============ */}
          {deleteModalOpen && financingToDelete && (
            <div className="modal-overlay">
              <div className="modal delete-modal">
                <div className="delete-icon"><Trash2 size={32} /></div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">
                  Êtes-vous sûr de vouloir supprimer le financement <br />
                  <span className="reservation-id">Dossier {financingToDelete.dossier_number}</span> ?<br />
                  Cette action est irréversible.
                </p>
                <div className="delete-actions">
                  <button type="button" onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
                  <button type="button" onClick={confirmDelete} className="modal-btn btn-delete">Supprimer</button>
                </div>
              </div>
            </div>
          )}

          {/* ============ INTEREST PROMPT MODAL ============ */}
          {interestModalOpen && currentFinancingForSchedule && (
            <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                  <h2 className="modal-title">Générer l'échéancier</h2>
                  <button type="button" className="modal-close" aria-label="Fermer" disabled={generating} onClick={() => setInterestModalOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem' }}>
                  <p style={{ marginTop: 0, marginBottom: '1rem' }}>
                    Dossier <strong>{currentFinancingForSchedule.dossier_number}</strong>
                  </p>
                  <div className="form-group">
                    <label>Taux d'intérêt (%)</label>
                    <input type="number" step="0.01" className="inline-input"
                      value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Taux de TVA (%)</label>
                    <input type="number" step="0.01" className="inline-input"
                      value={tvaRate} onChange={(e) => setTvaRate(e.target.value)} />
                  </div>
                </div>
                <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" disabled={generating} onClick={() => setInterestModalOpen(false)}>
                    Annuler
                  </button>
                  <button type="button" className="btn btn-primary" disabled={generating} onClick={confirmGenerateSchedule}>
                    {generating ? "Traitement..." : "Générer"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ============ RECORD PAYMENT MODAL ============ */}
      {recordPaymentModalOpen && selectedFinancing && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Enregistrer un paiement</h2>
              <button type="button" className="modal-close" aria-label="Fermer" onClick={() => setRecordPaymentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div className="inline-grid-2">
                  <div className="form-group">
                    <label>N° échéance</label>
                    <input type="number" className="inline-input" value={paymentForm.installment_number}
                      onChange={(e) => setPaymentForm({ ...paymentForm, installment_number: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="form-group">
                    <label>Montant payé (DH)</label>
                    <input type="number" step="0.01" className="inline-input" value={paymentForm.paid_amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Date paiement</label>
                    <input type="date" className="inline-input" value={paymentForm.paid_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paid_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Méthode</label>
                    <AcSelect
                      value={paymentForm.payment_method}
                      onChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                      options={PAYMENT_METHOD_OPTIONS}
                      ariaLabel="Méthode de paiement"
                      variant="inline"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Référence</label>
                    <input type="text" className="inline-input" value={paymentForm.transaction_reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <textarea className="inline-input" rows={2} value={paymentForm.payment_notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_notes: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRecordPaymentModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Styles />
    </div>
  );
}

/* ============================================================
   Styles — identical to AdminCars + payment-specific bits
   + styled portaled dropdown (desktop & mobile)
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

/* Modals (same look as AdminReservations) */
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
    font-size: 1.1rem; font-weight: 900; letter-spacing: -0.01em;
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
.rv .modal-body { color: var(--tx); }
.rv .modal-body p { line-height: 1.5; }
.rv .modal-actions-footer { display: flex; gap: 0.75rem; border-top: 2px dotted var(--line) !important; }

.rv .form-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.rv .form-group label {
    font-size: 0.68rem; font-weight: 900; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--tx-2);
}

.rv .modal-btn {
    flex: 1; height: 46px; border-radius: 999px;
    border: 1.5px solid var(--line-strong);
    font-size: 0.88rem; font-weight: 800; cursor: pointer; transition: transform 0.1s;
    display: inline-flex; align-items: center; justify-content: center;
}
.rv .modal-btn:active { transform: translateY(3px); }
.rv .modal-btn-cancel { background: var(--surface); color: var(--tx); }
.rv .btn-delete { background: var(--danger); color: #fff; }

/* Pill buttons used in modal footers */
.rv .btn {
    display: inline-flex !important; align-items: center !important; justify-content: center !important;
    gap: 0.5rem !important; height: 44px !important; padding: 0 20px !important;
    border-radius: 999px !important; border: 1.5px solid var(--line-strong) !important;
    font-size: 0.85rem !important; font-weight: 800 !important; letter-spacing: 0.01em;
    cursor: pointer !important; white-space: nowrap !important;
    transition: transform 0.12s ease, background 0.15s ease !important; text-decoration: none;
}
.rv .btn:active { transform: translateY(3px) !important; }
.rv .btn:disabled { opacity: 0.45; cursor: not-allowed !important; }
.rv .btn.btn-primary { background: var(--acc) !important; color: #0a0a0a !important; }
.rv .btn.btn-primary:hover:not(:disabled) { background: var(--acc-d) !important; transform: translateY(-1px) !important; }
.rv .btn.btn-secondary { background: var(--surface) !important; color: var(--tx) !important; }
.rv .btn.btn-secondary:hover:not(:disabled) { background: var(--surface-2) !important; transform: translateY(-1px) !important; }

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

/* Form */
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
.rv textarea.inline-input {
    width: 100%; min-height: 44px; padding: 10px 14px;
    border: 1.5px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--tx);
    font-size: 0.9rem; font-family: inherit; transition: border-color 0.15s;
}
.rv textarea.inline-input { min-height: 80px; resize: vertical; }
.rv .inline-select {
    appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 38px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23a16207' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
}
.rv .inline-input:focus,
.rv .inline-select:focus,
.rv textarea.inline-input:focus { outline: none; border-color: var(--blue); }
.rv .inline-input::placeholder { color: var(--tx-3); }

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

/* Searchable matricule */
.rv .inline-search-section { position: relative; }
.rv .inline-search-input-wrapper { position: relative; display: flex; align-items: center; }
.rv .inline-search-input-wrapper > svg {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: var(--tx-3); pointer-events: none; z-index: 1;
}
.rv .inline-search-input-wrapper .inline-input { padding-left: 44px; padding-right: 44px; }
.rv .clear-search-btn {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    width: 30px; height: 30px; border-radius: 50%; border: 0;
    background: var(--surface-2); color: var(--tx-2);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.rv .clear-search-btn:hover { background: var(--line); }
.rv .inline-search-results {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 60;
    max-height: 240px; overflow-y: auto; padding: 6px;
    background: var(--surface); border: 1.5px solid var(--line);
    border-radius: 12px; box-shadow: 0 16px 40px -12px rgba(0,0,0,0.28);
    animation: rvFade 0.14s ease;
}
.rv .inline-search-result-item {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 12px; border: 0; border-radius: 8px;
    background: transparent; color: var(--tx); text-align: left;
    cursor: pointer; font-family: inherit; font-size: 0.85rem;
}
.rv .inline-search-result-item:hover { background: var(--surface-2); }
.rv .inline-search-result-item .mat-code { font-family: ui-monospace, monospace; font-weight: 700; color: var(--acc-tx); }
.rv .inline-search-result-item .mat-car { font-size: 0.78rem; color: var(--tx-2); }

/* Responsive form */
@media (max-width: 1024px) {
    .rv .inline-form-grid { grid-template-columns: 1fr; gap: 22px; }
}
@media (max-width: 640px) {
    .rv .inline-form-container { margin: 0.6rem; border-radius: 22px; }
    .rv .inline-form-header { padding: 18px 64px 18px 18px; gap: 14px; }
    .rv .inline-form-icon { width: 48px; height: 48px; border-radius: 14px; }
    .rv .inline-form-title h2 { font-size: 1.2rem; }
    .rv .inline-form-close { right: 14px; width: 40px; height: 40px; }
    .rv .inline-form { padding: 16px; }
    .rv .inline-section { padding: 16px; border-radius: 18px; }
    .rv .inline-grid-2 { grid-template-columns: 1fr; }
    .rv .inline-form-footer { flex-direction: column-reverse; }
    .rv .inline-form-footer > * { width: 100%; }
    .rv .modal-overlay { align-items: flex-end; padding: 0; }
    .rv .modal {
        max-width: 100% !important; max-height: 92vh;
        border-radius: 24px 24px 0 0; border-bottom: 0;
        animation: rvSheet 0.28s ease;
    }
    .rv .modal-actions-footer { flex-direction: column-reverse; justify-content: stretch !important; padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)) !important; }
    .rv .modal-actions-footer button,
    .rv .modal-actions-footer .btn { width: 100%; }
    .rv .delete-actions { flex-direction: column-reverse; }
    .rv .delete-actions { gap: 10px; }
    .rv .delete-actions .modal-btn,
    .rv .modal-actions-footer .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }
    .rv .modal-actions-footer .btn { flex: 0 0 auto; height: 52px !important; font-size: 0.95rem !important; }
    .rv .inline-input,
    .rv .inline-select,
    .rv textarea.inline-input { font-size: 16px; }
    .rv .inline-form-title h2 { overflow-wrap: anywhere; }
    .rv .inline-primary-btn,
    .rv .inline-secondary-btn { min-height: 48px; }
    .rv .delete-modal { padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }
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

/* Page shell */
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

/* Table */
/* Table */
            .rv .ac-tablecard { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
            .rv .ac-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            .rv .ac-table { width: 100%; min-width: 1000px; border-collapse: collapse; font-size: 0.82rem; }
            .rv .ac-table th {
                text-align: left; padding: 12px 16px; background: var(--surface-2); color: var(--tx-2);
                font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
            }
            .rv .ac-table td { padding: 12px 16px; border-top: 1px solid var(--line); color: var(--tx); vertical-align: middle; transition: background 0.15s ease; }
            
            /* Effet de survol fluide sur les lignes du tableau avec bordure dorée à gauche */
            .rv .ac-table tbody tr { transition: transform 0.15s ease, background-color 0.15s ease; }
            .rv .ac-table tbody tr:hover td { background: var(--surface-2); }
            .rv .ac-table tbody tr td:first-child { box-shadow: inset 3px 0 0 transparent; transition: box-shadow 0.15s ease; }
            .rv .ac-table tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 var(--acc); }
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
.rv .ac-price-pill {
    display: inline-block; padding: 4px 10px; border-radius: 8px; white-space: nowrap;
    background: rgba(234, 179, 8, 0.14); color: var(--acc-tx);
    font-weight: 800; font-size: 0.8rem;
}
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

.rv .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
.rv .badge-success { background: #dcfce7; color: #166534; }
.rv .badge-danger { background: #fee2e2; color: #991b1b; }
.rv .badge-amber { background: #fef3c7; color: #92400e; }
.rv .badge-blue { background: #dbeafe; color: #1e40af; }
.rv .badge-emerald { background: #d1fae5; color: #065f46; }
.rv .badge-purple { background: #f3e8ff; color: #6b21a5; }
@media (prefers-color-scheme: dark) {
    .rv .badge-success { background: #14532d; color: #4ade80; }
    .rv .badge-danger { background: #7f1d1d; color: #fca5a5; }
    .rv .badge-amber { background: #78350f; color: #fde68a; }
    .rv .badge-blue { background: #1e3a5f; color: #60a5fa; }
    .rv .badge-emerald { background: #064e3b; color: #34d399; }
    .rv .badge-purple { background: #4c1d95; color: #c084fc; }
}

/* Progress bar */
.rv .ac-progress { display: flex; align-items: center; gap: 8px; min-width: 100px; }
.rv .ac-progress-bar { flex: 1; height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; min-width: 60px; }
.rv .ac-progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #eab308); border-radius: 999px; transition: width 0.3s ease; }
.rv .ac-progress-label { font-size: 0.72rem; font-weight: 700; color: var(--tx-2); white-space: nowrap; }

.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
.rv .ac-action-btn {
    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
    color: var(--tx-2);
}
.rv .ac-action-btn:hover { background: var(--surface-2); color: var(--tx); }
.rv .ac-action-edit { color: #10b981; }
.rv .ac-action-delete { color: #ef4444; }
.rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
.rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
    .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
}

.rv .ac-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); }
.rv .ac-card-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
    background: var(--surface-2); cursor: pointer; transition: all 0.2s; color: var(--tx-2);
}
.rv .ac-card-btn span { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.02em; color: var(--tx-2); line-height: 1; }
.rv .ac-card-btn:active { transform: scale(0.96); }
.rv .ac-card-btn:hover { background: var(--line); color: var(--tx); }
.rv .ac-card-btn.ac-action-edit:hover { background: #ecfdf5; color: #10b981; }
.rv .ac-card-btn.ac-action-delete:hover { background: #fef2f2; color: #ef4444; }
@media (prefers-color-scheme: dark) {
    .rv .ac-card-btn.ac-action-edit:hover { background: #064e3b; }
    .rv .ac-card-btn.ac-action-delete:hover { background: #7f1d1d; }
}

/* Mobile cards (list mode) */
.rv .ac-mcards { display: flex; flex-direction: column; gap: 10px; }
.rv .ac-mcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
.rv .ac-mcard-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .ac-mcard-thumb { width: 64px; height: 48px; object-fit: cover; border-radius: 12px; border: 1px solid var(--line); flex-shrink: 0; }
.rv .ac-mcard-thumb-empty { display: flex; align-items: center; justify-content: center; background: var(--surface-2); color: var(--tx-3); }
.rv .ac-mcard-info { flex: 1; min-width: 0; }
.rv .ac-mcard-name { font-weight: 700; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .ac-mcard-sub { margin-top: 3px; }
.rv .ac-mcard-price { font-weight: 800; font-size: 1rem; white-space: nowrap; }
.rv .ac-mcard-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rv .ac-mcard-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 12px; font-size: 0.75rem; color: var(--tx-2); }
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; }

/* Cards view */
.rv .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.rv .car-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
}
.rv .car-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18); }
.rv .card-image { position: relative; height: 190px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rv .card-image img { width: 100%; height: 100%; object-fit: cover; }
.rv .card-status { position: absolute; top: 0.75rem; right: 0.75rem; }
.rv .card-content { padding: 16px; }
.rv .card-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 0.5rem; font-size: 1.05rem; font-weight: 700; }
.rv .card-price { font-size: 1.15rem; font-weight: 800; color: var(--acc-tx); white-space: nowrap; }
.rv .card-price small { font-size: 0.7rem; font-weight: 500; margin-left: 2px; }
.rv .card-details {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;
    margin: 0.75rem 0; padding: 0.75rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
}
.rv .detail-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--tx-2); min-width: 0; }
.rv .card-real-status {
    display: flex; align-items: center; gap: 6px; margin-bottom: 12px; padding: 8px 12px;
    border-radius: 10px; background: var(--surface-2); font-size: 0.72rem; color: var(--tx-2);
}

/* Sort bar */
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

/* Custom dropdown — base */
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
.rv .ac-dd-trigger:hover:not(:disabled) { border-color: var(--tx-3); }
.rv .ac-dd-trigger.open { border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.14); }
.rv .ac-dd-trigger:disabled { opacity: 0.55; cursor: not-allowed; }
.rv .ac-dd-chevron { flex-shrink: 0; color: var(--acc-tx); transition: transform 0.2s ease; }
.rv .ac-dd-trigger.open .ac-dd-chevron { transform: rotate(180deg); }

/* Custom dropdown — inline variant (matches .inline-select) */
.rv .ac-dd-inline .ac-dd-trigger {
    min-height: 44px;
    padding: 10px 38px 10px 14px;
    border: 1.5px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    background-image: none;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--tx);
}
.rv .ac-dd-inline .ac-dd-trigger:hover:not(:disabled) { border-color: var(--tx-3); }
.rv .ac-dd-inline .ac-dd-trigger.open {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(29, 161, 232, 0.12);
}
.rv .ac-dd-inline .ac-dd-trigger:disabled { opacity: 0.55; cursor: not-allowed; }
.rv .ac-dd-inline .ac-dd-chevron { color: var(--tx-3); }
.rv .ac-dd-inline .ac-dd-trigger.open .ac-dd-chevron { color: var(--blue); }

/* Dropdown menu (both inline & portaled) */
.rv .ac-dd-menu {
    margin: 0; padding: 6px; list-style: none;
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
    box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.28);
    overflow-y: auto;
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

/* Portaled floating menu (position/size set inline by AcSelect) */
.rv .ac-dd-menu-floating {
    z-index: 2000;              /* above modals (1000) */
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    box-shadow: 0 18px 44px -12px rgba(0, 0, 0, 0.35);
}

/* Larger tap targets on small screens (mobile dropdown polish) */
@media (max-width: 640px) {
    .rv .ac-dd-menu-floating .ac-dd-item {
        padding: 13px 14px;
        font-size: 0.95rem;
        min-height: 46px;
    }
    .rv .ac-dd-inline .ac-dd-trigger { font-size: 16px; } /* prevents iOS zoom */
    .rv .ac-dd-trigger { font-size: 16px; }
    .rv .ac-dd-trigger { min-height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
    .rv .ac-dd-menu-floating { animation: none !important; }
}

/* Pagination */
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

/* Loading */
.rv .loading { text-align: center; padding: 4rem 1rem; color: var(--tx-2); font-weight: 700; }
.rv .spinner {
    display: inline-block; width: 40px; height: 40px; margin-bottom: 12px; border-radius: 50%;
    border: 4px solid var(--line); border-top-color: #eab308; animation: acSpin 0.7s linear infinite;
}
@keyframes acSpin { to { transform: rotate(360deg); } }

/* Responsive page */
.rv .ac-mobile-only { display: none; }
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
    .rv .ac-filters > div { width: 100% !important; }
    .rv .ac-seg { align-self: stretch; }
    .rv .ac-seg-btn { flex: 1; justify-content: center; }
    .rv .ac-desktop-only { display: none !important; }
    .rv .ac-mobile-only { display: block !important; }
    .rv .cards-grid { grid-template-columns: 1fr; }
}
`}</style>
  );
}