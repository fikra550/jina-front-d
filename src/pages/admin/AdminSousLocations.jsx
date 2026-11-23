// src/pages/admin/AdminSousLocations.jsx
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import {
  fetchSousLocations,
  selectSousLocations,
  selectSousLocationsLoading,
  fetchSousLocationDetails,
  selectSelectedSousLocation,
  clearSelectedSousLocation,
  deleteSousLocation,
  createSousLocation,
  updateSousLocation,
} from "../../Redux/store";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Search, RefreshCw, Save,
  ArrowUpDown, ArrowUp, ArrowDown,
  MapPin, Tag, Calendar, List, LayoutGrid,
  CheckCircle2, AlertCircle, Info, Activity, Check, ChevronDown,
  FileText, Users
} from "lucide-react";

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
  { value: "status", label: "Statut" },
  { value: "reservations", label: "Réservations" },
  { value: "created_at", label: "Date de création" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
];

/* -------------------------------------------------------------------------- */
/*                                  Composant                                 */
/* -------------------------------------------------------------------------- */
export default function AdminSousLocations() {
  const dispatch = useDispatch();
  const sousLocations = useSelector(selectSousLocations);
  const loading = useSelector(selectSousLocationsLoading);
  const selected = useSelector(selectSelectedSousLocation);

  /* ------------------------------- UI state ------------------------------ */
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
  const [itemToDelete, setItemToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("list");
  const [expandedId, setExpandedId] = useState(null);

  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
  });

  /* ------------------------------ Init data ------------------------------ */
  useEffect(() => {
    dispatch(fetchSousLocations());
  }, [dispatch]);

  useResetScrollOnOpen([
  showForm,
  deleteModalOpen,
]);

  /* ------------------------------- Helpers ------------------------------- */
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

  const filteredItems = sousLocations
    .filter((sl) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        sl.name?.toLowerCase().includes(q) ||
        sl.description?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "name":
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        case "reservations":
          aVal = a.reservations_count || 0;
          bVal = b.reservations_count || 0;
          break;
        case "created_at":
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const itemsPerView =
    viewMode === "list" ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredItems.length / itemsPerView) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerView,
    currentPage * itemsPerView
  );

  /* ---------------------------- Expand handler --------------------------- */
  const handleToggleDetails = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      dispatch(clearSelectedSousLocation());
    } else {
      setExpandedId(id);
      dispatch(fetchSousLocationDetails(id));
    }
  };

  /* -------------------------- Create / Edit form ------------------------- */
  const openCreateForm = () => {
    setEditingItem(null);
    setFormData({ name: "", description: "", status: "active" });
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      status: item.status || "active",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({ name: "", description: "", status: "active" });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        await dispatch(
          updateSousLocation({ id: editingItem.id, data: formData })
        ).unwrap();
        toast.success("Sous-location modifiée avec succès!");
      } else {
        await dispatch(createSousLocation(formData)).unwrap();
        toast.success("Sous-location créée avec succès!");
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({ name: "", description: "", status: "active" });
      await dispatch(fetchSousLocations(true));
    } catch (err) {
      toast.error(err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------ Delete flow ---------------------------- */
  const handleDeleteClick = (item) => {
    setItemToDelete(item);
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
    if (!itemToDelete) return;
    try {
      await dispatch(deleteSousLocation(itemToDelete.id)).unwrap();
      toast.success("Sous-location supprimée avec succès");
      if (expandedId === itemToDelete.id) {
        setExpandedId(null);
        dispatch(clearSelectedSousLocation());
      }
      await dispatch(fetchSousLocations(true));
    } catch (err) {
      toast.error(err?.message || "Erreur lors de la suppression");
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  /* ------------------------------ Refresh / export ----------------------- */
  const refreshData = async () => {
    await dispatch(fetchSousLocations(true));
    toast.success("Liste actualisée");
  };

  const handleExport = () => {
    if (filteredItems.length === 0) {
      toast.warning("Aucune sous-location à exporter");
      return;
    }
    const headers = [
      "ID",
      "Nom",
      "Description",
      "Statut",
      "Réservations",
      "Créé le",
    ];
    const csvData = filteredItems.map((sl) =>
      [
        sl.id,
        `"${(sl.name || "").replace(/"/g, '""')}"`,
        `"${(sl.description || "").replace(/"/g, '""')}"`,
        sl.status === "active" ? "Actif" : "Inactif",
        sl.reservations_count || 0,
        sl.created_at ? new Date(sl.created_at).toLocaleDateString("fr-FR") : "",
      ].join(",")
    );
    const blob = new Blob(
      ["\uFEFF" + headers.join(",") + "\n" + csvData.join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sous_locations_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  /* ------------------------------- Badges -------------------------------- */
  const getStatusBadge = (status) => {
    if (status === "active")
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={12} /> Actif
        </span>
      );
    return (
      <span className="badge badge-danger">
        <AlertCircle size={12} /> Inactif
      </span>
    );
  };

  const getReservationBadgeClass = (status) => {
    const map = {
      pending: "badge-amber",
      confirmed: "badge-blue",
      active: "badge-emerald",
      completed: "badge-success",
      cancelled: "badge-danger",
    };
    return map[status] || "badge-blue";
  };

  /* -------------------------------- Stats -------------------------------- */
  const stats = {
    total: sousLocations.length,
    active: sousLocations.filter((s) => s.status === "active").length,
    inactive: sousLocations.filter((s) => s.status === "inactive").length,
    reservations: sousLocations.reduce(
      (sum, s) => sum + (s.reservations_count || 0),
      0
    ),
  };

  const statCards = [
    {
      label: "Total",
      value: stats.total,
      icon: <MapPin size={20} />,
      color: "blue",
    },
    {
      label: "Actives",
      value: stats.active,
      icon: <CheckCircle2 size={20} />,
      color: "green",
    },
    {
      label: "Inactives",
      value: stats.inactive,
      icon: <AlertCircle size={20} />,
      color: "red",
    },
    {
      label: "Réservations",
      value: stats.reservations,
      icon: <Calendar size={20} />,
      color: "cyan",
    },
  ];

  /* ------------------------------- Pagination ---------------------------- */
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
        totalItems={filteredItems.length}
      />
    </div>
  );

  /* ------------------------------ Render --------------------------------- */
  if (loading) {
    return (
      <div className="rv">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement des sous-locations...</p>
        </div>
        <Styles />
      </div>
    );
  }

  return (
    <div className="rv">
      {showForm ? (
        /* ============================== FORMULAIRE ============================== */
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              <MapPin size={28} />
            </div>
            <div className="inline-form-title">
              <h2>
                {editingItem
                  ? "Modifier la sous-location"
                  : "Nouvelle sous-location"}
              </h2>
              <p>
                {editingItem
                  ? "Modifiez les informations de la sous-location"
                  : "Ajoutez une nouvelle sous-location à votre flotte"}
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

          <form onSubmit={handleSubmitForm} className="inline-form">
            <div
              className="inline-form-grid"
              style={{ gridTemplateColumns: "1fr" }}
            >
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Tag size={18} />
                    <h3>Informations de la sous-location</h3>
                  </div>
                  <div
                    className="inline-grid-2"
                    style={{ gridTemplateColumns: "1fr" }}
                  >
                    <div className="inline-field">
                      <label>Nom *</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        placeholder="Ex: Location groupe, Partenaire Nord..."
                      />
                    </div>
                    <div className="inline-field">
                      <label>Description</label>
                      <textarea
                        className="inline-input"
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Description facultative..."
                      />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <AcSelect
                        id="sl-status"
                        ariaLabel="Statut"
                        value={formData.status}
                        onChange={(v) =>
                          setFormData({ ...formData, status: v })
                        }
                        options={STATUS_OPTIONS}
                      />
                    </div>
                  </div>
                  <div className="inline-info-msg">
                    <Info size={16} />
                    <span>
                      Une sous-location inactive n'apparaîtra plus dans les
                      sélections de réservation
                    </span>
                  </div>
                </div>

                {editingItem && (
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
                          {editingItem.created_at
                            ? new Date(
                                editingItem.created_at
                              ).toLocaleDateString("fr-FR")
                            : "—"}
                        </span>
                      </div>
                      <div className="inline-history-item">
                        <span className="inline-info-label">
                          Nombre de réservations
                        </span>
                        <span className="inline-info-value">
                          {editingItem.reservations_count || 0}
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
                {editingItem ? <Save size={16} /> : <Plus size={16} />}
                {submitting
                  ? "Traitement..."
                  : editingItem
                  ? "Mettre à jour"
                  : "Créer la sous-location"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ================================ LISTE ================================ */
        <div className="ac-wrap">
          {/* Header */}
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon">
                <MapPin size={24} />
              </div>
              <div className="rv-head-text">
                <h1 className="rv-title">Sous-locations</h1>
                <p className="rv-sub">
                  Gérez vos sous-locations et leurs réservations associées
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
                onClick={openCreateForm}
                className="ac-btn ac-btn-primary"
              >
                <Plus size={15} />
                <span className="ac-btn-text">Nouvelle sous-location</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="rv-stats">
            {statCards.map((st) => (
              <div key={st.label} className="rv-stat-card">
                <div className={`rv-stat-icon rv-stat-${st.color}`}>
                  {st.icon}
                </div>
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
                placeholder="Rechercher par nom ou description..."
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
              <strong>{filteredItems.length}</strong> sous-location(s) trouvée(s)
            </p>
            <p>
              Page {currentPage} / {totalPages}
            </p>
          </div>

          {/* =================== VUE LISTE =================== */}
          {viewMode === "list" ? (
            <div className="ac-listwrap">
              {/* ---- Desktop table ---- */}
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
                          Nom {getSortIcon("name")}
                        </th>
                        <th>Description</th>
                        <th
                          onClick={() => handleSort("reservations")}
                          className="sortable-header"
                        >
                          Réservations {getSortIcon("reservations")}
                        </th>
                        <th
                          onClick={() => handleSort("status")}
                          className="sortable-header"
                        >
                          Statut {getSortIcon("status")}
                        </th>
                        <th
                          onClick={() => handleSort("created_at")}
                          className="sortable-header"
                        >
                          Créé le {getSortIcon("created_at")}
                        </th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="ac-empty-cell">
                            <MapPin size={40} />
                            <p>Aucune sous-location trouvée</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((sl) => {
                          const isExpanded = expandedId === sl.id;
                          return (
                            <>
                              <tr key={sl.id}>
                                <td>
                                  <span className="ac-id">#{sl.id}</span>
                                </td>
                                <td className="ac-strong">{sl.name}</td>
                                <td
                                  className="ac-model"
                                  style={{
                                    maxWidth: 280,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {sl.description || "—"}
                                </td>
                                <td>
                                  <span className="ac-price-pill">
                                    <Calendar size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                    {sl.reservations_count || 0}
                                  </span>
                                </td>
                                <td>{getStatusBadge(sl.status)}</td>
                                <td>
                                  <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {sl.created_at
                                      ? new Date(
                                          sl.created_at
                                        ).toLocaleDateString("fr-FR")
                                      : "—"}
                                  </div>
                                </td>
                                <td className="text-right">
                                  <div className="ac-actions">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDetails(sl.id)}
                                      className="ac-action-btn"
                                      style={{ color: "#1da1e8" }}
                                      title="Voir les détails"
                                    >
                                      <FileText size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditForm(sl)}
                                      className="ac-action-btn ac-action-edit"
                                      title="Modifier"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteClick(sl)}
                                      className="ac-action-btn ac-action-delete"
                                      title="Supprimer"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr key={`details-${sl.id}`}>
                                  <td colSpan="7" className="sl-details-cell">
                                    <div className="sl-details-panel">
                                      {!selected || selected.id !== sl.id ? (
                                        <p className="sl-muted">
                                          Chargement des détails...
                                        </p>
                                      ) : (
                                        <>
                                          <div className="sl-details-section">
                                            <h4>
                                              <FileText size={14} /> Description
                                            </h4>
                                            <p>
                                              {selected.description ||
                                                "Aucune description fournie."}
                                            </p>
                                          </div>
                                          <div className="sl-details-section">
                                            <h4>
                                              <Calendar size={14} />{" "}
                                              Réservations associées (
                                              {selected.reservations?.length ||
                                                0}
                                              )
                                            </h4>
                                            {selected.reservations &&
                                            selected.reservations.length > 0 ? (
                                              <div className="sl-reservations-list">
                                                {selected.reservations.map(
                                                  (res) => (
                                                    <div
                                                      key={res.id}
                                                      className="sl-reservation-item"
                                                    >
                                                      <span className="ac-id">
                                                        #{res.id}
                                                      </span>
                                                      <span className="sl-res-client">
                                                        <Users size={12} />
                                                        {res.client?.prenom}{" "}
                                                        {res.client?.nom}
                                                      </span>
                                                      <span className="sl-res-car">
                                                        {res.car?.brand}{" "}
                                                        {res.car?.model}
                                                      </span>
                                                      <span className="sl-res-dates">
                                                        {res.start_date} →{" "}
                                                        {res.end_date}
                                                      </span>
                                                      <span
                                                        className={`badge ${getReservationBadgeClass(
                                                          res.status
                                                        )}`}
                                                      >
                                                        {res.status}
                                                      </span>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            ) : (
                                              <p className="sl-muted">
                                                Aucune réservation associée.
                                              </p>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ---- Mobile cards ---- */}
              <div className="ac-mobile-only">
                <div className="ac-sortbar">
                  <label htmlFor="sl-sort-mobile">Trier</label>
                  <AcSelect
                    id="sl-sort-mobile"
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

                {paginatedItems.length === 0 ? (
                  <div className="ac-empty-card">
                    <MapPin size={40} />
                    <p>Aucune sous-location trouvée</p>
                  </div>
                ) : (
                  <div className="ac-mcards">
                    {paginatedItems.map((sl) => {
                      const isExpanded = expandedId === sl.id;
                      return (
                        <div key={sl.id} className="ac-mcard">
                          <div className="ac-mcard-head">
                            <div className="ac-mcard-thumb ac-mcard-thumb-empty">
                              <Tag size={22} />
                            </div>
                            <div className="ac-mcard-info">
                              <div className="ac-mcard-name">{sl.name}</div>
                              <div className="ac-mcard-sub">
                                <span className="ac-id">#{sl.id}</span>
                              </div>
                            </div>
                            <div className="ac-mcard-price">
                              {sl.reservations_count || 0}
                              <small> rés.</small>
                            </div>
                          </div>

                          <div className="ac-mcard-badges">
                            {getStatusBadge(sl.status)}
                          </div>

                          <div className="ac-mcard-meta">
                            <span>
                              <Calendar size={13} />
                              {sl.created_at
                                ? new Date(sl.created_at).toLocaleDateString(
                                    "fr-FR"
                                  )
                                : "—"}
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="sl-mobile-details">
                              {!selected || selected.id !== sl.id ? (
                                <p className="sl-muted">
                                  Chargement des détails...
                                </p>
                              ) : (
                                <>
                                  <div className="sl-details-section">
                                    <h4>
                                      <FileText size={13} /> Description
                                    </h4>
                                    <p>
                                      {selected.description ||
                                        "Aucune description fournie."}
                                    </p>
                                  </div>
                                  <div className="sl-details-section">
                                    <h4>
                                      <Calendar size={13} /> Réservations (
                                      {selected.reservations?.length || 0})
                                    </h4>
                                    {selected.reservations &&
                                    selected.reservations.length > 0 ? (
                                      <div className="sl-reservations-list">
                                        {selected.reservations.map((res) => (
                                          <div
                                            key={res.id}
                                            className="sl-reservation-item"
                                          >
                                            <span className="ac-id">
                                              #{res.id}
                                            </span>
                                            <span className="sl-res-client">
                                              {res.client?.prenom}{" "}
                                              {res.client?.nom}
                                            </span>
                                            <span className="sl-res-dates">
                                              {res.start_date} → {res.end_date}
                                            </span>
                                            <span
                                              className={`badge ${getReservationBadgeClass(
                                                res.status
                                              )}`}
                                            >
                                              {res.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="sl-muted">
                                        Aucune réservation associée.
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          <div className="ac-card-btns">
                            <button
                              type="button"
                              onClick={() => handleToggleDetails(sl.id)}
                              className="ac-card-btn"
                              style={{ color: "#1da1e8" }}
                            >
                              <FileText size={17} />
                              <span>Détails</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(sl)}
                              className="ac-card-btn ac-action-edit"
                            >
                              <Edit2 size={17} />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(sl)}
                              className="ac-card-btn ac-action-delete"
                            >
                              <Trash2 size={17} />
                              <span>Supprimer</span>
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
            /* =================== VUE CARTES =================== */
            <>
              <div className="ac-sortbar">
                <label htmlFor="sl-sort-cards">Trier</label>
                <AcSelect
                  id="sl-sort-cards"
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

              {paginatedItems.length === 0 ? (
                <div className="ac-empty-card">
                  <MapPin size={40} />
                  <p>Aucune sous-location trouvée</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {paginatedItems.map((sl) => {
                    const isExpanded = expandedId === sl.id;
                    return (
                      <div key={sl.id} className="car-card">
                        <div
                          className="card-image"
                          style={{
                            background:
                              "linear-gradient(135deg, #fef3c7, #fde68a)",
                          }}
                        >
                          <Tag
                            size={64}
                            style={{ color: "rgba(146, 64, 14, 0.6)" }}
                          />
                          <div className="card-status">
                            {getStatusBadge(sl.status)}
                          </div>
                        </div>
                        <div className="card-content">
                          <div className="card-title">
                            <span>{sl.name}</span>
                            <span className="card-price">
                              {sl.reservations_count || 0}
                              <small> rés.</small>
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--tx-2)",
                              margin: "4px 0 8px",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: "2.2em",
                            }}
                          >
                            {sl.description || "Aucune description"}
                          </p>

                          <div className="card-details">
                            <div className="detail-item">
                              <Calendar size={14} />
                              {sl.created_at
                                ? new Date(sl.created_at).toLocaleDateString(
                                    "fr-FR"
                                  )
                                : "—"}
                            </div>
                            <div className="detail-item">
                              <Tag size={14} />
                              <span className="ac-id">#{sl.id}</span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="sl-mobile-details">
                              {!selected || selected.id !== sl.id ? (
                                <p className="sl-muted">
                                  Chargement des détails...
                                </p>
                              ) : (
                                <div className="sl-details-section">
                                  <h4>
                                    <Calendar size={13} /> Réservations (
                                    {selected.reservations?.length || 0})
                                  </h4>
                                  {selected.reservations &&
                                  selected.reservations.length > 0 ? (
                                    <div className="sl-reservations-list">
                                      {selected.reservations.map((res) => (
                                        <div
                                          key={res.id}
                                          className="sl-reservation-item"
                                        >
                                          <span className="ac-id">
                                            #{res.id}
                                          </span>
                                          <span className="sl-res-dates">
                                            {res.start_date} → {res.end_date}
                                          </span>
                                          <span
                                            className={`badge ${getReservationBadgeClass(
                                              res.status
                                            )}`}
                                          >
                                            {res.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="sl-muted">
                                      Aucune réservation associée.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="ac-card-btns">
                            <button
                              type="button"
                              onClick={() => handleToggleDetails(sl.id)}
                              className="ac-card-btn"
                              style={{ color: "#1da1e8" }}
                            >
                              <FileText size={17} />
                              <span>Détails</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(sl)}
                              className="ac-card-btn ac-action-edit"
                            >
                              <Edit2 size={17} />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(sl)}
                              className="ac-card-btn ac-action-delete"
                            >
                              <Trash2 size={17} />
                              <span>Supprimer</span>
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

          {/* =================== DELETE MODAL =================== */}
          {deleteModalOpen && itemToDelete && (
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
                  Êtes-vous sûr de vouloir supprimer la sous-location
                  <br />
                  <span className="reservation-id">
                    {itemToDelete.name}
                  </span>{" "}
                  ?<br />
                  Cette action est irréversible.
                </p>
                {itemToDelete.reservations_count > 0 && (
                  <p
                    className="delete-message"
                    style={{ fontSize: "0.75rem", color: "#dc2626" }}
                  >
                    ⚠️ Cette sous-location possède{" "}
                    {itemToDelete.reservations_count} réservation(s). La
                    suppression peut affecter ces réservations.
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
  font-size: 0.88rem; font-weight: 800; cursor: pointer; transition: transform 0.1s;
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

/* ---------- Formulaire inline ---------- */
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
.rv textarea.inline-input { min-height: 88px; resize: vertical; line-height: 1.4; }
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

/* ---------- Filtres ---------- */
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
.rv .ac-table tbody tr:hover td { background: var(--surface-2); }
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
@media (prefers-color-scheme: dark) {
  .rv .badge-success { background: #14532d; color: #4ade80; }
  .rv .badge-danger { background: #7f1d1d; color: #fca5a5; }
  .rv .badge-amber { background: #78350f; color: #fde68a; }
  .rv .badge-blue { background: #1e3a5f; color: #60a5fa; }
  .rv .badge-emerald { background: #064e3b; color: #34d399; }
}

/* ---------- Boutons actions ---------- */
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

/* ---------- Détails dépliés ---------- */
.rv .sl-details-cell { background: var(--surface-2) !important; padding: 0 !important; }
.rv .sl-details-panel { padding: 16px 20px; border-top: 1px dashed var(--line); }
.rv .sl-details-section { margin-bottom: 14px; }
.rv .sl-details-section:last-child { margin-bottom: 0; }
.rv .sl-details-section h4 {
  display: inline-flex; align-items: center; gap: 6px;
  margin: 0 0 8px; font-size: 0.78rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--tx-2);
}
.rv .sl-details-section p {
  margin: 0; font-size: 0.82rem; color: var(--tx); line-height: 1.5;
}
.rv .sl-reservations-list { display: flex; flex-direction: column; gap: 6px; }
.rv .sl-reservation-item {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 12px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--line);
  font-size: 0.78rem;
}
.rv .sl-res-client {
  display: inline-flex; align-items: center; gap: 4px;
  font-weight: 700; color: var(--tx);
}
.rv .sl-res-car { color: var(--tx-2); }
.rv .sl-res-dates {
  color: var(--tx-2);
  font-family: ui-monospace, monospace; font-size: 0.74rem;
}
.rv .sl-muted { color: var(--tx-3); font-size: 0.8rem; font-style: italic; margin: 0; }

.rv .sl-mobile-details {
  margin: 10px 0;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px dashed var(--line);
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
  background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e;
}
.rv .ac-mcard-info { flex: 1; min-width: 0; }
.rv .ac-mcard-name {
  font-weight: 700; font-size: 0.95rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rv .ac-mcard-sub { margin-top: 3px; }
.rv .ac-mcard-price { font-weight: 800; font-size: 1rem; white-space: nowrap; }
.rv .ac-mcard-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rv .ac-mcard-meta {
  display: flex; flex-wrap: wrap; gap: 6px 14px;
  margin-bottom: 12px; font-size: 0.75rem; color: var(--tx-2);
}
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; }

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
  font-size: 1.15rem; font-weight: 800; color: var(--acc-tx); white-space: nowrap;
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
}
@media (max-width: 640px) {
  .rv .inline-form-container { margin: 0.6rem; border-radius: 22px; }
  .rv .inline-form-header { padding: 18px 64px 18px 18px; gap: 14px; }
  .rv .inline-form-icon { width: 48px; height: 48px; border-radius: 14px; }
  .rv .inline-form-title h2 { font-size: 1.2rem; }
  .rv .inline-form-close { right: 14px; width: 40px; height: 40px; }
  .rv .inline-form { padding: 16px; }
  .rv .inline-section { padding: 16px; border-radius: 18px; }
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
  .rv .inline-history-item { flex-wrap: wrap; }
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