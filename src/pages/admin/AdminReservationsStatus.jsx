// src/pages/admin/AdminReservationsStatus.jsx
import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from 'react-redux';
import {
  fetchReservations, fetchCars, fetchMatricules, fetchClients,
  updateReservation, deleteReservation, createReservation,
  checkLateReservations, selectReservations, selectCars,
  selectMatricules, selectClients, selectReservationsLoading,
  selectUser, refreshMatricules, createClient, api,
  fetchSousLocations,
  createSousLocation,
  selectSousLocations,
  selectSousLocationsLoading,
} from "../../Redux/store";
import { syncReportForReservation } from "../../utils/reportSync";
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import { toast } from "sonner";
import {
  Check, X, Eye, Trash2, Search, RefreshCw, ChevronLeft, ChevronRight,
  Printer, FileText, Calendar, User, Car, Clock, AlertCircle, CreditCard,
  Mail, Phone, MapPin, IdCard, Download, Plus, Edit, Info, Save,
  DollarSign, History, Receipt, Users, CalendarDays, UserPlus,
  Image as ImageIcon, FileImage, Trash, Copy, CheckCircle, Gauge,
  Settings, EyeOff, Minus, Shield, Truck, FileCheck, PenTool, Building2,
  CreditCard as CreditCardIcon, CalendarRange, Fuel, Navigation, Upload,
  AlertTriangle, XCircle, Sparkles, Star, Heart, Award, Gem, Tag,Home,Coins,
  Wrench, Key, Briefcase, ArrowUpDown, ArrowUp, ArrowDown,
  MessageCircle, Link2, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, Maximize2, ArrowRight
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import checklistImage from "../../assets/Checklist.png";
import logoImage from "../../assets/logo.png";
import agentSignatureImage from "../../assets/cache.png";
import ContractLocation, { contractToPdf } from "../../components/contract/ContractLocation";

// Statuses handled by this page
const STATUS_PAGE_STATUSES = ["pending", "contacted", "cancelled"];

// ========== HELPER FUNCTIONS ==========
const getUserDisplayName = (user) => {
  if (!user) return "—";
  return user.Fullname || user.fullname || user.name || user.username || "—";
};

const buildReceptionNotesJSON = (reservation, currentUser) => {
  return JSON.stringify({
    livre_par: getUserDisplayName(currentUser),
    receptionne_par: reservation?.created_by || "—"
  });
};

const downloadAndOpenPDF = (doc, filename) => {
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// ==================== ContractDisplayOptions ====================
const ContractDisplayOptions = ({ options, onOptionChange, onResetAll }) => {
  const sections = [
    { id: "prices", label: "Prix et Montants", icon: DollarSign },
    { id: "clientInfo", label: "Informations du Locataire", icon: User },
    { id: "secondDriver", label: "Deuxième Conducteur", icon: Users },
    { id: "vehicleInfo", label: "Informations du Véhicule", icon: Car },
    { id: "deliveryReception", label: "Livraison et Réception", icon: Clock },
    { id: "rentalDates", label: "Dates de Location", icon: Calendar },
    { id: "kilometrage", label: "Kilométrage", icon: Gauge },
    { id: "rentalDays", label: "Nombre de jours", icon: CalendarDays },
    { id: "observations", label: "Observations", icon: Info },
    { id: "insurance", label: "Assurance Supplémentaire", icon: Shield },
    { id: "depositGuarantee", label: "Caution et Garantie", icon: Shield },
    { id: "signatures", label: "Signatures", icon: FileText }
  ];

  const displayModes = [
    { value: "show", label: "Afficher normalement", icon: Eye },
    { value: "hide", label: "Masquer", icon: EyeOff },
    { value: "dash", label: "Remplacer par des traits", icon: Minus }
  ];

  return (
    <div className="display-options-panel">
      <div className="display-options-header">
        <h3><Settings size={16} /> Options d'affichage du contrat</h3>
        <button type="button" onClick={onResetAll} className="reset-all-btn">
          <RefreshCw size={14} /> Réinitialiser toutes les options
        </button>
      </div>
      <div className="display-options-grid">
        {sections.map(section => {
          const IconComponent = section.icon;
          const currentValue = options[section.id] || "show";
          return (
            <div key={section.id} className="display-option-item">
              <div className="display-option-label">
                <IconComponent size={14} />
                <span>{section.label}</span>
              </div>
              <div className="display-option-buttons">
                {displayModes.map(mode => (
                  <button
                    key={mode.value}
                    type="button"
                    className={`mode-btn ${currentValue === mode.value ? "active" : ""}`}
                    onClick={() => onOptionChange(section.id, mode.value)}
                    title={mode.label}
                  >
                    <mode.icon size={12} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ContractLocation (2 pages: recto + verso) lives in components/contract/ContractLocation.jsx

// ==================== SecondDriverSearch ====================
const SecondDriverSearch = ({ clients, selectedClientId, selectedSecondDriverId, onSelect, onCreateNew }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewDriver, setIsNewDriver] = useState(false);
  const dispatch = useDispatch();
  const [newDriverData, setNewDriverData] = useState({
    prenom: "", nom: "", telephone: "", email: "", city: "",
    cin_number: "", driver_license_number: ""
  });
  const [creatingDriver, setCreatingDriver] = useState(false);

  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim() || isNewDriver || !clients || !Array.isArray(clients)) return [];
    const term = searchTerm.toLowerCase().trim();
    return clients
      .filter(client => {
        if (!client || typeof client !== "object") return false;
        if (selectedClientId && client.id === selectedClientId) return false;
        const fullName = `${client.prenom || ""} ${client.nom || ""}`.toLowerCase();
        const email = (client.email || "").toLowerCase();
        const telephone = (client.telephone || "").toLowerCase();
        return fullName.includes(term) || email.includes(term) || telephone.includes(term);
      })
      .slice(0, 10);
  }, [searchTerm, isNewDriver, clients, selectedClientId]);

  const handleSelect = (client) => {
    onSelect(client);
    setSearchTerm("");
    setIsNewDriver(false);
  };

  const handleCreateNew = () => {
    setIsNewDriver(true);
    setNewDriverData({
      prenom: "", nom: "", telephone: "", email: "", city: "",
      cin_number: "", driver_license_number: ""
    });
  };

  const handleCancelNew = () => {
    setIsNewDriver(false);
    setNewDriverData({
      prenom: "", nom: "", telephone: "", email: "", city: "",
      cin_number: "", driver_license_number: ""
    });
  };

  const handleSaveNewDriver = async () => {
    if (!newDriverData.prenom || !newDriverData.nom || !newDriverData.telephone) {
      toast.error("Veuillez remplir les champs obligatoires (Prénom, Nom, Téléphone)");
      return;
    }
    setCreatingDriver(true);
    try {
      const result = await dispatch(createClient(newDriverData)).unwrap();
      const newClient = result.client || result;
      toast.success("Conducteur créé avec succès");
      onSelect(newClient);
      setIsNewDriver(false);
      setSearchTerm("");
      setNewDriverData({
        prenom: "", nom: "", telephone: "", email: "", city: "",
        cin_number: "", driver_license_number: ""
      });
    } catch (error) {
      toast.error("Erreur lors de la création du conducteur");
    } finally {
      setCreatingDriver(false);
    }
  };

  if (isNewDriver) {
    return (
      <div className="inline-new-client" style={{ marginTop: "1rem" }}>
        <div className="inline-section-header" style={{ marginBottom: "1rem" }}>
          <Gem size={18} />
          <h3>Nouveau conducteur</h3>
        </div>
        <div className="inline-grid-2">
          <div className="inline-field">
            <label><User size={14} /> Prénom *</label>
            <input type="text" className="inline-input" value={newDriverData.prenom} onChange={(e) => setNewDriverData(prev => ({ ...prev, prenom: e.target.value }))} required />
          </div>
          <div className="inline-field">
            <label><User size={14} /> Nom *</label>
            <input type="text" className="inline-input" value={newDriverData.nom} onChange={(e) => setNewDriverData(prev => ({ ...prev, nom: e.target.value }))} required />
          </div>
          <div className="inline-field">
            <label><Phone size={14} /> Téléphone *</label>
            <input type="tel" className="inline-input" value={newDriverData.telephone} onChange={(e) => setNewDriverData(prev => ({ ...prev, telephone: e.target.value }))} required />
          </div>
          <div className="inline-field">
            <label><Mail size={14} /> Email</label>
            <input type="email" className="inline-input" value={newDriverData.email} onChange={(e) => setNewDriverData(prev => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="inline-field">
            <label><MapPin size={14} /> Ville</label>
            <input type="text" className="inline-input" value={newDriverData.city} onChange={(e) => setNewDriverData(prev => ({ ...prev, city: e.target.value }))} />
          </div>
          <div className="inline-field">
            <label><IdCard size={14} /> CIN</label>
            <input type="text" className="inline-input" value={newDriverData.cin_number} onChange={(e) => setNewDriverData(prev => ({ ...prev, cin_number: e.target.value }))} />
          </div>
          <div className="inline-field">
            <label><Key size={14} /> Permis</label>
            <input type="text" className="inline-input" value={newDriverData.driver_license_number} onChange={(e) => setNewDriverData(prev => ({ ...prev, driver_license_number: e.target.value }))} />
          </div>
        </div>
        <div className="inline-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="inline-secondary-btn" onClick={handleCancelNew}>Annuler</button>
          <button type="button" className="inline-primary-btn" onClick={handleSaveNewDriver} disabled={creatingDriver}>
            {creatingDriver ? "Création..." : "Créer le conducteur"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-search-section" style={{ marginTop: "0.5rem" }}>
      <div className="inline-search-input-wrapper">
        <Search size={18} />
        <input
          type="text"
          className="inline-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un conducteur par nom, email ou téléphone..."
        />
      </div>
      {filteredDrivers.length > 0 && (
        <div className="inline-results">
          {filteredDrivers.map(driver => (
            <div key={driver.id} className="inline-result-item" onClick={() => handleSelect(driver)}>
              <div className="inline-result-avatar"><User size={20} /></div>
              <div className="inline-result-info">
                <strong>{driver.prenom} {driver.nom}</strong>
                <div className="inline-result-details">
                  <span><Mail size={12} /> {driver.email}</span>
                  <span><Phone size={12} /> {driver.telephone}</span>
                  <span><MapPin size={12} /> {driver.city}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="inline-outline-btn" onClick={handleCreateNew} style={{ marginTop: "0.5rem" }}>
        <UserPlus size={16} /> Créer un nouveau conducteur
      </button>
    </div>
  );
};

// ==================== SousLocationSearch ====================
const SousLocationSearch = ({ sousLocations, selectedId, onSelect, onCreateNew, canCreate = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const list = Array.isArray(sousLocations) ? sousLocations : [];
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(sl => sl.name.toLowerCase().includes(term));
  }, [list, searchTerm]);

  const selected = list.find(sl => sl.id === selectedId);

  return (
    <div className="sous-location-search" ref={wrapperRef}>
      <div className="inline-search-input-wrapper" onClick={() => setIsOpen(true)}>
        <Search size={16} />
        <input
          type="text"
          className="inline-input"
          placeholder="Rechercher une sous‑location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {selected && !searchTerm && (
          <span className="selected-badge">{selected.name}</span>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="inline-results">
          {filtered.map(sl => (
            <div
              key={sl.id}
              className={`inline-result-item ${selectedId === sl.id ? 'active' : ''}`}
              onClick={() => {
                onSelect(sl.id);
                setSearchTerm("");
                setIsOpen(false);
              }}
            >
              <div className="inline-result-avatar"><Tag size={16} /></div>
              <div className="inline-result-info">
                <strong>{sl.name}</strong>
                {sl.description && <div className="inline-result-details">{sl.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && filtered.length === 0 && (
        <div className="inline-empty-state">
          <p>Aucune sous‑location trouvée.</p>
        </div>
      )}

      {canCreate && (
        <button
          type="button"
          className="inline-outline-btn"
          style={{ marginTop: '0.5rem' }}
          onClick={onCreateNew}
        >
          <Plus size={14} /> Créer une sous‑location
        </button>
      )}
    </div>
  );
};

// ==================== ReservationForm ====================
const ReservationForm = ({
  isOpen, onClose, onSubmit, onSubmitAndNavigate, editingReservation, clients, cars, matricules, submitting
}) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const myPermissions = useSelector(state => state.permissions?.myPermissions || []);
  const canCreateSousLocation = user && (
    user.role === 'admin' ||
    user.role === 'superadmin' ||
    (Array.isArray(myPermissions) && myPermissions.includes('sous-locations'))
  );

  const sousLocations = useSelector(selectSousLocations);

  const [formData, setFormData] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    start_time: "08:00",
    end_time: "18:00",
    rental_days: 1,
    total_price: 0,
    amount_paid: 0,
    remaining_amount: 0,
    status: "pending",
    car_id: "",
    client_id: "",
    matricule_id: "",
    has_second_driver: false,
    second_driver_client_id: "",
    notes: "",
    reception_notes: "",
    kilometrage_sortie: "",
    kilometrage_entree: "",
    sous_location_id: "",
    can_extend_days: false,
    prolongation_days: 0,
  });

  const [dailyRate, setDailyRate] = useState(0);

  const [clientSearch, setClientSearch] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [carMatricules, setCarMatricules] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [newPayment, setNewPayment] = useState({
    amount: "", date: new Date().toISOString().split("T")[0],
    method: "cash", notes: ""
  });
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [matriculeSearch, setMatriculeSearch] = useState("");
  const [selectedMatricule, setSelectedMatricule] = useState(null);
  const [filteredMatricules, setFilteredMatricules] = useState([]);
  const [newClientData, setNewClientData] = useState({
    prenom: "", nom: "", telephone: "", email: "", city: "",
    cin_number: "", driver_license_number: "", date_naissance: "",
    lieu_naissance: "", cin_delivre_le: "", permis_delivre_le: ""
  });

  const [manualTotalPrice, setManualTotalPrice] = useState("");
  const [showCreateSousLocationModal, setShowCreateSousLocationModal] = useState(false);
  const [newSousLocationName, setNewSousLocationName] = useState('');
  const [newSousLocationDesc, setNewSousLocationDesc] = useState('');

  const totalDays = (parseInt(formData.rental_days, 10) || 0) +
    (formData.can_extend_days ? (parseInt(formData.prolongation_days, 10) || 0) : 0);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim() || isNewClient || !clients || !Array.isArray(clients)) return [];
    const searchTerm = clientSearch.toLowerCase().trim();
    return clients
      .filter(client => {
        if (!client || typeof client !== "object") return false;
        const fullName = `${client.prenom || ""} ${client.nom || ""}`.toLowerCase();
        const email = (client.email || "").toLowerCase();
        const telephone = (client.telephone || "").toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm) || telephone.includes(searchTerm);
      })
      .slice(0, 10);
  }, [clientSearch, isNewClient, clients]);

  useEffect(() => {
    if (!matriculeSearch.trim() || !matricules || !Array.isArray(matricules)) {
      setFilteredMatricules([]);
      return;
    }
    const searchTerm = matriculeSearch.toLowerCase().trim();
    const filtered = matricules
      .filter(mat => {
        if (!mat || typeof mat !== "object") return false;
        if (mat.status === 'sold') return false;
        const matriculeCode = (mat.matricule_code || "").toLowerCase();
        return matriculeCode.includes(searchTerm);
      })
      .slice(0, 10);
    setFilteredMatricules(filtered);
  }, [matriculeSearch, matricules]);

  // 🔒 FIX : chargement défensif de la réservation en édition
  useEffect(() => {
    if (editingReservation) {
      const computeRentalDays = (start, end) => {
        if (!start || !end) return 1;
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 1;
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < startDate) return 1;
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 0 ? 1 : diffDays;
      };

      const rawRentalDays =
        editingReservation.rental_days || editingReservation.total_days;

      const computedFromDates =
        editingReservation.start_date && editingReservation.end_date
          ? computeRentalDays(editingReservation.start_date, editingReservation.end_date)
          : 1;

      const totalDays =
        (typeof rawRentalDays === 'number' && rawRentalDays > 0)
          ? rawRentalDays
          : computedFromDates;

      const prolongation = editingReservation.prolongation_days || 0;
      const baseDays = editingReservation.can_extend_days
        ? Math.max(totalDays - prolongation, 1)
        : Math.max(totalDays, 1);

      setFormData({
        start_date: editingReservation.start_date?.split("T")[0] || "",
        end_date: editingReservation.end_date?.split("T")[0] || "",
        start_time: editingReservation.start_time || "08:00",
        end_time: editingReservation.end_time || "18:00",
        rental_days: baseDays,
        total_price: editingReservation.total_price || 0,
        amount_paid: editingReservation.amount_paid || 0,
        remaining_amount: editingReservation.remaining_amount || 0,
        status: editingReservation.status || "pending",
        car_id: editingReservation.car_id || "",
        client_id: editingReservation.client_id || "",
        matricule_id: editingReservation.matricule_id || "",
        has_second_driver: editingReservation.has_second_driver || false,
        second_driver_client_id: editingReservation.second_driver_client_id || "",
        notes: editingReservation.notes || "",
        reception_notes: editingReservation.reception_notes || "",
        kilometrage_sortie: editingReservation.kilometrage_sortie || "",
        kilometrage_entree: editingReservation.kilometrage_entree || "",
        sous_location_id: editingReservation.sous_location_id || "",
        can_extend_days: editingReservation.can_extend_days || false,
        prolongation_days: editingReservation.prolongation_days || 0,
      });

      if (totalDays > 0) {
        setDailyRate(editingReservation.total_price / totalDays);
      } else {
        setDailyRate(0);
      }

      setPaymentHistory(
        Array.isArray(editingReservation.payment_history)
          ? editingReservation.payment_history
          : []
      );
      if (editingReservation.client_id) {
        const client = clients.find((c) => c.id === editingReservation.client_id);
        if (client) {
          setSelectedClient(client);
          setClientSearch(`${client.prenom} ${client.nom}`);
        }
      }
      if (editingReservation.matricule_id) {
        const matricule = matricules.find((m) => m.id === editingReservation.matricule_id);
        if (matricule) {
          setSelectedMatricule(matricule);
          setMatriculeSearch(matricule.matricule_code);
          if (matricule.car_id) {
            setFormData((prev) => ({ ...prev, car_id: matricule.car_id }));
          }
        }
      }
    }
  }, [editingReservation, clients, matricules]);

  useEffect(() => {
    if (formData.car_id) {
      const filtered = matricules.filter(m => m.car_id == formData.car_id);
      setCarMatricules(filtered);
    } else {
      setCarMatricules([]);
    }
  }, [formData.car_id, matricules]);

  useEffect(() => {
    if (formData.matricule_id) {
      const selectedMatriculeObj = matricules.find(m => m.id == formData.matricule_id);
      if (selectedMatriculeObj && (!formData.kilometrage_sortie || formData.kilometrage_sortie === "")) {
        setFormData(prev => ({ ...prev, kilometrage_sortie: selectedMatriculeObj.kilometrage }));
      }
    }
  }, [formData.matricule_id, matricules]);

  useEffect(() => {
    if (formData.car_id && dailyRate === 0 && totalDays > 0) {
      const car = cars.find(c => c.id == formData.car_id);
      if (car) {
        setDailyRate(car.price_per_day);
        setFormData(prev => ({ ...prev, total_price: car.price_per_day * totalDays }));
      }
    }
  }, [formData.car_id, cars, dailyRate, totalDays]);

  useEffect(() => {
    if (dailyRate > 0 && totalDays > 0) {
      setFormData(prev => ({ ...prev, total_price: dailyRate * totalDays }));
    }
  }, [dailyRate, totalDays]);

  const isFirstRender = useRef(true);

  // 🔒 FIX : ne jamais écraser end_date avec une date < start_date
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (editingReservation) {
      return;
    }
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    if (formData.status === 'confirmed') {
      setFormData(prev => ({ ...prev, start_time: currentTime }));
    }
    if (formData.status === 'completed') {
      setFormData(prev => {
        const startDate = prev.start_date;
        const nextEndDate = (startDate && currentDate < startDate)
          ? (prev.end_date || startDate)
          : currentDate;
        return {
          ...prev,
          end_date: nextEndDate,
          end_time: currentTime
        };
      });
    }
  }, [formData.status, editingReservation]);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSousLocations());
    }
  }, [isOpen, dispatch]);

  const computeTotalDaysFor = (rentalDaysVal, prolongationVal, canExtend) => {
    const base = parseInt(rentalDaysVal, 10) || 0;
    const prolongation = canExtend ? (parseInt(prolongationVal, 10) || 0) : 0;
    return base + prolongation;
  };

  const handleStartDateChange = (value) => {
    setFormData(prev => {
      const days = computeTotalDaysFor(prev.rental_days, prev.prolongation_days, prev.can_extend_days);
      if (!value || days <= 0) return { ...prev, start_date: value };
      const start = new Date(value);
      const end = new Date(start);
      end.setDate(start.getDate() + days);
      return { ...prev, start_date: value, end_date: end.toISOString().split("T")[0] };
    });
  };

  // 🔒 FIX : si end < start, forcer 1 jour minimum
  const handleEndDateChange = (value) => {
    setFormData(prev => {
      if (!prev.start_date || !value) return { ...prev, end_date: value };
      const start = new Date(prev.start_date);
      const end = new Date(value);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { ...prev, end_date: value };
      }
      const diffTime = Math.max(end - start, 0);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const totalSpan = diffDays === 0 ? 1 : diffDays;
      const prolongation = prev.can_extend_days ? (parseInt(prev.prolongation_days, 10) || 0) : 0;
      const baseDays = Math.max(totalSpan - prolongation, 1);
      return { ...prev, end_date: value, rental_days: baseDays };
    });
  };

  const handleRentalDaysChange = (value) => {
    if (value === '') {
      setFormData(prev => ({ ...prev, rental_days: null }));
      return;
    }
    const days = parseInt(value, 10);
    if (!isNaN(days) && days >= 1) {
      setFormData(prev => {
        const totalDaysNow = computeTotalDaysFor(days, prev.prolongation_days, prev.can_extend_days);
        if (!prev.start_date || totalDaysNow <= 0) {
          return { ...prev, rental_days: days };
        }
        const start = new Date(prev.start_date);
        const end = new Date(start);
        end.setDate(start.getDate() + totalDaysNow);
        return { ...prev, rental_days: days, end_date: end.toISOString().split('T')[0] };
      });
    }
  };

  const handleProlongationToggle = (checked) => {
    setFormData(prev => {
      const nextProlongation = checked ? (prev.prolongation_days || 1) : 0;
      const next = { ...prev, can_extend_days: checked, prolongation_days: nextProlongation };
      if (prev.start_date) {
        const totalDaysNow = computeTotalDaysFor(prev.rental_days, nextProlongation, checked);
        const start = new Date(prev.start_date);
        const end = new Date(start);
        end.setDate(start.getDate() + totalDaysNow);
        next.end_date = end.toISOString().split('T')[0];
      }
      return next;
    });
  };

  const handleProlongationDaysChange = (value) => {
    const val = parseInt(value, 10);
    const safeVal = val > 0 ? val : 1;
    setFormData(prev => {
      const next = { ...prev, prolongation_days: safeVal };
      if (prev.start_date && prev.can_extend_days) {
        const totalDaysNow = computeTotalDaysFor(prev.rental_days, safeVal, true);
        const start = new Date(prev.start_date);
        const end = new Date(start);
        end.setDate(start.getDate() + totalDaysNow);
        next.end_date = end.toISOString().split('T')[0];
      }
      return next;
    });
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setIsNewClient(false);
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setClientSearch(`${client.prenom} ${client.nom}`);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setIsNewClient(true);
    setFormData(prev => ({ ...prev, client_id: "" }));
    setClientSearch("");
    setNewClientData({
      prenom: "", nom: "", telephone: "", email: "", city: "",
      cin_number: "", driver_license_number: "", date_naissance: "",
      lieu_naissance: "", cin_delivre_le: "", permis_delivre_le: ""
    });
  };

  const handleSaveNewClient = async () => {
    if (!newClientData.prenom || !newClientData.nom || !newClientData.telephone) {
      toast.error("Veuillez remplir les champs obligatoires du client (Prénom, Nom, Téléphone)");
      return;
    }
    setCreatingClient(true);
    try {
      const result = await dispatch(createClient(newClientData)).unwrap();
      const newClient = result.client || result;
      toast.success("Client créé avec succès");
      handleClientSelect(newClient);
      setIsNewClient(false);
      setNewClientData({
        prenom: "", nom: "", telephone: "", email: "", city: "",
        cin_number: "", driver_license_number: "", date_naissance: "",
        lieu_naissance: "", cin_delivre_le: "", permis_delivre_le: ""
      });
    } catch (error) {
      toast.error("Erreur lors de la création du client");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleMatriculeSelect = (matricule) => {
    setSelectedMatricule(matricule);
    setMatriculeSearch(matricule.matricule_code);
    setFormData(prev => ({
      ...prev,
      matricule_id: matricule.id,
      car_id: matricule.car_id,
      kilometrage_sortie: matricule.kilometrage || ""
    }));
    const associatedCar = cars.find(c => c.id == matricule.car_id);
    if (associatedCar) {
      toast.success(`Véhicule sélectionné: ${associatedCar.brand} ${associatedCar.model}`);
    }
    setFilteredMatricules([]);
  };

  const handleAddPayment = () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }
    const amount = parseFloat(newPayment.amount);
    const currentTotalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    const maxPossible = (formData.total_price || 0) - currentTotalPaid;

    if (maxPossible <= 0) {
      toast.error("Cette réservation est déjà entièrement payée.");
      return;
    }

    let actualAmount = amount;
    if (actualAmount > maxPossible) {
      actualAmount = maxPossible;
      toast.info(`Le paiement a été ajusté à ${actualAmount} DH (reste à payer).`);
    }

    const payment = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: actualAmount,
      date: newPayment.date,
      method: newPayment.method,
      notes: newPayment.notes || "",
      created_at: new Date().toISOString()
    };

    const updatedHistory = [...paymentHistory, payment];
    setPaymentHistory(updatedHistory);
    const newAmountPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = (formData.total_price || 0) - newAmountPaid;

    setFormData(prev => ({
      ...prev,
      amount_paid: newAmountPaid,
      remaining_amount: newRemaining
    }));

    setNewPayment({ amount: "", date: new Date().toISOString().split("T")[0], method: "cash", notes: "" });
    setShowAddPayment(false);
    toast.success("Paiement ajouté");
  };

  const handleRemovePayment = (paymentId) => {
    const updatedHistory = paymentHistory.filter(p => p.id !== paymentId);
    setPaymentHistory(updatedHistory);
    const newAmountPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = (formData.total_price || 0) - newAmountPaid;
    setFormData(prev => ({
      ...prev,
      amount_paid: newAmountPaid,
      remaining_amount: newRemaining
    }));
    toast.success("Paiement supprimé");
  };

  const handleRecalculateTotal = () => {
    const car = cars.find(c => c.id == formData.car_id);
    if (!car) {
      toast.warning("Veuillez d'abord sélectionner un véhicule.");
      return;
    }
    if (totalDays <= 0) {
      toast.warning("Le nombre de jours doit être supérieur à 0.");
      return;
    }
    setDailyRate(car.price_per_day);
    setFormData(prev => ({ ...prev, total_price: car.price_per_day * totalDays }));
  };

  const handleApplyManualTotal = () => {
    const dailyPrice = parseFloat(manualTotalPrice);
    if (isNaN(dailyPrice) || dailyPrice <= 0) {
      toast.warning("Veuillez entrer un prix journalier valide.");
      return;
    }
    if (totalDays > 0) {
      const newTotal = dailyPrice * totalDays;
      setFormData(prev => ({ ...prev, total_price: newTotal }));
      setDailyRate(dailyPrice);
      toast.success(`Prix total calculé : ${newTotal} DH (${dailyPrice} DH/jour × ${totalDays} jours)`);
    } else {
      toast.warning("Le nombre de jours doit être supérieur à 0.");
    }
  };

  // 🔒 FIX : garantir rental_days >= 1 à la soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    let clientId = formData.client_id;
    if (isNewClient && !clientId) {
      toast.error("Veuillez confirmer la création du client en cliquant sur 'Confirmer la création'");
      return;
    }
    if (!clientId) {
      toast.error("Veuillez sélectionner ou créer un client");
      return;
    }
    const safeTotalDays = (Number(totalDays) > 0) ? Number(totalDays) : 1;
    const reservationData = {
      ...formData,
      rental_days: safeTotalDays,
      client_id: clientId,
      payment_history: paymentHistory
    };
    onSubmit(reservationData);
  };

  const handleSubmitAndNavigate = (e) => {
    e.preventDefault();
    let clientId = formData.client_id;
    if (isNewClient && !clientId) {
      toast.error("Veuillez confirmer la création du client en cliquant sur 'Confirmer la création'");
      return;
    }
    if (!clientId) {
      toast.error("Veuillez sélectionner ou créer un client");
      return;
    }
    const safeTotalDays = (Number(totalDays) > 0) ? Number(totalDays) : 1;
    const reservationData = {
      ...formData,
      rental_days: safeTotalDays,
      client_id: clientId,
      payment_history: paymentHistory
    };
    if (onSubmitAndNavigate) {
      onSubmitAndNavigate(reservationData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="inline-form-container">
      <div className="inline-form-header">
        <div className="inline-form-icon">{editingReservation ? <Sparkles size={28} /> : <Star size={28} />}</div>
        <div className="inline-form-title">
          <h2>{editingReservation ? "Modifier la réservation" : "Nouvelle réservation"}</h2>
          <p>{editingReservation ? "Modifiez les détails de la réservation" : "Créez une nouvelle réservation en quelques clics"}</p>
        </div>
        <button onClick={onClose} className="inline-form-close"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit} className="inline-form">
        <div className="inline-form-grid">
          <div className="inline-form-col">
            <div className="inline-section">
              <div className="inline-section-header"><User size={18} /><h3>Client</h3></div>
              {!isNewClient ? (
                <>
                  <div className="inline-search-section">
                    <div className="inline-search-input-wrapper">
                      <Search size={18} />
                      <input type="text" className="inline-input" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Rechercher un client existant..." />
                    </div>
                    {filteredClients.length > 0 && (
                      <div className="inline-results">
                        {filteredClients.map(client => (
                          <div key={client.id} className="inline-result-item" onClick={() => handleClientSelect(client)}>
                            <div className="inline-result-avatar"><User size={20} /></div>
                            <div className="inline-result-info">
                              <strong>{client.prenom} {client.nom}</strong>
                              <div className="inline-result-details">
                                <span><Mail size={12} /> {client.email}</span>
                                <span><Phone size={12} /> {client.telephone}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" className="inline-outline-btn" onClick={handleNewClient}>
                      <UserPlus size={16} /> Créer un nouveau client
                    </button>
                  </div>
                  {selectedClient && (
                    <div className="inline-selected">
                      <CheckCircle size={20} />
                      <div>
                        <strong>Client sélectionné</strong>
                        <p>{selectedClient.prenom} {selectedClient.nom} - {selectedClient.telephone}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="inline-new-client">
                  <div className="inline-grid-2">
                    <div className="inline-field"><label>Prénom *</label><input type="text" className="inline-input" value={newClientData.prenom} onChange={(e) => setNewClientData(prev => ({ ...prev, prenom: e.target.value }))} required /></div>
                    <div className="inline-field"><label>Nom *</label><input type="text" className="inline-input" value={newClientData.nom} onChange={(e) => setNewClientData(prev => ({ ...prev, nom: e.target.value }))} required /></div>
                    <div className="inline-field"><label>Téléphone *</label><input type="tel" className="inline-input" value={newClientData.telephone} onChange={(e) => setNewClientData(prev => ({ ...prev, telephone: e.target.value }))} required /></div>
                    <div className="inline-field"><label>Email</label><input type="email" className="inline-input" value={newClientData.email} onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))} /></div>
                    <div className="inline-field"><label>Ville</label><input type="text" className="inline-input" value={newClientData.city} onChange={(e) => setNewClientData(prev => ({ ...prev, city: e.target.value }))} /></div>
                    <div className="inline-field"><label>CIN</label><input type="text" className="inline-input" value={newClientData.cin_number} onChange={(e) => setNewClientData(prev => ({ ...prev, cin_number: e.target.value }))} /></div>
                    <div className="inline-field"><label>Permis</label><input type="text" className="inline-input" value={newClientData.driver_license_number} onChange={(e) => setNewClientData(prev => ({ ...prev, driver_license_number: e.target.value }))} /></div>
                    <div className="inline-field"><label>Date naissance</label><input type="date" className="inline-input" value={newClientData.date_naissance} onChange={(e) => setNewClientData(prev => ({ ...prev, date_naissance: e.target.value }))} /></div>
                    <div className="inline-field"><label>Lieu naissance</label><input type="text" className="inline-input" value={newClientData.lieu_naissance} onChange={(e) => setNewClientData(prev => ({ ...prev, lieu_naissance: e.target.value }))} /></div>
                    <div className="inline-field"><label>CIN délivré le</label><input type="date" className="inline-input" value={newClientData.cin_delivre_le} onChange={(e) => setNewClientData(prev => ({ ...prev, cin_delivre_le: e.target.value }))} /></div>
                    <div className="inline-field"><label>Permis délivré le</label><input type="date" className="inline-input" value={newClientData.permis_delivre_le} onChange={(e) => setNewClientData(prev => ({ ...prev, permis_delivre_le: e.target.value }))} /></div>
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="inline-secondary-btn" onClick={() => setIsNewClient(false)}>Annuler</button>
                    <button type="button" className="inline-primary-btn" onClick={handleSaveNewClient} disabled={creatingClient}>
                      {creatingClient ? "Création..." : "Confirmer la création"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><Users size={18} /><h3>Deuxième conducteur</h3></div>
              <label className="inline-checkbox">
                <input type="checkbox" checked={formData.has_second_driver} onChange={(e) => setFormData(prev => ({ ...prev, has_second_driver: e.target.checked, second_driver_client_id: "" }))} />
                <span>Ajouter un deuxième conducteur</span>
              </label>
              {formData.has_second_driver && (
                <SecondDriverSearch
                  clients={clients}
                  selectedClientId={formData.client_id}
                  selectedSecondDriverId={formData.second_driver_client_id}
                  onSelect={(client) => setFormData(prev => ({ ...prev, second_driver_client_id: client.id }))}
                  onCreateNew={() => {}}
                />
              )}
              {formData.second_driver_client_id && (
                <div className="inline-selected">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Deuxième conducteur sélectionné</strong>
                    <p>
                      {(() => {
                        const secondDriver = clients.find(c => c.id === parseInt(formData.second_driver_client_id));
                        return secondDriver ? `${secondDriver.prenom} ${secondDriver.nom} - ${secondDriver.telephone}` : "—";
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><Calendar size={18} /><h3>Dates et durée</h3></div>
              <div className="inline-grid-2">
                <div className="inline-field"><label>Date de début *</label><input type="date" className="inline-input" value={formData.start_date} onChange={(e) => handleStartDateChange(e.target.value)} required /></div>
                <div className="inline-field"><label>Heure de début</label><input type="time" className="inline-input" value={formData.start_time} onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))} /></div>
                <div className="inline-field"><label>Date de fin *</label><input type="date" className="inline-input" value={formData.end_date} min={formData.start_date || ''} onChange={(e) => handleEndDateChange(e.target.value)} required /></div>
                <div className="inline-field"><label>Heure de fin</label><input type="time" className="inline-input" value={formData.end_time} onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))} /></div>
                <div className="inline-field"><label>Nombre de jours</label><input
                  type="number"
                  className="inline-input"
                  value={formData.rental_days ?? ''}
                  onChange={(e) => handleRentalDaysChange(e.target.value)}
                  min="1"
                /></div>
              </div>
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><Tag size={18} /><h3>Sous‑location & prolongation</h3></div>
              <div className="inline-grid-2">
                <div className="inline-field">
                  <label>Sous‑location</label>
                  <SousLocationSearch
                    sousLocations={sousLocations}
                    selectedId={formData.sous_location_id}
                    onSelect={(id) => setFormData({ ...formData, sous_location_id: id })}
                    onCreateNew={() => setShowCreateSousLocationModal(true)}
                    canCreate={canCreateSousLocation}
                  />
                </div>
                <div className="inline-field">
                  <label>Prolongation autorisée</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <label className="inline-checkbox" style={{ marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.can_extend_days || false}
                        onChange={(e) => handleProlongationToggle(e.target.checked)}
                      />
                      <span>Le client pourra prolonger la location</span>
                    </label>
                    {formData.can_extend_days && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#475569' }}>Jours à ajouter :</label>
                        <input
                          type="number"
                          className="inline-input"
                          style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                          value={formData.prolongation_days || 1}
                          onChange={(e) => handleProlongationDaysChange(e.target.value)}
                          min="1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="inline-form-col">
            <div className="inline-section">
              <div className="inline-section-header"><Car size={18} /><h3>Véhicule</h3></div>
              <div className="inline-search-section">
                <div className="inline-search-input-wrapper">
                  <Search size={18} />
                  <input type="text" className="inline-input" value={matriculeSearch} onChange={(e) => setMatriculeSearch(e.target.value)} placeholder="Rechercher par immatriculation..." />
                </div>
                {filteredMatricules.length > 0 && (
                  <div className="inline-results">
                    {filteredMatricules.map(mat => {
                      const carForMat = cars.find(c => c.id == mat.car_id);
                      return (
                        <div key={mat.id} className="inline-result-item" onClick={() => handleMatriculeSelect(mat)}>
                          <div className="inline-result-avatar"><Car size={20} /></div>
                          <div className="inline-result-info">
                            <strong className="inline-matricule-code">{mat.matricule_code}</strong>
                            {carForMat && (
                              <div className="inline-result-details">
                                <span>{carForMat.brand} {carForMat.model}</span>
                                <span>{carForMat.price_per_day} DH/jour</span>
                                <span>{mat.kilometrage} km</span>
                                <span className={`badge ${mat.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                  {mat.status === 'active' ? 'Actif' : 'Inactif'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedMatricule && (
                <div className="inline-selected">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Matricule sélectionné</strong>
                    <p>
                      {selectedMatricule.matricule_code} - Kilométrage: {selectedMatricule.kilometrage} km
                      <span className={`badge ${selectedMatricule.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: '8px' }}>
                        {selectedMatricule.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              <div className="inline-grid-2">
                <div className="inline-field">
                  <label>Véhicule *</label>
                  <select className="inline-select" value={formData.car_id} onChange={(e) => setFormData(prev => ({ ...prev, car_id: e.target.value, matricule_id: "" }))} required disabled={!!selectedMatricule}>
                    <option value="">Choisir un véhicule</option>
                    {cars.map(car => (
                      <option key={car.id} value={car.id}>
                        {car.brand} {car.model} - {car.price_per_day} DH/jour
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inline-field">
                  <label>Matricule</label>
                  <select className="inline-select" value={formData.matricule_id} onChange={(e) => setFormData(prev => ({ ...prev, matricule_id: e.target.value }))} disabled={!!selectedMatricule}>
                    <option value="">Choisir un matricule</option>
                    {carMatricules.map(mat => (
                      <option key={mat.id} value={mat.id}>
                        {mat.matricule_code} - {mat.kilometrage} km
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inline-field">
                  <label>Km départ</label>
                  <input type="number" className="inline-input" value={formData.kilometrage_sortie} onChange={(e) => setFormData(prev => ({ ...prev, kilometrage_sortie: e.target.value }))} placeholder="Kilométrage de sortie" />
                </div>
                <div className="inline-field">
                  <label>Km retour</label>
                  <input type="number" className="inline-input" value={formData.kilometrage_entree} onChange={(e) => setFormData(prev => ({ ...prev, kilometrage_entree: e.target.value }))} placeholder="Kilométrage de retour" />
                </div>
              </div>
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><DollarSign size={18} /><h3>Paiement et statut</h3></div>
              <div className="inline-grid-2">
                <div className="inline-field">
                  <label>Prix total personnalisé (DH)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.01"
                      className="inline-input"
                      value={manualTotalPrice}
                      onChange={(e) => setManualTotalPrice(e.target.value)}
                      placeholder="Saisir un montant total"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="inline-secondary-btn"
                      onClick={handleApplyManualTotal}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="Appliquer ce montant directement comme prix total"
                    >
                      <Check size={14} /> Appliquer
                    </button>
                  </div>
                </div>
                <div className="inline-field">
                  <label>Prix total (DH) *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.01"
                      className="inline-input"
                      placeholder="prix total"
                      value={formData.total_price||''}
                      onChange={(e) => {
                        const newTotal = parseFloat(e.target.value) || 0;
                        if (totalDays > 0) {
                          setDailyRate(newTotal / totalDays);
                        }
                        setFormData(prev => ({ ...prev, total_price: newTotal }));
                      }}
                      required
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="inline-secondary-btn"
                      onClick={handleRecalculateTotal}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="Recalculer le total à partir du prix journalier du véhicule"
                      disabled={!formData.car_id}
                    >
                      <RefreshCw size={14} /> Recalculer
                    </button>
                  </div>
                </div>
                <div className="inline-field"><label>Montant payé (DH)</label><input type="number" step="0.01" className="inline-input" value={formData.amount_paid} readOnly style={{ backgroundColor: "#f3f4f6" }} /></div>
                <div className="inline-field"><label>Reste à payer (DH)</label><input type="number" step="0.01" className="inline-input" value={formData.remaining_amount} readOnly style={{ backgroundColor: "#f3f4f6" }} /></div>
                <div className="inline-field"><label>Statut</label>
                  <select className="inline-select" value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmée</option>
                    <option value="contacted">Contacté</option>
                    <option value="completed">Terminée</option>
                    <option value="retard">En retard</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>
              <div className="inline-payment-section">
                <button type="button" className="inline-add-payment" onClick={() => setShowAddPayment(!showAddPayment)}>
                  <Plus size={16} /> Ajouter un paiement
                </button>
                {showAddPayment && (
                  <div className="inline-payment-form">
                    <div className="inline-grid-2">
                      <div className="inline-field"><label>Montant</label><input type="number" step="0.01" className="inline-input" value={newPayment.amount} onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))} /></div>
                      <div className="inline-field"><label>Date</label><input type="date" className="inline-input" value={newPayment.date} onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))} /></div>
                      <div className="inline-field"><label>Méthode</label><select className="inline-select" value={newPayment.method} onChange={(e) => setNewPayment(prev => ({ ...prev, method: e.target.value }))}><option value="cash">Espèces</option><option value="card">Carte</option><option value="check">Chèque</option><option value="transfer">Virement</option></select></div>
                      <div className="inline-field"><label>Notes</label><input type="text" className="inline-input" value={newPayment.notes} onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))} /></div>
                    </div>
                    <div className="inline-actions">
                      <button type="button" className="inline-secondary-btn" onClick={() => setShowAddPayment(false)}>Annuler</button>
                      <button type="button" className="inline-primary-btn" onClick={handleAddPayment}>Ajouter</button>
                    </div>
                  </div>
                )}
                {paymentHistory.length > 0 && (
                  <div className="inline-history">
                    <h4><History size={14} /> Historique des paiements ({paymentHistory.length})</h4>
                    {paymentHistory.map(payment => (
                      <div key={payment.id} className="inline-history-item">
                        <div className="inline-history-info">
                          <span className="inline-history-date">{new Date(payment.date).toLocaleDateString("fr-FR")}</span>
                          <span className="inline-history-method">{payment.method === "cash" ? "Espèces" : payment.method === "card" ? "Carte" : payment.method === "check" ? "Chèque" : "Virement"}</span>
                          <span className="inline-history-amount">{payment.amount} DH</span>
                          <span className="inline-history-notes">{payment.notes || "-"}</span>
                        </div>
                        <button type="button" className="inline-history-delete" onClick={() => handleRemovePayment(payment.id)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><Info size={18} /><h3>Notes</h3></div>
              <div className="inline-field">
                <textarea className="inline-textarea" rows="3" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes supplémentaires..." />
              </div>
            </div>
          </div>
        </div>

        {showCreateSousLocationModal && (
          <div className="modal-overlay" onClick={() => setShowCreateSousLocationModal(false)}>
            <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  <Plus size={20} style={{ color: '#eab308' }} /> Nouvelle sous‑location
                </h2>
                <button onClick={() => setShowCreateSousLocationModal(false)} className="modal-close">
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>Nom *</label>
                  <input
                    type="text"
                    className="inline-input"
                    value={newSousLocationName}
                    onChange={(e) => setNewSousLocationName(e.target.value)}
                    placeholder="Ex: Location groupe"
                    style={{ width: '100%', padding: '0.75rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>Description</label>
                  <textarea
                    className="inline-textarea"
                    rows="3"
                    value={newSousLocationDesc}
                    onChange={(e) => setNewSousLocationDesc(e.target.value)}
                    placeholder="Description facultative"
                    style={{ width: '100%', padding: '0.75rem' }}
                  />
                </div>
              </div>
              <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreateSousLocationModal(false)} className="btn btn-secondary" type="button">
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    if (!newSousLocationName.trim()) {
                      toast.error('Le nom est obligatoire');
                      return;
                    }
                    try {
                      const result = await dispatch(createSousLocation({
                        name: newSousLocationName,
                        description: newSousLocationDesc
                      })).unwrap();
                      setFormData({ ...formData, sous_location_id: result.id });
                      setShowCreateSousLocationModal(false);
                      setNewSousLocationName('');
                      setNewSousLocationDesc('');
                      toast.success('Sous‑location créée');
                      dispatch(fetchSousLocations());
                    } catch (err) {
                      toast.error(err.message || 'Erreur');
                    }
                  }}
                  className="btn btn-primary"
                  type="button"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="inline-form-footer">
          <button type="button" className="inline-secondary-btn" onClick={onClose}>Annuler</button>
          <button type="submit" className="inline-primary-btn" disabled={submitting}>
            {submitting ? "Traitement..." : (editingReservation ? "Mettre à jour" : "Créer la réservation")}
          </button>
          {onSubmitAndNavigate && (
            <button
              type="button"
              className="inline-primary-btn"
              onClick={handleSubmitAndNavigate}
              disabled={submitting}
              style={{
                background: '#3b82f6',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              {submitting ? "Traitement..." : (editingReservation ? "Mettre à jour & Contrat" : "Créer & Contrat")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// ==================== ContractViewPage ====================
// ========== RESPONSIVE HELPERS ==========
const useMediaQuery = (query) => {
  const getMatch = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);

  return matches;
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

// ========== CUSTOM FILTER CONTROLS (styled dropdown + date popover) ==========
const useClickAway = (ref, onAway, active) => {
  useEffect(() => {
    if (!active) return;
    const handler = (ev) => {
      if (ev.type === "keydown") { if (ev.key === "Escape") onAway(); return; }
      if (ref.current && !ref.current.contains(ev.target)) onAway();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
};

const RvSelect = ({ value, onChange, options, ariaLabel, id, className = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickAway(ref, () => setOpen(false), open);
  const current = options.find(o => String(o.value) === String(value)) || options[0];
  return (
    <div className={`rv-dd ${className}`} ref={ref}>
      <button
        type="button"
        id={id}
        className={`rv-select rv-dd-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span>{current?.label}</span>
      </button>
      {open && (
        <ul className="rv-dd-menu" role="listbox">
          {options.map(o => {
            const active = String(o.value) === String(value);
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`rv-dd-item ${active ? "active" : ""}`}
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

const RV_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const RV_WEEKDAYS = ["Lu","Ma","Me","Je","Ve","Sa","Di"];
const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const parseISO = (v) => {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
};

const RvDatePicker = ({ value, onChange, placeholder = "jj/mm/aaaa", align = "left", min, max }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sel = parseISO(value);
  const today = new Date();
  const [view, setView] = useState({ y: sel?.y ?? today.getFullYear(), m: sel?.m ?? today.getMonth() });
  useClickAway(ref, () => setOpen(false), open);

  const toggle = () => {
    if (!open) {
      const base = parseISO(value);
      setView({ y: base?.y ?? today.getFullYear(), m: base?.m ?? today.getMonth() });
    }
    setOpen(o => !o);
  };
  const shift = (delta) => setView(v => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const display = sel ? `${pad2(sel.d)}/${pad2(sel.m + 1)}/${sel.y}` : "";

  return (
    <div className="rv-dp" ref={ref}>
      <button type="button" className={`rv-dp-trigger ${display ? "" : "empty"}`} onClick={toggle} aria-haspopup="dialog" aria-expanded={open}>
        <span>{display || placeholder}</span>
        <Calendar size={15} />
      </button>
      {open && (
        <div className={`rv-dp-pop ${align === "right" ? "right" : ""}`} role="dialog">
          <div className="rv-dp-head">
            <button type="button" className="rv-dp-nav" onClick={() => shift(-1)} aria-label="Mois précédent"><ChevronLeft size={18} /></button>
            <span className="rv-dp-title">{RV_MONTHS[view.m]} {view.y}</span>
            <button type="button" className="rv-dp-nav" onClick={() => shift(1)} aria-label="Mois suivant"><ChevronRight size={18} /></button>
          </div>
          <div className="rv-dp-grid rv-dp-week">
            {RV_WEEKDAYS.map(w => <span key={w}>{w}</span>)}
          </div>
          <div className="rv-dp-grid">
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const iso = toISO(view.y, view.m, d);
              const disabled = (min && iso < min) || (max && iso > max);
              const cls = `rv-dp-day ${iso === value ? "selected" : ""} ${iso === todayISO ? "today" : ""}`;
              return (
                <button key={iso} type="button" className={cls} disabled={disabled}
                  onClick={() => { onChange(iso); setOpen(false); }}>
                  {d}
                </button>
              );
            })}
          </div>
          <div className="rv-dp-foot">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}>Effacer</button>
            <button type="button" onClick={() => { onChange(todayISO); setOpen(false); }}>Aujourd’hui</button>
          </div>
        </div>
      )}
    </div>
  );
};

const A4_WIDTH_PX = 794; // 210mm at 96dpi — the contract sheet is a fixed A4 page

// Scales the fixed-size A4 contract to the screen width (phones included)
// and lets the user zoom in. The PDF export is NOT affected: it clones
// #contract-print-view straight from the DOM and ignores this wrapper.
const ContractViewport = ({ children }) => {
  const stageRef = useRef(null);
  const sheetRef = useRef(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(1123);

  useEffect(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return undefined;

    const measure = () => {
      const available = stage.clientWidth || A4_WIDTH_PX;
      setFit(Math.min(1, available / A4_WIDTH_PX));
      setSheetHeight(sheet.scrollHeight || 1123);
    };
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  const scale = fit * zoom;
  const showZoom = fit < 1;

  return (
    <div className="cv-wrap">
      {showZoom && (
        <div className="cv-zoombar" role="group" aria-label="Zoom du contrat">
          <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(2)))} disabled={zoom <= 1} aria-label="Dézoomer">
            <ZoomOut size={18} />
          </button>
          <output>{Math.round(scale * 100)}%</output>
          <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(2)))} disabled={zoom >= 3} aria-label="Zoomer">
            <ZoomIn size={18} />
          </button>
          <button type="button" onClick={() => setZoom(1)} disabled={zoom === 1}>
            <Maximize2 size={16} /> Ajuster
          </button>
        </div>
      )}
      <div className="cv-stage" ref={stageRef}>
        <div className="cv-spacer" style={{ width: A4_WIDTH_PX * scale, height: sheetHeight * scale + 8 }}>
          <div className="cv-sheet" ref={sheetRef} style={{ width: A4_WIDTH_PX, transform: `scale(${scale})` }}>
            {children}
          </div>
        </div>
      </div>
      {showZoom && <p className="cv-hint">Utilisez + / − pour zoomer, puis faites glisser pour naviguer.</p>}
    </div>
  );
};

const ContractViewPage = ({ reservation, onClose, currentUser, clients }) => {
  const dispatch = useDispatch();

  const [receptionNotesOverride, setReceptionNotesOverride] = useState(reservation?.reception_notes || null);

  const [contractSignatures, setContractSignatures] = useState({
    agent: reservation?.signatures?.agent || "",
    locataire: reservation?.signatures?.locataire || "",
    secondConducteur: reservation?.signatures?.secondConducteur || "",
    locataire_image: reservation?.signatures?.locataire_image || "",
  });

  const [contractPaperwork, setContractPaperwork] = useState({
    circulation: true,
    carteGrise: true,
    assurance: true,
    vignette: true,
    visiteTechnique: true,
    autorisation: true
  });
  const [contractDisplayOptions, setContractDisplayOptions] = useState({
    prices: "dash",
    clientInfo: "show",
    secondDriver: "show",
    vehicleInfo: "show",
    deliveryReception: "show",
    rentalDates: "show",
    kilometrage: "show",
    rentalDays: "dash",
    observations: "show",
    insurance: "show",
    depositGuarantee: "show",
    signatures: "show"
  });
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  const handleDisplayOptionChange = (section, value) => {
    setContractDisplayOptions(prev => ({ ...prev, [section]: value }));
  };
  const handleResetAllOptions = () => {
    setContractDisplayOptions({
      prices: "dash",
      clientInfo: "show",
      secondDriver: "show",
      vehicleInfo: "show",
      deliveryReception: "show",
      rentalDates: "show",
      kilometrage: "show",
      rentalDays: "dash",
      observations: "show",
      insurance: "show",
      depositGuarantee: "show",
      signatures: "show"
    });
    toast.success("Toutes les options ont été réinitialisées");
  };

  const generateContractPDF = async (includeSignatures = false) => {
    try {
      toast.loading("Génération du contrat en cours...", { id: "contract-pdf" });

      const notesJSON = buildReceptionNotesJSON(reservation, currentUser);
      try {
        await dispatch(updateReservation({ id: reservation.id, data: { reception_notes: notesJSON } })).unwrap();
        setReceptionNotesOverride(notesJSON);
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.error("Failed to save reception_notes", e);
      }

      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const contractElement = document.getElementById("contract-print-view");
      if (!contractElement) throw new Error("Contract element not found");
      await contractToPdf(doc, contractElement, { includeSignatures, agentSignatureImage });

      const filename = `contrat-location-${reservation.id}.pdf`;
      downloadAndOpenPDF(doc, filename);
      toast.success("Contrat généré avec succès!", { id: "contract-pdf" });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération du contrat", { id: "contract-pdf" });
    }
  };

  const handlePrintClick = () => {
    setShowPrintOptions(true);
  };

  const handlePrintConfirm = (withSignature) => {
    setShowPrintOptions(false);
    setTimeout(() => generateContractPDF(withSignature), 200);
  };

  const mergedSignatures = {
    ...reservation.signatures,
    ...contractSignatures,
  };

  return (
    <div className="inline-form-container">
      <div className="inline-form-header">
        <div className="inline-form-icon"><FileText size={28} /></div>
        <div className="inline-form-title">
          <h2>Contrat de location</h2>
          <p>Réservation #{reservation.id} · visualisez et imprimez</p>
        </div>
        <button onClick={onClose} className="inline-form-close" aria-label="Fermer"><X size={22} /></button>
      </div>
      <div className="inline-form" style={{ paddingTop: 0 }}>
        <div className="contract-actions-bar">
          <button className="btn btn-secondary" onClick={() => setShowDisplayOptions(!showDisplayOptions)}>
            <Settings size={16} /> Options d'affichage
          </button>
          <button className="btn btn-primary" onClick={handlePrintClick}>
            <Printer size={16} /> Imprimer / PDF
          </button>
        </div>
        {showDisplayOptions && (
          <ContractDisplayOptions
            options={contractDisplayOptions}
            onOptionChange={handleDisplayOptionChange}
            onResetAll={handleResetAllOptions}
          />
        )}
        <div className="signature-input-section">
          <h3>Signatures</h3>
          <div className="signature-inputs">
            <div>
              <label>Signature Agent</label>
              <input type="text" value={contractSignatures.agent} onChange={(e) => setContractSignatures(prev => ({ ...prev, agent: e.target.value }))} placeholder="Nom de l'agent" className="inline-input" />
            </div>
            <div>
              <label>Signature Locataire (texte)</label>
              <input type="text" value={contractSignatures.locataire} onChange={(e) => setContractSignatures(prev => ({ ...prev, locataire: e.target.value }))} placeholder="Nom du locataire" className="inline-input" />
            </div>
            <div>
              <label>Deuxième Conducteur</label>
              <input type="text" value={contractSignatures.secondConducteur} onChange={(e) => setContractSignatures(prev => ({ ...prev, secondConducteur: e.target.value }))} placeholder="Nom du conducteur" className="inline-input" />
            </div>
          </div>
          {mergedSignatures.locataire_image && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', border: '1.5px dashed currentColor', borderRadius: '12px', background: '#fff' }}>
              <label>Signature dessinée du client</label>
              <img src={mergedSignatures.locataire_image} alt="Signature client" style={{ maxHeight: '80px', maxWidth: '100%', display: 'block', marginTop: '0.5rem' }} />
            </div>
          )}
        </div>
        <div className="paperwork-checkboxes">
          <h3>Documents Remis</h3>
          <div className="checkbox-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.carteGrise} onChange={() => setContractPaperwork(prev => ({ ...prev, carteGrise: !prev.carteGrise }))} /> Carte grise</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.assurance} onChange={() => setContractPaperwork(prev => ({ ...prev, assurance: !prev.assurance }))} /> Assurance</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.vignette} onChange={() => setContractPaperwork(prev => ({ ...prev, vignette: !prev.vignette }))} /> Vignette</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.visiteTechnique} onChange={() => setContractPaperwork(prev => ({ ...prev, visiteTechnique: !prev.visiteTechnique }))} /> Visite technique</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.autorisation} onChange={() => setContractPaperwork(prev => ({ ...prev, autorisation: !prev.autorisation }))} /> Autorisation</label>
          </div>
        </div>

        <ContractViewport>
          <ContractLocation
            reservation={{
              ...reservation,
              signatures: mergedSignatures,
              paperwork: contractPaperwork,
              reception_notes: receptionNotesOverride ?? reservation?.reception_notes
            }}
            showSignatures={true}
            currentUser={currentUser}
            clients={clients}
            displayOptions={contractDisplayOptions}
            containerId="contract-print-view"
          />
        </ContractViewport>
      </div>

      {showPrintOptions && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Options d'impression</h2>
              <button onClick={() => setShowPrintOptions(false)} className="modal-close" aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p>Souhaitez-vous inclure la signature de l'agent dans le contrat ?</p>
            </div>
            <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => handlePrintConfirm(false)} className="btn btn-secondary">
                Sans signature
              </button>
              <button onClick={() => handlePrintConfirm(true)} className="btn btn-primary">
                Avec signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Main AdminReservationsStatus ====================
export default function AdminReservationsStatus() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const store = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const focusParam = searchParams.get('focus');
  const searchParam = searchParams.get('search');
  const isMobile = useMediaQuery("(max-width: 820px)");

  const reservations = useSelector(selectReservations);
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);
  const clients = useSelector(selectClients);
  const loading = useSelector(selectReservationsLoading);
  const currentUser = useSelector(selectUser);

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showContract, setShowContract] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const [reservationToDelete, setReservationToDelete] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContractReservation, setSelectedContractReservation] = useState(null);
  const [contractSignatures, setContractSignatures] = useState({
    agent: "", locataire: "", secondConducteur: ""
  });
  const [contractPaperwork, setContractPaperwork] = useState({
    circulation: true, carteGrise: true, assurance: true,
    vignette: true, visiteTechnique: true, autorisation: true
  });
  const [contractDisplayOptions, setContractDisplayOptions] = useState({
    prices: "dash", clientInfo: "show", secondDriver: "show",
    vehicleInfo: "show", deliveryReception: "show", rentalDates: "dash",
    kilometrage: "show", rentalDays: "show", observations: "show",
    insurance: "show", depositGuarantee: "show", signatures: "show"
  });
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingReservationId, setPendingReservationId] = useState(null);
  const [availableMatricules, setAvailableMatricules] = useState([]);
  const [selectedMatriculeId, setSelectedMatriculeId] = useState('');

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeReservationId, setCompleteReservationId] = useState(null);
  const [kilometrageRetour, setKilometrageRetour] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');

  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printReservation, setPrintReservation] = useState(null);

  // ===== Load data =====
  useEffect(() => {
    const load = async () => {
      await Promise.all([
        dispatch(fetchReservations()),
        dispatch(fetchCars()),
        dispatch(fetchMatricules()),
        dispatch(fetchClients()),
        dispatch(checkLateReservations())
      ]);
    };
    load();
  }, [dispatch]);

  useResetScrollOnOpen([
  showReservationForm,
  showContract,
  deleteModalOpen,
  showConfirmModal,
  showCompleteModal,
  showPrintOptions,
]);

  // ===== FOCUS FROM URL PARAMETER =====
  useEffect(() => {
    if (focusParam && reservations.length > 0) {
      const found = reservations.find(r => r.id === parseInt(focusParam));
      if (found) {
        setSearch(`#${focusParam}`);
        setCurrentPage(1);
        setTimeout(() => {
          const element = document.getElementById(`reservation-${focusParam}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.background = '#fef3c7';
            setTimeout(() => {
              element.style.background = '';
            }, 3000);
          }
        }, 500);
        setSearchParams({});
      } else {
        toast.warning(`Réservation #${focusParam} non trouvée`);
        setSearchParams({});
      }
    }
  }, [focusParam, reservations, setSearchParams]);

  useEffect(() => {
    if (searchParam) {
      setSearch(searchParam);
      setCurrentPage(1);
    }
  }, [searchParam, setSearchParams]);

  const lastProcessedContractId = useRef(null);

  useEffect(() => {
    const contractReservation = location.state?.contractReservation;
    if (contractReservation) {
      setSelectedContractReservation(contractReservation);
      setShowContract(true);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    const contractId = location.state?.contractId || searchParams.get('contract');
    if (!contractId) {
      lastProcessedContractId.current = null;
      return;
    }
    if (contractId === lastProcessedContractId.current) return;
    if (reservations.length === 0) return;

    lastProcessedContractId.current = contractId;
    const reservation = reservations.find(r => r.id === parseInt(contractId));

    if (reservation) {
      setSelectedContractReservation(reservation);
      setShowContract(true);
      if (location.state?.contractId) {
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        setSearchParams({});
      }
    } else {
      toast.warning('Réservation non trouvée');
      if (location.state?.contractId) {
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        setSearchParams({});
      }
    }
  }, [location, reservations, navigate, searchParams, setSearchParams]);

  // ============ CRUD Handlers ============
  const handleCreateReservation = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(createReservation(data)).unwrap();
      const reservation = result.reservation || result;
      toast.success("Réservation créée avec succès!");
      setShowReservationForm(false);

      await syncReportForReservation(reservation, dispatch);

      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndNavigate = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(createReservation(data)).unwrap();
      const reservation = result.reservation || result;
      toast.success("Réservation créée avec succès!");
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
      setShowReservationForm(false);
      setSelectedContractReservation(reservation);
      setShowContract(true);
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReservation = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(updateReservation({ id: editingReservation.id, data })).unwrap();
      const reservation = result.reservation || result;
      toast.success("Réservation modifiée avec succès!");
      setShowReservationForm(false);
      setEditingReservation(null);

      await syncReportForReservation(reservation, dispatch);

      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAndNavigate = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(updateReservation({ id: editingReservation.id, data })).unwrap();
      const reservation = result.reservation || result;
      toast.success("Réservation modifiée avec succès!");
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
      setShowReservationForm(false);
      setEditingReservation(null);
      setSelectedContractReservation(reservation);
      setShowContract(true);
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setShowReservationForm(true);
  };

  const handleAddNew = () => {
    setEditingReservation(null);
    setShowReservationForm(true);
  };

  // ===== Confirm Modal Logic =====
  const openConfirmModal = (reservation) => {
    const carId = reservation.car_id;
    const reservedMatriculeIds = reservations
      .filter(r => r.id !== reservation.id && (r.status === 'confirmed' || r.status === 'retard'))
      .map(r => r.matricule_id)
      .filter(Boolean);

    const available = matricules.filter(m =>
      m.car_id === carId &&
      m.status !== 'sold' &&
      !reservedMatriculeIds.includes(m.id)
    );
    setAvailableMatricules(available);
    setPendingReservationId(reservation.id);
    if (reservation.matricule_id) {
      setSelectedMatriculeId(reservation.matricule_id);
    } else {
      setSelectedMatriculeId(available.length > 0 ? available[0].id : '');
    }
    setShowConfirmModal(true);
  };

  const confirmConfirm = async () => {
    if (!selectedMatriculeId) {
      toast.error("Veuillez sélectionner un matricule.");
      return;
    }
    try {
      const result = await dispatch(updateReservation({
        id: pendingReservationId,
        data: {
          status: 'confirmed',
          matricule_id: selectedMatriculeId,
          start_time: new Date().toTimeString().slice(0, 5)
        }
      })).unwrap();
      const updatedReservation = result.reservation || result;
      const token = updatedReservation.signature_token || pendingReservationId;
      const code = updatedReservation.signature_code || pendingReservationId;

      toast.success("Réservation confirmée avec succès !");

      const link = `${window.location.origin}/sign-contract/${token}`;
      toast.info(
        <div>
          <p>🔗 Lien de signature : <a href={link} target="_blank" rel="noopener noreferrer">{link}</a></p>
          <p>🔑 Code : <strong>{code}</strong> (à communiquer au client)</p>
        </div>,
        { duration: 10000 }
      );
    } catch (error) {
      toast.error(error.message || "Erreur lors de la confirmation");
    }
    setShowConfirmModal(false);
    setPendingReservationId(null);
    setSelectedMatriculeId('');
  };

  // 🔒 FIX : date par défaut intelligente (jamais avant start_date)
  const openCompleteModal = (reservation) => {
    setCompleteReservationId(reservation.id);
    setKilometrageRetour(reservation.kilometrage_entree || reservation.matricule_kilometrage_at_start || '');

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startStr = reservation.start_date?.split('T')[0];

    const defaultReturnDate =
      (startStr && todayStr < startStr) ? startStr : todayStr;

    setReturnDate(defaultReturnDate);
    setReturnTime(now.toTimeString().slice(0, 5));
    setShowCompleteModal(true);
  };

  // 🔒 FIX : garde-fou — end_date jamais antérieure à start_date
  const confirmComplete = async () => {
    if (!kilometrageRetour || isNaN(kilometrageRetour) || parseFloat(kilometrageRetour) < 0) {
      toast.error("Veuillez entrer un kilométrage retour valide.");
      return;
    }

    const reservation = reservations.find(r => r.id === completeReservationId);
    const startStr = reservation?.start_date?.split('T')[0];

    let effectiveEndDate = returnDate;
    if (startStr && returnDate && returnDate < startStr) {
      effectiveEndDate = startStr;
      toast.info("Date de retour ajustée à la date de début de location.");
    }

    try {
      await dispatch(updateReservation({
        id: completeReservationId,
        data: {
          status: 'completed',
          end_date: effectiveEndDate,
          end_time: returnTime,
          kilometrage_entree: parseFloat(kilometrageRetour)
        }
      })).unwrap();
      toast.success("Réservation terminée avec succès !");
    } catch (error) {
      toast.error(error.message || "Erreur lors de la terminaison");
    }
    setShowCompleteModal(false);
    setCompleteReservationId(null);
    setKilometrageRetour('');
    setReturnDate('');
    setReturnTime('');
  };

  // ----- WhatsApp handler -----
  const handleWhatsApp = (reservation) => {
    const client = clients.find(c => c.id === reservation.client_id);
    if (!client || !client.telephone) {
      toast.error("رقم الهاتف ديال العميل غير موجود.");
      return;
    }
    let phone = client.telephone.replace(/[\s\-\(\)\.]/g, '');
    if (phone.startsWith('0') && phone.length === 10) {
      phone = '212' + phone.substring(1);
    } else if (phone.startsWith('+')) {
      phone = phone.substring(1);
    }
    const total = reservation.total_price || 0;
    const paid = reservation.amount_paid || 0;
    const remaining = reservation.remaining_amount !== undefined ? reservation.remaining_amount : (total - paid);
    const status = reservation.status;
    const clientName = client.prenom ? `${client.prenom} ${client.nom}` : client.nom || "العميل";
    let daysRemaining = null;
    if (reservation.end_date) {
      const today = new Date();
      const end = new Date(reservation.end_date);
      today.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    }
    let message = "";
    switch (status) {
      case "pending":
        message = `السلام عليكم ${clientName}، وصلاتنا طلب ديال الكرية (رقم ${reservation.id}). المجموع هو ${total} درهم، دفعتي ${paid} درهم، باقي ${remaining} درهم. يرجى تأكيد الحجز ديالك. شكراً.`;
        break;
      case "confirmed":
        if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3) {
          message = `السلام عليكم ${clientName}، الحجز ديالك (رقم ${reservation.id}) كينتهي في ${daysRemaining} يوم. خاص ترجع السيارة في الوقت المحدد. المبلغ المتبقي هو ${remaining} درهم. شكراً.`;
        } else {
          message = `السلام عليكم ${clientName}، الحجز ديالك (رقم ${reservation.id}) تأكد. المبلغ المتبقي هو ${remaining} درهم. نتمناو لك رحلة موفقة. شكراً.`;
        }
        break;
      case "retard":
        message = `السلام عليكم ${clientName}، الحجز ديالك (رقم ${reservation.id}) متأخر. خاص ترجع السيارة فالحال. المبلغ المتبقي هو ${remaining} درهم. رجاء اتصل بنا. شكراً.`;
        break;
      case "completed":
        message = `السلام عليكم ${clientName}، شكراً على الكرية ديالك (رقم ${reservation.id}). نتمناو نشوفوك مرة أخرى. شكراً.`;
        break;
      case "cancelled":
        message = `السلام عليكم ${clientName}، تم إلغاء الحجز ديالك (رقم ${reservation.id}). إذا عندك أي سؤال، اتصل بنا. شكراً.`;
        break;
      case "contacted":
        message = `السلام عليكم ${clientName}، حاولنا نتواصلو معاك بخصوص الحجز ديالك (رقم ${reservation.id}). خاص ترجع لينا فالحال. شكراً.`;
        break;
      default:
        message = `السلام عليكم ${clientName}، كنا نتواصلو معاك بخصوص الحجز ديالك (رقم ${reservation.id}). المجموع هو ${total} درهم، دفعتي ${paid} درهم، باقي ${remaining} درهم. شكراً.`;
    }
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // ===== setStatus =====
  const setStatus = async (id, newStatus, extraData = {}) => {
    if (newStatus === 'confirmed') {
      const reservation = reservations.find(r => r.id === id);
      if (reservation) {
        openConfirmModal(reservation);
      }
      return;
    }
    if (newStatus === 'completed') {
      const reservation = reservations.find(r => r.id === id);
      if (reservation) {
        openCompleteModal(reservation);
      }
      return;
    }
    const result = await dispatch(updateReservation({ id, data: { status: newStatus, ...extraData } }));
    if (result.error) {
      toast.error(result.payload);
    } else {
      toast.success(newStatus === "cancelled" ? "Annulée" : "Mis à jour");
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    }
  };

  // ----- Delete handlers -----
  const handleDeleteClick = (reservation) => {
    setReservationToDelete(reservation);
    setDeleteModalOpen(true);
  };

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
    if (!reservationToDelete) return;
    const result = await dispatch(deleteReservation(reservationToDelete.id));
    if (result.error) {
      toast.error(result.payload);
    } else {
      toast.success("Réservation supprimée avec succès");
    }
    setDeleteModalOpen(false);
    setReservationToDelete(null);
  };

  // ----- Refresh and Export -----
  const refreshData = async () => {
    await Promise.all([
      dispatch(fetchReservations(true)),
      dispatch(fetchCars(true)),
      dispatch(fetchMatricules(true)),
      dispatch(fetchClients(true)),
      dispatch(checkLateReservations())
    ]);
    toast.success("Actualisé");
  };

  const handleExport = () => {
    const headers = ["ID", "Client", "Véhicule", "Immatriculation", "Début", "Fin", "Total (DH)", "Statut", "Prolongation", "Sous-location"];
    const csvData = reservations
      .filter(r => STATUS_PAGE_STATUSES.includes(r.status))
      .map(r => {
        const client = clients.find(c => c.id === r.client_id);
        const car = cars.find(c => c.id === r.car_id);
        const mat = matricules.find(m => m.id === r.matricule_id);
        return [
          r.id,
          client ? `"${client.prenom} ${client.nom}"` : "N/A",
          car ? `"${car.brand} ${car.model}"` : "N/A",
          mat?.matricule_code || "",
          r.start_date,
          r.end_date,
          r.total_price,
          r.status,
          r.can_extend_days ? "Oui" : "Non",
          r.sous_location?.name || "",
        ].join(",");
      });
    const blob = new Blob([headers.join(",") + "\n" + csvData.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations_status_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  // 🔒 FIX : calculateDays défensif
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end < start) return 1;
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays;
  };

  const calculateDaysRemaining = (reservation) => {
    if (!reservation.end_date) return "";
    const today = new Date();
    const end = new Date(reservation.end_date);
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      const lateDays = Math.abs(diffDays);
      return lateDays === 1 ? "+1 jour de retard" : `+${lateDays} jours de retard`;
    }
    if (diffDays === 0) return "Dernier jour";
    if (diffDays === 1) return "1 jour restant";
    return `${diffDays} jours restants`;
  };

  const handlePrintClick = (reservation) => {
    setSelectedContractReservation(reservation);
    setPrintReservation(reservation);
    setShowPrintOptions(true);
  };

  const handlePrintConfirm = (withSignature) => {
    setShowPrintOptions(false);
    setTimeout(() => {
      generateContractPDF(printReservation, withSignature);
      setPrintReservation(null);
    }, 200);
  };

  const generateContractPDF = async (reservation, includeSignatures = false) => {
    try {
      toast.loading("Génération du contrat en cours...", { id: "contract-pdf" });

      const notesJSON = buildReceptionNotesJSON(reservation, currentUser);
      try {
        await dispatch(updateReservation({ id: reservation.id, data: { reception_notes: notesJSON } })).unwrap();
        reservation.reception_notes = notesJSON;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.error("Failed to save reception_notes", e);
      }

      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const contractElement = document.getElementById("contract-print-hidden");
      if (!contractElement) {
        console.error("Contract element not found");
        toast.error("Erreur: Élément du contrat non trouvé", { id: "contract-pdf" });
        return;
      }
      await contractToPdf(doc, contractElement, { includeSignatures, agentSignatureImage });

      const filename = `contrat-location-${reservation.id}.pdf`;
      downloadAndOpenPDF(doc, filename);
      toast.success("Contrat généré avec succès!", { id: "contract-pdf" });
    } catch (error) {
      console.error("Error generating contract:", error);
      toast.error("Erreur lors de la génération du contrat", { id: "contract-pdf" });
    }
  };

  const handleViewContract = (reservation) => {
    setSelectedContractReservation(reservation);
    setShowContract(true);
  };

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

  // ----- Filtering and sorting (ONLY pending, contacted, cancelled) -----
  const filteredReservations = useMemo(() => {
    let filtered = reservations.filter(r => {
      if (!STATUS_PAGE_STATUSES.includes(r.status)) {
        return false;
      }

      const client = clients.find(c => c.id === r.client_id);
      const car = cars.find(c => c.id === r.car_id);
      const mat = matricules.find(m => m.id === r.matricule_id);
      if (search &&
          !`${client?.prenom} ${client?.nom}`.toLowerCase().includes(search.toLowerCase()) &&
          !`${car?.brand} ${car?.model}`.toLowerCase().includes(search.toLowerCase()) &&
          !mat?.matricule_code?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      if (filterParam && STATUS_PAGE_STATUSES.includes(filterParam)) {
        if (r.status !== filterParam) return false;
      } else if (statusFilter) {
        if (r.status !== statusFilter) return false;
      }

      return true;
    });

    if (startDateFilter && endDateFilter) {
      const filterStart = new Date(startDateFilter);
      const filterEnd = new Date(endDateFilter);
      filtered = filtered.filter(r => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        return start <= filterEnd && end >= filterStart;
      });
    } else if (startDateFilter) {
      const filterStart = new Date(startDateFilter);
      filtered = filtered.filter(r => new Date(r.start_date) >= filterStart);
    } else if (endDateFilter) {
      const filterEnd = new Date(endDateFilter);
      filtered = filtered.filter(r => new Date(r.end_date) <= filterEnd);
    }

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "id": aVal = a.id; bVal = b.id; break;
        case "client": const aClient = clients.find(c => c.id === a.client_id); const bClient = clients.find(c => c.id === b.client_id); aVal = aClient ? `${aClient.prenom} ${aClient.nom}` : ""; bVal = bClient ? `${bClient.prenom} ${bClient.nom}` : ""; break;
        case "vehicle": const aCar = cars.find(c => c.id === a.car_id); const bCar = cars.find(c => c.id === b.car_id); aVal = aCar ? `${aCar.brand} ${aCar.model}` : ""; bVal = bCar ? `${bCar.brand} ${bCar.model}` : ""; break;
        case "matricule": const aMat = matricules.find(m => m.id === a.matricule_id); const bMat = matricules.find(m => m.id === b.matricule_id); aVal = aMat?.matricule_code || ""; bVal = bMat?.matricule_code || ""; break;
        case "start_date": aVal = new Date(a.start_date); bVal = new Date(b.start_date); break;
        case "end_date": aVal = new Date(a.end_date); bVal = new Date(b.end_date); break;
        case "days": aVal = calculateDays(a.start_date, a.end_date); bVal = calculateDays(b.start_date, b.end_date); break;
        case "total": aVal = a.total_price || 0; bVal = b.total_price || 0; break;
        case "status": aVal = a.status; bVal = b.status; break;
        default: aVal = a.id; bVal = b.id;
      }
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      else return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [reservations, clients, cars, matricules, search, statusFilter, sortField, sortDirection, filterParam, startDateFilter, endDateFilter]);

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const paginated = filteredReservations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    const config = {
      pending: { class: "badge-warning", label: "En attente", icon: Clock },
      confirmed: { class: "badge-success", label: "Confirmée", icon: Check },
      contacted: { class: "badge-purple", label: "Contacté", icon: Phone },
      completed: { class: "badge-blue", label: "Terminée", icon: CheckCircle },
      cancelled: { class: "badge-gray", label: "Annulée", icon: XCircle },
      retard: { class: "badge-danger", label: "En retard", icon: AlertTriangle }
    };
    const c = config[status] || config.pending;
    const IconComponent = c.icon;
    return (
      <span className={`rv-badge rv-st-${config[status] ? status : "pending"}`}>
        <IconComponent size={12} className="badge-icon" />
        {c.label}
      </span>
    );
  };

  const clearDateFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des réservations...</p>
      </div>
    );
  }

  const renderConfirmModal = () => (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Confirmer la réservation</h2>
          <button onClick={() => setShowConfirmModal(false)} className="modal-close"><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1rem' }}>Sélectionnez le matricule à attribuer à cette réservation :</p>
          {availableMatricules.length === 0 ? (
            <p style={{ color: 'red' }}>Aucun matricule disponible pour ce véhicule.</p>
          ) : (
            <div className="form-group">
              <label>Matricule</label>
              <select
                value={selectedMatriculeId}
                onChange={(e) => setSelectedMatriculeId(e.target.value)}
                className="inline-select"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                <option value="">Sélectionner un matricule</option>
                {availableMatricules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.matricule_code} - {m.kilometrage} km
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary" disabled={!!busy.confirmConfirm}>Annuler</button>
          <button onClick={() => runBusy("confirmConfirm", confirmConfirm)} className="btn btn-primary" disabled={availableMatricules.length === 0 || !selectedMatriculeId || !!busy.confirmConfirm}>
            {busy.confirmConfirm ? (<><span className="btn-spinner" /> Traitement...</>) : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompleteModal = () => (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Terminer la réservation</h2>
          <button onClick={() => setShowCompleteModal(false)} className="modal-close"><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Date de retour</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={reservations.find(r => r.id === completeReservationId)?.start_date?.split('T')[0] || ''}
                className="inline-input"
                style={{ width: '100%', padding: '0.75rem' }}
              />
            </div>
            <div className="form-group">
              <label>Heure de retour</label>
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="inline-input"
                style={{ width: '100%', padding: '0.75rem' }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Km retour</label>
            <input
              type="number"
              value={kilometrageRetour}
              onChange={(e) => setKilometrageRetour(e.target.value)}
              className="inline-input"
              placeholder="Ex: 12345"
              style={{ width: '100%', padding: '0.75rem' }}
            />
          </div>
        </div>
        <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCompleteModal(false)} className="btn btn-secondary" disabled={!!busy.confirmComplete}>Annuler</button>
          <button onClick={() => runBusy("confirmComplete", confirmComplete)} className="btn btn-primary" disabled={!kilometrageRetour || isNaN(kilometrageRetour) || !!busy.confirmComplete}>
            {busy.confirmComplete ? (<><span className="btn-spinner" /> Traitement...</>) : "Terminer"}
          </button>
        </div>
      </div>
    </div>
  );

  // ===== UI HELPERS (shared by the desktop table and the mobile cards) =====
  const getInitials = (client) => {
    if (!client) return "?";
    const letters = `${(client.prenom || "").charAt(0)}${(client.nom || "").charAt(0)}`.toUpperCase();
    return letters || "?";
  };

  const getActionDefs = (r) => {
    const isExpanded = expandedRowId === r.id;
    const canDecide = r.status === "pending" || r.status === "contacted";
    return [
      canDecide && {
        key: "confirm", label: "Confirmer", title: "Confirmer", Icon: CheckCircle, tone: "green", primary: true,
        onClick: () => setStatus(r.id, "confirmed"),
      },
      canDecide && {
        key: "cancel", label: "Annuler", title: "Annuler", Icon: XCircle, tone: "red",
        async: true,
        onClick: () => setStatus(r.id, "cancelled"),
      },
      r.status === "cancelled" && {
        key: "restore", label: "En attente", title: "Remettre en attente", Icon: Clock, tone: "gold", primary: true,
        async: true,
        onClick: () => setStatus(r.id, "pending"),
      },
      { key: "contract", label: "Contrat", title: "Voir contrat", Icon: FileText, tone: "ink", onClick: () => handleViewContract(r) },
      { key: "print", label: "Imprimer", title: "Imprimer", Icon: Printer, tone: "violet", onClick: () => handlePrintClick(r) },
      { key: "wa", label: "WhatsApp", title: "Envoyer un message WhatsApp", Icon: MessageCircle, tone: "green", onClick: () => handleWhatsApp(r) },
      { key: "edit", label: "Modifier", title: "Modifier", Icon: Edit, tone: "teal", onClick: () => handleEdit(r) },
      {
        key: "details", label: "Détails", title: "Détails", Icon: isExpanded ? ChevronUp : Eye, tone: "cyan",
        active: isExpanded,
        onClick: () => setExpandedRowId(isExpanded ? null : r.id),
      },
      { key: "delete", label: "Supprimer", title: "Supprimer", Icon: Trash2, tone: "red", onClick: () => handleDeleteClick(r) },
    ].filter(Boolean);
  };

  // Desktop: compact round icon buttons
  const renderIcons = (r) => (
    <div className="rv-icons">
      {getActionDefs(r).map(({ key, title, Icon, tone, active, onClick, async: isAsync }) => {
        const bk = `${key}-${r.id}`;
        const isBusy = !!busy[bk];
        return (
          <button
            type="button"
            key={key}
            className={`rv-ico tone-${tone} ${active ? "active" : ""}`}
            onClick={isAsync ? () => runBusy(bk, onClick) : onClick}
            disabled={isBusy}
            title={title}
            aria-label={title}
          >
            {isBusy ? <span className="btn-spinner only" /> : <Icon size={17} />}
          </button>
        );
      })}
    </div>
  );

  // Mobile: big labelled tiles (every action stays one tap away)
  const renderTiles = (r) => (
    <div className="rv-tiles">
      {getActionDefs(r).map(({ key, label, title, Icon, tone, active, primary, onClick, async: isAsync }) => {
        const bk = `${key}-${r.id}`;
        const isBusy = !!busy[bk];
        return (
          <button
            type="button"
            key={key}
            className={`rv-tile tone-${tone} ${active ? "active" : ""} ${primary ? "primary" : ""}`}
            onClick={isAsync ? () => runBusy(bk, onClick) : onClick}
            disabled={isBusy}
            aria-label={title}
          >
            {isBusy ? <span className="btn-spinner only" /> : <Icon size={20} />}
            <span>{isBusy ? "Traitement..." : label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderDetails = (r) => {
    let history = r.payment_history;
    if (typeof history === "string") {
      try { history = JSON.parse(history); } catch (e) { history = []; }
    }
    if (!Array.isArray(history)) history = [];
    const hasExtension = r.can_extend_days && r.prolongation_days > 0;
    return (
      <div className="rv-details">
        <div className="rv-dcard c-blue">
          <h4><DollarSign size={14} /> Paiement</h4>
          <div className="rv-kv"><span>Total</span><b>{r.total_price} DH</b></div>
          <div className="rv-kv"><span>Payé</span><b className="ok">{r.amount_paid} DH</b></div>
          <div className="rv-kv"><span>Restant</span><b className="due">{r.remaining_amount} DH</b></div>
        </div>

        {history.length > 0 && (
          <div className="rv-dcard c-ink">
            <h4><Receipt size={14} /> Historique des paiements</h4>
            {history.map((p, idx) => (
              <div className="rv-pay" key={idx}>
                <span className="d">{new Date(p.date).toLocaleDateString("fr-FR")}</span>
                <span className="a">{p.amount} DH</span>
                <span className="m">{p.method}</span>
                {p.notes && <span className="n">{p.notes}</span>}
              </div>
            ))}
          </div>
        )}

        <div className={`rv-dcard ${hasExtension ? "c-red" : "c-mute"}`}>
          <h4><Tag size={14} /> Prolongation</h4>
          {hasExtension ? (
            <>
              <div className="rv-kv"><span>Jours ajoutés</span><b>+{r.prolongation_days} jours</b></div>
              <div className="rv-kv">
                <span>Ajoutée le</span>
                <b>{r.updated_at ? new Date(r.updated_at).toLocaleDateString("fr-FR") : "—"}</b>
              </div>
            </>
          ) : (
            <span className="rv-none">Aucune prolongation</span>
          )}
        </div>

        {r.notes && (
          <div className="rv-dcard c-mute">
            <h4><Info size={14} /> Notes</h4>
            <span className="rv-none" style={{ color: "var(--tx)" }}>{r.notes}</span>
          </div>
        )}
      </div>
    );
  };

  const renderExtendChip = (r) =>
    r.can_extend_days ? (
      <span className="rv-chip yes"><CheckCircle size={13} /> Prolongation : Oui</span>
    ) : (
      <span className="rv-chip"><XCircle size={13} /> Prolongation : Non</span>
    );

  const renderSousLocationChip = (r) =>
    r.sous_location ? (
      <span className="rv-chip sub"><Tag size={13} /> {r.sous_location.name}</span>
    ) : (
      <span className="rv-chip own"><Home size={13} /> Propre</span>
    );

  // ===== MOBILE CARD =====
  const renderCard = (r) => {
    const client = clients.find(c => c.id === r.client_id);
    const car = cars.find(c => c.id === r.car_id);
    const mat = matricules.find(m => m.id === r.matricule_id);
    const secondDriver = clients.find(c => c.id === r.second_driver_client_id);
    const days = (r.rental_days > 0) ? r.rental_days : calculateDays(r.start_date, r.end_date);
    const daysRemaining = calculateDaysRemaining(r);
    const isLate = r.status === "retard";

    const total = Number(r.total_price) || 0;
    const paid = Number(r.amount_paid) || 0;
    const remaining = r.remaining_amount != null && r.remaining_amount !== ""
      ? Number(r.remaining_amount) || 0
      : Math.max(total - paid, 0);
    const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    const settled = total > 0 && remaining <= 0;

    const s = dateParts(r.start_date);
    const e = dateParts(r.end_date);

    return (
      <article key={r.id} id={`reservation-${r.id}`} className={`rv-card ${isLate ? "is-late" : ""}`}>
        <div className="rv-card-top">
          <span className="rv-card-no"><small>N°</small><b>{r.id}</b></span>
          {getStatusBadge(r.status)}
        </div>

        <div className="rv-card-client">
          <span className="rv-avatar">{getInitials(client)}</span>
          <div>
            <div className="rv-client-name">{client ? `${client.prenom} ${client.nom}` : "—"}</div>
            {secondDriver && r.has_second_driver && (
              <div className="second-driver-info"><Users size={11} /> {secondDriver.prenom} {secondDriver.nom}</div>
            )}
          </div>
        </div>

        <div className="rv-card-veh">
          <div className="rv-veh">
            <span className="rv-veh-name">{car ? `${car.brand} ${car.model}` : "—"}</span>
            {car?.color && (
              <span className="rv-color">
                <span className="color-dot" style={{ backgroundColor: car.color }} /> {car.color}
              </span>
            )}
          </div>
          <span className="rv-plate">
            <span className="rv-plate-strip">MA</span>
            <span className="rv-plate-code">{mat?.matricule_code || "—"}</span>
          </span>
        </div>

        <div className="rv-route">
          <div className="rv-date-block">
            <span className="dd">{s.day}</span>
            <span className="mm">{s.mon}</span>
            <span className="yy">{s.year}</span>
          </div>
          <div className="rv-route-mid">
            <span className="rv-chip days"><CalendarDays size={13} /> {days} {days > 1 ? "jours" : "jour"}</span>
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
              <span className="tot">{r.total_price}<small>DH</small></span>
            </div>
            <div className={`rv-remaining ${settled ? "ok" : remaining > 0 ? "due" : ""}`}>
              {settled ? "Soldé ✓" : remaining > 0 ? `Reste ${remaining} DH` : ""}
              {daysRemaining && (
                <div className={isLate ? "rv-late" : ""} style={{ fontWeight: 700, fontSize: "0.72rem", marginTop: 2, color: isLate ? undefined : "var(--tx-2)" }}>
                  <Clock size={11} style={{ verticalAlign: "-1px" }} /> {daysRemaining}
                </div>
              )}
            </div>
          </div>
          {total > 0 && (
            <div className={`rv-bar ${settled ? "full" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Paiement">
              <i style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        <div className="rv-card-tags">
          {renderExtendChip(r)}
          {renderSousLocationChip(r)}
        </div>

        <div className="rv-perf" />
        {renderTiles(r)}
        {expandedRowId === r.id && renderDetails(r)}
      </article>
    );
  };

  return (
    <div className="rv">
      {selectedContractReservation && (
        <div style={{ display: "none" }}>
          <ContractLocation
            reservation={{
              ...selectedContractReservation,
              signatures: contractSignatures,
              paperwork: contractPaperwork
            }}
            currentUser={currentUser}
            clients={clients}
            displayOptions={contractDisplayOptions}
            containerId="contract-print-hidden"
          />
        </div>
      )}

      {showContract && selectedContractReservation ? (
        <ContractViewPage
          reservation={selectedContractReservation}
          onClose={() => setShowContract(false)}
          currentUser={currentUser}
          clients={clients}
        />
      ) : showReservationForm ? (
        <ReservationForm
          isOpen={showReservationForm}
          onClose={() => { setShowReservationForm(false); setEditingReservation(null); }}
          onSubmit={editingReservation ? handleUpdateReservation : handleCreateReservation}
          onSubmitAndNavigate={editingReservation ? handleUpdateAndNavigate : handleCreateAndNavigate}
          editingReservation={editingReservation}
          clients={clients}
          cars={cars}
          matricules={matricules}
          submitting={submitting}
        />
      ) : (
        <div className="admin-container rv-wrap">
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><Clock size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">En attente / Annulées / Contactées</h1>
                <p className="rv-sub">
                  <b>{filteredReservations.length}</b> réservation(s) <span>· uniquement en attente, contacté, annulé</span>
                </p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button onClick={() => runBusy("refresh", refreshData)} disabled={!!busy.refresh} className="btn btn-secondary" aria-label="Actualiser"><RefreshCw size={16} className={busy.refresh ? "rv-spin" : ""} /><span className="rv-lbl">Actualiser</span></button>
              <button onClick={handleExport} className="btn btn-secondary" aria-label="Exporter"><Download size={16} /><span className="rv-lbl">Exporter</span></button>
              <button onClick={handleAddNew} className="btn btn-primary"><Plus size={16} /> Nouvelle réservation</button>
            </div>
          </div>

          {(() => {
            const count = (st) => filteredReservations.filter((r) => r.status === st).length;
            const stats = [
              { label: "Total", value: filteredReservations.length, icon: <CalendarDays size={20} />, color: "blue" },
              { label: "En attente", value: count("pending"), icon: <Clock size={20} />, color: "gold" },
              { label: "Contactées", value: count("contacted"), icon: <Phone size={20} />, color: "violet" },
              { label: "Annulées", value: count("cancelled"), icon: <XCircle size={20} />, color: "gray" },
            ];
            return (
              <div className="rv-stats">
                {stats.map((st) => (
                  <div key={st.label} className="rv-stat-card">
                    <div className={`rv-stat-icon rv-stat-${st.color}`}>{st.icon}</div>
                    <div>
                      <p className="rv-stat-label">{st.label}</p>
                      <p className="rv-stat-value">{st.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="rv-toolbar">
            <div className="rv-search">
              <Search size={17} />
              <input
                type="text"
                placeholder="Client, véhicule, immatriculation..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <RvSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
              ariaLabel="Filtrer par statut"
              options={[
                { value: "", label: "Tous statuts" },
                { value: "pending", label: "En attente" },
                { value: "contacted", label: "Contacté" },
                { value: "cancelled", label: "Annulée" },
              ]}
            />
            <div className="rv-dates">
              <div className="rv-date">
                <span>Du</span>
                <RvDatePicker value={startDateFilter} max={endDateFilter || undefined} onChange={(v) => { setStartDateFilter(v); setCurrentPage(1); }} />
              </div>
              <div className="rv-date">
                <span>Au</span>
                <RvDatePicker align="right" value={endDateFilter} min={startDateFilter || undefined} onChange={(v) => { setEndDateFilter(v); setCurrentPage(1); }} />
              </div>
              {(startDateFilter || endDateFilter) && (
                <button onClick={clearDateFilters} className="rv-clear" title="Effacer les filtres de date" aria-label="Effacer les filtres de date"><X size={16} /></button>
              )}
            </div>
          </div>

          {filterParam && STATUS_PAGE_STATUSES.includes(filterParam) && (
            <div className="rv-banner">
              <span>🔎 Filtre actif : {filterParam === "pending" ? "En attente" : filterParam === "contacted" ? "Contacté" : "Annulée"}</span>
              <button onClick={() => setSearchParams({})}><X size={14} /> Effacer le filtre</button>
            </div>
          )}

          <div className="rv-meta">
            <span>{filteredReservations.length} réservation(s)</span>
            <span>Page {currentPage} / {totalPages || 1}</span>
          </div>

          {isMobile ? (
            <>
              <div className="rv-sortbar">
                <label htmlFor="rv-sort">Trier</label>
                <RvSelect
                  id="rv-sort"
                  className="grow"
                  value={sortField}
                  onChange={(v) => setSortField(v)}
                  options={[
                    { value: "id", label: "Numéro" },
                    { value: "start_date", label: "Date de début" },
                    { value: "client", label: "Client" },
                    { value: "vehicle", label: "Véhicule" },
                    { value: "days", label: "Nombre de jours" },
                    { value: "total", label: "Total" },
                    { value: "status", label: "Statut" },
                  ]}
                />
                <button
                  type="button"
                  className="rv-sortdir"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  aria-label={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
                >
                  {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
              </div>

              {paginated.length === 0 ? (
                <div className="rv-tablewrap"><p className="rv-empty">Aucune réservation</p></div>
              ) : (
                <div className="rv-cards">{paginated.map(renderCard)}</div>
              )}

              {totalPages > 1 && (
                <div className="rv-pager-card">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={filteredReservations.length}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rv-tablewrap">
              <div className="rv-scroll">
                <table className="rv-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                      <th onClick={() => handleSort("client")} className="sortable-header">Client {getSortIcon("client")}</th>
                      <th onClick={() => handleSort("vehicle")} className="sortable-header">Véhicule / Matricule {getSortIcon("vehicle")}</th>
                      <th onClick={() => handleSort("start_date")} className="sortable-header">Période {getSortIcon("start_date")}</th>
                      <th onClick={() => handleSort("days")} className="sortable-header">Jours {getSortIcon("days")}</th>
                      <th>Jours restants</th>
                      <th onClick={() => handleSort("total")} className="sortable-header">Total {getSortIcon("total")}</th>
                      <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                      <th>Prolongation</th>
                      <th>Sous‑location</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan="11" className="rv-empty">Aucune réservation</td></tr>
                    ) : (
                      paginated.map(r => {
                        const client = clients.find(c => c.id === r.client_id);
                        const car = cars.find(c => c.id === r.car_id);
                        const mat = matricules.find(m => m.id === r.matricule_id);
                        // 🔒 FIX : préfère rental_days valide, sinon recalcule
                        const days = (r.rental_days > 0) ? r.rental_days : calculateDays(r.start_date, r.end_date);
                        const daysRemaining = calculateDaysRemaining(r);
                        const secondDriver = clients.find(c => c.id === r.second_driver_client_id);
                        const isExpanded = expandedRowId === r.id;
                        return (
                          <Fragment key={r.id}>
                            <tr id={`reservation-${r.id}`} className="rv-row">
                              <td><span className="rv-card-no"><small>N°</small><b>{r.id}</b></span></td>
                              <td>
                                <div className="rv-client">
                                  <span className="rv-avatar">{getInitials(client)}</span>
                                  <div>
                                    <div className="rv-client-name">{client ? `${client.prenom} ${client.nom}` : "—"}</div>
                                    {secondDriver && r.has_second_driver && (
                                      <div className="second-driver-info"><Users size={11} /> {secondDriver.prenom} {secondDriver.nom}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="rv-veh">
                                  <span className="rv-veh-name">{car ? `${car.brand} ${car.model}` : "—"}</span>
                                  <span className="rv-plate">
                                    <span className="rv-plate-strip">MA</span>
                                    <span className="rv-plate-code">{mat?.matricule_code || "—"}</span>
                                  </span>
                                  {car?.color && (
                                    <span className="rv-color">
                                      <span className="color-dot" style={{ backgroundColor: car.color }} title={car.color} /> {car.color}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="rv-period">
                                  <span><Calendar size={13} /> {new Date(r.start_date).toLocaleDateString("fr-FR")}</span>
                                  <span><ArrowRight size={13} /> {new Date(r.end_date).toLocaleDateString("fr-FR")}</span>
                                </div>
                              </td>
                              <td>
                                <span className="rv-chip days"><CalendarDays size={13} /> {days} {days > 1 ? "jours" : "jour"}</span>
                              </td>
                              <td className={r.status === "retard" ? "rv-late" : ""} style={{ fontSize: "0.78rem", fontWeight: 700 }}>{daysRemaining}</td>
                              <td><span className="rv-price"><Coins size={14} /> {r.total_price} DH</span></td>
                              <td>{getStatusBadge(r.status)}</td>
                              <td>
                                {r.can_extend_days
                                  ? <span className="rv-chip yes"><CheckCircle size={13} /> Oui</span>
                                  : <span className="rv-chip"><XCircle size={13} /> Non</span>}
                              </td>
                              <td>
                                {r.sous_location
                                  ? <span className="rv-chip sub"><Tag size={13} /> {r.sous_location.name}</span>
                                  : <span className="rv-chip own"><Home size={13} /> Propre</span>}
                              </td>
                              <td className="text-right">{renderIcons(r)}</td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="11" className="rv-details-cell">{renderDetails(r)}</td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  totalItems={filteredReservations.length}
                />
              )}
            </div>
          )}

          {deleteModalOpen && reservationToDelete && (
            <div className="modal-overlay">
              <div className="modal delete-modal">
                <div className="delete-icon"><Trash2 size={32} /></div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">Êtes-vous sûr de vouloir supprimer la réservation <br /><span className="reservation-id">#{reservationToDelete.id}</span> ?<br />Cette action est irréversible.</p>
                {reservationToDelete.status === "confirmed" && (<p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>⚠️ Cette réservation est confirmée. La suppression affectera les données associées.</p>)}
                <div className="delete-actions"><button disabled={deleting} onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button><button disabled={deleting} onClick={confirmDelete} className="modal-btn btn-delete">{deleting ? (<><span className="btn-spinner" /> Suppression...</>) : "Supprimer"}</button></div>
              </div>
            </div>
          )}

          {showPrintOptions && printReservation && (
            <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                  <h2 className="modal-title">Options d'impression</h2>
                  <button onClick={() => setShowPrintOptions(false)} className="modal-close">
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem' }}>
                  <p>Souhaitez-vous inclure la signature de l'agent dans le contrat ?</p>
                </div>
                <div className="modal-actions-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button onClick={() => handlePrintConfirm(false)} className="btn btn-secondary">
                    Sans signature
                  </button>
                  <button onClick={() => handlePrintConfirm(true)} className="btn btn-primary">
                    Avec signature
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfirmModal && renderConfirmModal()}
      {showCompleteModal && renderCompleteModal()}

      <style>{`
@import url("https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap");

/* =====================================================================
   RESERVATIONS — "Jina Road" design
   Palette taken from the printed rental contract:
   yellow #eab308 · sky blue #1da1e8 · ink #0a0a0a · paper white
   Everything is scoped under .rv so it never leaks into other pages.
   ===================================================================== */

.rv {
  --acc: #eab308;
  --acc-d: #ca9a04;
  --acc-tx: #a16207;
  --danger: #dc2626;
  --blue: #1da1e8;
  --blue-d: #0f84c4;
  --ink: #0a0a0a;

  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f4f5f8;
  --tx: #111216;
  --tx-2: #5b6070;
  --tx-3: #8a90a0;
  --line: #e1e4ea;
  --line-strong: #0a0a0a;
  --hard: 0 3px 0 #0a0a0a;
  --soft: 0 10px 30px rgba(10, 10, 10, 0.08);

  font-family: Archivo, "Segoe UI", system-ui, -apple-system, sans-serif;
  color: var(--tx);
  min-height: 100%;
  -webkit-tap-highlight-color: transparent;
}

@media (prefers-color-scheme: dark) {
  .rv {
    --bg: #0f172a;
    --surface: #15171c;
    --surface-2: #1b1e25;
    --tx: #f2f3f5;
    --tx-2: #a4aab8;
    --tx-3: #747b8c;
    --line: #2a2e37;
    --line-strong: #3b404c;
    --acc-tx: #facc15;
    --hard: 0 3px 0 rgba(234, 179, 8, 0.7);
    --soft: 0 10px 30px rgba(0, 0, 0, 0.45);
  }
}

.rv *,
.rv *::before,
.rv *::after {
  box-sizing: border-box;
}

.rv button {
  font-family: inherit;
}

.rv input[type="checkbox"],
.rv input[type="radio"] {
  accent-color: var(--acc);
}

/* =====================================================================
   PAGE HEADER
   ===================================================================== */
.rv .rv-wrap {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

.rv .rv-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.rv .rv-kicker {
  display: inline-block;
  background: var(--ink);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 14px 4px 10px;
  border-radius: 0 999px 999px 0;
  margin-bottom: 8px;
  position: relative;
}
.rv .rv-kicker::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--acc);
  margin-right: 8px;
}

.rv .rv-title {
  font-size: clamp(1.6rem, 4.4vw, 2.4rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--tx);
  margin: 0;
}

.rv .rv-sub {
  margin: 10px 0 0;
  font-size: 0.85rem;
  color: var(--tx-2);
}
.rv .rv-sub b {
  color: var(--tx);
  font-weight: 900;
}

.rv .rv-head-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
}

/* =====================================================================
   BUTTONS  (also restyles .btn used in modals / forms)
   index.css sets !important on .btn so we match it here.
   ===================================================================== */
.rv .btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;
  height: 44px !important;
  padding: 0 20px !important;
  border-radius: 999px !important;
  border: 1.5px solid var(--line-strong) !important;
  font-size: 0.85rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.01em;
  cursor: pointer !important;
  white-space: nowrap !important;
  transition: transform 0.12s ease, background 0.15s ease !important;
  text-decoration: none;
}
.rv .btn:active {
  transform: translateY(3px) !important;
}
.rv .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed !important;
}
.rv .btn.btn-primary {
  background: var(--acc) !important;
  color: #0a0a0a !important;
}
.rv .btn.btn-primary:hover:not(:disabled) {
  background: var(--acc-d) !important;
  transform: translateY(-1px) !important;
}
.rv .btn.btn-secondary {
  background: var(--surface) !important;
  color: var(--tx) !important;
}
.rv .btn.btn-secondary:hover:not(:disabled) {
  background: var(--surface-2) !important;
  transform: translateY(-1px) !important;
}

/* =====================================================================
   TOOLBAR (search / status / dates)
   ===================================================================== */
.rv .rv-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 20px;
  padding: 14px;
  margin-bottom: 1.1rem;
}

.rv .rv-search {
  position: relative;
}
.rv .rv-search svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--acc-tx);
  pointer-events: none;
}
.rv .rv-search input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 42px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: var(--surface-2);
  color: var(--tx);
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.rv .rv-search input::placeholder {
  color: var(--tx-3);
}
.rv .rv-search input:focus {
  outline: none;
  background: var(--surface);
  border-color: var(--blue);
}

.rv .rv-select {
  height: 44px;
  min-width: 170px;
  padding: 0 38px 0 16px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: var(--surface-2);
  color: var(--tx);
  font-size: 0.85rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23a16207' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
.rv .rv-select:focus {
  outline: none;
  border-color: var(--blue);
}

.rv .rv-dates {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rv .rv-date {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: var(--surface-2);
}
.rv .rv-date span {
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--acc-tx);
}
.rv .rv-date .rv-dp { height: 100%; min-width: 118px; }
.rv .rv-date input {
  border: 0;
  background: transparent;
  color: var(--tx);
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  min-width: 0;
  width: 125px;
}
.rv .rv-date input:focus {
  outline: none;
}
.rv .rv-date:focus-within {
  border-color: var(--blue);
}
.rv .rv-clear {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--danger);
  background: transparent;
  color: var(--danger);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.rv .rv-clear:hover {
  background: var(--danger);
  color: #fff;
}

.rv .rv-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  background: #fff6d6;
  color: #7a4a00;
  border: 1.5px dashed #d98a00;
  border-radius: 14px;
  padding: 10px 14px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
}
.rv .rv-banner button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 0;
  cursor: pointer;
  color: inherit;
  font-weight: 800;
}

.rv .rv-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  margin-bottom: 0.8rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--tx-2);
}

.rv .rv-sortbar {
  display: none;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.9rem;
}
.rv .rv-sortbar label {
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--tx-2);
}
.rv .rv-sortbar .rv-select {
  flex: 1;
  min-width: 0;
}
.rv .rv-sortdir {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid var(--line-strong);
  background: var(--surface);
  color: var(--tx);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* custom dropdown */
.rv .rv-dd { position: relative; }
.rv .rv-dd.grow { flex: 1; min-width: 0; }
.rv .rv-dd-trigger { width: 100%; text-align: left; display: flex; align-items: center; }
.rv .rv-dd-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .rv-dd-trigger.open { border-color: var(--blue); }
.rv .rv-dd-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 100%;
  z-index: 60;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 18px;
  max-height: 280px;
  overflow-y: auto;
  animation: rvFade 0.12s ease;
}
.rv .rv-dd-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--tx);
  font-size: 0.85rem;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.rv .rv-dd-item:hover { background: var(--surface-2); }
.rv .rv-dd-item.active { background: var(--acc); color: #0a0a0a; }

/* custom date picker */
.rv .rv-dp { position: relative; flex: 1; min-width: 0; }
.rv .rv-dp-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--tx);
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.rv .rv-dp-trigger.empty { color: var(--tx-3); }
.rv .rv-dp-trigger svg { color: var(--acc-tx); flex-shrink: 0; }
.rv .rv-dp-pop {
  position: absolute;
  top: calc(100% + 14px);
  left: -8px;
  z-index: 70;
  width: 290px;
  padding: 14px;
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 20px;
  animation: rvFade 0.12s ease;
}
.rv .rv-dp-pop.right { left: auto; right: -8px; }
.rv .rv-dp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.rv .rv-dp-title { font-size: 0.95rem; font-weight: 900; }
.rv .rv-dp-nav {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  background: var(--surface-2);
  color: var(--tx);
  cursor: pointer;
}
.rv .rv-dp-nav:hover { border-color: var(--line-strong); }
.rv .rv-dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.rv .rv-dp-week span {
  text-align: center;
  font-size: 0.65rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--acc-tx);
  padding: 4px 0 6px;
}
.rv .rv-dp-day {
  aspect-ratio: 1;
  border: 1.5px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--tx);
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
.rv .rv-dp-day:hover:not(:disabled) { background: var(--surface-2); }
.rv .rv-dp-day.today { border-color: var(--blue); }
.rv .rv-dp-day.selected { background: var(--acc); color: #0a0a0a; border-color: var(--line-strong); }
.rv .rv-dp-day:disabled { opacity: 0.3; cursor: not-allowed; }
.rv .rv-dp-foot { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px dotted var(--line); }
.rv .rv-dp-foot button {
  border: 0; background: transparent;
  color: var(--tx-2);
  font-size: 0.78rem; font-weight: 800; font-family: inherit;
  padding: 6px 10px; border-radius: 999px; cursor: pointer;
}
.rv .rv-dp-foot button:hover { background: var(--surface-2); color: var(--tx); }

/* =====================================================================
   STATUS BADGES (own class names — index.css forces !important on .badge-*)
   ===================================================================== */
.rv .rv-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px 4px 9px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border: 1.5px solid currentColor;
  background: transparent;
}
.rv .rv-badge .badge-icon {
  flex-shrink: 0;
}
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

/* =====================================================================
   SHARED SMALL PIECES: plate, chips, tones
   ===================================================================== */
.rv .rv-plate {
  display: inline-flex;
  align-items: stretch;
  border: 2px solid #0a0a0a;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  color: #0a0a0a;
  line-height: 1;
}
.rv .rv-plate-strip {
  background: var(--blue);
  color: #fff;
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  padding: 6px 5px;
  display: flex;
  align-items: flex-end;
}
.rv .rv-plate-code {
  padding: 6px 10px;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rv .rv-color {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--tx-2);
}
.rv .color-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1.5px solid rgba(10, 10, 10, 0.35);
  display: inline-block;
  flex-shrink: 0;
}

.rv .rv-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  background: var(--surface-2);
  color: var(--tx);
  border: 1.5px solid var(--line);
  white-space: nowrap;
}
.rv .rv-chip svg { flex-shrink: 0; }
.rv .rv-chip.yes { background: #e3f7ea; color: #0f8a43; border-color: #bfe8cf; }
.rv .rv-chip.own { background: var(--ink); color: #fff; border-color: var(--ink); }
.rv .rv-chip.own svg { color: var(--acc); }
.rv .rv-chip.sub { background: #e3f3fc; color: var(--blue-d); border-color: #bfe3f7; }
.rv .rv-chip.days svg { color: var(--acc-tx); }

@media (prefers-color-scheme: dark) {
  .rv .rv-chip.yes { background: rgba(22, 163, 74, 0.16); color: #4ade80; border-color: transparent; }
  .rv .rv-chip.own { background: #f2f3f5; color: #0a0a0a; border-color: #f2f3f5; }
  .rv .rv-chip.sub { background: rgba(29, 161, 232, 0.16); color: #5cc3f5; border-color: transparent; }
}

.rv .rv-price {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 900;
  font-size: 0.95rem;
  color: var(--tx);
  background: linear-gradient(transparent 62%, rgba(234, 179, 8, 0.38) 62%);
  padding: 0 2px;
  white-space: nowrap;
}
.rv .rv-price svg { color: var(--acc-tx); }

.rv .rv-late { color: var(--danger); font-weight: 800; }

/* icon-button tones */
.rv .tone-gold   { --t: #c47a00; }
.rv .tone-blue   { --t: #0f84c4; }
.rv .tone-ink    { --t: #0a0a0a; }
.rv .tone-violet { --t: #6d3fd1; }
.rv .tone-green  { --t: #16a34a; }
.rv .tone-teal   { --t: #0f9d8a; }
.rv .tone-cyan   { --t: #0891b2; }
.rv .tone-red    { --t: #dc2626; }
@media (prefers-color-scheme: dark) {
  .rv .tone-ink { --t: #f2f3f5; }
  .rv .tone-violet { --t: #a78bfa; }
  .rv .tone-gold { --t: #ffc247; }
}

/* =====================================================================
   DESKTOP TABLE
   ===================================================================== */
.rv .rv-tablewrap {
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 20px;
  overflow: hidden;
}
.rv .rv-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.rv .rv-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.rv .rv-table thead th {
  background: var(--surface-2);
  color: var(--tx-2);
  text-align: left;
  padding: 14px 14px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 4px solid var(--acc);
}
.rv .rv-table thead th.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.rv .rv-table thead th.sortable-header:hover {
  background: var(--line);
  color: var(--tx);
}
.rv .rv-table .sort-icon {
  display: inline-block;
  margin-left: 4px;
  opacity: 0.45;
  vertical-align: middle;
}
.rv .rv-table .sort-icon.active {
  opacity: 1;
  color: var(--blue);
}
.rv .rv-table tbody td {
  padding: 12px 14px;
  border-top: 1.5px dotted var(--line);
  vertical-align: middle;
}
.rv .rv-table tbody tr.rv-row:hover {
  background: rgba(29, 161, 232, 0.06);
}
.rv .rv-table .text-right { text-align: right; }
.rv .rv-empty {
  text-align: center;
  padding: 3rem 1rem !important;
  color: var(--tx-2);
  font-weight: 700;
}

.rv .rv-client {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}
.rv .rv-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--acc);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  border: 2px solid var(--ink);
}
.rv .rv-client-name { font-weight: 800; }
.rv .second-driver-info {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--blue-d);
}

.rv .rv-veh { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.rv .rv-veh-name { font-weight: 800; font-size: 0.85rem; }

.rv .rv-period { display: flex; flex-direction: column; gap: 3px; font-size: 0.78rem; font-weight: 700; }
.rv .rv-period span { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.rv .rv-period svg { color: var(--acc-tx); }

/* icon buttons (table) */
.rv .rv-icons {
  display: grid;
  grid-template-columns: repeat(4, 36px);
  gap: 3px;
  justify-content: end;
}
.rv .rv-ico {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: var(--t, var(--tx));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease;
}
.rv .rv-ico:hover,
.rv .rv-ico.active {
  background: rgba(127, 127, 127, 0.14);
  background: color-mix(in srgb, var(--t, #888) 16%, transparent);
  transform: scale(1.08);
}
.rv .rv-ico:focus-visible,
.rv .rv-tile:focus-visible {
  outline: 3px solid var(--blue);
  outline-offset: 2px;
}

/* expanded details */
.rv .rv-details-cell {
  padding: 0 !important;
  background: var(--surface-2);
}
.rv .rv-details {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 18px 20px 22px;
}
.rv .rv-dcard {
  flex: 1 1 240px;
  min-width: 0;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-left: 6px solid var(--c, var(--blue));
  border-radius: 14px;
  padding: 14px 16px;
}
.rv .rv-dcard.c-blue { --c: var(--blue); }
.rv .rv-dcard.c-red { --c: var(--acc); }
.rv .rv-dcard.c-ink { --c: var(--ink); }
.rv .rv-dcard.c-mute { --c: #c3c8d2; }
.rv .rv-dcard h4 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--tx-2);
}
.rv .rv-dcard h4 svg { color: var(--c, var(--blue)); }
.rv .rv-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 5px 0;
  font-size: 0.85rem;
}
.rv .rv-kv > span:first-child { color: var(--tx-2); font-weight: 600; }
.rv .rv-kv b { font-weight: 900; }
.rv .rv-kv .ok { color: #0f8a43; background: #e3f7ea; padding: 1px 9px; border-radius: 999px; }
.rv .rv-kv .due { color: var(--danger); background: #fde6e8; padding: 1px 9px; border-radius: 999px; }
.rv .rv-pay {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 4px 10px;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1.5px dotted var(--line);
  font-size: 0.8rem;
}
.rv .rv-pay:last-child { border-bottom: 0; }
.rv .rv-pay .d { color: var(--tx-3); font-weight: 600; }
.rv .rv-pay .a { font-weight: 900; color: #0f8a43; }
.rv .rv-pay .m { font-size: 0.68rem; font-weight: 800; text-transform: capitalize; background: var(--surface-2); padding: 1px 9px; border-radius: 999px; border: 1.5px solid var(--line); }
.rv .rv-pay .n { grid-column: 1 / -1; color: var(--tx-2); font-style: italic; font-size: 0.75rem; }
.rv .rv-none { font-size: 0.85rem; color: var(--tx-3); font-weight: 600; }

@media (prefers-color-scheme: dark) {
  .rv .rv-kv .ok { background: rgba(22, 163, 74, 0.16); color: #4ade80; }
  .rv .rv-kv .due { background: rgba(220, 38, 38, 0.18); color: #ff7a85; }
  .rv .rv-pay .a { color: #4ade80; }
}

/* =====================================================================
   MOBILE CARDS  — "rental ticket"
   ===================================================================== */
.rv .rv-cards { display: flex; flex-direction: column; gap: 12px; }

.rv .rv-card {
  position: relative;
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 18px;
  overflow: hidden;
  transition: background 0.4s ease;
}
.rv .rv-card::before {
  content: "";
  display: block;
  height: 5px;
  background: linear-gradient(90deg, var(--acc) 0 34%, var(--blue) 34% 67%, var(--ink) 67% 100%);
}
.rv .rv-card.is-late { border-color: var(--danger); }

.rv .rv-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px 0;
}
.rv .rv-card-no {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  border: 1.5px solid var(--line-strong);
  border-radius: 10px;
  padding: 2px 10px;
  background: var(--surface);
  line-height: 1.2;
}
.rv .rv-card-no small {
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: var(--acc-tx);
}
.rv .rv-card-no b { font-size: 0.95rem; font-weight: 900; }

.rv .rv-card-client {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 0;
}
.rv .rv-card-client .rv-avatar { width: 36px; height: 36px; font-size: 0.8rem; }
.rv .rv-card-client .rv-client-name { font-size: 0.98rem; line-height: 1.15; }

.rv .rv-card-veh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 14px 0;
}
.rv .rv-card-veh .rv-veh-name { font-size: 0.88rem; }

.rv .rv-route {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  margin: 10px 14px 0;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: 12px;
}
.rv .rv-date-block { display: flex; flex-direction: column; line-height: 1; }
.rv .rv-date-block.end { text-align: right; align-items: flex-end; }
.rv .rv-date-block .dd { font-size: 1.05rem; font-weight: 900; letter-spacing: -0.01em; }
.rv .rv-date-block .mm { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--acc-tx); margin-top: 2px; }
.rv .rv-date-block .yy { font-size: 0.58rem; font-weight: 600; color: var(--tx-3); margin-top: 1px; }
.rv .rv-route-mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
}
.rv .rv-route-mid .line {
  display: flex;
  align-items: center;
  width: 100%;
  color: var(--tx-3);
}
.rv .rv-route-mid .line::before,
.rv .rv-route-mid .line::after {
  content: "";
  flex: 1;
  border-top: 2px dotted var(--tx-3);
}
.rv .rv-route-mid .line svg { flex-shrink: 0; color: var(--acc-tx); }

.rv .rv-money {
  margin: 10px 14px 0;
}
.rv .rv-money-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.rv .rv-money-top .lbl { font-size: 0.62rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: var(--tx-3); display: block; margin-bottom: 2px; }
.rv .rv-money-top .tot { font-size: 1.15rem; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
.rv .rv-money-top .tot small { font-size: 0.75rem; font-weight: 800; margin-left: 3px; color: var(--tx-2); }
.rv .rv-remaining { font-size: 0.8rem; font-weight: 800; text-align: right; }
.rv .rv-remaining.due { color: var(--danger); }
.rv .rv-remaining.ok { color: #0f8a43; }
.rv .rv-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  overflow: hidden;
}
.rv .rv-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: repeating-linear-gradient(-45deg, var(--blue) 0 8px, #5cc3f5 8px 16px);
}
.rv .rv-bar.full i { background: #16a34a; }

.rv .rv-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px 12px;
}

/* ticket perforation */
.rv .rv-perf {
  position: relative;
  border-top: 2px dashed var(--line);
  margin: 0 18px;
}
.rv .rv-perf::before,
.rv .rv-perf::after {
  content: "";
  position: absolute;
  top: -11px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg);
  border: 1.5px solid var(--line-strong);
}
.rv .rv-perf::before { left: -28px; }
.rv .rv-perf::after { right: -28px; }
.rv .rv-card.is-late .rv-perf::before,
.rv .rv-card.is-late .rv-perf::after { border-color: var(--danger); }

.rv .rv-tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 12px 12px 12px;
}
.rv .rv-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 50px;
  padding: 6px 2px;
  border-radius: 12px;
  border: 1.5px solid var(--line);
  background: var(--surface);
  color: var(--t, var(--tx));
  cursor: pointer;
  transition: transform 0.1s ease, background 0.15s ease;
}
.rv .rv-tile span {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--tx);
  line-height: 1;
}
.rv .rv-tile:active { transform: scale(0.95); }
.rv .rv-tile.active {
  background: rgba(127, 127, 127, 0.14);
  background: color-mix(in srgb, var(--t, #888) 14%, transparent);
  border-color: var(--t);
}
.rv .rv-tile.primary {
  background: var(--t);
  border-color: var(--line-strong);
}
.rv .rv-tile.primary,
.rv .rv-tile.primary span { color: #fff; }
.rv .rv-tile.primary.tone-gold { --t: #e09a00; }
.rv .rv-tile.primary.tone-gold span, .rv .rv-tile.primary.tone-gold { color: #0a0a0a; }

.rv .rv-card .rv-details {
  padding: 0 14px 16px;
  flex-direction: column;
  gap: 10px;
}
.rv .rv-card .rv-dcard { flex: 0 0 auto; }

/* =====================================================================
   MOBILE CARDS — même style que les cartes de la liste Utilisateurs
   (bordure douce, avatar ambre, boutons clairs avec libellé)
   ===================================================================== */
.rv .rv-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.rv .rv-card::before { display: none; }
.rv .rv-card.is-late { border-color: var(--danger); }

.rv .rv-card-top { padding: 14px 14px 0; }
.rv .rv-card-no {
  border: 0;
  border-radius: 6px;
  padding: 2px 8px;
  background: var(--surface-2);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.rv .rv-card-no small { color: var(--tx-3); letter-spacing: 0.04em; }
.rv .rv-card-no b { font-size: 0.78rem; font-weight: 700; color: var(--tx-2); }

.rv .rv-card-client { padding-top: 10px; }
.rv .rv-card .rv-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 0;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
}
.rv .rv-card-client .rv-avatar { width: 40px; height: 40px; font-size: 0.85rem; }
.rv .rv-card-client .rv-client-name { font-weight: 700; }

.rv .rv-route { border-radius: 10px; }
.rv .rv-bar { border-width: 1px; }

/* ligne de séparation simple (plus de ticket perforé) */
.rv .rv-perf { border-top: 1px solid var(--line); margin: 4px 14px 0; }
.rv .rv-perf::before,
.rv .rv-perf::after { display: none; }

/* boutons d'action : fond clair + icône colorée + petit libellé */
.rv .rv-tiles { padding: 12px 14px 14px; }
.rv .rv-tile {
  border: 0;
  border-radius: 10px;
  background: var(--surface-2);
  min-height: 52px;
}
.rv .rv-tile span {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--tx-2);
}
.rv .rv-tile.active,
.rv .rv-tile.primary,
.rv .rv-tile.primary.tone-gold {
  background: rgba(127, 127, 127, 0.14);
  background: color-mix(in srgb, var(--t, #888) 14%, transparent);
  border: 0;
  color: var(--t);
}
.rv .rv-tile.primary span,
.rv .rv-tile.primary.tone-gold span,
.rv .rv-tile.active span { color: var(--tx); }

/* =====================================================================
   LISTE — même style que la liste Utilisateurs
   (en-tête avec icône ambre, cartes de stats, filtres et tableau doux)
   ===================================================================== */
.rv .rv-head { align-items: flex-start; margin-bottom: 1.5rem; }
.rv .rv-head-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.rv .rv-head-icon {
  width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  display: flex; align-items: center; justify-content: center; color: #fff;
  box-shadow: 0 8px 24px -6px rgba(245, 158, 11, 0.5);
}
.rv .rv-title { font-size: 1.75rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
.rv .rv-sub { margin: 2px 0 0; font-size: 0.85rem; }
.rv .rv-sub b { font-weight: 700; }

.rv .rv-head-actions .btn {
  height: 38px !important;
  padding: 0 16px !important;
  border-radius: 10px !important;
  border: 1px solid var(--line) !important;
  font-size: 0.8rem !important;
  font-weight: 600 !important;
}
.rv .rv-head-actions .btn.btn-secondary:hover:not(:disabled) { border-color: var(--tx-3) !important; }
.rv .rv-head-actions .btn.btn-primary {
  background: linear-gradient(135deg, #0f172a, #1e293b) !important;
  color: #fff !important;
  border-color: transparent !important;
  box-shadow: 0 4px 14px -4px rgba(15, 23, 42, 0.4);
}
.rv .rv-head-actions .btn.btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #0f172a, #1e293b) !important; box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.5); }

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
.rv .rv-stat-cyan { background: #cffafe; color: #0891b2; }
.rv .rv-stat-red { background: #fee2e2; color: #dc2626; }
.rv .rv-stat-label { margin: 0; font-size: 0.72rem; font-weight: 600; color: var(--tx-2); text-transform: uppercase; letter-spacing: 0.05em; }
.rv .rv-stat-value { margin: 2px 0 0; font-size: 1.5rem; font-weight: 800; line-height: 1; color: var(--tx); }
@media (prefers-color-scheme: dark) {
  .rv .rv-stat-blue { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
  .rv .rv-stat-green { background: rgba(22, 163, 74, 0.2); color: #4ade80; }
  .rv .rv-stat-cyan { background: rgba(8, 145, 178, 0.2); color: #22d3ee; }
  .rv .rv-stat-red { background: rgba(220, 38, 38, 0.2); color: #f87171; }
}

/* filtres */
.rv .rv-toolbar {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.04);
}
.rv .rv-search input,
.rv .rv-select,
.rv .rv-date { height: 38px; border-radius: 10px; border-width: 1px; }
.rv .rv-search input { font-size: 0.8rem; padding-left: 38px; }
.rv .rv-search svg { left: 13px; width: 16px; height: 16px; color: var(--tx-3); }
.rv .rv-search input:focus,
.rv .rv-select:focus,
.rv .rv-dd-trigger.open,
.rv .rv-date:focus-within { border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.12); }
.rv .rv-select { font-size: 0.8rem; font-weight: 500; }
.rv .rv-clear { width: 32px; height: 32px; border-width: 1px; }
.rv .rv-dd-menu { border-width: 1px; border-color: var(--line); border-radius: 12px; box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15); }
.rv .rv-dd-item { border-radius: 8px; font-size: 0.8rem; font-weight: 500; padding: 8px 12px; }
.rv .rv-dd-item.active { background: #fef3c7; color: #92400e; font-weight: 600; }
.rv .rv-dp-pop { border-width: 1px; border-color: var(--line); border-radius: 14px; box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15); }
.rv .rv-dp-day.selected { background: #eab308; border-color: #eab308; }
@media (prefers-color-scheme: dark) {
  .rv .rv-dd-item.active { background: #422006; color: #fde68a; }
}
.rv .rv-meta { font-weight: 500; }
.rv .rv-meta span:first-child { color: var(--tx); font-weight: 600; }

/* tableau */
.rv .rv-tablewrap { border: 1px solid var(--line); border-radius: 16px; }
.rv .rv-table { font-size: 0.82rem; }
.rv .rv-table thead th {
  padding: 12px 16px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em;
  border-bottom: 0;
}
.rv .rv-table thead th.sortable-header:hover { background: var(--line); }
.rv .rv-table .sort-icon.active { color: #eab308; }
.rv .rv-table tbody td { padding: 12px 16px; border-top: 1px solid var(--line); }
.rv .rv-table tbody tr.rv-row:hover { background: var(--surface-2); }

/* avatars dans le tableau = mêmes que les utilisateurs */
.rv .rv-client .rv-avatar {
  width: 32px; height: 32px; border-radius: 10px; border: 0; font-size: 0.8rem;
  background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff;
}
.rv .rv-client-name { font-weight: 600; }

/* boutons d'action : carrés arrondis comme AdminUsers */
.rv .rv-ico { width: 32px; height: 32px; border-radius: 8px; }
.rv .rv-ico:hover,
.rv .rv-ico.active { transform: none; }
.rv .rv-icons { grid-template-columns: repeat(4, 32px); gap: 4px; }

.rv .rv-pager-card { border: 1px solid var(--line); border-radius: 16px; }
.rv .rv-sortdir { border-width: 1px; border-color: var(--line); border-radius: 10px; }
.rv .rv-sortbar label { font-weight: 600; }

@media (max-width: 820px) {
  .rv .rv-head-actions .btn { padding: 0 14px !important; height: 40px !important; }
  .rv .rv-stats { grid-template-columns: repeat(2, 1fr); }
  .rv .rv-toolbar { padding: 12px; }
}

/* couleurs de stats propres à cette page */
.rv .rv-stat-gold { background: #fef3c7; color: #d97706; }
.rv .rv-stat-violet { background: #f3e8ff; color: #8b5cf6; }
.rv .rv-stat-gray { background: #f1f5f9; color: #64748b; }
@media (prefers-color-scheme: dark) {
  .rv .rv-stat-gold { background: rgba(217, 119, 6, 0.2); color: #fbbf24; }
  .rv .rv-stat-violet { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
  .rv .rv-stat-gray { background: rgba(100, 116, 139, 0.2); color: #cbd5e1; }
}

/* =====================================================================
   MODALS (confirm / complete / delete / print / sous-location)
   ===================================================================== */
@keyframes rvFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rvPop { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes rvSheet { from { transform: translateY(100%); } to { transform: none; } }
@keyframes rvSpin { to { transform: rotate(360deg); } }

.rv .modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(10, 10, 10, 0.62);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  animation: rvFade 0.18s ease;
}
.rv .modal {
  position: relative;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--surface);
  color: var(--tx);
  border: 1.5px solid var(--line-strong);
  border-radius: 24px;
  animation: rvPop 0.25s ease;
}
.rv .modal-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: var(--surface);
  border-bottom: 2px dotted var(--line);
}
.rv .modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}
.rv .modal-title::before {
  content: "";
  width: 6px;
  height: 22px;
  background: var(--acc);
  border-radius: 2px;
  transform: skewX(-14deg);
  flex-shrink: 0;
}
.rv .modal-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  background: var(--surface-2);
  color: var(--tx);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.rv .modal-close:hover { background: var(--acc); border-color: var(--acc); color: #0a0a0a; }
.rv .modal-body { color: var(--tx); }
.rv .modal-body p { line-height: 1.5; }
.rv .modal-actions-footer {
  display: flex;
  gap: 0.75rem;
  border-top: 2px dotted var(--line) !important;
}

.rv .form-group { display: flex; flex-direction: column; gap: 6px; }
.rv .form-group label {
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx-2);
}

.rv .modal-btn {
  flex: 1;
  height: 46px;
  border-radius: 999px;
  border: 1.5px solid var(--line-strong);
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rv .modal-btn:active { transform: translateY(3px); }
.rv .modal-btn-cancel { background: var(--surface); color: var(--tx); }
.rv .btn-delete { background: var(--danger); color: #fff; }

.rv .delete-modal { max-width: 420px; padding: 0 22px 22px; text-align: center; }
.rv .delete-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: #fde6e8;
  border: 2px solid var(--danger);
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rv .delete-title { font-size: 1.25rem; font-weight: 900; margin-bottom: 8px; text-align: center; }
.rv .delete-message { font-size: 0.88rem; color: var(--tx-2); margin-bottom: 12px; text-align: center; line-height: 1.5; }
.rv .reservation-id {
  display: inline-block;
  background: var(--ink);
  color: #fff;
  padding: 2px 12px;
  border-radius: 8px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.05em;
}
.rv .delete-actions { display: flex; gap: 0.75rem; padding-top: 8px; }

@media (prefers-color-scheme: dark) {
  .rv .delete-icon { background: rgba(220, 38, 38, 0.18); }
  .rv .reservation-id { background: #f2f3f5; color: #0a0a0a; }
}

/* =====================================================================
   ADD / UPDATE FORM  (ReservationForm)
   ===================================================================== */
.rv .inline-form-container {
  position: relative;
  max-width: 1280px;
  margin: 1.5rem auto;
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 28px;
  overflow: hidden;
  overflow: clip;
}
.rv .inline-form-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px 80px 24px 28px;
  background: var(--ink);
  border-bottom: 6px solid transparent;
}
.rv .inline-form-icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: var(--acc);
  color: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transform: rotate(-5deg);
}
.rv .inline-form-title h2 {
  margin: 0;
  color: #fff;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1.1;
}
.rv .inline-form-title p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}
.rv .inline-form-close {
  position: absolute;
  top: 50%;
  right: 22px;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.rv .inline-form-close:hover { background: var(--acc); border-color: var(--acc); color: #0a0a0a; transform: translateY(-50%) rotate(90deg); }

.rv .inline-form { padding: 28px; }
.rv .inline-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.rv .inline-form-col { display: flex; flex-direction: column; gap: 22px; min-width: 0; }

.rv .inline-section {
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  border-radius: 20px;
  padding: 20px;
  min-width: 0;
}
.rv .inline-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}
.rv .inline-section-header svg {
  width: 30px;
  height: 30px;
  padding: 6px;
  border-radius: 50%;
  background: var(--acc);
  color: #0a0a0a;
  flex-shrink: 0;
}
.rv .inline-section-header h3 {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx);
  white-space: nowrap;
}
.rv .inline-section-header::after {
  content: "";
  flex: 1;
  border-bottom: 2px dotted var(--tx-3);
  transform: translateY(4px);
  min-width: 12px;
}

.rv .inline-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.rv .inline-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.rv .inline-field label,
.rv .signature-input-section label,
.rv .inline-payment-form label {
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx-2);
}
.rv .inline-input,
.rv .inline-select,
.rv .inline-textarea {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--tx);
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s;
}
.rv .inline-textarea { resize: vertical; min-height: 84px; }
.rv .inline-input:focus,
.rv .inline-select:focus,
.rv .inline-textarea:focus {
  outline: none;
  border-color: var(--blue);
}
.rv .inline-input:disabled,
.rv .inline-select:disabled { opacity: 0.55; cursor: not-allowed; }

.rv .inline-search-section {
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 14px;
}
.rv .inline-search-input-wrapper { position: relative; margin-bottom: 12px; }
.rv .inline-search-input-wrapper svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--acc-tx);
  pointer-events: none;
}
.rv .inline-search-input-wrapper .inline-input { padding-left: 42px; }
.rv .inline-results {
  max-height: 260px;
  overflow-y: auto;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  margin-bottom: 12px;
  background: var(--surface);
}
.rv .inline-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  cursor: pointer;
  border-bottom: 1.5px dotted var(--line);
  transition: background 0.15s;
}
.rv .inline-result-item:last-child { border-bottom: 0; }
.rv .inline-result-item:hover { background: rgba(29, 161, 232, 0.1); }
.rv .inline-result-item.active { background: rgba(29, 161, 232, 0.14); border-left: 4px solid var(--blue); }
.rv .inline-result-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--acc-tx);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rv .inline-result-info { flex: 1; min-width: 0; }
.rv .inline-result-info strong { display: block; font-size: 0.9rem; font-weight: 800; margin-bottom: 3px; }
.rv .inline-result-details { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.72rem; color: var(--tx-2); font-weight: 600; }
.rv .inline-matricule-code {
  font-family: Archivo, monospace;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--tx);
  background: #fff;
  border: 1.5px solid #0a0a0a;
  border-radius: 6px;
  padding: 1px 8px;
  color: #0a0a0a;
}
.rv .inline-selected {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 11px 14px;
  background: rgba(29, 161, 232, 0.12);
  border: 1.5px solid var(--blue);
  border-radius: 12px;
}
.rv .inline-selected svg { color: var(--blue-d); flex-shrink: 0; }
.rv .inline-selected strong { display: block; font-size: 0.66rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--blue-d); }
.rv .inline-selected p { margin: 0; font-size: 0.85rem; font-weight: 700; }
.rv .inline-checkbox { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 0.88rem; font-weight: 700; cursor: pointer; }
.rv .inline-checkbox input { width: 18px; height: 18px; }

.rv .inline-outline-btn,
.rv .inline-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1.5px solid var(--line-strong);
  background: var(--surface);
  color: var(--tx);
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.1s, background 0.15s;
}
.rv .inline-outline-btn:hover,
.rv .inline-secondary-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
.rv .inline-outline-btn:active,
.rv .inline-secondary-btn:active { transform: translateY(2px); }

.rv .inline-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 26px;
  border-radius: 999px;
  border: 1.5px solid var(--line-strong);
  background: var(--acc);
  color: #0a0a0a;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.1s, background 0.15s;
}
.rv .inline-primary-btn:hover:not(:disabled) { background: var(--acc-d); transform: translateY(-1px); }
.rv .inline-primary-btn:active:not(:disabled) { transform: translateY(3px); }
.rv .inline-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rv .inline-add-payment {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 18px;
  margin-bottom: 16px;
  border-radius: 999px;
  border: 1.5px solid var(--line-strong);
  background: var(--blue);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
}
.rv .inline-add-payment:hover { background: var(--blue-d); }
.rv .inline-payment-section { margin-top: 18px; }
.rv .inline-payment-form {
  background: var(--surface);
  border: 1.5px dashed var(--line-strong);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 18px;
}
.rv .inline-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap; }
.rv .inline-history { background: var(--surface); border: 1.5px solid var(--line); border-radius: 16px; overflow: hidden; }
.rv .inline-history h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 12px 16px;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: var(--surface-2);
  border-bottom: 1.5px solid var(--line);
}
.rv .inline-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1.5px dotted var(--line);
}
.rv .inline-history-item:last-child { border-bottom: 0; }
.rv .inline-history-info { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; font-size: 0.78rem; }
.rv .inline-history-date { color: var(--tx-3); font-weight: 600; }
.rv .inline-history-method { background: var(--surface-2); border: 1.5px solid var(--line); padding: 1px 10px; border-radius: 999px; font-weight: 700; font-size: 0.7rem; }
.rv .inline-history-amount { font-weight: 900; color: #0f8a43; }
.rv .inline-history-notes { color: var(--tx-2); font-style: italic; }
.rv .inline-history-delete { background: none; border: 0; color: var(--danger); cursor: pointer; padding: 8px; border-radius: 50%; }
.rv .inline-history-delete:hover { background: rgba(220, 38, 38, 0.12); }
.rv .inline-new-client { padding: 6px 0; }
.rv .inline-empty-state { padding: 1rem; text-align: center; background: var(--surface); border: 1.5px dashed var(--line-strong); border-radius: 14px; margin-top: 0.5rem; }
.rv .inline-empty-state p { color: var(--tx-2); margin-bottom: 0.75rem; font-weight: 600; }
.rv .inline-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 24px;
  padding-top: 22px;
  border-top: 2px dotted var(--line);
}

.rv .sous-location-search { position: relative; width: 100%; }
.rv .sous-location-search .selected-badge {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  max-width: 60%;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--blue);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

/* =====================================================================
   CONTRACT VIEW PAGE
   The A4 sheet (210mm) is scaled to the screen width, with zoom buttons.
   ===================================================================== */
.rv .contract-actions-bar {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin: 22px 0;
}
.rv .signature-input-section,
.rv .paperwork-checkboxes {
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
}
.rv .signature-input-section h3,
.rv .paperwork-checkboxes h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.rv .signature-input-section h3::before,
.rv .paperwork-checkboxes h3::before {
  content: "";
  width: 6px;
  height: 18px;
  background: var(--acc);
  border-radius: 2px;
  transform: skewX(-14deg);
}
.rv .signature-inputs { display: flex; flex-wrap: wrap; gap: 14px; }
.rv .signature-inputs > div { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.rv .checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}
.rv .checkbox-label input { width: 18px; height: 18px; }

.rv .display-options-panel {
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 20px;
}
.rv .display-options-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.rv .display-options-header h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 0.82rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.rv .reset-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1.5px solid var(--line-strong);
  background: var(--surface);
  color: var(--tx);
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
}
.rv .reset-all-btn:hover { background: var(--surface-2); }
.rv .display-options-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.rv .display-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 12px;
}
.rv .display-option-label { display: flex; align-items: center; gap: 7px; font-size: 0.78rem; font-weight: 700; min-width: 0; }
.rv .display-option-label svg { color: var(--acc-tx); flex-shrink: 0; }
.rv .display-option-buttons { display: flex; gap: 4px; flex-shrink: 0; }
.rv .mode-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1.5px solid var(--line);
  background: var(--surface);
  color: var(--tx-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.rv .mode-btn:hover { background: var(--surface-2); }
.rv .mode-btn.active { background: var(--acc); border-color: var(--line-strong); color: #0a0a0a; }

/* contract viewport */
.rv .cv-wrap { margin-top: 4px; }
.rv .cv-zoombar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--ink);
  border-radius: 999px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}
.rv .cv-zoombar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 42px;
  height: 42px;
  padding: 0 12px;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
}
.rv .cv-zoombar button:hover:not(:disabled) { background: var(--acc); color: #0a0a0a; }
.rv .cv-zoombar button:disabled { opacity: 0.35; cursor: not-allowed; }
.rv .cv-zoombar output { min-width: 48px; text-align: center; color: #fff; font-size: 0.78rem; font-weight: 800; }
.rv .cv-stage {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  border-radius: 14px;
  background:
    repeating-linear-gradient(-45deg, rgba(127,127,127,0.07) 0 10px, transparent 10px 20px);
  padding: 10px 0;
}
.rv .cv-spacer { margin: 0 auto; position: relative; }
.rv .cv-sheet { position: absolute; top: 0; left: 0; transform-origin: top left; }
.rv .cv-hint { text-align: center; font-size: 0.72rem; font-weight: 700; color: var(--tx-3); margin: 8px 0 0; }

/* =====================================================================
   PAGINATION (PaginationControls component)
   ===================================================================== */
.rv .pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 14px;
  border-top: 2px dotted var(--line);
}
.rv .page-btn {
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1.5px solid var(--line);
  background: var(--surface);
  color: var(--tx);
  font-weight: 800;
  cursor: pointer;
}
.rv .page-btn:hover:not(:disabled) { background: var(--surface-2); }
.rv .page-btn.active { background: var(--acc); color: #0a0a0a; border-color: var(--line-strong); }
.rv .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.rv .rv-pager-card { background: var(--surface); border: 1.5px solid var(--line-strong); border-radius: 20px; margin-top: 18px; overflow: hidden; }

/* =====================================================================
   LOADING
   ===================================================================== */
.rv .loading { text-align: center; padding: 4rem 1rem; color: var(--tx-2); font-weight: 700; }
.rv .spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border-radius: 50%;
  border: 4px solid var(--line);
  border-top-color: var(--acc);
  border-right-color: var(--blue);
  animation: rvSpin 0.7s linear infinite;
}

/* =====================================================================
   RESPONSIVE
   ===================================================================== */
@media (max-width: 1100px) {
  .rv .rv-toolbar { grid-template-columns: 1fr 1fr; }
  .rv .rv-search { grid-column: 1 / -1; }
  .rv .rv-dates { grid-column: 1 / -1; }
  .rv .rv-date { flex: 1; }
  .rv .rv-date input { width: 100%; }
}

@media (max-width: 1024px) {
  .rv .inline-form-grid { grid-template-columns: 1fr; gap: 22px; }
}

@media (max-width: 820px) {
  .rv .rv-wrap { padding: 0.9rem; }
  .rv .rv-head { align-items: stretch; }
  .rv .rv-head-text { width: 100%; }
  .rv .rv-head-actions { width: 100%; display: grid; grid-template-columns: auto auto 1fr; gap: 8px; }
  .rv .rv-head-actions .rv-lbl { display: none; }
  .rv .rv-head-actions .btn { padding: 0 16px !important; }
  .rv .rv-head-actions .btn-primary { width: 100%; }
  .rv .rv-sub span { display: none; }

  .rv .rv-toolbar { padding: 12px; border-radius: 18px; grid-template-columns: 1fr; }
  .rv .rv-select { width: 100%; min-width: 0; }
  .rv .rv-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .rv .rv-date { padding: 0 10px; gap: 6px; min-width: 0; }
  .rv .rv-date input { font-size: 0.74rem; width: 100%; min-width: 0; }
  .rv .rv-clear { grid-column: 1 / -1; width: 100%; height: 38px; border-radius: 999px; }
  .rv .rv-sortbar { display: flex; }
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
  .rv .inline-form-footer > *,
  .rv .inline-actions > * { width: 100%; }
  .rv .inline-form-footer .inline-primary-btn,
  .rv .inline-form-footer .inline-secondary-btn,
  .rv .inline-form-footer .inline-outline-btn { width: 100%; }
  .rv .inline-history-item { flex-direction: column; align-items: flex-start; }
  .rv .inline-result-details { flex-direction: column; gap: 2px; }

  /* modals become bottom sheets */
  .rv .modal-overlay { align-items: flex-end; padding: 0; }
  .rv .modal {
    max-width: 100% !important;
    max-height: 92vh;
    border-radius: 24px 24px 0 0;
    border-bottom: 0;
    animation: rvSheet 0.28s ease;
  }
  .rv .modal-actions-footer {
    flex-direction: column-reverse;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)) !important;
  }
  .rv .modal-actions-footer .btn,
  .rv .modal-actions-footer button { width: 100%; }
  .rv .delete-actions { flex-direction: column-reverse; gap: 10px; }
  .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }

  /* contract page */
  .rv .contract-actions-bar { display: grid; grid-template-columns: 1fr; margin: 16px 0; }
  .rv .contract-actions-bar .btn { width: 100%; }
  .rv .signature-input-section,
  .rv .paperwork-checkboxes,
  .rv .display-options-panel { padding: 14px; border-radius: 18px; }
  .rv .display-options-grid { grid-template-columns: 1fr; }
}

@media (max-width: 380px) {
  .rv .rv-tiles { grid-template-columns: repeat(3, 1fr); }
  .rv .rv-date-block .dd { font-size: 0.95rem; }
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
    </div>
  );
}