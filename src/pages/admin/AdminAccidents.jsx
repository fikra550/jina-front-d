// src/pages/admin/AdminAccidents.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { AccidentReportPDF } from '../../components/pdf/AccidentReportPDF';
import { AccidentEstimatePDF } from '../../components/pdf/AccidentEstimatePDF';
import { AccidentInvoicePDF } from '../../components/pdf/AccidentInvoicePDF';
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  fetchAccidents,
  fetchMatricules,
  fetchCars,
  fetchClients,
  fetchGarages,
  fetchReservations,
  createAccident,
  updateAccident,
  deleteAccident,
  getAccidentNextStatuses,
  selectAccidents,
  selectMatricules,
  selectCars,
  selectClients,
  selectGarages,
  selectReservations,
  selectAccidentsLoading,
  selectToken,
} from "../../Redux/store";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Eye, Search, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, Car, User, Calendar, DollarSign,
  FileText, Shield, Gavel, Clock, CheckCircle, XCircle, AlertCircle,
  Building2, Phone, Mail, MapPin, IdCard, TrendingUp, BarChart3,
  Save, TrashIcon, FileCheck, Briefcase, Scale, ClipboardList,
  Users, CalendarDays, Euro, Wallet, CreditCard, Loader2, Wrench, Palette,
  Sparkles, Star, ArrowLeft, Info, Activity, ArrowUpDown, ArrowUp, ArrowDown,
  Key, Lock, Unlock, Crown, Printer, Download, Truck, Home, Clipboard,
  Receipt, PenTool, FileSignature, CheckSquare, Percent, Copy, Check, ChevronDown
} from "lucide-react";

// Menu déroulant personnalisé pour mobile/desktop (cohérent avec AdminCars)
const AcSelect = ({ value, onChange, options, id, ariaLabel, style = {} }) => {
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
    <div className="ac-dd" ref={ref} style={style}>
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

const SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "date", label: "Date" },
  { value: "matricule", label: "Véhicule" },
  { value: "client", label: "Client" },
  { value: "losses", label: "Pertes" },
  { value: "assurance", label: "Assurance" },
  { value: "status", label: "Statut" },
];

export default function AdminAccidents() {
  const dispatch = useDispatch();
  const accidents = useSelector(selectAccidents);
  const matricules = useSelector(selectMatricules);
  const cars = useSelector(selectCars);
  const clients = useSelector(selectClients);
  const garages = useSelector(selectGarages);
  const reservations = useSelector(selectReservations);
  const loading = useSelector(selectAccidentsLoading);
  const token = useSelector(selectToken);

  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  // UI state
  const [showAccidentForm, setShowAccidentForm] = useState(false);
  const [showAccidentDetails, setShowAccidentDetails] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [accidentToDelete, setAccidentToDelete] = useState(null);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  const [nextStatuses, setNextStatuses] = useState([]);

  // Document preview state
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentPreviewType, setDocumentPreviewType] = useState(null);
  const [documentPreviewAccident, setDocumentPreviewAccident] = useState(null);

  // Sorting
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Searchable select states
  const [matriculeSearchTerm, setMatriculeSearchTerm] = useState('');
  const [filteredMatriculesList, setFilteredMatriculesList] = useState([]);
  const [selectedMatriculeObj, setSelectedMatriculeObj] = useState(null);

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [filteredClientsList, setFilteredClientsList] = useState([]);
  const [selectedClientObj, setSelectedClientObj] = useState(null);

  const [reservationSearchTerm, setReservationSearchTerm] = useState('');
  const [selectedReservationObj, setSelectedReservationObj] = useState(null);

  const [garageSearchTerm, setGarageSearchTerm] = useState('');
  const [filteredGaragesList, setFilteredGaragesList] = useState([]);
  const [selectedGarageObj, setSelectedGarageObj] = useState(null);

  // Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payer: 'client',
    method: 'cash',
    reference: '',
    notes: ''
  });

  // Close Confirmation Modal state
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  const [formData, setFormData] = useState({
    matricule_id: "",
    car_id: "",
    client_id: "",
    reservation_id: "",
    date_accident: new Date().toISOString().slice(0, 10),
    time_accident: "",
    location: "",
    description: "",
    police_report_number: "",
    amount_of_losses: 0,
    amount_assurance: 0,
    nom_expert: "",
    status: "open",
    accident_type: "grave",
    procedure_type: "classic",
    expert_decision: "pending",
    expert_amount: 0,
    expert_notes: "",
    notes: "",
    garage_id: "",
    inspection_notes: "",
    estimated_cost: 0,
    total_repair_cost: 0,
    franchise_amount: 0,
    insurance_paid: 0,
    client_paid: 0,
    total_paid: 0,
    remaining_amount: 0,
    internal_notes: "",
    closed_at: null,
    estimate_items: [],
    estimate_total_ht: 0,
    estimate_tva: 0,
    estimate_total_ttc: 0,
    estimate_status: "draft",
    estimate_number: "",
    repair_start_date: "",
    repair_end_date: "",
    repair_notes: "",
    invoice_number: "",
    invoice_items: [],
    invoice_total_ht: 0,
    invoice_tva: 0,
    invoice_total_ttc: 0,
    payments: [],
    img_accident: [],
    img_evaluation_expert: [],
    img_fixed: [],
    image_facture: [],
  });

  useEffect(() => {
    const load = async () => {
      await Promise.all([
        dispatch(fetchAccidents()),
        dispatch(fetchMatricules()),
        dispatch(fetchCars()),
        dispatch(fetchClients()),
        dispatch(fetchGarages()),
        dispatch(fetchReservations()),
      ]);
    };
    load();
  }, [dispatch]);

  useResetScrollOnOpen([
  showAccidentForm,
  showAccidentDetails,
  showDocumentPreview,
  showPaymentModal,
  showCloseModal,
  deleteModalOpen,
  activeStep,          // also reset when wizard step changes
]);

  useEffect(() => {
    if (editing && editing.id) {
      const loadNextStatuses = async () => {
        const result = await dispatch(getAccidentNextStatuses(editing.id));
        if (!result.error && result.payload) setNextStatuses(result.payload);
      };
      loadNextStatuses();
    }
  }, [editing, dispatch]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === "asc" ? <ArrowUp size={12} className="sort-icon active" /> : <ArrowDown size={12} className="sort-icon active" />;
  };

  const statusConfig = {
    open: { label: "Ouvert", bg: "badge-warning", icon: AlertCircle },
    under_review: { label: "En cours d'examen", bg: "badge-purple", icon: Eye },
    waiting_estimate: { label: "En attente de devis", bg: "badge-pink", icon: Clock },
    estimate_approved: { label: "Devis approuvé", bg: "badge-indigo", icon: CheckCircle },
    under_repair: { label: "En réparation", bg: "badge-orange", icon: Wrench },
    invoice_received: { label: "Facture reçue", bg: "badge-rose", icon: FileText },
    waiting_payment: { label: "En attente de paiement", bg: "badge-yellow", icon: Wallet },
    closed: { label: "Clos", bg: "badge-success", icon: CheckSquare },
    pending: { label: "Signalé", bg: "badge-warning", icon: AlertCircle },
    evaluation_owner: { label: "Évaluation propriétaire", bg: "badge-purple", icon: User },
    "contact expert": { label: "Contact expert", bg: "badge-pink", icon: Phone },
    evaluation_expert: { label: "Évaluation expert", bg: "badge-indigo", icon: Scale },
    fixed: { label: "Réparé", bg: "badge-orange", icon: Wrench },
    waiting: { label: "En attente paiement", bg: "badge-rose", icon: Clock },
    completed: { label: "Terminé", bg: "badge-success", icon: CheckCircle }
  };

  const STATUS_FILTER_OPTIONS = [
    { value: "all", label: "Tous statuts" },
    ...Object.entries(statusConfig).map(([key, val]) => ({ value: key, label: val.label }))
  ];

  const filteredAccidents = useMemo(() => {
    return accidents.filter(acc => {
      const mat = matricules.find(m => m.id === acc.matricule_id);
      const client = clients.find(c => c.id === acc.client_id);
      const matchesSearch = searchTerm === '' ||
        (acc.notes && acc.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (acc.id && acc.id.toString().includes(searchTerm)) ||
        (mat?.matricule_code?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client && `${client.prenom} ${client.nom}`.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;

      let matchesNotification = true;
      if (filterParam === 'notifications') {
        const daysSince = (new Date() - new Date(acc.date_accident)) / (1000 * 60 * 60 * 24);
        matchesNotification = daysSince <= 7 && acc.status !== 'completed' && acc.status !== 'closed';
      }

      return matchesSearch && matchesStatus && matchesNotification;
    }).sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "id": aVal = a.id; bVal = b.id; break;
        case "date": aVal = new Date(a.date_accident); bVal = new Date(b.date_accident); break;
        case "matricule": aVal = matricules.find(m => m.id === a.matricule_id)?.matricule_code || ""; bVal = matricules.find(m => m.id === b.matricule_id)?.matricule_code || ""; break;
        case "client": const aClient = clients.find(c => c.id === a.client_id); const bClient = clients.find(c => c.id === b.client_id); aVal = aClient ? `${aClient.prenom} ${aClient.nom}` : ""; bVal = bClient ? `${bClient.prenom} ${bClient.nom}` : ""; break;
        case "losses": aVal = a.amount_of_losses || 0; bVal = b.amount_of_losses || 0; break;
        case "assurance": aVal = a.amount_assurance || 0; bVal = b.amount_assurance || 0; break;
        case "status": aVal = a.status || ""; bVal = b.status || ""; break;
        default: aVal = a.id; bVal = b.id;
      }
      return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [accidents, searchTerm, statusFilter, sortField, sortDirection, matricules, clients, filterParam]);

  const totalPages = Math.ceil(filteredAccidents.length / itemsPerPage);
  const paginatedAccidents = filteredAccidents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Estimate items
  const addEstimateItem = () => {
    setFormData(prev => ({
      ...prev,
      estimate_items: [...prev.estimate_items, { name: '', quantity: 1, unit_price: 0 }]
    }));
  };
  const removeEstimateItem = (index) => {
    setFormData(prev => ({
      ...prev,
      estimate_items: prev.estimate_items.filter((_, i) => i !== index)
    }));
  };
  const updateEstimateItem = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.estimate_items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, estimate_items: items };
    });
  };

  // Invoice items
  const addInvoiceItem = () => {
    setFormData(prev => ({
      ...prev,
      invoice_items: [...prev.invoice_items, { name: '', quantity: 1, unit_price: 0 }]
    }));
  };
  const removeInvoiceItem = (index) => {
    setFormData(prev => ({
      ...prev,
      invoice_items: prev.invoice_items.filter((_, i) => i !== index)
    }));
  };
  const updateInvoiceItem = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.invoice_items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, invoice_items: items };
    });
  };

  const copyEstimateToInvoice = () => {
    setFormData(prev => ({
      ...prev,
      invoice_items: JSON.parse(JSON.stringify(prev.estimate_items || [])),
    }));
    toast.info("Articles du devis copiés vers la facture");
  };

  useEffect(() => {
    const estItems = formData.estimate_items || [];
    const estHT = estItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
    setFormData(prev => ({
      ...prev,
      estimate_total_ht: estHT,
      estimate_tva: 0,
      estimate_total_ttc: estHT
    }));
  }, [formData.estimate_items]);

  useEffect(() => {
    const invItems = formData.invoice_items || [];
    const invHT = invItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
    setFormData(prev => ({
      ...prev,
      invoice_total_ht: invHT,
      invoice_tva: 0,
      invoice_total_ttc: invHT
    }));
  }, [formData.invoice_items]);

  const filteredReservationsList = useMemo(() => {
    if (!reservationSearchTerm && !formData.matricule_id && !formData.date_accident && !formData.time_accident) {
      return [];
    }

    let base = reservations;
    if (formData.matricule_id) {
      base = base.filter(r => r.matricule_id === parseInt(formData.matricule_id));
    }

    if (formData.date_accident) {
      const accidentDate = new Date(formData.date_accident);
      base = base.filter(r => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        accidentDate.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return accidentDate >= start && accidentDate <= end;
      });
    }

    if (formData.time_accident) {
      const accidentTime = formData.time_accident;
      base = base.filter(r => {
        if (r.start_time && r.end_time) {
          return accidentTime >= r.start_time && accidentTime <= r.end_time;
        }
        return true;
      });
    }

    const lower = reservationSearchTerm.toLowerCase().trim();
    if (lower) {
      base = base.filter(res => {
        const client = clients.find(c => c.id === res.client_id);
        const clientName = client ? `${client.prenom} ${client.nom}`.toLowerCase() : '';
        const startDate = new Date(res.start_date).toLocaleDateString("fr-FR");
        const endDate = new Date(res.end_date).toLocaleDateString("fr-FR");
        return (
          res.id.toString().includes(lower) ||
          clientName.includes(lower) ||
          startDate.includes(lower) ||
          endDate.includes(lower)
        );
      });
    }

    return base.slice(0, 10);
  }, [reservations, formData.matricule_id, formData.date_accident, formData.time_accident, reservationSearchTerm, clients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let result;
      if (editing) {
        result = await dispatch(updateAccident({ id: editing.id, data: formData }));
      } else {
        result = await dispatch(createAccident(formData));
      }
      if (result.error) toast.error(result.payload);
      else {
        toast.success(editing ? "Accident modifié" : "Accident créé");
        setShowAccidentForm(false);
        setEditing(null);
        resetForm();
        await Promise.all([
          dispatch(fetchAccidents(true)),
          dispatch(fetchMatricules(true)),
          dispatch(fetchCars(true)),
          dispatch(fetchClients(true)),
          dispatch(fetchGarages(true)),
          dispatch(fetchReservations(true))
        ]);
      }
    } catch (error) {
      toast.error("Erreur lors de l'opération");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      matricule_id: "",
      car_id: "",
      client_id: "",
      reservation_id: "",
      date_accident: new Date().toISOString().slice(0, 10),
      time_accident: "",
      location: "",
      description: "",
      police_report_number: "",
      amount_of_losses: 0,
      amount_assurance: 0,
      nom_expert: "",
      status: "open",
      accident_type: "grave",
      procedure_type: "classic",
      expert_decision: "pending",
      expert_amount: 0,
      expert_notes: "",
      notes: "",
      garage_id: "",
      inspection_notes: "",
      estimated_cost: 0,
      total_repair_cost: 0,
      franchise_amount: 0,
      insurance_paid: 0,
      client_paid: 0,
      total_paid: 0,
      remaining_amount: 0,
      internal_notes: "",
      closed_at: null,
      estimate_items: [],
      estimate_total_ht: 0,
      estimate_tva: 0,
      estimate_total_ttc: 0,
      estimate_status: "draft",
      estimate_number: "",
      repair_start_date: "",
      repair_end_date: "",
      repair_notes: "",
      invoice_number: "",
      invoice_items: [],
      invoice_total_ht: 0,
      invoice_tva: 0,
      invoice_total_ttc: 0,
      payments: [],
      img_accident: [],
      img_evaluation_expert: [],
      img_fixed: [],
      image_facture: [],
    });
    setSelectedMatriculeObj(null);
    setMatriculeSearchTerm('');
    setFilteredMatriculesList([]);
    setSelectedClientObj(null);
    setClientSearchTerm('');
    setFilteredClientsList([]);
    setSelectedReservationObj(null);
    setReservationSearchTerm('');
    setSelectedGarageObj(null);
    setGarageSearchTerm('');
    setFilteredGaragesList([]);
    setActiveStep(0);
  };

  const handleEdit = (acc) => {
    setEditing(acc);
    setFormData({
      ...acc,
      date_accident: formatDateForInput(acc.date_accident),
      repair_start_date: formatDateForInput(acc.repair_start_date),
      repair_end_date: formatDateForInput(acc.repair_end_date),
      closed_at: acc.closed_at ? formatDateForInput(acc.closed_at) : null,
      img_accident: acc.img_accident || [],
      img_evaluation_expert: acc.img_evaluation_expert || [],
      img_fixed: acc.img_fixed || [],
      image_facture: acc.image_facture || [],
      estimate_items: acc.estimate_items || [],
      invoice_items: acc.invoice_items || [],
      payments: acc.payments || [],
      status: acc.status || "open",
      estimate_number: acc.estimate_number || "",
    });

    if (acc.matricule_id) {
      const mat = matricules.find(m => m.id === acc.matricule_id);
      if (mat) {
        setSelectedMatriculeObj(mat);
        const car = cars.find(c => c.id === mat.car_id);
        setMatriculeSearchTerm(`${mat.matricule_code} - ${car ? `${car.brand} ${car.model}` : 'N/A'}`);
      }
    }
    if (acc.client_id) {
      const client = clients.find(c => c.id === acc.client_id);
      if (client) {
        setSelectedClientObj(client);
        setClientSearchTerm(`${client.prenom} ${client.nom} - ${client.telephone}`);
      }
    }
    if (acc.reservation_id) {
      const res = reservations.find(r => r.id === acc.reservation_id);
      if (res) {
        setSelectedReservationObj(res);
        const client = clients.find(c => c.id === res.client_id);
        setReservationSearchTerm(
          `#${res.id} - ${new Date(res.start_date).toLocaleDateString("fr-FR")} → ${new Date(res.end_date).toLocaleDateString("fr-FR")} - Client: ${client ? `${client.prenom} ${client.nom}` : 'N/A'}`
        );
      }
    }
    if (acc.garage_id) {
      const garage = garages.find(g => g.id === acc.garage_id);
      if (garage) {
        setSelectedGarageObj(garage);
        setGarageSearchTerm(`${garage.name} - ${garage.address || garage.phone || ''}`);
      }
    }

    setShowAccidentForm(true);
    setActiveStep(0);
  };

  const handleViewDetails = (accident) => {
    setSelectedAccident(accident);
    setShowAccidentDetails(true);
  };

  const handleAddNew = () => {
    setEditing(null);
    resetForm();
    setShowAccidentForm(true);
  };

  const handleDeleteClick = (accident) => {
    setAccidentToDelete(accident);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!accidentToDelete) return;
    const result = await dispatch(deleteAccident(accidentToDelete.id));
    if (result.error) toast.error(result.payload);
    else {
      toast.success("Accident supprimé");
    }
    setDeleteModalOpen(false);
    setAccidentToDelete(null);
  };

  const refreshData = async () => {
    await Promise.all([
      dispatch(fetchAccidents(true)),
      dispatch(fetchMatricules(true)),
      dispatch(fetchCars(true)),
      dispatch(fetchClients(true)),
      dispatch(fetchGarages(true)),
      dispatch(fetchReservations(true))
    ]);
    toast.success("Données actualisées");
  };

  const openDocumentPreview = (type, accident) => {
    setDocumentPreviewType(type);
    setDocumentPreviewAccident(accident);
    setShowDocumentPreview(true);
  };

  const closeDocumentPreview = () => {
    setShowDocumentPreview(false);
    setDocumentPreviewType(null);
    setDocumentPreviewAccident(null);
  };

  const downloadDocument = async (accidentId, type) => {
    const accident = accidents.find(a => a.id === accidentId);
    if (!accident) {
      toast.error('Données de l\'accident introuvables');
      return;
    }

    let PdfComponent;
    let fileName;
    switch (type) {
      case 'report':
        PdfComponent = AccidentReportPDF;
        fileName = `Rapport_Accident_${accident.accident_number || accident.id}.pdf`;
        break;
      case 'estimate':
        PdfComponent = AccidentEstimatePDF;
        fileName = `Devis_${accident.estimate_number || accident.accident_number || accident.id}.pdf`;
        break;
      case 'invoice':
        PdfComponent = AccidentInvoicePDF;
        fileName = `Facture_${accident.invoice_number || accident.accident_number || accident.id}.pdf`;
        break;
      default:
        toast.error('Type de document invalide');
        return;
    }

    try {
      const blob = await pdf(<PdfComponent accident={accident} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Document téléchargé');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const openPaymentModal = () => {
    setPaymentForm({
      amount: '',
      payer: 'client',
      method: 'cash',
      reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = () => {
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amount) || amount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    if (!paymentForm.payer) {
      toast.error('Veuillez sélectionner un payeur');
      return;
    }
    if (!paymentForm.method) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    const newPayment = {
      amount: amount,
      payer: paymentForm.payer,
      date: new Date().toISOString().slice(0, 10),
      method: paymentForm.method,
      reference: paymentForm.reference || "",
      notes: paymentForm.notes || "",
    };

    const updatedPayments = [...(formData.payments || []), newPayment];
    let clientTotal = 0, insuranceTotal = 0;
    updatedPayments.forEach(p => {
      if (p.payer === 'client') clientTotal += p.amount;
      else if (p.payer === 'insurance') insuranceTotal += p.amount;
    });
    setFormData({
      ...formData,
      payments: updatedPayments,
      client_paid: clientTotal,
      insurance_paid: insuranceTotal,
      total_paid: clientTotal + insuranceTotal,
      remaining_amount: (formData.total_repair_cost || 0) - (clientTotal + insuranceTotal)
    });
    toast.success("Paiement ajouté");
    setShowPaymentModal(false);
  };

  const openCloseModal = () => setShowCloseModal(true);
  const handleCloseConfirm = async () => {
    if (editing) {
      const result = await dispatch(updateAccident({
        id: editing.id,
        data: { ...formData, status: 'closed', closed_at: new Date().toISOString() }
      }));
      if (result.error) toast.error(result.payload);
      else {
        toast.success("Accident clôturé");
        dispatch(fetchAccidents(true));
        setShowAccidentForm(false);
        setEditing(null);
        resetForm();
      }
    }
    setShowCloseModal(false);
  };

  const handleMatriculeSearch = (term) => {
    setMatriculeSearchTerm(term);
    if (term.trim() === '') {
      setFilteredMatriculesList([]);
      return;
    }
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
    setFormData(prev => ({
      ...prev,
      matricule_id: mat.id,
      car_id: mat.car_id || '',
    }));
    setFilteredMatriculesList([]);
    setSelectedReservationObj(null);
    setReservationSearchTerm('');
    setFormData(prev => ({ ...prev, reservation_id: '' }));
  };

  const clearMatriculeSelection = () => {
    setSelectedMatriculeObj(null);
    setMatriculeSearchTerm('');
    setFilteredMatriculesList([]);
    setFormData(prev => ({ ...prev, matricule_id: '', car_id: '' }));
    setSelectedReservationObj(null);
    setReservationSearchTerm('');
    setFormData(prev => ({ ...prev, reservation_id: '' }));
  };

  const handleClientSearch = (term) => {
    setClientSearchTerm(term);
    if (term.trim() === '') {
      setFilteredClientsList([]);
      return;
    }
    const lower = term.toLowerCase().trim();
    const filtered = clients.filter(c =>
      `${c.prenom} ${c.nom} ${c.telephone} ${c.email}`.toLowerCase().includes(lower)
    );
    setFilteredClientsList(filtered.slice(0, 10));
  };

  const handleClientSelect = (client) => {
    setSelectedClientObj(client);
    setClientSearchTerm(`${client.prenom} ${client.nom} - ${client.telephone}`);
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setFilteredClientsList([]);
  };

  const clearClientSelection = () => {
    setSelectedClientObj(null);
    setClientSearchTerm('');
    setFilteredClientsList([]);
    setFormData(prev => ({ ...prev, client_id: '' }));
  };

  const handleReservationSearch = (term) => {
    setReservationSearchTerm(term);
  };

  const handleReservationSelect = (res) => {
    setSelectedReservationObj(res);
    const client = clients.find(c => c.id === res.client_id);
    const mat = matricules.find(m => m.id === res.matricule_id);
    const car = mat ? cars.find(c => c.id === mat.car_id) : null;

    setReservationSearchTerm(
      `#${res.id} - ${new Date(res.start_date).toLocaleDateString("fr-FR")} → ${new Date(res.end_date).toLocaleDateString("fr-FR")} - Client: ${client ? `${client.prenom} ${client.nom}` : 'N/A'}`
    );

    setFormData(prev => ({
      ...prev,
      reservation_id: res.id,
      client_id: res.client_id,
      matricule_id: mat ? mat.id : '',
      car_id: car ? car.id : '',
    }));

    if (client) {
      setSelectedClientObj(client);
      setClientSearchTerm(`${client.prenom} ${client.nom} - ${client.telephone}`);
    }

    if (mat) {
      setSelectedMatriculeObj(mat);
      setMatriculeSearchTerm(`${mat.matricule_code} - ${car ? `${car.brand} ${car.model}` : 'N/A'}`);
    } else {
      setSelectedMatriculeObj(null);
      setMatriculeSearchTerm('');
    }
  };

  const clearReservationSelection = () => {
    setSelectedReservationObj(null);
    setReservationSearchTerm('');
    setFormData(prev => ({ ...prev, reservation_id: '' }));
  };

  const handleGarageSearch = (term) => {
    setGarageSearchTerm(term);
    if (term.trim() === '') {
      setFilteredGaragesList([]);
      return;
    }
    const lower = term.toLowerCase().trim();
    const filtered = garages.filter(g =>
      `${g.name} ${g.address} ${g.phone}`.toLowerCase().includes(lower)
    );
    setFilteredGaragesList(filtered.slice(0, 10));
  };

  const handleGarageSelect = (garage) => {
    setSelectedGarageObj(garage);
    setGarageSearchTerm(`${garage.name} - ${garage.address || garage.phone || ''}`);
    setFormData(prev => ({ ...prev, garage_id: garage.id }));
    setFilteredGaragesList([]);
  };

  const clearGarageSelection = () => {
    setSelectedGarageObj(null);
    setGarageSearchTerm('');
    setFilteredGaragesList([]);
    setFormData(prev => ({ ...prev, garage_id: '' }));
  };

  const renderAccidentDetails = () => (
    <div className="step-content">
      <div className="inline-grid-2">
        <div className="inline-field">
          <label>Date de l'accident *</label>
          <input type="date" required value={formData.date_accident} onChange={(e) => setFormData({...formData, date_accident: e.target.value})} className="inline-input" />
        </div>
        <div className="inline-field">
          <label>Heure</label>
          <input type="time" value={formData.time_accident} onChange={(e) => setFormData({...formData, time_accident: e.target.value})} className="inline-input" />
        </div>
        <div className="inline-field">
          <label>Lieu</label>
          <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="inline-input" placeholder="Ex: Autoroute Casablanca" />
        </div>
        <div className="inline-field">
          <label>Rapport de police (n°)</label>
          <input type="text" value={formData.police_report_number} onChange={(e) => setFormData({...formData, police_report_number: e.target.value})} className="inline-input" />
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Description de l'accident</label>
          <textarea rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="inline-textarea" placeholder="Décrivez les circonstances de l'accident..." />
        </div>

        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Véhicule (Matricule) *</label>
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
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={clearMatriculeSelection}
                  title="Effacer la sélection"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {filteredMatriculesList.length > 0 && (
              <div className="inline-results">
                {filteredMatriculesList.map(mat => {
                  const car = cars.find(c => c.id === mat.car_id);
                  return (
                    <div key={mat.id} className="inline-result-item" onClick={() => handleMatriculeSelect(mat)}>
                      <div className="inline-result-avatar"><Car size={20} /></div>
                      <div className="inline-result-info">
                        <strong>{mat.matricule_code}</strong>
                        <div className="inline-result-details">
                          <span>{car ? `${car.brand} ${car.model} (${car.year})` : 'N/A'}</span>
                          <span>{mat.kilometrage?.toLocaleString()} km</span>
                          <span className={`badge ${mat.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            {mat.status === 'active' ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedMatriculeObj && (
              <div className="inline-selected">
                <CheckCircle size={20} />
                <div>
                  <strong>Matricule sélectionné</strong>
                  <p>
                    {selectedMatriculeObj.matricule_code} - {cars.find(c => c.id === selectedMatriculeObj.car_id)?.brand} {cars.find(c => c.id === selectedMatriculeObj.car_id)?.model} ({selectedMatriculeObj.kilometrage?.toLocaleString()} km)
                    <span className={`badge ${selectedMatriculeObj.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: '8px' }}>
                      {selectedMatriculeObj.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {!selectedMatriculeObj && matriculeSearchTerm.trim() !== "" && filteredMatriculesList.length === 0 && (
              <div className="inline-no-results">Aucun matricule trouvé.</div>
            )}
          </div>
          <input type="hidden" name="matricule_id" value={formData.matricule_id} />
        </div>

        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Client *</label>
          <div className="inline-search-section">
            <div className="inline-search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                className="inline-input"
                value={clientSearchTerm}
                onChange={(e) => handleClientSearch(e.target.value)}
                placeholder="Rechercher un client (nom, prénom, téléphone)..."
                required
              />
              {selectedClientObj && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={clearClientSelection}
                  title="Effacer la sélection"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {filteredClientsList.length > 0 && (
              <div className="inline-results">
                {filteredClientsList.map(client => (
                  <div key={client.id} className="inline-result-item" onClick={() => handleClientSelect(client)}>
                    <div className="inline-result-avatar"><User size={20} /></div>
                    <div className="inline-result-info">
                      <strong>{client.prenom} {client.nom}</strong>
                      <div className="inline-result-details">
                        <span>{client.telephone}</span>
                        <span>{client.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedClientObj && (
              <div className="inline-selected">
                <CheckCircle size={20} />
                <div>
                  <strong>Client sélectionné</strong>
                  <p>{selectedClientObj.prenom} {selectedClientObj.nom} - {selectedClientObj.telephone}</p>
                </div>
              </div>
            )}

            {!selectedClientObj && clientSearchTerm.trim() !== "" && filteredClientsList.length === 0 && (
              <div className="inline-no-results">Aucun client trouvé.</div>
            )}
          </div>
          <input type="hidden" name="client_id" value={formData.client_id} />
        </div>

        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Réservation (optionnel)</label>
          <div className="inline-search-section">
            <div className="inline-search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                className="inline-input"
                value={reservationSearchTerm}
                onChange={(e) => handleReservationSearch(e.target.value)}
                placeholder="Rechercher une réservation (ID, client, dates)..."
              />
              {selectedReservationObj && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={clearReservationSelection}
                  title="Effacer la sélection"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {filteredReservationsList.length > 0 && (
              <div className="inline-results">
                {filteredReservationsList.map(res => {
                  const client = clients.find(c => c.id === res.client_id);
                  return (
                    <div key={res.id} className="inline-result-item" onClick={() => handleReservationSelect(res)}>
                      <div className="inline-result-avatar"><Calendar size={20} /></div>
                      <div className="inline-result-info">
                        <strong>#{res.id}</strong>
                        <div className="inline-result-details">
                          <span>{new Date(res.start_date).toLocaleDateString("fr-FR")} → {new Date(res.end_date).toLocaleDateString("fr-FR")}</span>
                          <span>Client: {client ? `${client.prenom} ${client.nom}` : 'N/A'}</span>
                          {res.start_time && <span>De {res.start_time} à {res.end_time}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(formData.matricule_id || formData.date_accident || reservationSearchTerm) && filteredReservationsList.length === 0 && (
              <div className="inline-no-results">
                {formData.matricule_id && formData.date_accident 
                  ? 'Aucune réservation trouvée pour ce matricule et cette date.'
                  : formData.matricule_id 
                  ? 'Aucune réservation trouvée pour ce matricule.'
                  : formData.date_accident 
                  ? 'Aucune réservation trouvée pour cette date.'
                  : 'Aucune réservation trouvée.'}
              </div>
            )}

            {selectedReservationObj && (
              <div className="inline-selected">
                <CheckCircle size={20} />
                <div>
                  <strong>Réservation sélectionnée</strong>
                  <p>#{selectedReservationObj.id} - {new Date(selectedReservationObj.start_date).toLocaleDateString("fr-FR")} → {new Date(selectedReservationObj.end_date).toLocaleDateString("fr-FR")}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Client: {clients.find(c => c.id === selectedReservationObj.client_id)?.prenom} {clients.find(c => c.id === selectedReservationObj.client_id)?.nom}
                  </p>
                </div>
              </div>
            )}
          </div>
          <input type="hidden" name="reservation_id" value={formData.reservation_id} />
        </div>

        <div className="inline-field">
          <label>Type d'accident</label>
          <select value={formData.accident_type} onChange={(e) => setFormData({...formData, accident_type: e.target.value})} className="inline-select">
            <option value="grave">Grave</option>
            <option value="non_grave">Non-grave</option>
          </select>
        </div>
        <div className="inline-field">
          <label>Montant des pertes (DH) *</label>
          <input type="number" step="0.01" required value={formData.amount_of_losses} onChange={(e) => setFormData({...formData, amount_of_losses: parseFloat(e.target.value) || 0})} className="inline-input" />
        </div>
        <div className="inline-field">
          <label>Montant assurance (DH)</label>
          <input type="number" step="0.01" value={formData.amount_assurance} onChange={(e) => setFormData({...formData, amount_assurance: parseFloat(e.target.value) || 0})} className="inline-input" />
        </div>
        <div className="inline-field">
          <label>Statut initial</label>
          <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="inline-select">
            {Object.entries(statusConfig).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Notes</label>
          <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="inline-textarea" />
        </div>
      </div>
    </div>
  );

  const renderGarageInspection = () => (
    <div className="step-content">
      <div className="inline-grid-2">
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Garage</label>
          <div className="inline-search-section">
            <div className="inline-search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                className="inline-input"
                value={garageSearchTerm}
                onChange={(e) => handleGarageSearch(e.target.value)}
                placeholder="Rechercher un garage (nom, adresse, téléphone)..."
              />
              {selectedGarageObj && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={clearGarageSelection}
                  title="Effacer la sélection"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {filteredGaragesList.length > 0 && (
              <div className="inline-results">
                {filteredGaragesList.map(garage => (
                  <div key={garage.id} className="inline-result-item" onClick={() => handleGarageSelect(garage)}>
                    <div className="inline-result-avatar"><Building2 size={20} /></div>
                    <div className="inline-result-info">
                      <strong>{garage.name}</strong>
                      <div className="inline-result-details">
                        <span>{garage.address || 'N/A'}</span>
                        <span>{garage.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedGarageObj && (
              <div className="inline-selected">
                <CheckCircle size={20} />
                <div>
                  <strong>Garage sélectionné</strong>
                  <p>{selectedGarageObj.name} - {selectedGarageObj.address || selectedGarageObj.phone}</p>
                </div>
              </div>
            )}

            {!selectedGarageObj && garageSearchTerm.trim() !== "" && filteredGaragesList.length === 0 && (
              <div className="inline-no-results">Aucun garage trouvé.</div>
            )}
          </div>
          <input type="hidden" name="garage_id" value={formData.garage_id} />
        </div>

        <div className="inline-field">
          <label>Coût estimé (DH)</label>
          <input type="number" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value) || 0})} className="inline-input" />
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Notes d'inspection</label>
          <textarea rows="3" value={formData.inspection_notes} onChange={(e) => setFormData({...formData, inspection_notes: e.target.value})} className="inline-textarea" placeholder="Résultat de l'inspection par le garage..." />
        </div>
        <div className="inline-field">
          <label>Expert</label>
          <input type="text" value={formData.nom_expert} onChange={(e) => setFormData({...formData, nom_expert: e.target.value})} className="inline-input" placeholder="Nom de l'expert" />
        </div>
        <div className="inline-field">
          <label>Décision expert</label>
          <select value={formData.expert_decision} onChange={(e) => setFormData({...formData, expert_decision: e.target.value})} className="inline-select">
            <option value="pending">En attente</option>
            <option value="accepted">Accepté</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>
        <div className="inline-field">
          <label>Montant expert (DH)</label>
          <input type="number" step="0.01" value={formData.expert_amount} onChange={(e) => setFormData({...formData, expert_amount: parseFloat(e.target.value) || 0})} className="inline-input" />
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Notes expert</label>
          <textarea rows="2" value={formData.expert_notes} onChange={(e) => setFormData({...formData, expert_notes: e.target.value})} className="inline-textarea" />
        </div>
      </div>
    </div>
  );

  const renderEstimate = () => (
    <div className="step-content">
      <div className="inline-grid-2">
        <div className="inline-field">
          <label>Statut devis</label>
          <select
            value={formData.estimate_status}
            onChange={(e) => setFormData({...formData, estimate_status: e.target.value})}
            className="inline-select"
          >
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>
        <div className="inline-field">
          <label>Numéro de devis</label>
          <input
            type="text"
            value={formData.estimate_number}
            onChange={(e) => setFormData({...formData, estimate_number: e.target.value})}
            className="inline-input"
            placeholder="DEV-2026-001"
          />
        </div>
        <div className="inline-field">
          <label>Franchise (DH)</label>
          <input
            type="number"
            step="0.01"
            value={formData.franchise_amount}
            onChange={(e) => setFormData({...formData, franchise_amount: parseFloat(e.target.value) || 0})}
            className="inline-input"
          />
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Articles du devis</label>
          <div style={{ border: '1.5px solid var(--line)', borderRadius: '12px', padding: '14px', background: 'var(--surface-2)' }}>
            {formData.estimate_items.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--tx-3)', padding: '10px' }}>Aucun article</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                    <th style={{ padding: '6px', textAlign: 'left', color: 'var(--tx-2)' }}>Nom</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '80px', color: 'var(--tx-2)' }}>Qté</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '100px', color: 'var(--tx-2)' }}>Prix unit.</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '100px', color: 'var(--tx-2)' }}>Total</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.estimate_items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1.5px dotted var(--line)' }}>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => updateEstimateItem(idx, 'name', e.target.value)}
                          placeholder="Nom de l'article"
                          className="inline-input"
                          style={{ minHeight: '36px', padding: '4px 8px' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity || 1}
                          onChange={(e) => updateEstimateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="inline-input"
                          style={{ minHeight: '36px', padding: '4px 8px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price || 0}
                          onChange={(e) => updateEstimateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="inline-input"
                          style={{ minHeight: '36px', padding: '4px 8px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                        {(item.quantity || 0) * (item.unit_price || 0)} DH
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeEstimateItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line-strong)' }}>
                    <td colSpan="3" style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total HT</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{formData.estimate_total_ht} DH</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
            <button
              type="button"
              onClick={addEstimateItem}
              className="inline-secondary-btn"
              style={{ marginTop: '10px' }}
            >
              <Plus size={16} /> Ajouter un article
            </button>
          </div>
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="inline-secondary-btn"
            onClick={() => {
              if (editing) openDocumentPreview('estimate', editing);
            }}
          >
            <Printer size={16} /> Aperçu Devis
          </button>
          <button
            type="button"
            className="inline-primary-btn"
            onClick={() => {
              setFormData({...formData, estimate_status: 'approved'});
              toast.success("Devis approuvé");
            }}
          >
            <CheckCircle size={16} /> Approuver le devis
          </button>
        </div>
      </div>
    </div>
  );

  const renderRepair = () => (
    <div className="step-content">
      <div className="inline-grid-2">
        <div className="inline-field">
          <label>Date début réparation</label>
          <input type="date" value={formData.repair_start_date} onChange={(e) => setFormData({...formData, repair_start_date: e.target.value})} className="inline-input" />
        </div>
        <div className="inline-field">
          <label>Date fin réparation</label>
          <input type="date" value={formData.repair_end_date} onChange={(e) => setFormData({...formData, repair_end_date: e.target.value})} className="inline-input" />
        </div>
        <div className="inline-field">
          <label>Coût total réparation (DH)</label>
          <input type="number" step="0.01" value={formData.total_repair_cost} onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            setFormData({
              ...formData,
              total_repair_cost: val,
              remaining_amount: val - formData.total_paid
            });
          }} className="inline-input" />
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <label>Notes réparation</label>
          <textarea rows="3" value={formData.repair_notes} onChange={(e) => setFormData({...formData, repair_notes: e.target.value})} className="inline-textarea" placeholder="Suivi des réparations..." />
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" className="inline-secondary-btn" onClick={() => {
            setFormData({...formData, status: 'under_repair'});
            toast.success("Statut mis à jour: En réparation");
          }}>
            <Wrench size={16} /> Démarrer la réparation
          </button>
          <button type="button" className="inline-primary-btn" onClick={() => {
            setFormData({
              ...formData,
              status: 'invoice_received',
              repair_end_date: new Date().toISOString().slice(0, 10)
            });
            toast.success("Réparation terminée");
          }}>
            <CheckCircle size={16} /> Terminer la réparation
          </button>
        </div>
      </div>
    </div>
  );

  const renderInvoice = () => (
    <div className="step-content">
      <div className="inline-grid-2">
        <div className="inline-field">
          <label>Numéro facture</label>
          <input
            type="text"
            value={formData.invoice_number}
            onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
            className="inline-input"
            placeholder="FACT-2026-001"
          />
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              type="button"
              className="inline-secondary-btn"
              onClick={copyEstimateToInvoice}
            >
              <Copy size={16} /> Copier le devis
            </button>
          </div>
          <label>Articles de la facture</label>
          <div style={{ border: '1.5px solid var(--line)', borderRadius: '12px', padding: '14px', background: 'var(--surface-2)' }}>
            {formData.invoice_items.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--tx-3)', padding: '10px' }}>Aucun article</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                    <th style={{ padding: '6px', textAlign: 'left', color: 'var(--tx-2)' }}>Nom</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '80px', color: 'var(--tx-2)' }}>Qté</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '100px', color: 'var(--tx-2)' }}>Prix unit.</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '100px', color: 'var(--tx-2)' }}>Total</th>
                    <th style={{ padding: '6px', textAlign: 'center', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.invoice_items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1.5px dotted var(--line)' }}>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => updateInvoiceItem(idx, 'name', e.target.value)}
                          placeholder="Nom de l'article"
                          className="inline-input"
                          style={{ minHeight: '36px', padding: '4px 8px' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity || 1}
                          onChange={(e) => updateInvoiceItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="inline-input"
                          style={{ minHeight: '36px', padding: '4px 8px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price || 0}
                          onChange={(e) => updateInvoiceItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="inline-input"
                          style={{ minHeight: '36px', padding: '4px 8px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                        {(item.quantity || 0) * (item.unit_price || 0)} DH
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeInvoiceItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line-strong)' }}>
                    <td colSpan="3" style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total HT</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{formData.invoice_total_ht} DH</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
            <button
              type="button"
              onClick={addInvoiceItem}
              className="inline-secondary-btn"
              style={{ marginTop: '10px' }}
            >
              <Plus size={16} /> Ajouter un article
            </button>
          </div>
        </div>
        <div className="inline-field" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="inline-secondary-btn"
            onClick={() => {
              if (editing) openDocumentPreview('invoice', editing);
            }}
          >
            <Printer size={16} /> Aperçu Facture
          </button>
          <button
            type="button"
            className="inline-primary-btn"
            onClick={() => {
              setFormData({...formData, status: 'waiting_payment'});
              toast.success("Facture générée - En attente de paiement");
            }}
          >
            <FileText size={16} /> Générer la facture
          </button>
        </div>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="step-content">
      <div className="inline-grid-2">
        <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
            <label style={{ fontWeight: "bold" }}>Paiements enregistrés</label>
            <button type="button" className="inline-secondary-btn" onClick={openPaymentModal}>
              <Plus size={16} /> Ajouter un paiement
            </button>
          </div>
          {formData.payments && formData.payments.length > 0 ? (
            <div style={{ border: "1.5px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead style={{ background: "var(--surface-2)" }}>
                  <tr>
                    <th style={{ padding: "8px", textAlign: "left", color: "var(--tx-2)" }}>Date</th>
                    <th style={{ padding: "8px", textAlign: "left", color: "var(--tx-2)" }}>Payeur</th>
                    <th style={{ padding: "8px", textAlign: "left", color: "var(--tx-2)" }}>Méthode</th>
                    <th style={{ padding: "8px", textAlign: "right", color: "var(--tx-2)" }}>Montant</th>
                    <th style={{ padding: "8px", textAlign: "left", color: "var(--tx-2)" }}>Référence</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.payments.map((payment, idx) => (
                    <tr key={idx} style={{ borderTop: "1.5px dotted var(--line)" }}>
                      <td style={{ padding: "8px" }}>{payment.date}</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: payment.payer === 'client' ? '#dcfce7' : '#dbeafe',
                          color: payment.payer === 'client' ? '#166534' : '#1e40af',
                          fontSize: "0.7rem",
                          fontWeight: "bold"
                        }}>
                          {payment.payer === 'client' ? 'Client' : 'Assurance'}
                        </span>
                      </td>
                      <td style={{ padding: "8px" }}>{payment.method}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                        {payment.amount.toFixed(2)} DH
                      </td>
                      <td style={{ padding: "8px" }}>{payment.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "var(--surface-2)", fontWeight: "bold", borderTop: "2px solid var(--line-strong)" }}>
                  <tr>
                    <td colSpan="3" style={{ padding: "8px", textAlign: "right" }}>Total payé:</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      {(Number(formData.total_paid) || 0).toFixed(2)} DH
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ padding: "8px", textAlign: "right" }}>Reste à payer:</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#dc2626" }}>
                      {(Number(formData.remaining_amount) || 0).toFixed(2)} DH
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--tx-3)", border: "1.5px dashed var(--line)", borderRadius: "12px" }}>
              Aucun paiement enregistré
            </div>
          )}
        </div>
        <div className="inline-field">
          <label>Payé par client (DH)</label>
          <input type="number" step="0.01" value={formData.client_paid} readOnly className="inline-input" style={{ background: "var(--surface-2)" }} />
        </div>
        <div className="inline-field">
          <label>Payé par assurance (DH)</label>
          <input type="number" step="0.01" value={formData.insurance_paid} readOnly className="inline-input" style={{ background: "var(--surface-2)" }} />
        </div>
      </div>
    </div>
  );

  const renderClose = () => {
    const totalRepairCost = Number(formData.total_repair_cost) || 0;
    const totalPaid = Number(formData.total_paid) || 0;
    const remaining = totalRepairCost - totalPaid;

    return (
      <div className="step-content">
        <div style={{ background: "var(--surface-2)", padding: "20px", borderRadius: "16px", border: "1.5px solid var(--line)" }}>
          <h3 style={{ marginBottom: "15px", fontSize: "1rem", fontWeight: "800" }}>Vérification avant clôture</h3>
          <div className="inline-grid-2">
            <div className="inline-field">
              <label>Coût total réparation</label>
              <input type="text" value={`${totalRepairCost.toFixed(2)} DH`} readOnly className="inline-input" style={{ background: "var(--surface)" }} />
            </div>
            <div className="inline-field">
              <label>Total payé</label>
              <input type="text" value={`${totalPaid.toFixed(2)} DH`} readOnly className="inline-input" style={{ background: "var(--surface)" }} />
            </div>
            <div className="inline-field">
              <label>Reste à payer</label>
              <input type="text" value={`${remaining.toFixed(2)} DH`} readOnly className="inline-input" style={{
                background: "var(--surface)",
                color: remaining > 0 ? "#dc2626" : "#16a34a",
                fontWeight: "bold"
              }} />
            </div>
            <div className="inline-field">
              <label>Statut actuel</label>
              <input type="text" value={statusConfig[formData.status]?.label || formData.status} readOnly className="inline-input" style={{ background: "var(--surface)" }} />
            </div>
          </div>
          {remaining > 0 && (
            <div style={{ background: "rgba(220,38,38,0.1)", padding: "12px", borderRadius: "12px", marginTop: "15px", color: "#dc2626", border: "1.5px solid #dc2626", fontSize: "0.85rem", fontWeight: "700" }}>
              ⚠️ Attention : Il reste {remaining.toFixed(2)} DH à payer. L'accident ne peut pas être clôturé tant que tous les paiements ne sont pas effectués.
            </div>
          )}
          {remaining <= 0 && formData.status !== 'closed' && (
            <div style={{ background: "rgba(22,163,74,0.1)", padding: "12px", borderRadius: "12px", marginTop: "15px", color: "#16a34a", border: "1.5px solid #16a34a", fontSize: "0.85rem", fontWeight: "700" }}>
              ✅ Tous les paiements sont effectués. Vous pouvez clôturer l'accident.
            </div>
          )}
          {formData.status === 'closed' && (
            <div style={{ background: "rgba(29,161,232,0.1)", padding: "12px", borderRadius: "12px", marginTop: "15px", color: "#0f84c4", border: "1.5px solid #1da1e8", fontSize: "0.85rem", fontWeight: "700" }}>
              ✅ Cet accident est déjà clôturé.
            </div>
          )}
          <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" className="inline-secondary-btn" onClick={() => {
              if (editing) openDocumentPreview('report', editing);
            }}>
              <Printer size={16} /> Aperçu Rapport
            </button>
            {remaining <= 0 && formData.status !== 'closed' && (
              <button type="button" className="inline-primary-btn" onClick={openCloseModal} style={{ background: "#dc2626", color: "#fff" }}>
                <CheckSquare size={16} /> Clôturer l'accident
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: return renderAccidentDetails();
      case 1: return renderGarageInspection();
      case 2: return renderEstimate();
      case 3: return renderRepair();
      case 4: return renderInvoice();
      case 5: return renderPayments();
      case 6: return renderClose();
      default: return null;
    }
  };

  const getStats = () => ({
    total: accidents.length,
    open: accidents.filter(a => a.status === 'open' || a.status === 'under_review' || a.status === 'waiting_estimate').length,
    under_repair: accidents.filter(a => a.status === 'under_repair').length,
    closed: accidents.filter(a => a.status === 'closed').length
  });
  const stats = getStats();

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("fr-FR");
    } catch {
      return dateString;
    }
  };

  if (loading) return (
    <div className="rv">
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des accidents...</p>
      </div>
      <Styles />
    </div>
  );

  return (
    <div className="rv">
      {showAccidentForm && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editing ? <Sparkles size={28} /> : <AlertTriangle size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editing ? "Modifier l'accident" : "Signaler un accident"}</h2>
              <p>{editing ? "Modifiez les informations" : "Ajoutez un nouvel accident"}</p>
            </div>
            <button type="button" onClick={() => { setShowAccidentForm(false); setEditing(null); resetForm(); }} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <div className="steps-progress">
            {["Détails", "Garage", "Devis", "Réparation", "Facture", "Paiements", "Clôture"].map((label, idx) => (
              <div key={idx} className={`step-indicator ${idx === activeStep ? 'active' : ''} ${idx < activeStep ? 'completed' : ''}`} onClick={() => setActiveStep(idx)}>
                <span className="step-number">{idx + 1}</span>
                <span className="step-label">{label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="inline-form">
            {renderStepContent()}

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => { setShowAccidentForm(false); setEditing(null); resetForm(); }}>
                Annuler
              </button>
              {activeStep > 0 && (
                <button type="button" className="inline-secondary-btn" onClick={() => setActiveStep(activeStep - 1)}>
                  Précédent
                </button>
              )}
              {activeStep < 6 && (
                <button type="button" className="inline-secondary-btn" onClick={() => setActiveStep(activeStep + 1)}>
                  Suivant
                </button>
              )}
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {submitting ? "Traitement..." : (editing ? "Mettre à jour" : "Créer")}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAccidentDetails && selectedAccident && (
        <div className="modal-overlay" onClick={() => setShowAccidentDetails(false)}>
          <div className="modal" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Détails de l'accident #{selectedAccident.id}</h3>
              <button type="button" onClick={() => setShowAccidentDetails(false)} className="modal-close"><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div className="details-actions-bar" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => { setShowAccidentDetails(false); handleEdit(selectedAccident); }} className="ac-btn ac-btn-primary"><Edit2 size={16} /> Modifier</button>
                <button onClick={() => { setShowAccidentDetails(false); handleDeleteClick(selectedAccident); }} className="ac-btn" style={{ borderColor: '#dc2626', color: '#dc2626' }}><Trash2 size={16} /> Supprimer</button>
                <button onClick={() => openDocumentPreview('report', selectedAccident)} className="ac-btn"><Printer size={16} /> Rapport</button>
                <button onClick={() => openDocumentPreview('estimate', selectedAccident)} className="ac-btn"><FileText size={16} /> Devis</button>
                <button onClick={() => openDocumentPreview('invoice', selectedAccident)} className="ac-btn"><Receipt size={16} /> Facture</button>
              </div>

              <div className="rv-stats" style={{ marginBottom: '20px' }}>
                <div className="rv-stat-card">
                  <div>
                    <p className="rv-stat-label">Statut</p>
                    <p className="rv-stat-value" style={{ fontSize: '1rem' }}>{statusConfig[selectedAccident.status]?.label || selectedAccident.status}</p>
                  </div>
                </div>
                <div className="rv-stat-card">
                  <div>
                    <p className="rv-stat-label">Coût total</p>
                    <p className="rv-stat-value" style={{ fontSize: '1rem' }}>{selectedAccident.total_repair_cost || 0} DH</p>
                  </div>
                </div>
                <div className="rv-stat-card">
                  <div>
                    <p className="rv-stat-label">Payé</p>
                    <p className="rv-stat-value" style={{ fontSize: '1rem' }}>{selectedAccident.total_paid || 0} DH</p>
                  </div>
                </div>
                <div className="rv-stat-card">
                  <div>
                    <p className="rv-stat-label">Reste</p>
                    <p className="rv-stat-value" style={{ fontSize: '1rem', color: selectedAccident.remaining_amount > 0 ? '#dc2626' : '#16a34a' }}>
                      {selectedAccident.remaining_amount || 0} DH
                    </p>
                  </div>
                </div>
              </div>

              <div className="details-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div className="inline-section">
                  <div className="inline-section-header"><Car size={16} /><h3>Véhicule</h3></div>
                  <div className="info-row"><span className="info-label">Matricule</span><span className="info-value matricule-value">{selectedAccident.matricule?.matricule_code || "—"}</span></div>
                  <div className="info-row"><span className="info-label">Marque / Modèle</span><span className="info-value">{selectedAccident.car?.brand} {selectedAccident.car?.model}</span></div>
                </div>
                <div className="inline-section">
                  <div className="inline-section-header"><User size={16} /><h3>Client</h3></div>
                  <div className="info-row"><span className="info-label">Nom</span><span className="info-value">{selectedAccident.client?.prenom} {selectedAccident.client?.nom}</span></div>
                  <div className="info-row"><span className="info-label">Téléphone</span><span className="info-value">{selectedAccident.client?.telephone || "—"}</span></div>
                </div>
                <div className="inline-section">
                  <div className="inline-section-header"><Building2 size={16} /><h3>Garage</h3></div>
                  <div className="info-row"><span className="info-label">Nom</span><span className="info-value">{selectedAccident.garage?.name || "Non assigné"}</span></div>
                  <div className="info-row"><span className="info-label">Adresse</span><span className="info-value">{selectedAccident.garage?.address || "—"}</span></div>
                </div>
              </div>

              {selectedAccident.notes && (
                <div className="inline-section" style={{ marginTop: '16px' }}>
                  <div className="inline-section-header"><FileText size={16} /><h3>Notes</h3></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--tx-2)', margin: 0 }}>{selectedAccident.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-actions-footer" style={{ padding: '16px 24px' }}>
              <button type="button" onClick={() => setShowAccidentDetails(false)} className="modal-btn modal-btn-cancel">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {showDocumentPreview && documentPreviewAccident && documentPreviewType && (
        <div className="modal-overlay" onClick={closeDocumentPreview}>
          <div className="document-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="document-preview-header">
              <div className="document-preview-title">
                <FileText size={24} />
                <h2>
                  {documentPreviewType === 'report' && 'Rapport d\'accident'}
                  {documentPreviewType === 'estimate' && 'Devis de réparation'}
                  {documentPreviewType === 'invoice' && 'Facture de réparation'}
                </h2>
              </div>
              <div className="document-preview-actions">
                <button
                  type="button"
                  className="document-preview-download"
                  onClick={() => downloadDocument(documentPreviewAccident.id, documentPreviewType)}
                >
                  <Download size={18} /> Télécharger
                </button>
                <button type="button" className="document-preview-close" onClick={closeDocumentPreview}>
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="document-preview-body">
              <PDFViewer width="100%" height="100%" style={{ border: 'none', borderRadius: '8px' }}>
                {documentPreviewType === 'report' && <AccidentReportPDF accident={documentPreviewAccident} />}
                {documentPreviewType === 'estimate' && <AccidentEstimatePDF accident={documentPreviewAccident} />}
                {documentPreviewType === 'invoice' && <AccidentInvoicePDF accident={documentPreviewAccident} />}
              </PDFViewer>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal delete-modal" style={{ maxWidth: '440px', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title"><Wallet size={20} /> Ajouter un paiement</h3>
              <button type="button" className="modal-close" onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="inline-field" style={{ marginBottom: '12px' }}>
                <label>Montant (DH) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  placeholder="0.00"
                  className="inline-input"
                />
              </div>
              <div className="inline-field" style={{ marginBottom: '12px' }}>
                <label>Payeur *</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="client"
                      checked={paymentForm.payer === 'client'}
                      onChange={() => setPaymentForm({...paymentForm, payer: 'client'})}
                    /> Client
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="insurance"
                      checked={paymentForm.payer === 'insurance'}
                      onChange={() => setPaymentForm({...paymentForm, payer: 'insurance'})}
                    /> Assurance
                  </label>
                </div>
              </div>
              <div className="inline-field" style={{ marginBottom: '12px' }}>
                <label>Méthode *</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                  className="inline-select"
                >
                  <option value="cash">Espèces</option>
                  <option value="check">Chèque</option>
                  <option value="bank_transfer">Virement</option>
                </select>
              </div>
              <div className="inline-field" style={{ marginBottom: '12px' }}>
                <label>Référence (optionnel)</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                  placeholder="N° chèque, virement..."
                  className="inline-input"
                />
              </div>
              <div className="inline-field">
                <label>Notes (optionnel)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  placeholder="Commentaires..."
                  className="inline-textarea"
                  rows="2"
                />
              </div>
            </div>
            <div className="modal-actions-footer" style={{ padding: '16px 20px' }}>
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setShowPaymentModal(false)}>Annuler</button>
              <button type="button" className="modal-btn inline-primary-btn" onClick={handlePaymentSubmit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon"><CheckSquare size={32} /></div>
            <h3 className="delete-title">Confirmer la clôture</h3>
            <p className="delete-message">
              Êtes-vous sûr de vouloir clôturer cet accident ?<br />
              Une fois clôturé, vous ne pourrez plus modifier les informations.
            </p>
            <div className="delete-actions">
              <button type="button" onClick={() => setShowCloseModal(false)} className="modal-btn modal-btn-cancel">Annuler</button>
              <button type="button" onClick={handleCloseConfirm} className="modal-btn btn-delete">Clôturer</button>
            </div>
          </div>
        </div>
      )}

      {!showAccidentForm && !showAccidentDetails && !showDocumentPreview && (
        <div className="ac-wrap">
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><AlertTriangle size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">Gestion des Accidents</h1>
                <p className="rv-sub">Suivi complet des sinistres et réparations</p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button type="button" onClick={refreshData} className="ac-btn">
                <RefreshCw size={15} /><span className="ac-btn-text">Actualiser</span>
              </button>
              <button type="button" onClick={handleAddNew} className="ac-btn ac-btn-primary">
                <Plus size={15} /><span className="ac-btn-text">Nouvel accident</span>
              </button>
            </div>
          </div>

          <div className="rv-stats">
            <div className="rv-stat-card">
              <div className="rv-stat-icon rv-stat-blue"><AlertTriangle size={20} /></div>
              <div><p className="rv-stat-label">Total</p><p className="rv-stat-value">{stats.total}</p></div>
            </div>
            <div className="rv-stat-card">
              <div className="rv-stat-icon rv-stat-amber"><AlertCircle size={20} /></div>
              <div><p className="rv-stat-label">Ouverts</p><p className="rv-stat-value">{stats.open}</p></div>
            </div>
            <div className="rv-stat-card">
              <div className="rv-stat-icon rv-stat-orange"><Wrench size={20} /></div>
              <div><p className="rv-stat-label">En réparation</p><p className="rv-stat-value">{stats.under_repair}</p></div>
            </div>
            <div className="rv-stat-card">
              <div className="rv-stat-icon rv-stat-green"><CheckCircle size={20} /></div>
              <div><p className="rv-stat-label">Clôturés</p><p className="rv-stat-value">{stats.closed}</p></div>
            </div>
          </div>

          <div className="ac-filters">
            <div className="ac-search">
              <Search size={16} />
              <input type="text" placeholder="Rechercher par ID, client, plaque..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {searchTerm && (
                <button type="button" className="ac-search-clear" onClick={() => setSearchTerm('')} aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ minWidth: '200px' }}>
              <AcSelect
                id="ac-status-filter"
                ariaLabel="Filtrer par statut"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
          </div>

          {filterParam === 'notifications' && (
            <div className="filter-indicator">
              <span className="filter-indicator-text">
                <AlertCircle size={16} /> Affichage des accidents récents (7 derniers jours) non clôturés
              </span>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="clear-filter-btn"
              >
                <X size={16} /> Effacer le filtre
              </button>
            </div>
          )}

          <div className="ac-meta">
            <p><strong>{filteredAccidents.length}</strong> accident(s) trouvé(s)</p>
            <p>Page {currentPage} / {totalPages || 1}</p>
          </div>

          <div className="ac-listwrap">
            <div className="ac-tablecard ac-desktop-only">
              <div className="ac-scroll">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                      <th onClick={() => handleSort("date")} className="sortable-header">Date {getSortIcon("date")}</th>
                      <th onClick={() => handleSort("matricule")} className="sortable-header">Véhicule {getSortIcon("matricule")}</th>
                      <th onClick={() => handleSort("client")} className="sortable-header">Client {getSortIcon("client")}</th>
                      <th>Coût total</th>
                      <th>Payé</th>
                      <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAccidents.length === 0 ? (
                      <tr><td colSpan="8" className="ac-empty-cell"><AlertTriangle size={40} /><p>Aucun accident trouvé</p></td></tr>
                    ) : (
                      paginatedAccidents.map(acc => {
                        const mat = matricules.find(m => m.id === acc.matricule_id);
                        const client = clients.find(c => c.id === acc.client_id);
                        const status = statusConfig[acc.status] || statusConfig.open;
                        const StatusIcon = status.icon;
                        return (
                          <tr key={acc.id}>
                            <td><span className="ac-id">#{acc.id}</span></td>
                            <td>{formatDate(acc.date_accident)}</td>
                            <td>
                              <div className="flex items-center gap-1">
                                <Car size={14} />
                                <span className="ac-strong" style={{ fontFamily: 'monospace', color: '#eab308' }}>{mat?.matricule_code || "—"}</span>
                              </div>
                            </td>
                            <td className="ac-strong">{client ? `${client.prenom} ${client.nom}` : "—"}</td>
                            <td>{acc.total_repair_cost || 0} DH</td>
                            <td>{acc.total_paid || 0} DH</td>
                            <td>
                              <span className={`badge ${status.bg}`}>
                                <StatusIcon size={12} /> {status.label}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="ac-actions">
                                <button type="button" onClick={() => handleViewDetails(acc)} className="ac-action-btn" style={{ color: '#3b82f6' }} title="Détails"><Eye size={16} /></button>
                                <button type="button" onClick={() => handleEdit(acc)} className="ac-action-btn ac-action-edit" title="Modifier"><Edit2 size={16} /></button>
                                <button type="button" onClick={() => openDocumentPreview('report', acc)} className="ac-action-btn" style={{ color: '#8b5cf6' }} title="Rapport"><FileText size={16} /></button>
                                <button type="button" onClick={() => openDocumentPreview('estimate', acc)} className="ac-action-btn" style={{ color: '#06b6d4' }} title="Devis"><FileCheck size={16} /></button>
                                <button type="button" onClick={() => openDocumentPreview('invoice', acc)} className="ac-action-btn" style={{ color: '#eab308' }} title="Facture"><Receipt size={16} /></button>
                                <button type="button" onClick={() => handleDeleteClick(acc)} className="ac-action-btn ac-action-delete" title="Supprimer"><Trash2 size={16} /></button>
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

            <div className="ac-mobile-only">
              <div className="ac-sortbar">
                <label htmlFor="ac-sort-acc">Trier</label>
                <AcSelect id="ac-sort-acc" ariaLabel="Trier par" value={sortField} onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
                <button
                  type="button"
                  className="ac-sortdir"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                >
                  {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
              </div>
              {paginatedAccidents.length === 0 ? (
                <div className="ac-empty-card"><AlertTriangle size={40} /><p>Aucun accident trouvé</p></div>
              ) : (
                <div className="ac-mcards">
                  {paginatedAccidents.map(acc => {
                    const mat = matricules.find(m => m.id === acc.matricule_id);
                    const client = clients.find(c => c.id === acc.client_id);
                    const status = statusConfig[acc.status] || statusConfig.open;
                    const StatusIcon = status.icon;
                    return (
                      <div key={acc.id} className="ac-mcard">
                        <div className="ac-mcard-head">
                          <div className="ac-mcard-thumb ac-mcard-thumb-empty"><AlertTriangle size={22} /></div>
                          <div className="ac-mcard-info">
                            <div className="ac-mcard-name">#{acc.id} — {client ? `${client.prenom} ${client.nom}` : 'Client N/A'}</div>
                            <div className="ac-mcard-sub"><span className="ac-id">{mat?.matricule_code || "Aucun matricule"}</span></div>
                          </div>
                          <div className="ac-mcard-price">{acc.total_repair_cost || 0}<small> DH</small></div>
                        </div>

                        <div className="ac-mcard-badges">
                          <span className={`badge ${status.bg}`}><StatusIcon size={12} /> {status.label}</span>
                        </div>

                        <div className="ac-mcard-meta">
                          <span><Calendar size={13} /> {formatDate(acc.date_accident)}</span>
                          <span><Wallet size={13} /> Payé: {acc.total_paid || 0} DH</span>
                        </div>

                        <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                          <button type="button" onClick={() => handleViewDetails(acc)} className="ac-card-btn" style={{ color: '#3b82f6' }}>
                            <Eye size={17} /><span>Détails</span>
                          </button>
                          <button type="button" onClick={() => handleEdit(acc)} className="ac-card-btn ac-action-edit">
                            <Edit2 size={17} /><span>Modifier</span>
                          </button>
                          <button type="button" onClick={() => handleDeleteClick(acc)} className="ac-card-btn ac-action-delete">
                            <Trash2 size={17} /><span>Supprimer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="ac-pager">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  totalItems={filteredAccidents.length}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {deleteModalOpen && accidentToDelete && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon"><TrashIcon size={32} /></div>
            <h3 className="delete-title">Confirmer la suppression</h3>
            <p className="delete-message">
              Êtes-vous sûr de vouloir supprimer l'accident <br />
              <span className="reservation-id">#{accidentToDelete.id}</span> ?<br />
              Cette action est irréversible.
            </p>
            <div className="delete-actions">
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
              <button type="button" onClick={confirmDelete} className="modal-btn btn-delete">Supprimer</button>
            </div>
          </div>
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
.rv .modal-close:hover:not(:disabled) { background: var(--acc); border-color: var(--acc); color: #0a0a0a; }
.rv .modal-body { color: var(--tx); }
.rv .modal-actions-footer { display: flex; gap: 0.75rem; border-top: 2px dotted var(--line); }
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
.rv .delete-title { font-size: 1.25rem; font-weight: 900; margin: 0 0 8px; text-align: center; }
.rv .delete-message { font-size: 0.88rem; color: var(--tx-2); margin: 0 0 12px; text-align: center; line-height: 1.5; }
.rv .reservation-id {
    display: inline-block; background: var(--ink); color: #fff;
    padding: 2px 12px; border-radius: 8px; font-weight: 900;
    font-style: italic; letter-spacing: 0.05em; margin: 4px 0;
}
.rv .delete-actions { display: flex; gap: 0.75rem; padding-top: 8px; }

/* Inline Form */
.rv .inline-form-container {
    position: relative; max-width: 1280px; margin: 1.5rem auto;
    background: var(--surface); border: 1.5px solid var(--line-strong);
    border-radius: 28px; overflow: visible;
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
.rv .inline-form-title h2 { margin: 0; color: #fff; font-size: 1.6rem; font-weight: 900; }
.rv .inline-form-title p { margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; }
.rv .inline-form-close {
    position: absolute; top: 50%; right: 22px; transform: translateY(-50%);
    width: 44px; height: 44px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.35); background: transparent; color: #fff;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.rv .inline-form-close:hover { background: var(--acc); border-color: var(--acc); color: #0a0a0a; }

.rv .steps-progress {
    display: flex; justify-content: space-between; padding: 1.2rem 2rem;
    background: var(--surface-2); border-bottom: 1.5px solid var(--line);
    overflow-x: auto; gap: 0.5rem;
}
.rv .step-indicator { display: flex; flex-direction: column; align-items: center; cursor: pointer; flex: 1; min-width: 60px; position: relative; }
.rv .step-number {
    width: 28px; height: 28px; border-radius: 50%; background: var(--line);
    display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.75rem; margin-bottom: 4px;
}
.rv .step-indicator.active .step-number { background: var(--acc); color: #0a0a0a; }
.rv .step-indicator.completed .step-number { background: #10b981; color: white; }
.rv .step-label { font-size: 0.65rem; color: var(--tx-2); text-align: center; white-space: nowrap; font-weight: 700; }

.rv .inline-form { padding: 28px; }
.rv .inline-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.rv .inline-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; position: relative; }
.rv .inline-field label { font-size: 0.68rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); }
.rv .inline-input, .rv .inline-select, .rv .inline-textarea {
    width: 100%; min-height: 44px; padding: 10px 14px;
    border: 1.5px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--tx);
    font-size: 0.9rem; font-family: inherit;
}
.rv .inline-select {
    appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 38px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23a16207' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
}
.rv .inline-select option { background: var(--surface); color: var(--tx); padding: 8px; }
.rv .inline-textarea { resize: vertical; min-height: 80px; }
.rv .step-content { padding: 1rem 0; }

.rv .inline-form-footer { display: flex; justify-content: flex-end; gap: 14px; padding-top: 22px; border-top: 2px dotted var(--line); margin-top: 24px; flex-wrap: wrap; }
.rv .inline-secondary-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 42px; padding: 0 18px; border-radius: 999px;
    border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
    font-size: 0.8rem; font-weight: 800; cursor: pointer;
}
.rv .inline-primary-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 46px; padding: 0 26px; border-radius: 999px;
    border: 1.5px solid var(--line-strong); background: var(--acc); color: #0a0a0a;
    font-size: 0.9rem; font-weight: 800; cursor: pointer;
}

/* Searchable selects */
.rv .inline-search-section { background: var(--surface-2); border-radius: 16px; padding: 12px; border: 1.5px solid var(--line); position: relative; }
.rv .inline-search-input-wrapper { position: relative; }
.rv .inline-search-input-wrapper svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--tx-3); }
.rv .inline-search-input-wrapper .inline-input { padding-left: 42px; padding-right: 42px; }
.rv .clear-search-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--tx-3); }
.rv .inline-results { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100; max-height: 220px; overflow-y: auto; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }
.rv .inline-result-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; border-bottom: 1.5px dotted var(--line); }
.rv .inline-result-item:hover { background: var(--surface-2); }
.rv .inline-result-avatar { width: 36px; height: 36px; background: var(--ink); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--acc); flex-shrink: 0; }
.rv .inline-result-info { flex: 1; }
.rv .inline-result-info strong { display: block; margin-bottom: 2px; font-size: 0.85rem; }
.rv .inline-result-details { display: flex; gap: 12px; font-size: 0.7rem; color: var(--tx-2); flex-wrap: wrap; }
.rv .inline-selected { background: rgba(234,179,8,0.12); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-top: 10px; border: 1.5px solid var(--acc); }
.rv .inline-selected svg { color: var(--acc-tx); flex-shrink: 0; }
.rv .inline-selected strong { display: block; font-size: 0.7rem; color: var(--acc-tx); }
.rv .inline-selected p { font-size: 0.8rem; font-weight: 700; margin: 0; }
.rv .inline-no-results { padding: 10px; color: var(--tx-3); font-size: 0.8rem; text-align: center; }

/* Main Container Layout */
.rv .ac-wrap { width: 100%; max-width: none; margin: 0; padding: 1.5rem; }
.rv .rv-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.rv .rv-head-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.rv .rv-head-icon {
    width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    display: flex; align-items: center; justify-content: center; color: #fff;
}
.rv .rv-title { margin: 0; font-size: 1.75rem; font-weight: 800; line-height: 1.15; color: var(--tx); }
.rv .rv-sub { margin: 2px 0 0; font-size: 0.85rem; color: var(--tx-2); }
.rv .rv-head-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.rv .ac-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    height: 38px; padding: 0 16px; border-radius: 10px;
    border: 1px solid var(--line); background: var(--surface); color: var(--tx);
    font-size: 0.8rem; font-weight: 600; white-space: nowrap; cursor: pointer;
}
.rv .ac-btn-primary {
    background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; border-color: transparent;
}

.rv .rv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
.rv .rv-stat-card {
    display: flex; align-items: center; gap: 12px; padding: 16px;
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
}
.rv .rv-stat-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rv .rv-stat-blue { background: #dbeafe; color: #2563eb; }
.rv .rv-stat-amber { background: #fef3c7; color: #d97706; }
.rv .rv-stat-orange { background: #ffedd5; color: #ea580c; }
.rv .rv-stat-green { background: #dcfce7; color: #16a34a; }
.rv .rv-stat-label { margin: 0; font-size: 0.72rem; font-weight: 600; color: var(--tx-2); text-transform: uppercase; }
.rv .rv-stat-value { margin: 2px 0 0; font-size: 1.4rem; font-weight: 800; color: var(--tx); }

.rv .ac-filters {
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
    padding: 14px; margin-bottom: 1rem;
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    position: relative; z-index: 30;
}
.rv .ac-search { position: relative; flex: 1; min-width: 240px; }
.rv .ac-search > svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--tx-3); }
.rv .ac-search input {
    width: 100%; height: 38px; padding: 0 38px; border-radius: 10px;
    border: 1px solid var(--line); background: var(--surface-2); color: var(--tx); font-size: 0.8rem;
}
.rv .ac-search-clear {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    width: 20px; height: 20px; border-radius: 50%; border: 0; background: var(--line); color: var(--tx-2);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
}

.rv .filter-indicator {
    display: flex; align-items: center; justify-content: space-between;
    background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px;
    padding: 10px 14px; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;
}
.rv .filter-indicator-text { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: #92400e; }
.rv .clear-filter-btn {
    display: inline-flex; align-items: center; gap: 4px; background: none; border: 1px solid #92400e;
    padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #92400e; cursor: pointer;
}

.rv .ac-meta { display: flex; justify-content: space-between; padding: 0 4px; margin-bottom: 12px; font-size: 0.78rem; color: var(--tx-2); }
.rv .ac-tablecard { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.rv .ac-scroll { overflow-x: auto; }
.rv .ac-table { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 0.82rem; }
.rv .ac-table th { text-align: left; padding: 12px 16px; background: var(--surface-2); color: var(--tx-2); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; }
.rv .ac-table td { padding: 12px 16px; border-top: 1px solid var(--line); color: var(--tx); vertical-align: middle; }
.rv .ac-table tbody tr td:first-child { box-shadow: inset 3px 0 0 transparent; transition: box-shadow 0.15s, background 0.15s; }
.rv .ac-table tbody tr:hover td { background: var(--surface-2); }
.rv .ac-table tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 #eab308; }
.rv .sortable-header { cursor: pointer; user-select: none; }
.rv .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.4; }
.rv .sort-icon.active { opacity: 1; color: var(--acc); }
.rv .ac-id {
    font-family: monospace; font-size: 0.75rem; font-weight: 600;
    background: var(--surface-2); color: var(--tx-2); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--line);
}
.rv .ac-strong { font-weight: 700; }
.rv .ac-empty-cell { text-align: center; padding: 48px 20px !important; color: var(--tx-3) !important; }
.rv .ac-empty-card { text-align: center; padding: 40px 20px; color: var(--tx-3); background: var(--surface); border: 1px dashed var(--line); border-radius: 14px; }

.rv .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
.rv .badge-warning { background: #fef3c7; color: #92400e; }
.rv .badge-purple { background: #f3e8ff; color: #6b21a5; }
.rv .badge-pink { background: #fce7f3; color: #9d174d; }
.rv .badge-indigo { background: #e0e7ff; color: #3730a3; }
.rv .badge-orange { background: #ffedd5; color: #9a3412; }
.rv .badge-rose { background: #ffe4e6; color: #9f1239; }
.rv .badge-yellow { background: #fef3c7; color: #92400e; }
.rv .badge-success { background: #dcfce7; color: #166534; }

.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
.rv .ac-action-btn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; border-radius: 8px; cursor: pointer; }
.rv .ac-action-edit { color: #10b981; }
.rv .ac-action-delete { color: #ef4444; }

.rv .ac-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); }
.rv .ac-card-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
    background: var(--surface-2); cursor: pointer;
}
.rv .ac-card-btn span { font-size: 0.64rem; font-weight: 700; color: var(--tx-2); }
.rv .ac-mcards { display: flex; flex-direction: column; gap: 10px; }
.rv .ac-mcard { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
.rv .ac-mcard-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .ac-mcard-thumb { width: 64px; height: 48px; object-fit: cover; border-radius: 12px; border: 1px solid var(--line); flex-shrink: 0; }
.rv .ac-mcard-thumb-empty { display: flex; align-items: center; justify-content: center; background: var(--surface-2); color: var(--tx-3); }
.rv .ac-mcard-info { flex: 1; min-width: 0; }
.rv .ac-mcard-name { font-weight: 700; font-size: 0.95rem; }
.rv .ac-mcard-sub { margin-top: 3px; }
.rv .ac-mcard-price { font-weight: 800; font-size: 1rem; }
.rv .ac-mcard-price small { font-size: 0.65rem; color: var(--tx-2); }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rv .ac-mcard-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 12px; font-size: 0.75rem; color: var(--tx-2); }
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; }

.rv .ac-sortbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; position: relative; z-index: 20; }
.rv .ac-sortbar label { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); }
.rv .ac-sortbar .ac-dd { flex: 1; min-width: 0; }
.rv .ac-sortdir {
    width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
    border: 1px solid var(--line); background: var(--surface); color: var(--tx);
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}

.rv .ac-dd { position: relative; }
.rv .ac-dd-trigger {
    width: 100%; height: 38px; padding: 0 14px 0 16px;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--tx);
    font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.rv .ac-dd-chevron { flex-shrink: 0; color: var(--acc-tx); transition: transform 0.2s; }
.rv .ac-dd-trigger.open .ac-dd-chevron { transform: rotate(180deg); }
.rv .ac-dd-menu {
    position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 150;
    margin: 0; padding: 6px; list-style: none;
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
    box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.28);
    max-height: 300px; overflow-y: auto;
}
.rv .ac-dd-item {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 11px 12px; border: 0; border-radius: 10px; background: transparent; color: var(--tx);
    font-size: 0.88rem; font-weight: 600; cursor: pointer; text-align: left;
}
.rv .ac-dd-item:hover { background: var(--surface-2); }
.rv .ac-dd-item.active { background: #fef3c7; color: #92400e; font-weight: 700; }

.rv .ac-pager { margin-top: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.rv .loading { text-align: center; padding: 4rem 1rem; color: var(--tx-2); font-weight: 700; }
.rv .spinner {
    display: inline-block; width: 40px; height: 40px; margin-bottom: 12px; border-radius: 50%;
    border: 4px solid var(--line); border-top-color: #eab308; animation: acSpin 0.7s linear infinite;
}
@keyframes acSpin { to { transform: rotate(360deg); } }

.rv .document-preview-modal {
    background: var(--surface); border-radius: 24px; max-width: 95vw; width: 1000px;
    max-height: 95vh; height: 90vh; display: flex; flex-direction: column; overflow: hidden;
}
.rv .document-preview-header {
    display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.5rem;
    border-bottom: 1px solid var(--line); background: var(--surface-2); flex-shrink: 0;
}
.rv .document-preview-title { display: flex; align-items: center; gap: 0.75rem; }
.rv .document-preview-title h2 { font-size: 1.15rem; font-weight: 700; margin: 0; }
.rv .document-preview-actions { display: flex; gap: 0.75rem; align-items: center; }
.rv .document-preview-download {
    display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1.25rem;
    background: var(--ink); color: #fff; border: none; border-radius: 40px; font-weight: 600; cursor: pointer;
}
.rv .document-preview-close { background: var(--line); border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.rv .document-preview-body { flex: 1; padding: 1rem; background: var(--bg); min-height: 0; }

.rv .ac-mobile-only { display: none; }
@media (max-width: 768px) {
    .rv .ac-wrap { padding: 1rem; }
    .rv .rv-head { flex-direction: column; }
    .rv .rv-head-actions { width: 100%; gap: 6px; }
    .rv .rv-head-actions .ac-btn { flex: 1; height: 40px; padding: 0 10px; }
    .rv .btn-text { display: none; }
    .rv .rv-stats { grid-template-columns: repeat(2, 1fr); }
    .rv .ac-filters { flex-direction: column; align-items: stretch; }
    .rv .ac-search { min-width: 100%; }
    .rv .ac-desktop-only { display: none !important; }
    .rv .ac-mobile-only { display: block !important; }
}
    `}</style>
  );
}