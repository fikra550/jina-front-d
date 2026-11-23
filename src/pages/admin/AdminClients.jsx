// src/pages/admin/AdminClients.jsx
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import {
  fetchClients, createClient, updateClient, deleteClient,
  selectClients, selectClientsLoading,
  fetchReservations, selectReservations,
  fetchAccidents, selectAccidents,
  selectCars, selectMatricules,
} from "../../Redux/store";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Search, RefreshCw, User, Phone, Mail,
  IdCard, MapPin, Calendar, FileText, CreditCard, Save,
  Users, Camera, Upload, AlertTriangle,
  DollarSign, History, Car, AlertCircle, CheckCircle,
  Wallet, Info, Activity, Eye, Download, ExternalLink,
  List, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown,
  Check, ChevronDown,
} from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

/* -------------------------------------------------------------------------- */
/*                        Menu déroulant personnalisé                         */
/* -------------------------------------------------------------------------- */
const AcSelect = ({ value, onChange, options, id, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (ev) => {
      if (ev.type === "keydown") {
        if (ev.key === "Escape") setOpen(false);
        return;
      }
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

  const current =
    options.find((o) => String(o.value) === String(value)) || options[0];

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
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
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
  { value: "name", label: "Nom" },
  { value: "telephone", label: "Téléphone" },
  { value: "cin", label: "CIN" },
  { value: "city", label: "Ville" },
];

/* -------------------------------------------------------------------------- */
/*                                  Composant                                 */
/* -------------------------------------------------------------------------- */
export default function AdminClients() {
  const dispatch = useDispatch();
  const clients = useSelector(selectClients);
  const loading = useSelector(selectClientsLoading);
  const reservations = useSelector(selectReservations);
  const accidents = useSelector(selectAccidents);
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);

  /* ------------------------------- UI state ------------------------------ */
  const [showClientForm, setShowClientForm] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
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
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cinPreview, setCinPreview] = useState("");
  const [licensePreview, setLicensePreview] = useState("");
  const [activeTab, setActiveTab] = useState("reservations");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [viewMode, setViewMode] = useState("list");

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    city: "",
    cin_number: "",
    driver_license_number: "",
    cin_image: "",
    driver_license_image: "",
    date_naissance: "",
    lieu_naissance: "",
    cin_delivre_le: "",
    permis_delivre_le: "",
  });

  /* ------------------------------- Helpers -------------------------------- */
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

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "MAD",
    }).format(num);
  };

  /* ------------------------------ Init data ------------------------------- */
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        dispatch(fetchClients()),
        dispatch(fetchReservations()),
        dispatch(fetchAccidents()),
      ]);
      setDataLoaded(true);
    };
    loadData();
  }, [dispatch]);

  useResetScrollOnOpen([
  showClientForm,
  showClientDetails,
  deleteModalOpen,
]);

  /* ------------------------------- Sorting -------------------------------- */
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field)
      return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === "asc" ? (
      <ArrowUp size={12} className="sort-icon active" />
    ) : (
      <ArrowDown size={12} className="sort-icon active" />
    );
  };

  /* ---------------------------- Cross helpers ----------------------------- */
  const getCarForReservation = (reservation) => {
    if (reservation.car) return reservation.car;
    if (reservation.car_id && cars?.length > 0) {
      return cars.find((c) => c.id === reservation.car_id);
    }
    return null;
  };

  const getMatriculeForReservation = (reservation) => {
    if (reservation.matricule) return reservation.matricule;
    if (reservation.matricule_id && matricules?.length > 0) {
      return matricules.find((m) => m.id === reservation.matricule_id);
    }
    return null;
  };

  const getClientReservations = (clientId) => {
    if (!reservations || !Array.isArray(reservations)) return [];
    return reservations
      .filter((r) => r.client_id === clientId)
      .sort(
        (a, b) =>
          new Date(b.created_at || b.start_date) -
          new Date(a.created_at || a.start_date)
      );
  };

  const getClientAccidents = (clientId) => {
    if (!accidents || !Array.isArray(accidents)) return [];
    return accidents
      .filter((a) => a.client_id === clientId)
      .sort(
        (a, b) => new Date(b.date_accident) - new Date(a.date_accident)
      );
  };

  const getClientStats = (clientId) => {
    const clientReservations = getClientReservations(clientId);
    const totalSpent = clientReservations.reduce(
      (sum, r) => sum + (Number(r.total_price) || 0),
      0
    );
    const totalPaid = clientReservations.reduce(
      (sum, r) => sum + (Number(r.amount_paid) || 0),
      0
    );
    const totalRemaining = clientReservations.reduce(
      (sum, r) => sum + (Number(r.remaining_amount) || 0),
      0
    );
    const activeReservations = clientReservations.filter(
      (r) => r.status === "confirmed" || r.status === "retard"
    ).length;
    const completedReservations = clientReservations.filter(
      (r) => r.status === "completed"
    ).length;
    const cancelledReservations = clientReservations.filter(
      (r) => r.status === "cancelled"
    ).length;
    const accidentCount = getClientAccidents(clientId).length;
    return {
      totalSpent,
      totalPaid,
      totalRemaining,
      activeReservations,
      completedReservations,
      cancelledReservations,
      totalReservations: clientReservations.length,
      accidentCount,
    };
  };

  const getPaymentHistoryArray = (reservation) => {
    if (!reservation.payment_history) return [];
    if (Array.isArray(reservation.payment_history))
      return reservation.payment_history;
    if (typeof reservation.payment_history === "string") {
      try {
        const parsed = JSON.parse(reservation.payment_history);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  /* -------------------------- Download / PDF ------------------------------ */
  const downloadFile = async (url, filename) => {
    try {
      toast.info("Téléchargement en cours...");
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success("Téléchargement terminé");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const isPdfFile = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.startsWith("data:application/pdf")) return true;
    if (lower.endsWith(".pdf")) return true;
    return false;
  };

  const renderDocumentPreview = (url, label) => {
    if (!url) return null;
    const fullUrl = getImageUrl(url);
    if (!fullUrl) return null;
    const isPdf = isPdfFile(fullUrl);
    const filename =
      fullUrl.split("/").pop() ||
      `${label.toLowerCase().replace(/\s/g, "_")}.pdf`;
    if (isPdf) {
      return (
        <div className="document-card pdf-card">
          <div className="pdf-icon-wrapper">
            <FileText size={48} className="pdf-icon" />
          </div>
          <div className="pdf-actions">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-action-btn view"
            >
              <ExternalLink size={14} /> Voir PDF
            </a>
            <button
              onClick={() => runBusy(`download-${filename}`, () => downloadFile(fullUrl, filename))}
              disabled={!!busy[`download-${filename}`]}
              className="pdf-action-btn download"
            >
              {busy[`download-${filename}`] ? (<><span className="btn-spinner" /> Téléchargement...</>) : (<><Download size={14} /> Télécharger</>)}
            </button>
          </div>
          <span className="document-label">{label}</span>
        </div>
      );
    }
    return (
      <div className="document-card">
        <img src={fullUrl} alt={label} className="document-image" />
        <span className="document-label">{label}</span>
      </div>
    );
  };

  const renderFormDocumentPreview = (dataUrl, label, onRemove) => {
    if (!dataUrl) return null;
    const isPdf = isPdfFile(dataUrl);
    const filename = `${label.toLowerCase().replace(/\s/g, "_")}.pdf`;
    if (isPdf) {
      return (
        <div className="image-preview-container pdf-preview-container">
          <div className="pdf-icon-wrapper">
            <FileText size={40} className="pdf-icon" />
          </div>
          <div className="pdf-actions small">
            <a
              href={dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-action-btn view"
            >
              <ExternalLink size={12} /> Voir
            </a>
            <button
              onClick={() => runBusy(`download-${filename}`, () => downloadFile(dataUrl, filename))}
              disabled={!!busy[`download-${filename}`]}
              className="pdf-action-btn download"
            >
              {busy[`download-${filename}`] ? (<><span className="btn-spinner" /> Téléchargement...</>) : (<><Download size={12} /> Télécharger</>)}
            </button>
          </div>
          <button
            type="button"
            className="remove-image-btn"
            onClick={onRemove}
          >
            <X size={14} /> Supprimer
          </button>
        </div>
      );
    }
    return (
      <div className="image-preview-container">
        <img src={dataUrl} alt={label} className="image-preview" />
        <button
          type="button"
          className="remove-image-btn"
          onClick={onRemove}
        >
          <X size={14} /> Supprimer
        </button>
      </div>
    );
  };

  /* ---------------------------- File uploads ------------------------------ */
  const handleFileChange = (field, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, [field]: reader.result });
      if (field === "cin_image") setCinPreview(reader.result);
      if (field === "driver_license_image") setLicensePreview(reader.result);
    };
    reader.onerror = () => toast.error("Erreur lors de la lecture du fichier");
    reader.readAsDataURL(file);
  };

  /* ---------------------------- CRUD handlers ----------------------------- */
  const handleCreateClient = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(createClient(data)).unwrap();
      toast.success("Client ajouté avec succès!");
      setShowClientForm(false);
      setEditingClient(null);
      setCinPreview("");
      setLicensePreview("");
      await dispatch(fetchClients(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(updateClient({ id: editingClient.id, data })).unwrap();
      toast.success("Client modifié avec succès!");
      setShowClientForm(false);
      setEditingClient(null);
      setCinPreview("");
      setLicensePreview("");
      await dispatch(fetchClients(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      nom: client.nom,
      prenom: client.prenom,
      telephone: client.telephone,
      email: client.email || "",
      city: client.city || "",
      cin_number: client.cin_number || "",
      driver_license_number: client.driver_license_number || "",
      cin_image: client.cin_image || client.cin_image_url || "",
      driver_license_image:
        client.driver_license_image || client.driver_license_image_url || "",
      date_naissance: formatDateForInput(client.date_naissance),
      lieu_naissance: client.lieu_naissance || "",
      cin_delivre_le: formatDateForInput(client.cin_delivre_le),
      permis_delivre_le: formatDateForInput(client.permis_delivre_le),
    });
    setCinPreview(client.cin_image_url || "");
    setLicensePreview(client.driver_license_image_url || "");
    setShowClientForm(true);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    resetForm();
    setCinPreview("");
    setLicensePreview("");
    setShowClientForm(true);
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      prenom: "",
      telephone: "",
      email: "",
      city: "",
      cin_number: "",
      driver_license_number: "",
      cin_image: "",
      driver_license_image: "",
      date_naissance: "",
      lieu_naissance: "",
      cin_delivre_le: "",
      permis_delivre_le: "",
    });
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
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
    if (!clientToDelete) return;
    const result = await dispatch(deleteClient(clientToDelete.id));
    if (result.error) toast.error(result.payload);
    else {
      toast.success("Client supprimé avec succès");
      await dispatch(fetchClients(true));
    }
    setDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const openDetails = (client) => {
    setSelectedClient(client);
    setShowClientDetails(true);
    setActiveTab("reservations");
  };

  const closeForm = () => {
    setShowClientForm(false);
    setEditingClient(null);
    resetForm();
    setCinPreview("");
    setLicensePreview("");
  };

  const refreshData = async () => {
    await Promise.all([
      dispatch(fetchClients(true)),
      dispatch(fetchReservations(true)),
      dispatch(fetchAccidents(true)),
    ]);
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = [
      "ID", "Nom", "Prénom", "Téléphone", "Email", "Ville",
      "CIN", "Permis", "Date naissance", "Lieu naissance",
    ];
    const csvData = filteredClients.map((c) =>
      [
        c.id,
        `"${c.nom}"`,
        `"${c.prenom}"`,
        c.telephone,
        c.email || "",
        c.city || "",
        c.cin_number || "",
        c.driver_license_number || "",
        c.date_naissance || "",
        c.lieu_naissance || "",
      ].join(",")
    );
    const blob = new Blob([headers.join(",") + "\n" + csvData.join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  /* -------------------------- Filter / sort data -------------------------- */
  const filteredClients =
    clients && Array.isArray(clients)
      ? clients
          .filter(
            (c) =>
              searchTerm === "" ||
              `${c.prenom} ${c.nom}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.telephone?.includes(searchTerm) ||
              c.cin_number?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
              case "id":
                aVal = a.id;
                bVal = b.id;
                break;
              case "name":
                aVal = `${a.prenom} ${a.nom}`.toLowerCase();
                bVal = `${b.prenom} ${b.nom}`.toLowerCase();
                break;
              case "telephone":
                aVal = a.telephone || "";
                bVal = b.telephone || "";
                break;
              case "cin":
                aVal = a.cin_number || "";
                bVal = b.cin_number || "";
                break;
              case "city":
                aVal = a.city || "";
                bVal = b.city || "";
                break;
              default:
                aVal = a.id;
                bVal = b.id;
            }
            if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
          })
      : [];

  const itemsPerView =
    viewMode === "list" ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredClients.length / itemsPerView) || 1;
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerView,
    currentPage * itemsPerView
  );

  /* ------------------------------ Badges ---------------------------------- */
  const getStatusBadge = (status) => {
    const config = {
      pending: { class: "badge-amber", label: "En attente", Icon: Info },
      confirmed: { class: "badge-success", label: "Confirmée", Icon: CheckCircle },
      contacted: { class: "badge-purple", label: "Contacté", Icon: Phone },
      completed: { class: "badge-blue", label: "Terminée", Icon: CheckCircle },
      cancelled: { class: "badge-danger", label: "Annulée", Icon: X },
      retard: { class: "badge-danger", label: "En retard", Icon: AlertTriangle },
    };
    const c = config[status] || config.pending;
    const Icon = c.Icon;
    return (
      <span className={`badge ${c.class}`}>
        <Icon size={12} /> {c.label}
      </span>
    );
  };

  const getAccidentStatusBadge = (status) => {
    const config = {
      pending: { class: "badge-amber", label: "En attente" },
      evaluation_owner: { class: "badge-blue", label: "Évaluation propriétaire" },
      "contact expert": { class: "badge-purple", label: "Contact expert" },
      evaluation_expert: { class: "badge-blue", label: "Évaluation expert" },
      fixed: { class: "badge-blue", label: "Réparation" },
      waiting: { class: "badge-amber", label: "En attente" },
      completed: { class: "badge-success", label: "Terminé" },
    };
    const c = config[status] || { class: "badge-danger", label: status };
    return <span className={`badge ${c.class}`}>{c.label}</span>;
  };

  /* -------------------------------- Stats --------------------------------- */
  const stats = {
    total: clients?.length || 0,
    withCin: clients?.filter((c) => c.cin_number).length || 0,
    withLicense: clients?.filter((c) => c.driver_license_number).length || 0,
    withEmail: clients?.filter((c) => c.email).length || 0,
  };

  const statCards = [
    { label: "Total clients", value: stats.total, Icon: Users, color: "blue" },
    { label: "CIN enregistré", value: stats.withCin, Icon: IdCard, color: "green" },
    { label: "Permis enregistré", value: stats.withLicense, Icon: FileText, color: "cyan" },
    { label: "Email renseigné", value: stats.withEmail, Icon: Mail, color: "violet" },
  ];

  /* ------------------------------ Pagination ------------------------------ */
  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={
          viewMode === "list" ? setListItemsPerPage : setCardsItemsPerPage
        }
        totalItems={filteredClients.length}
      />
    </div>
  );

  /* ------------------------------- Loader --------------------------------- */
  if (loading && !dataLoaded) {
    return (
      <div className="rv">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement des clients...</p>
        </div>
        <Styles />
      </div>
    );
  }

  /* ------------------------------- Render --------------------------------- */
  return (
    <div className="rv">
      {/* =========================== DÉTAILS CLIENT =========================== */}
      {showClientDetails && selectedClient && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              <User size={28} />
            </div>
            <div className="inline-form-title">
              <h2>Détails du client</h2>
              <p>
                {selectedClient.prenom} {selectedClient.nom}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setShowClientDetails(false)}
              className="inline-form-close"
            >
              <X size={24} />
            </button>
          </div>

          <div className="inline-form client-details-body">
            {/* Profil */}
            <div className="client-profile-section">
              <div className="client-profile-header">
                <div className="client-avatar">
                  <User size={36} />
                </div>
                <div className="client-profile-info">
                  <h3>
                    {selectedClient.prenom} {selectedClient.nom}
                  </h3>
                  <div className="client-profile-details">
                    <span>
                      <Phone size={14} /> {selectedClient.telephone}
                    </span>
                    {selectedClient.email && (
                      <span>
                        <Mail size={14} /> {selectedClient.email}
                      </span>
                    )}
                    {selectedClient.city && (
                      <span>
                        <MapPin size={14} /> {selectedClient.city}
                      </span>
                    )}
                  </div>
                </div>
                <div className="client-profile-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClientDetails(false);
                      handleEdit(selectedClient);
                    }}
                    className="inline-primary-btn"
                  >
                    <Edit2 size={16} /> Modifier
                  </button>
                </div>
              </div>

              <div className="client-identity-grid">
                <div className="identity-item">
                  <span className="inline-info-label">CIN</span>
                  <span className="inline-info-value">
                    {selectedClient.cin_number || "—"}
                  </span>
                </div>
                <div className="identity-item">
                  <span className="inline-info-label">Permis</span>
                  <span className="inline-info-value">
                    {selectedClient.driver_license_number || "—"}
                  </span>
                </div>
                <div className="identity-item">
                  <span className="inline-info-label">Date naissance</span>
                  <span className="inline-info-value">
                    {formatDate(selectedClient.date_naissance)}
                  </span>
                </div>
                <div className="identity-item">
                  <span className="inline-info-label">Lieu naissance</span>
                  <span className="inline-info-value">
                    {selectedClient.lieu_naissance || "—"}
                  </span>
                </div>
                <div className="identity-item">
                  <span className="inline-info-label">CIN délivré le</span>
                  <span className="inline-info-value">
                    {formatDate(selectedClient.cin_delivre_le)}
                  </span>
                </div>
                <div className="identity-item">
                  <span className="inline-info-label">Permis délivré le</span>
                  <span className="inline-info-value">
                    {formatDate(selectedClient.permis_delivre_le)}
                  </span>
                </div>
              </div>

              {(selectedClient.cin_image_url ||
                selectedClient.driver_license_image_url) && (
                <div className="client-documents">
                  <h4>Documents scannés</h4>
                  <div className="documents-grid">
                    {selectedClient.cin_image_url &&
                      renderDocumentPreview(selectedClient.cin_image_url, "CIN")}
                    {selectedClient.driver_license_image_url &&
                      renderDocumentPreview(
                        selectedClient.driver_license_image_url,
                        "Permis de conduire"
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Stats du client */}
            {(() => {
              const st = getClientStats(selectedClient.id);
              const items = [
                { label: "Total réservations", value: st.totalReservations, color: "blue" },
                { label: "Réservations actives", value: st.activeReservations, color: "green" },
                { label: "Réservations terminées", value: st.completedReservations, color: "cyan" },
                { label: "Accidents", value: st.accidentCount, color: "red" },
                { label: "Total dépensé", money: st.totalSpent, color: "violet" },
                { label: "Total payé", money: st.totalPaid, color: "green" },
                { label: "Reste à payer", money: st.totalRemaining, color: "red" },
              ];
              return (
                <div className="rv-stats client-stats-section">
                  {items.map((it) => (
                    <div key={it.label} className="rv-stat-card">
                      <div className={`rv-stat-icon rv-stat-${it.color}`}>
                        <DollarSign size={18} />
                      </div>
                      <div>
                        <p className="rv-stat-label">{it.label}</p>
                        <p className="rv-stat-value">
                          {it.money !== undefined ? (
                            <>
                              {(Number(it.money) || 0).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              <small className="rv-stat-unit">MAD</small>
                            </>
                          ) : (
                            it.value
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Tabs */}
            <div className="client-tabs">
              <button
                type="button"
                className={`client-tab ${
                  activeTab === "reservations" ? "active" : ""
                }`}
                onClick={() => setActiveTab("reservations")}
              >
                <Calendar size={16} /> Réservations (
                {getClientReservations(selectedClient.id).length})
              </button>
              <button
                type="button"
                className={`client-tab ${
                  activeTab === "accidents" ? "active" : ""
                }`}
                onClick={() => setActiveTab("accidents")}
              >
                <AlertTriangle size={16} /> Accidents (
                {getClientAccidents(selectedClient.id).length})
              </button>
              <button
                type="button"
                className={`client-tab ${
                  activeTab === "payments" ? "active" : ""
                }`}
                onClick={() => setActiveTab("payments")}
              >
                <DollarSign size={16} /> Paiements
              </button>
            </div>

            {/* Tab content */}
            <div>
              {/* Réservations */}
              {activeTab === "reservations" && (
                <>
                  {getClientReservations(selectedClient.id).length === 0 ? (
                    <div className="ac-empty-card">
                      <Car size={40} />
                      <p>Aucune réservation pour ce client</p>
                    </div>
                  ) : (
                    <div className="client-cards-list">
                      {getClientReservations(selectedClient.id).map((res) => {
                        const car = getCarForReservation(res);
                        const matricule = getMatriculeForReservation(res);
                        const days = res.rental_days || res.total_days || 1;
                        return (
                          <div key={res.id} className="ac-mcard">
                            <div className="ac-mcard-head">
                              <div className="ac-mcard-thumb ac-mcard-thumb-empty">
                                <Car size={22} />
                              </div>
                              <div className="ac-mcard-info">
                                <div className="ac-mcard-name">
                                  {car
                                    ? `${car.brand} ${car.model}`
                                    : "—"}
                                </div>
                                <div className="ac-mcard-sub">
                                  <span className="ac-id">#{res.id}</span>{" "}
                                  <span className="ac-model">
                                    {matricule?.matricule_code || "—"}
                                  </span>
                                </div>
                              </div>
                              <div>{getStatusBadge(res.status)}</div>
                            </div>
                            <div className="ac-mcard-meta">
                              <span>
                                <Calendar size={13} />{" "}
                                {formatDate(res.start_date)} →{" "}
                                {formatDate(res.end_date)}
                              </span>
                              <span>
                                <Clock size={13} /> {days} jours
                              </span>
                              <span>
                                <DollarSign size={13} />{" "}
                                {formatCurrency(res.total_price)}
                              </span>
                              <span>
                                <CheckCircle size={13} /> Payé{" "}
                                {formatCurrency(res.amount_paid)}
                              </span>
                              <span className={res.remaining_amount > 0 ? "text-danger" : "text-success"}>
                                <Wallet size={13} /> Reste{" "}
                                {formatCurrency(res.remaining_amount)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Accidents */}
              {activeTab === "accidents" && (
                <>
                  {getClientAccidents(selectedClient.id).length === 0 ? (
                    <div className="ac-empty-card">
                      <AlertTriangle size={40} />
                      <p>Aucun accident pour ce client</p>
                    </div>
                  ) : (
                    <div className="client-cards-list">
                      {getClientAccidents(selectedClient.id).map((acc) => {
                        const car = acc.car;
                        const matricule = acc.matricule;
                        return (
                          <div key={acc.id} className="ac-mcard">
                            <div className="ac-mcard-head">
                              <div className="ac-mcard-thumb ac-mcard-thumb-empty">
                                <AlertTriangle size={22} />
                              </div>
                              <div className="ac-mcard-info">
                                <div className="ac-mcard-name">
                                  Accident #{acc.id}
                                </div>
                                <div className="ac-mcard-sub">
                                  <span className="ac-id">
                                    {formatDate(acc.date_accident)}
                                  </span>
                                </div>
                              </div>
                              <div>{getAccidentStatusBadge(acc.status)}</div>
                            </div>
                            <div className="ac-mcard-meta">
                              <span>
                                <Car size={13} />{" "}
                                {car ? `${car.brand} ${car.model}` : "—"}
                              </span>
                              <span>
                                <IdCard size={13} />{" "}
                                {matricule?.matricule_code || "—"}
                              </span>
                              <span
                                className={`badge ${
                                  acc.accident_type === "grave"
                                    ? "badge-danger"
                                    : "badge-amber"
                                }`}
                              >
                                {acc.accident_type === "grave"
                                  ? "Accident grave"
                                  : "Accident non grave"}
                              </span>
                              <span>
                                <DollarSign size={13} /> Pertes :{" "}
                                {formatCurrency(acc.amount_of_losses)}
                              </span>
                              <span>
                                <Shield size={13} /> Assurance :{" "}
                                {formatCurrency(acc.amount_assurance)}
                              </span>
                            </div>
                            {acc.description && (
                              <div className="client-note">
                                <Info size={13} />
                                <span>{acc.description}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Paiements */}
              {activeTab === "payments" && (
                <>
                  {getClientReservations(selectedClient.id).filter(
                    (r) =>
                      getPaymentHistoryArray(r).length > 0 ||
                      (r.amount_paid || 0) > 0
                  ).length === 0 ? (
                    <div className="ac-empty-card">
                      <Wallet size={40} />
                      <p>Aucun historique de paiement</p>
                    </div>
                  ) : (
                    <div className="client-cards-list">
                      {getClientReservations(selectedClient.id)
                        .filter(
                          (r) =>
                            getPaymentHistoryArray(r).length > 0 ||
                            (r.amount_paid || 0) > 0
                        )
                        .map((res) => {
                          const car = getCarForReservation(res);
                          const paymentHistory = getPaymentHistoryArray(res);
                          return (
                            <div key={res.id} className="ac-mcard">
                              <div className="ac-mcard-head">
                                <div className="ac-mcard-thumb ac-mcard-thumb-empty">
                                  <Wallet size={22} />
                                </div>
                                <div className="ac-mcard-info">
                                  <div className="ac-mcard-name">
                                    Réservation #{res.id}
                                  </div>
                                  <div className="ac-mcard-sub">
                                    <span className="ac-model">
                                      {car
                                        ? `${car.brand} ${car.model}`
                                        : "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="ac-mcard-meta">
                                <span>
                                  <DollarSign size={13} /> Total :{" "}
                                  {formatCurrency(res.total_price)}
                                </span>
                                <span>
                                  <CheckCircle size={13} /> Payé :{" "}
                                  {formatCurrency(res.amount_paid)}
                                </span>
                                <span
                                  className={
                                    (res.remaining_amount || 0) > 0
                                      ? "text-danger"
                                      : "text-success"
                                  }
                                >
                                  <Wallet size={13} /> Reste :{" "}
                                  {formatCurrency(res.remaining_amount)}
                                </span>
                              </div>
                              <div className="client-note">
                                <History size={13} />
                                <strong>Historique des paiements</strong>
                              </div>
                              {paymentHistory.length > 0 ? (
                                <div className="payment-items">
                                  {paymentHistory.map((payment, idx) => (
                                    <div
                                      key={idx}
                                      className="payment-item"
                                    >
                                      <span>{formatDate(payment.date)}</span>
                                      <span className="payment-amount">
                                        {formatCurrency(payment.amount)}
                                      </span>
                                      <span className="payment-method">
                                        {payment.method === "cash"
                                          ? "Espèces"
                                          : payment.method === "card"
                                          ? "Carte"
                                          : payment.method === "check"
                                          ? "Chèque"
                                          : "Virement"}
                                      </span>
                                      {payment.notes && (
                                        <span className="payment-notes">
                                          ({payment.notes})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="sl-muted">
                                  Aucun paiement enregistré
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="inline-form-footer client-details-footer">
            <button
              type="button"
              className="inline-secondary-btn"
              onClick={() => setShowClientDetails(false)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ============================ FORMULAIRE ============================ */}
      {showClientForm && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              <User size={28} />
            </div>
            <div className="inline-form-title">
              <h2>{editingClient ? "Modifier le client" : "Nouveau client"}</h2>
              <p>
                {editingClient
                  ? "Modifiez les informations du client"
                  : "Ajoutez un nouveau client à votre base de données"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={closeForm}
              className="inline-form-close"
            >
              <X size={24} />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingClient) handleUpdateClient(formData);
              else handleCreateClient(formData);
            }}
            className="inline-form"
          >
            <div className="inline-form-grid">
              {/* Colonne gauche */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <User size={18} />
                    <h3>Informations personnelles</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Nom *</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.nom}
                        onChange={(e) =>
                          setFormData({ ...formData, nom: e.target.value })
                        }
                        required
                        placeholder="Dupont"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Prénom *</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.prenom}
                        onChange={(e) =>
                          setFormData({ ...formData, prenom: e.target.value })
                        }
                        required
                        placeholder="Jean"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Téléphone *</label>
                      <input
                        type="tel"
                        className="inline-input"
                        value={formData.telephone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            telephone: e.target.value,
                          })
                        }
                        required
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Email</label>
                      <input
                        type="email"
                        className="inline-input"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="client@email.com"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Ville</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        placeholder="Casablanca"
                      />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <IdCard size={18} />
                    <h3>Pièces d'identité</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Numéro CIN</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.cin_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cin_number: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="AB123456"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Numéro Permis</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.driver_license_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            driver_license_number: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="P123456"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Date naissance</label>
                      <input
                        type="date"
                        className="inline-input"
                        value={formData.date_naissance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            date_naissance: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="inline-field">
                      <label>Lieu naissance</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.lieu_naissance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lieu_naissance: e.target.value,
                          })
                        }
                        placeholder="Casablanca"
                      />
                    </div>
                    <div className="inline-field">
                      <label>CIN délivré le</label>
                      <input
                        type="date"
                        className="inline-input"
                        value={formData.cin_delivre_le}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cin_delivre_le: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="inline-field">
                      <label>Permis délivré le</label>
                      <input
                        type="date"
                        className="inline-input"
                        value={formData.permis_delivre_le}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permis_delivre_le: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne droite */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Camera size={18} />
                    <h3>Documents scannés</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Image CIN</label>
                      <div
                        className="image-upload-area"
                        onClick={() =>
                          document.getElementById("cinInput").click()
                        }
                      >
                        <Upload size={24} />
                        <p>Cliquez pour télécharger</p>
                        <p
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--tx-3)",
                          }}
                        >
                          JPG, PNG, PDF — 5MB max
                        </p>
                        <input
                          type="file"
                          id="cinInput"
                          accept="image/*,application/pdf"
                          onChange={(e) =>
                            handleFileChange("cin_image", e.target.files[0])
                          }
                          style={{ display: "none" }}
                        />
                      </div>
                      {cinPreview &&
                        renderFormDocumentPreview(cinPreview, "CIN", () => {
                          setCinPreview("");
                          setFormData({ ...formData, cin_image: "" });
                        })}
                    </div>
                    <div className="inline-field">
                      <label>Image Permis</label>
                      <div
                        className="image-upload-area"
                        onClick={() =>
                          document.getElementById("licenseInput").click()
                        }
                      >
                        <Upload size={24} />
                        <p>Cliquez pour télécharger</p>
                        <p
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--tx-3)",
                          }}
                        >
                          JPG, PNG, PDF — 5MB max
                        </p>
                        <input
                          type="file"
                          id="licenseInput"
                          accept="image/*,application/pdf"
                          onChange={(e) =>
                            handleFileChange(
                              "driver_license_image",
                              e.target.files[0]
                            )
                          }
                          style={{ display: "none" }}
                        />
                      </div>
                      {licensePreview &&
                        renderFormDocumentPreview(
                          licensePreview,
                          "Permis",
                          () => {
                            setLicensePreview("");
                            setFormData({
                              ...formData,
                              driver_license_image: "",
                            });
                          }
                        )}
                    </div>
                  </div>
                  <div className="inline-info-msg">
                    <Info size={16} />
                    <span>
                      Les documents sont optionnels mais recommandés pour les
                      dossiers clients
                    </span>
                  </div>
                </div>

                {editingClient && (
                  <div className="inline-section">
                    <div className="inline-section-header">
                      <Activity size={18} />
                      <h3>Informations système</h3>
                    </div>
                    <div className="inline-history">
                      <div className="inline-history-item">
                        <span className="inline-info-label">
                          Date de création
                        </span>
                        <span className="inline-info-value">
                          {editingClient.created_at
                            ? formatDate(editingClient.created_at)
                            : "—"}
                        </span>
                      </div>
                      <div className="inline-history-item">
                        <span className="inline-info-label">
                          Dernière modification
                        </span>
                        <span className="inline-info-value">
                          {editingClient.updated_at
                            ? formatDate(editingClient.updated_at)
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="inline-form-footer">
              <button
                type="button"
                className="inline-secondary-btn"
                onClick={closeForm}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-primary-btn"
                disabled={submitting}
              >
                {editingClient ? <Save size={16} /> : <Plus size={16} />}
                {submitting
                  ? "Traitement..."
                  : editingClient
                  ? "Mettre à jour"
                  : "Créer le client"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================== LISTE =============================== */}
      {!showClientForm && !showClientDetails && (
        <div className="ac-wrap">
          {/* Header */}
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon">
                <Users size={24} />
              </div>
              <div className="rv-head-text">
                <h1 className="rv-title">Gestion des Clients</h1>
                <p className="rv-sub">
                  Base de données clients et documents
                </p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button
                type="button"
                onClick={() => runBusy("refresh", refreshData)}
                className="ac-btn"
                disabled={!!busy.refresh}
              >
                <RefreshCw size={15} className={busy.refresh ? "rv-spin" : ""} />
                <span className="ac-btn-text">Actualiser</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="ac-btn"
              >
                <Save size={15} />
                <span className="ac-btn-text">Exporter</span>
              </button>
              <button
                type="button"
                onClick={handleAddNew}
                className="ac-btn ac-btn-primary"
              >
                <Plus size={15} />
                <span className="ac-btn-text">Nouveau client</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="rv-stats">
            {statCards.map((st) => {
              const Icon = st.Icon;
              return (
                <div key={st.label} className="rv-stat-card">
                  <div className={`rv-stat-icon rv-stat-${st.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="rv-stat-label">{st.label}</p>
                    <p className="rv-stat-value">{st.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="ac-filters">
            <div className="ac-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, email, téléphone, CIN..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="ac-search-clear"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  aria-label="Effacer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="ac-seg" role="group" aria-label="Affichage">
              <button
                type="button"
                className={`ac-seg-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => {
                  setViewMode("list");
                  setCurrentPage(1);
                }}
              >
                <List size={15} />
                <span>Liste</span>
              </button>
              <button
                type="button"
                className={`ac-seg-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => {
                  setViewMode("cards");
                  setCurrentPage(1);
                }}
              >
                <LayoutGrid size={15} />
                <span>Cartes</span>
              </button>
            </div>
          </div>

          <div className="ac-meta">
            <p>
              <strong>{filteredClients.length}</strong> client(s) trouvé(s)
            </p>
            <p>
              Page {currentPage} / {totalPages}
            </p>
          </div>

          {/* Vue LISTE */}
          {viewMode === "list" ? (
            <div className="ac-listwrap">
              {/* Desktop table */}
              <div className="ac-tablecard ac-desktop-only">
                <div className="ac-scroll">
                  <table className="ac-table">
                    <thead>
                      <tr>
                        <th
                          onClick={() => handleSort("id")}
                          className="sortable-header"
                        >
                          ID {getSortIcon("id")}
                        </th>
                        <th
                          onClick={() => handleSort("name")}
                          className="sortable-header"
                        >
                          Client {getSortIcon("name")}
                        </th>
                        <th
                          onClick={() => handleSort("telephone")}
                          className="sortable-header"
                        >
                          Contact {getSortIcon("telephone")}
                        </th>
                        <th
                          onClick={() => handleSort("cin")}
                          className="sortable-header"
                        >
                          CIN {getSortIcon("cin")}
                        </th>
                        <th>Permis</th>
                        <th
                          onClick={() => handleSort("city")}
                          className="sortable-header"
                        >
                          Ville {getSortIcon("city")}
                        </th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedClients.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="ac-empty-cell">
                            <Users size={40} />
                            <p>Aucun client trouvé</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedClients.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <span className="ac-id">#{c.id}</span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <User size={14} />
                                <span className="ac-strong">
                                  {c.prenom} {c.nom}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 2,
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  <Phone size={12} /> {c.telephone}
                                </div>
                                {c.email && (
                                  <div
                                    className="flex items-center gap-1"
                                    style={{
                                      fontSize: "0.72rem",
                                      color: "var(--tx-3)",
                                    }}
                                  >
                                    <Mail size={10} /> {c.email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              {c.cin_number ? (
                                <div className="flex items-center gap-1">
                                  <IdCard size={12} /> {c.cin_number}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {c.driver_license_number ? (
                                <div className="flex items-center gap-1">
                                  <CreditCard size={12} />{" "}
                                  {c.driver_license_number}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {c.city ? (
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} /> {c.city}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="text-right">
                              <div className="ac-actions">
                                <button
                                  type="button"
                                  onClick={() => openDetails(c)}
                                  className="ac-action-btn"
                                  style={{ color: "#1da1e8" }}
                                  title="Détails"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(c)}
                                  className="ac-action-btn ac-action-edit"
                                  title="Modifier"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(c)}
                                  className="ac-action-btn ac-action-delete"
                                  title="Supprimer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="ac-mobile-only">
                <div className="ac-sortbar">
                  <label htmlFor="cl-sort-mobile">Trier</label>
                  <AcSelect
                    id="cl-sort-mobile"
                    ariaLabel="Trier par"
                    value={sortField}
                    onChange={setSortField}
                    options={SORT_OPTIONS}
                  />
                  <button
                    type="button"
                    className="ac-sortdir"
                    onClick={() =>
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc"
                      )
                    }
                  >
                    {sortDirection === "asc" ? (
                      <ArrowUp size={18} />
                    ) : (
                      <ArrowDown size={18} />
                    )}
                  </button>
                </div>

                {paginatedClients.length === 0 ? (
                  <div className="ac-empty-card">
                    <Users size={40} />
                    <p>Aucun client trouvé</p>
                  </div>
                ) : (
                  <div className="ac-mcards">
                    {paginatedClients.map((c) => (
                      <div key={c.id} className="ac-mcard">
                        <div className="ac-mcard-head">
                          <div className="ac-mcard-thumb ac-mcard-thumb-empty">
                            <User size={22} />
                          </div>
                          <div className="ac-mcard-info">
                            <div className="ac-mcard-name">
                              {c.prenom} {c.nom}
                            </div>
                            <div className="ac-mcard-sub">
                              <span className="ac-id">#{c.id}</span>
                            </div>
                          </div>
                          <div className="ac-mcard-price">
                            {c.city || "—"}
                          </div>
                        </div>
                        <div className="ac-mcard-meta">
                          <span>
                            <Phone size={13} /> {c.telephone}
                          </span>
                          {c.email && (
                            <span>
                              <Mail size={13} /> {c.email}
                            </span>
                          )}
                          {c.cin_number && (
                            <span>
                              <IdCard size={13} /> {c.cin_number}
                            </span>
                          )}
                        </div>
                        <div className="ac-card-btns">
                          <button
                            type="button"
                            onClick={() => openDetails(c)}
                            className="ac-card-btn"
                            style={{ color: "#1da1e8" }}
                          >
                            <Eye size={17} />
                            <span>Voir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="ac-card-btn ac-action-edit"
                          >
                            <Edit2 size={17} />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(c)}
                            className="ac-card-btn ac-action-delete"
                          >
                            <Trash2 size={17} />
                            <span>Supprimer</span>
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
            /* Vue CARTES */
            <>
              <div className="ac-sortbar">
                <label htmlFor="cl-sort-cards">Trier</label>
                <AcSelect
                  id="cl-sort-cards"
                  ariaLabel="Trier par"
                  value={sortField}
                  onChange={setSortField}
                  options={SORT_OPTIONS}
                />
                <button
                  type="button"
                  className="ac-sortdir"
                  onClick={() =>
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                  }
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp size={18} />
                  ) : (
                    <ArrowDown size={18} />
                  )}
                </button>
              </div>

              {paginatedClients.length === 0 ? (
                <div className="ac-empty-card">
                  <Users size={40} />
                  <p>Aucun client trouvé</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {paginatedClients.map((c) => (
                    <div key={c.id} className="car-card">
                      <div
                        className="card-image"
                        style={{
                          background:
                            "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                        }}
                      >
                        <User
                          size={64}
                          style={{ color: "rgba(37, 99, 235, 0.55)" }}
                        />
                        <div className="card-status">
                          <span className="ac-id">#{c.id}</span>
                        </div>
                      </div>
                      <div className="card-content">
                        <div className="card-title">
                          <span>
                            {c.prenom} {c.nom}
                          </span>
                          {c.city && (
                            <span className="card-price">
                              <MapPin
                                size={14}
                                style={{ verticalAlign: "middle" }}
                              />{" "}
                              {c.city}
                            </span>
                          )}
                        </div>
                        <div className="card-details">
                          <div className="detail-item">
                            <Phone size={14} /> {c.telephone}
                          </div>
                          {c.email && (
                            <div className="detail-item">
                              <Mail size={14} /> {c.email}
                            </div>
                          )}
                          {c.cin_number && (
                            <div className="detail-item">
                              <IdCard size={14} /> {c.cin_number}
                            </div>
                          )}
                          {c.driver_license_number && (
                            <div className="detail-item">
                              <CreditCard size={14} />{" "}
                              {c.driver_license_number}
                            </div>
                          )}
                        </div>
                        <div className="ac-card-btns">
                          <button
                            type="button"
                            onClick={() => openDetails(c)}
                            className="ac-card-btn"
                            style={{ color: "#1da1e8" }}
                          >
                            <Eye size={17} />
                            <span>Voir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="ac-card-btn ac-action-edit"
                          >
                            <Edit2 size={17} />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(c)}
                            className="ac-card-btn ac-action-delete"
                          >
                            <Trash2 size={17} />
                            <span>Supprimer</span>
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

          {/* Delete modal */}
          {deleteModalOpen && clientToDelete && (
            <div
              className="modal-overlay"
              onClick={() => setDeleteModalOpen(false)}
            >
              <div
                className="modal delete-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="delete-icon">
                  <Trash2 size={32} />
                </div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">
                  Êtes-vous sûr de vouloir supprimer le client <br />
                  <span className="reservation-id">
                    {clientToDelete.prenom} {clientToDelete.nom}
                  </span>{" "}
                  ?<br />
                  Cette action est irréversible.
                </p>
                {getClientReservations(clientToDelete.id).length > 0 && (
                  <p
                    className="delete-message"
                    style={{ fontSize: "0.75rem", color: "#dc2626" }}
                  >
                    ⚠️ Ce client a{" "}
                    {getClientReservations(clientToDelete.id).length}{" "}
                    réservation(s) associée(s)
                  </p>
                )}
                <div className="delete-actions">
                  <button disabled={deleting}
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="modal-btn modal-btn-cancel"
                  >
                    Annuler
                  </button>
                  <button disabled={deleting}
                    type="button"
                    onClick={confirmDelete}
                    className="modal-btn btn-delete"
                  >
                    {deleting ? (<><span className="btn-spinner" /> Suppression...</>) : "Supprimer"}
                  </button>
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

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */
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
@keyframes acSpin { to { transform: rotate(360deg); } }
@keyframes acDdIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

/* ---------- Modals ---------- */
.rv .modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 16px;
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
  font-size: 0.88rem; font-weight: 800; cursor: pointer;
  transition: transform 0.1s;
  display: inline-flex; align-items: center; justify-content: center;
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
@media (prefers-color-scheme: dark) {
  .rv .delete-icon { background: rgba(220, 38, 38, 0.18); }
  .rv .reservation-id { background: #f2f3f5; color: #0a0a0a; }
}

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
.rv .inline-form-title h2 {
  margin: 0; color: #fff; font-size: 1.6rem; font-weight: 900;
  letter-spacing: -0.01em; line-height: 1.1;
}
.rv .inline-form-title p { margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; }
.rv .inline-form-close {
  position: absolute; top: 50%; right: 22px; transform: translateY(-50%);
  width: 44px; height: 44px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.35); background: transparent; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
}
.rv .inline-form-close:hover {
  background: var(--acc); border-color: var(--acc); color: #0a0a0a;
  transform: translateY(-50%) rotate(90deg);
}
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
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx);
  white-space: nowrap;
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
.rv .inline-select {
  width: 100%; min-height: 44px; padding: 10px 14px;
  border: 1.5px solid var(--line); border-radius: 12px;
  background: var(--surface); color: var(--tx);
  font-size: 0.9rem; font-family: inherit; transition: border-color 0.15s;
}
.rv .inline-input:focus,
.rv .inline-select:focus { outline: none; border-color: var(--blue); }
.rv .inline-input::placeholder { color: var(--tx-3); }

.rv .inline-info-msg {
  display: flex; align-items: center; gap: 10px;
  margin-top: 14px; padding: 11px 14px; border-radius: 12px;
  font-size: 0.78rem; font-weight: 700; border: 1.5px solid;
  background: rgba(29,161,232,0.12); border-color: var(--blue); color: var(--blue-d);
}
.rv .inline-info-msg svg { flex-shrink: 0; }
.rv .inline-info-label {
  font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--tx-2);
}
.rv .inline-info-value { font-size: 0.85rem; font-weight: 800; color: var(--tx); }

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
.rv .inline-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rv .inline-form-footer {
  display: flex; justify-content: flex-end; gap: 14px;
  margin-top: 24px; padding-top: 22px; border-top: 2px dotted var(--line);
}
.rv .inline-history {
  background: var(--surface); border: 1.5px solid var(--line);
  border-radius: 16px; overflow: hidden;
}
.rv .inline-history-item {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 10px 16px; border-bottom: 1.5px dotted var(--line);
}
.rv .inline-history-item:last-child { border-bottom: 0; }

/* ---------- Layout général ---------- */
.rv .ac-wrap { width: 100%; max-width: none; margin: 0; padding: 1.5rem; }
.rv .rv-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;
}
.rv .rv-head-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.rv .rv-head-icon {
  width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  display: flex; align-items: center; justify-content: center; color: #fff;
  box-shadow: 0 8px 24px -6px rgba(245, 158, 11, 0.5);
}
.rv .rv-title {
  margin: 0; font-size: 1.75rem; font-weight: 800;
  line-height: 1.15; letter-spacing: -0.02em; color: var(--tx);
}
.rv .rv-sub { margin: 2px 0 0; font-size: 0.85rem; color: var(--tx-2); }
.rv .rv-head-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.rv .ac-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: 38px; padding: 0 16px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--surface); color: var(--tx);
  font-size: 0.8rem; font-weight: 600; white-space: nowrap; cursor: pointer;
  transition: all 0.2s ease;
}
.rv .ac-btn:hover {
  background: var(--surface-2); border-color: var(--tx-3); transform: translateY(-1px);
}
.rv .ac-btn-primary {
  background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 14px -4px rgba(15, 23, 42, 0.4);
}
.rv .ac-btn-primary:hover {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-color: transparent;
  box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.5);
}

/* ---------- Stats ---------- */
.rv .rv-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px; margin-bottom: 1.5rem;
}
.rv .rv-stat-card {
  display: flex; align-items: center; gap: 12px; padding: 16px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  transition: transform 0.25s, box-shadow 0.25s;
}
.rv .rv-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
}
.rv .rv-stat-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.rv .rv-stat-blue { background: #dbeafe; color: #2563eb; }
.rv .rv-stat-green { background: #dcfce7; color: #16a34a; }
.rv .rv-stat-red { background: #fee2e2; color: #dc2626; }
.rv .rv-stat-cyan { background: #cffafe; color: #0891b2; }
.rv .rv-stat-violet { background: #f3e8ff; color: #8b5cf6; }
.rv .rv-stat-label {
  margin: 0; font-size: 0.72rem; font-weight: 600; color: var(--tx-2);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.rv .rv-stat-value {
  margin: 2px 0 0; font-size: 1.4rem; font-weight: 800;
  line-height: 1.1; color: var(--tx);
}
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
.rv .ac-search > svg {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--tx-3); pointer-events: none;
}
.rv .ac-search input {
  width: 100%; height: 38px; padding: 0 38px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--surface-2); color: var(--tx);
  font-size: 0.8rem; font-family: inherit; transition: all 0.2s;
}
.rv .ac-search input::placeholder { color: var(--tx-3); }
.rv .ac-search input:focus {
  outline: none; border-color: #eab308;
  box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.12); background: var(--surface);
}
.rv .ac-search-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 20px; height: 20px; border-radius: 50%; border: 0;
  background: var(--line); color: var(--tx-2);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.rv .ac-seg {
  display: inline-flex; padding: 3px; gap: 3px; border-radius: 12px;
  background: var(--surface-2); border: 1px solid var(--line);
}
.rv .ac-seg-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  border: 0; border-radius: 9px; background: transparent; color: var(--tx-2);
  font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.rv .ac-seg-btn:hover:not(.active) { color: var(--tx); }
.rv .ac-seg-btn.active { background: #fef3c7; color: #92400e; }
@media (prefers-color-scheme: dark) {
  .rv .ac-seg-btn.active { background: #422006; color: #fde68a; }
}

.rv .ac-meta {
  display: flex; justify-content: space-between; padding: 0 4px;
  margin-bottom: 12px; font-size: 0.78rem; color: var(--tx-2);
}
.rv .ac-meta p { margin: 0; }
.rv .ac-meta strong { color: var(--tx); font-weight: 700; }

/* ---------- Table ---------- */
.rv .ac-tablecard {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 16px; overflow: hidden;
}
.rv .ac-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.rv .ac-table {
  width: 100%; min-width: 900px; border-collapse: collapse; font-size: 0.82rem;
}
.rv .ac-table th {
  text-align: left; padding: 12px 16px; background: var(--surface-2); color: var(--tx-2);
  font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; white-space: nowrap;
}
.rv .ac-table td {
  padding: 12px 16px; border-top: 1px solid var(--line);
  color: var(--tx); vertical-align: middle;
}
.rv .ac-table td { transition: background 0.15s; }
.rv .ac-table tbody tr:hover td { background: var(--surface-2); }
.rv .ac-table tbody tr td:first-child {
  box-shadow: inset 3px 0 0 transparent;
  transition: box-shadow 0.15s, background 0.15s;
}
.rv .ac-table tbody tr:hover td:first-child {
  box-shadow: inset 3px 0 0 #eab308;
}
.rv .ac-table .text-right { text-align: right; }
.rv .sortable-header { cursor: pointer; user-select: none; transition: background 0.2s; }
.rv .sortable-header:hover { background: var(--line) !important; }
.rv .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.4; vertical-align: middle; }
.rv .sort-icon.active { opacity: 1; color: #eab308; }
.rv .ac-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem; font-weight: 600;
  background: var(--surface-2); color: var(--tx-2);
  padding: 2px 8px; border-radius: 6px; border: 1px solid var(--line);
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
.rv .ac-empty-cell {
  text-align: center; padding: 48px 20px !important; color: var(--tx-3) !important;
}
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
.rv .badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap;
}
.rv .badge-success { background: #dcfce7; color: #166534; }
.rv .badge-danger { background: #fee2e2; color: #991b1b; }
.rv .badge-amber { background: #fef3c7; color: #92400e; }
.rv .badge-blue { background: #dbeafe; color: #1e40af; }
.rv .badge-emerald { background: #d1fae5; color: #065f46; }
.rv .badge-purple { background: #f3e8ff; color: #6b21a5; }
.rv .text-danger { color: #dc2626; }
.rv .text-success { color: #16a34a; }
@media (prefers-color-scheme: dark) {
  .rv .badge-success { background: #14532d; color: #4ade80; }
  .rv .badge-danger { background: #7f1d1d; color: #fca5a5; }
  .rv .badge-amber { background: #78350f; color: #fde68a; }
  .rv .badge-blue { background: #1e3a5f; color: #60a5fa; }
  .rv .badge-emerald { background: #064e3b; color: #34d399; }
  .rv .badge-purple { background: #4c1d95; color: #c084fc; }
  .rv .text-danger { color: #f87171; }
  .rv .text-success { color: #4ade80; }
}

/* ---------- Actions ---------- */
.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
.rv .ac-action-btn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: transparent; border-radius: 8px;
  cursor: pointer; transition: all 0.2s;
}
.rv .ac-action-edit { color: #10b981; }
.rv .ac-action-delete { color: #ef4444; }
.rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
.rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
@media (prefers-color-scheme: dark) {
  .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
  .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
}

/* ---------- Cartes mobile ---------- */
.rv .ac-mcards { display: flex; flex-direction: column; gap: 10px; }
.rv .ac-mcard {
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.rv .ac-mcard-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .ac-mcard-thumb {
  width: 64px; height: 48px; object-fit: cover; border-radius: 12px;
  border: 1px solid var(--line); flex-shrink: 0;
}
.rv .ac-mcard-thumb-empty {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #2563eb;
}
.rv .ac-mcard-info { flex: 1; min-width: 0; }
.rv .ac-mcard-name {
  font-weight: 700; font-size: 0.95rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rv .ac-mcard-sub { margin-top: 3px; }
.rv .ac-mcard-price { font-weight: 800; font-size: 0.95rem; white-space: nowrap; color: var(--tx-2); }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rv .ac-mcard-meta {
  display: flex; flex-wrap: wrap; gap: 6px 14px;
  margin-bottom: 12px; font-size: 0.75rem; color: var(--tx-2);
}
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; }

/* ---------- Boutons libellés (cartes) ---------- */
.rv .ac-card-btns {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
  padding-top: 12px; border-top: 1px solid var(--line);
}
.rv .ac-card-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
  background: var(--surface-2); cursor: pointer; transition: all 0.2s;
}
.rv .ac-card-btn span {
  font-size: 0.64rem; font-weight: 700; letter-spacing: 0.02em;
  color: var(--tx-2); line-height: 1;
}
.rv .ac-card-btn:active { transform: scale(0.96); }
.rv .ac-card-btn.ac-action-edit:hover,
.rv .ac-card-btn.ac-action-edit:active { background: #ecfdf5; }
.rv .ac-card-btn.ac-action-delete:hover,
.rv .ac-card-btn.ac-action-delete:active { background: #fef2f2; }
@media (prefers-color-scheme: dark) {
  .rv .ac-card-btn.ac-action-edit:hover,
  .rv .ac-card-btn.ac-action-edit:active { background: #064e3b; }
  .rv .ac-card-btn.ac-action-delete:hover,
  .rv .ac-card-btn.ac-action-delete:active { background: #7f1d1d; }
}

/* ---------- Vue Cartes ---------- */
.rv .cards-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
}
.rv .car-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
}
.rv .car-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18);
}
.rv .card-image {
  position: relative; height: 160px; background: var(--surface-2);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.rv .card-status { position: absolute; top: 0.75rem; right: 0.75rem; }
.rv .card-content { padding: 16px; }
.rv .card-title {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  margin-bottom: 0.5rem; font-size: 1.05rem; font-weight: 700;
}
.rv .card-price {
  font-size: 0.85rem; font-weight: 600; color: var(--tx-2);
  white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;
}
.rv .card-price small { font-size: 0.7rem; font-weight: 500; margin-left: 2px; }
.rv .card-details {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;
  margin: 0.75rem 0; padding: 0.75rem 0;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
}
.rv .detail-item {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.75rem; color: var(--tx-2); min-width: 0;
}

/* ---------- Sort bar ---------- */
.rv .ac-sortbar {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.rv .ac-sortbar label {
  font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--tx-2);
}
.rv .ac-sortbar .ac-dd { flex: 1; min-width: 0; }
.rv .ac-sortdir {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
  border: 1px solid var(--line); background: var(--surface); color: var(--tx);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
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
  font-size: 0.88rem; font-weight: 600; font-family: inherit; text-align: left;
  cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
}
.rv .ac-dd-trigger span {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rv .ac-dd-trigger:hover { border-color: var(--tx-3); }
.rv .ac-dd-trigger.open {
  border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.14);
}
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
  padding: 11px 12px; border: 0; border-radius: 10px;
  background: transparent; color: var(--tx);
  font-size: 0.88rem; font-weight: 600; font-family: inherit; text-align: left; cursor: pointer;
}
.rv .ac-dd-item:hover { background: var(--surface-2); }
.rv .ac-dd-item.active { background: #fef3c7; color: #92400e; font-weight: 700; }
@media (prefers-color-scheme: dark) {
  .rv .ac-dd-item.active { background: #422006; color: #fde68a; }
  .rv .ac-dd-menu { box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.6); }
}

/* ---------- Pagination ---------- */
.rv .ac-pager {
  margin-top: 16px; background: var(--surface); border: 1px solid var(--line);
  border-radius: 16px; overflow: hidden;
}

/* ---------- Loader ---------- */
.rv .loading {
  text-align: center; padding: 4rem 1rem; color: var(--tx-2); font-weight: 700;
}
.rv .spinner {
  display: inline-block; width: 40px; height: 40px; margin-bottom: 12px;
  border-radius: 50%; border: 4px solid var(--line);
  border-top-color: #eab308; animation: acSpin 0.7s linear infinite;
}

/* ---------- Upload ---------- */
.rv .image-upload-area {
  border: 2px dashed var(--line-strong); border-radius: 16px; padding: 20px 12px;
  text-align: center; cursor: pointer; background: var(--surface); color: var(--tx-2);
  transition: all 0.2s;
}
.rv .image-upload-area p { margin: 6px 0 0; font-size: 0.78rem; font-weight: 700; }
.rv .image-upload-area svg { color: var(--acc-tx); }
.rv .image-upload-area:hover { border-color: var(--acc); background: rgba(234, 179, 8, 0.08); }
.rv .image-preview-container { margin-top: 12px; text-align: center; }
.rv .image-preview {
  width: 130px; height: 130px; object-fit: cover; border-radius: 14px;
  border: 1.5px solid var(--line-strong);
}
.rv .remove-image-btn {
  display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; padding: 6px 14px;
  border-radius: 999px; border: 1.5px solid var(--danger); background: transparent; color: var(--danger);
  font-size: 0.72rem; font-weight: 800; cursor: pointer;
}
.rv .remove-image-btn:hover { background: var(--danger); color: #fff; }

/* ---------- Client - profil & détails ---------- */
.rv .client-profile-section {
  background: var(--surface-2); border: 1.5px solid var(--line);
  border-radius: 20px; padding: 24px; margin-bottom: 20px;
}
.rv .client-profile-header {
  display: flex; align-items: center; gap: 20px;
  margin-bottom: 20px; flex-wrap: wrap;
}
.rv .client-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  background: var(--ink); color: var(--acc);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.rv .client-profile-info { min-width: 0; flex: 1; }
.rv .client-profile-info h3 {
  margin: 0 0 8px; font-size: 1.35rem; font-weight: 900; color: var(--tx);
}
.rv .client-profile-details {
  display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.82rem; color: var(--tx-2);
}
.rv .client-profile-details span { display: inline-flex; align-items: center; gap: 6px; }
.rv .client-profile-actions { margin-left: auto; }

.rv .client-identity-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px; padding-top: 16px; border-top: 1.5px dotted var(--line);
}
.rv .identity-item { display: flex; flex-direction: column; gap: 4px; }

.rv .client-documents {
  margin-top: 18px; padding-top: 16px; border-top: 1.5px dotted var(--line);
}
.rv .client-documents h4 {
  margin: 0 0 12px; font-size: 0.8rem; font-weight: 900;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--tx-2);
}
.rv .documents-grid { display: flex; gap: 14px; flex-wrap: wrap; }
.rv .document-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  min-width: 140px;
}
.rv .document-image {
  width: 110px; height: 110px; object-fit: cover;
  border-radius: 10px; border: 1px solid var(--line);
}
.rv .document-label {
  font-size: 0.7rem; font-weight: 700; color: var(--tx-2);
  text-transform: uppercase; letter-spacing: 0.04em;
}

/* PDF */
.rv .pdf-icon-wrapper {
  display: flex; align-items: center; justify-content: center;
  width: 72px; height: 72px; border-radius: 12px;
  background: #fef3c7; color: #b45309;
}
.rv .pdf-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.rv .pdf-actions.small .pdf-action-btn { font-size: 0.68rem; padding: 4px 8px; }
.rv .pdf-action-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 12px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 700;
  text-decoration: none; cursor: pointer; border: 0;
  transition: background 0.15s;
}
.rv .pdf-action-btn.view { background: #dbeafe; color: #1e40af; }
.rv .pdf-action-btn.view:hover { background: #bfdbfe; }
.rv .pdf-action-btn.download { background: #e0f2fe; color: #0369a1; }
.rv .pdf-action-btn.download:hover { background: #b8e2f8; }
.rv .pdf-preview-container {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 12px; background: #fefce8; border-radius: 12px;
  border: 1px solid #fde047;
}
.rv .pdf-preview-container .pdf-icon-wrapper { width: 60px; height: 60px; }

@media (prefers-color-scheme: dark) {
  .rv .pdf-icon-wrapper { background: #422006; color: #fde047; }
  .rv .pdf-action-btn.view { background: #1e3a5f; color: #60a5fa; }
  .rv .pdf-action-btn.view:hover { background: #1e4a7a; }
  .rv .pdf-action-btn.download { background: #164e63; color: #67e8f9; }
  .rv .pdf-action-btn.download:hover { background: #1e6b80; }
  .rv .pdf-preview-container { background: #422006; border-color: #713f12; }
}

.rv .client-stats-section { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.rv .client-stats-section .rv-stat-card { min-width: 0; }
.rv .client-stats-section .rv-stat-card > div:last-child { min-width: 0; }
.rv .client-stats-section .rv-stat-value { font-size: 1.25rem; }
.rv .client-stats-section .rv-stat-unit {
  margin-left: 4px; font-size: 0.68rem; font-weight: 700; color: var(--tx-2);
}
.rv .client-details-body { padding: 28px; }
.rv .client-details-footer { padding: 20px 28px; }

/* Client stats section */
.rv .client-stats-section { margin-bottom: 20px; }

/* Client tabs */
.rv .client-tabs {
  display: flex; gap: 8px; flex-wrap: wrap;
  border-bottom: 2px dotted var(--line); padding-bottom: 12px;
  margin-bottom: 20px;
}
.rv .client-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 999px;
  border: 1.5px solid var(--line); background: var(--surface); color: var(--tx-2);
  font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.rv .client-tab:hover:not(.active) { border-color: var(--tx-3); color: var(--tx); }
.rv .client-tab.active { background: var(--acc); border-color: var(--acc); color: #0a0a0a; }

/* Client cards list */
.rv .client-cards-list { display: flex; flex-direction: column; gap: 10px; }
.rv .client-note {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 12px; margin-top: 8px;
  background: var(--surface-2); border: 1px dashed var(--line); border-radius: 10px;
  font-size: 0.76rem; color: var(--tx-2);
}

/* Payment items */
.rv .payment-items {
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
}
.rv .payment-item {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--line);
  font-size: 0.74rem; color: var(--tx-2);
}
.rv .payment-amount { font-weight: 800; color: var(--acc-tx); }
.rv .payment-method {
  padding: 2px 8px; border-radius: 999px;
  background: var(--surface-2); font-size: 0.66rem; font-weight: 700;
}
.rv .payment-notes { color: var(--tx-3); font-style: italic; }
.rv .sl-muted { color: var(--tx-3); font-size: 0.8rem; font-style: italic; margin: 0; }

/* ---------- Responsive ---------- */
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
  .rv .ac-seg { align-self: stretch; }
  .rv .ac-seg-btn { flex: 1; justify-content: center; }
  .rv .ac-desktop-only { display: none !important; }
  .rv .ac-mobile-only { display: block !important; }
  .rv .cards-grid { grid-template-columns: 1fr; }
  .rv .client-profile-header { flex-direction: column; align-items: flex-start; }
  .rv .client-profile-actions { margin-left: 0; }
}
@media (max-width: 640px) {
  .rv .inline-form-container { margin: 0.6rem; border-radius: 22px; }
  .rv .inline-form-header { padding: 18px 64px 18px 18px; gap: 14px; }
  .rv .inline-form-icon { width: 48px; height: 48px; border-radius: 14px; }
  .rv .inline-form-title h2 { font-size: 1.2rem; }
  .rv .inline-form-close { right: 14px; width: 40px; height: 40px; }
  .rv .inline-form { padding: 16px; }
  .rv .inline-section { padding: 16px; border-radius: 18px; }
  .rv .inline-form-grid { grid-template-columns: 1fr; }
  .rv .inline-form-footer { flex-direction: column-reverse; }
  .rv .inline-form-footer > * { width: 100%; }
  .rv .modal-overlay { align-items: flex-end; padding: 0; }
  .rv .modal {
    max-width: 100% !important; max-height: 92vh;
    border-radius: 24px 24px 0 0; border-bottom: 0;
    animation: rvSheet 0.28s ease;
  }
  .rv .delete-actions { flex-direction: column-reverse; gap: 10px; }
  .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }
  .rv .inline-input { font-size: 16px; }
  .rv .inline-primary-btn,
  .rv .inline-secondary-btn { min-height: 48px; }
  .rv .delete-modal {
    padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px));
  }
  .rv .client-tabs { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 8px; }
  .rv .client-tab { white-space: nowrap; flex-shrink: 0; }
}
@media (max-width: 640px) {
  /* ----- Détails du client (mobile) ----- */
  .rv .client-details-body { padding: 14px; }
  .rv .client-details-footer { padding: 14px; }

  .rv .client-profile-section { padding: 16px; border-radius: 18px; margin-bottom: 14px; }
  .rv .client-profile-header {
    flex-direction: column; align-items: center; text-align: center;
    gap: 12px; margin-bottom: 16px;
  }
  .rv .client-avatar { width: 64px; height: 64px; }
  .rv .client-profile-info { width: 100%; flex: 0 0 auto; }
  .rv .client-profile-info h3 { font-size: 1.15rem; margin-bottom: 8px; overflow-wrap: anywhere; }
  .rv .client-profile-details { justify-content: center; gap: 8px 14px; }
  .rv .client-profile-details span { min-width: 0; overflow-wrap: anywhere; text-align: left; }
  .rv .client-profile-actions { width: 100%; margin-left: 0; }
  .rv .client-profile-actions .inline-primary-btn { width: 100%; min-height: 48px; justify-content: center; }

  .rv .client-identity-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .rv .identity-item { min-width: 0; padding: 10px 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
  .rv .identity-item .inline-info-value { overflow-wrap: anywhere; }

  .rv .documents-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .rv .document-card { min-width: 0; padding: 10px; }
  .rv .document-image { width: 100%; height: auto; aspect-ratio: 1 / 1; }

  .rv .client-stats-section { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
  .rv .client-stats-section .rv-stat-card { padding: 12px; gap: 10px; min-width: 0; }
  .rv .client-stats-section .rv-stat-card > div:last-child { min-width: 0; }
  .rv .client-stats-section .rv-stat-card:last-child:nth-child(odd) { grid-column: 1 / -1; }
  .rv .client-stats-section .rv-stat-icon { width: 34px; height: 34px; border-radius: 10px; }
  .rv .client-stats-section .rv-stat-label { font-size: 0.62rem; letter-spacing: 0.03em; }
  .rv .client-stats-section .rv-stat-value { font-size: 1.05rem; overflow-wrap: anywhere; }
  .rv .client-stats-section .rv-stat-unit { font-size: 0.62rem; margin-left: 3px; }

  .rv .client-tabs { margin-bottom: 14px; padding-bottom: 10px; scrollbar-width: none; }
  .rv .client-tabs::-webkit-scrollbar { display: none; }
  .rv .client-tab { padding: 9px 14px; }

  .rv .client-cards-list .ac-mcard { padding: 14px; }
  .rv .client-cards-list .ac-mcard-head { gap: 10px; }
  .rv .client-cards-list .ac-mcard-thumb { width: 48px; height: 44px; }
  .rv .client-cards-list .ac-mcard-head > div:last-child:not(.ac-mcard-info) { flex-shrink: 0; }
  .rv .client-cards-list .ac-mcard-meta { flex-direction: column; align-items: flex-start; gap: 6px; }
  .rv .client-cards-list .ac-mcard-meta span { max-width: 100%; }
  .rv .client-note { overflow-wrap: anywhere; }
  .rv .payment-items { flex-direction: column; }
  .rv .payment-item { width: 100%; flex-wrap: wrap; }
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
  .rv *, .rv *::before, .rv *::after {
    animation: none !important; transition: none !important;
  }
}
    `}</style>
  );
}