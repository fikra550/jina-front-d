// src/pages/admin/AdminContacts.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchContacts,
  deleteContact,
  selectContacts,
  selectContactsLoading,
  fetchContactsCount,
  fetchRecentContacts,
} from "../../Redux/store";
import PaginationControls from '../../components/PaginationControls';
import { toast } from "sonner";
import {
  Trash2, Eye, Search, RefreshCw, Mail, Phone, User, Calendar,
  MessageSquare, X, ArrowUpDown, ArrowUp, ArrowDown, Download,
  Inbox, Clock, Sparkles, Check, ChevronDown, List, LayoutGrid,
  MessageCircle, Send, Hash, AlertCircle
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

const SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "fullname", label: "Nom" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
  { value: "created_at", label: "Date" },
];

export default function AdminContacts() {
  const dispatch = useDispatch();
  const contacts = useSelector(selectContacts);
  const loading = useSelector(selectContactsLoading);

  // UI state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'cards'

  // Sorting
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  // Load contacts
  useEffect(() => {
    dispatch(fetchContacts());
    dispatch(fetchContactsCount());
    dispatch(fetchRecentContacts());
  }, [dispatch]);

  // Sorting handlers
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

  // Filter & sort
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) => {
        const term = searchTerm.toLowerCase();
        return searchTerm === "" ||
          (c.fullname || "").toLowerCase().includes(term) ||
          (c.email || "").toLowerCase().includes(term) ||
          (c.phone || "").includes(searchTerm) ||
          (c.message || "").toLowerCase().includes(term);
      })
      .sort((a, b) => {
        let aVal, bVal;
        switch (sortField) {
          case "id": aVal = a.id; bVal = b.id; break;
          case "fullname": aVal = (a.fullname || "").toLowerCase(); bVal = (b.fullname || "").toLowerCase(); break;
          case "email": aVal = (a.email || "").toLowerCase(); bVal = (b.email || "").toLowerCase(); break;
          case "phone": aVal = a.phone || ""; bVal = b.phone || ""; break;
          case "created_at": aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
          default: aVal = a.id; bVal = b.id;
        }
        return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
  }, [contacts, searchTerm, sortField, sortDirection]);

  const itemsPerView = viewMode === "list" ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredContacts.length / itemsPerView);
  const paginated = filteredContacts.slice(
    (currentPage - 1) * itemsPerView,
    currentPage * itemsPerView
  );

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = contacts.filter(c => {
      const d = new Date(c.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const lastWeek = contacts.filter(c => {
      const d = new Date(c.created_at);
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= 7 && diff >= 0;
    }).length;
    return {
      total: contacts.length,
      thisMonth,
      lastWeek,
      lastMessage: contacts.length > 0 ? new Date(contacts[0].created_at) : null,
    };
  }, [contacts]);

  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return; // impossible de fermer pendant le traitement
    setDeleteModalOpen(false);
    setContactToDelete(null);
  };

  const confirmDelete = async () => {
    if (!contactToDelete || deleting) return;
    setDeleting(true);
    try {
      const result = await dispatch(deleteContact(contactToDelete.id));
      if (result.error) {
        toast.error(result.payload);
      } else {
        toast.success("Message supprimé");
      }
      setDeleteModalOpen(false);
      setContactToDelete(null);
      if (!result.error) {
        dispatch(fetchContacts(true));
        dispatch(fetchContactsCount());
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDetails = (contact) => {
    setSelectedContact(contact);
    setShowDetails(true);
  };

  const refreshData = async () => {
    await dispatch(fetchContacts(true));
    await dispatch(fetchContactsCount());
    await dispatch(fetchRecentContacts());
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = ["ID", "Nom", "Email", "Téléphone", "Message", "Date"];
    const csvData = filteredContacts.map((c) => [
      c.id,
      `"${(c.fullname || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.phone || "").replace(/"/g, '""')}"`,
      `"${(c.message || "").replace(/"/g, '""')}"`,
      `"${new Date(c.created_at).toLocaleDateString("fr-FR")}"`,
    ].join(","));
    const blob = new Blob([headers.join(",") + "\n" + csvData.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  const formatDate = (s) => {
    try { return new Date(s).toLocaleDateString("fr-FR"); }
    catch { return "—"; }
  };
  const formatDateTime = (s) => {
    try { return new Date(s).toLocaleString("fr-FR"); }
    catch { return "—"; }
  };
  const getPreview = (msg, len = 60) => {
    if (!msg) return "";
    return msg.length > len ? msg.slice(0, len) + "..." : msg;
  };

  // Loading
  if (loading && !deleting) {
    return (
      <div className="rv">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement des messages...</p>
        </div>
        <Styles />
      </div>
    );
  }

  // Stat cards
  const statCards = [
    { label: "Total messages", value: stats.total, icon: <Inbox size={20} />, color: "blue" },
    { label: "Ce mois-ci", value: stats.thisMonth, icon: <Sparkles size={20} />, color: "violet" },
    { label: "7 derniers jours", value: stats.lastWeek, icon: <Clock size={20} />, color: "green" },
    {
      label: "Dernier message",
      value: stats.lastMessage ? stats.lastMessage.toLocaleDateString("fr-FR") : "—",
      icon: <MessageCircle size={20} />,
      color: "cyan",
    },
  ];

  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === "list" ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredContacts.length}
      />
    </div>
  );

  return (
    <div className="rv">
      {/* ==================== DETAILS MODAL ==================== */}
      {showDetails && selectedContact && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title"><MessageSquare size={20} /> Détails du message</h3>
              <button onClick={() => setShowDetails(false)} className="modal-close" aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: "1.25rem" }}>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Nom complet</label>
                  <p><User size={14} className="di-icon" /> {selectedContact.fullname}</p>
                </div>
                <div className="detail-item">
                  <label>Email</label>
                  <p>
                    <Mail size={14} className="di-icon" />
                    <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                  </p>
                </div>
                <div className="detail-item">
                  <label>Téléphone</label>
                  <p>
                    <Phone size={14} className="di-icon" />
                    <a href={`tel:${selectedContact.phone}`}>{selectedContact.phone || "—"}</a>
                  </p>
                </div>
                <div className="detail-item">
                  <label>Reçu le</label>
                  <p><Calendar size={14} className="di-icon" /> {formatDateTime(selectedContact.created_at)}</p>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <label>Message</label>
                  <div className="message-content">{selectedContact.message}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDetails(false)} className="ac-btn">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE MODAL ==================== */}
      {deleteModalOpen && contactToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon"><Trash2 size={32} /></div>
            <h3 className="delete-title">Confirmer la suppression</h3>
            <p className="delete-message">
              Êtes-vous sûr de vouloir supprimer le message de<br />
              <span className="contact-highlight">{contactToDelete.fullname}</span> ?<br />
              Cette action est irréversible.
            </p>
            <div className="delete-actions">
              <button
                type="button"
                disabled={deleting}
                onClick={closeDeleteModal}
                className="modal-btn modal-btn-cancel"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="modal-btn btn-delete"
              >
                {deleting ? (<><span className="btn-spinner" /> Suppression...</>) : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MAIN LIST ==================== */}
      <div className="ac-wrap">
        {/* Header */}
        <div className="rv-head">
          <div className="rv-head-left">
            <div className="rv-head-icon"><Inbox size={24} /></div>
            <div className="rv-head-text">
              <h1 className="rv-title">Messages de Contact</h1>
              <p className="rv-sub">Liste des messages reçus via le formulaire de contact</p>
            </div>
          </div>
          <div className="rv-head-actions">
            <button type="button" onClick={refreshData} className="ac-btn">
              <RefreshCw size={15} /><span className="ac-btn-text">Actualiser</span>
            </button>
            <button type="button" onClick={handleExport} className="ac-btn">
              <Download size={15} /><span className="ac-btn-text">Exporter</span>
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
              placeholder="Rechercher par nom, email, téléphone ou message..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            {searchTerm && (
              <button
                type="button"
                className="ac-search-clear"
                onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
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
              onClick={() => { setViewMode("list"); setCurrentPage(1); }}
            >
              <List size={15} /> <span>Liste</span>
            </button>
            <button
              type="button"
              className={`ac-seg-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => { setViewMode("cards"); setCurrentPage(1); }}
            >
              <LayoutGrid size={15} /> <span>Cartes</span>
            </button>
          </div>
        </div>

        <div className="ac-meta">
          <p><strong>{filteredContacts.length}</strong> message(s) trouvé(s)</p>
          <p>Page {currentPage} / {totalPages || 1}</p>
        </div>

        {/* ==================== LIST VIEW ==================== */}
        {viewMode === "list" ? (
          <div className="ac-listwrap">
            {/* Desktop table */}
            <div className="ac-tablecard ac-desktop-only">
              <div className="ac-scroll">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                      <th onClick={() => handleSort("fullname")} className="sortable-header">Nom {getSortIcon("fullname")}</th>
                      <th onClick={() => handleSort("email")} className="sortable-header">Email {getSortIcon("email")}</th>
                      <th onClick={() => handleSort("phone")} className="sortable-header">Téléphone {getSortIcon("phone")}</th>
                      <th>Message (extrait)</th>
                      <th onClick={() => handleSort("created_at")} className="sortable-header">Date {getSortIcon("created_at")}</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="ac-empty-cell">
                          <Inbox size={40} />
                          <p>Aucun message trouvé</p>
                        </td>
                      </tr>
                    ) : paginated.map((c) => (
                      <tr key={c.id}>
                        <td><span className="ac-id">#{c.id}</span></td>
                        <td>
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span className="ac-strong">{c.fullname}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Mail size={14} />
                            <a href={`mailto:${c.email}`} className="ac-link">{c.email}</a>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Phone size={14} />
                            <a href={`tel:${c.phone}`} className="ac-link">{c.phone || "—"}</a>
                          </div>
                        </td>
                        <td>
                          <div className="message-preview" title={c.message}>
                            {getPreview(c.message, 60)}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(c.created_at)}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="ac-actions">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(c)}
                              className="ac-action-btn ac-action-info"
                              title="Voir les détails"
                            >
                              <Eye size={15} />
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards (same as AdminCars style) */}
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
                  <Inbox size={40} />
                  <p>Aucun message trouvé</p>
                </div>
              ) : (
                <div className="ac-mcards">
                  {paginated.map((c) => (
                    <div key={c.id} className="ac-mcard">
                      <div className="ac-mcard-head">
                        <div className="ac-mcard-avatar">
                          <User size={20} />
                        </div>
                        <div className="ac-mcard-info">
                          <div className="ac-mcard-name">{c.fullname}</div>
                          <div className="ac-mcard-sub">
                            <span className="ac-id">#{c.id}</span>
                            <span style={{ marginLeft: 8 }}>
                              <Calendar size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                              {formatDate(c.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="ac-mcard-meta">
                        <span><Mail size={13} /> {c.email}</span>
                        <span><Phone size={13} /> {c.phone || "—"}</span>
                      </div>

                      <div className="ac-mcard-msg">{getPreview(c.message, 120)}</div>

                      <div className="ac-card-btns">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(c)}
                          className="ac-card-btn ac-action-info"
                        >
                          <Eye size={17} /><span>Voir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(c)}
                          className="ac-card-btn ac-action-delete"
                        >
                          <Trash2 size={17} /><span>Supprimer</span>
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
                <Inbox size={40} />
                <p>Aucun message trouvé</p>
              </div>
            ) : (
              <div className="cards-grid">
                {paginated.map((c) => (
                  <div key={c.id} className="car-card contact-card">
                    <div className="contact-card-head">
                      <div className="contact-avatar">
                        <User size={26} />
                      </div>
                      <div className="contact-head-info">
                        <div className="contact-name-full">{c.fullname}</div>
                        <div className="contact-meta-line">
                          <span className="ac-id">#{c.id}</span>
                          <span>
                            <Calendar size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="contact-info-block">
                      <div className="contact-info-line">
                        <Mail size={13} />
                        <a href={`mailto:${c.email}`} className="ac-link">{c.email}</a>
                      </div>
                      <div className="contact-info-line">
                        <Phone size={13} />
                        <a href={`tel:${c.phone}`} className="ac-link">{c.phone || "—"}</a>
                      </div>
                    </div>

                    <div className="contact-msg-block">
                      <div className="contact-msg-label">
                        <MessageSquare size={12} /> Message
                      </div>
                      <div className="contact-msg-text">{getPreview(c.message, 150)}</div>
                    </div>

                    <div className="ac-card-btns">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(c)}
                        className="ac-card-btn ac-action-info"
                      >
                        <Eye size={17} /><span>Voir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(c)}
                        className="ac-card-btn ac-action-delete"
                      >
                        <Trash2 size={17} /><span>Supprimer</span>
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
@keyframes btnSpin { to { transform: rotate(360deg); } }

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
.rv .details-modal { max-width: 640px; }
.rv .delete-modal { max-width: 420px; padding: 28px 22px 22px; text-align: center; }
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
.rv .modal-body { color: var(--tx); }
.rv .modal-footer {
    display: flex; justify-content: flex-end; gap: 0.75rem;
    padding: 0.75rem 1.25rem 1.25rem;
}

/* Delete modal */
.rv .delete-icon {
    width: 72px; height: 72px; margin: 0 auto 14px; border-radius: 50%;
    background: #fde6e8; border: 2px solid var(--danger); color: var(--danger);
    display: flex; align-items: center; justify-content: center;
}
.rv .delete-title { font-size: 1.25rem; font-weight: 900; margin: 0 0 8px; text-align: center; }
.rv .delete-message { font-size: 0.88rem; color: var(--tx-2); margin: 0 0 12px; text-align: center; line-height: 1.5; }
.rv .contact-highlight {
    display: inline-block; background: var(--ink); color: #fff;
    padding: 2px 12px; border-radius: 8px; font-weight: 900;
    font-style: italic; letter-spacing: 0.05em; margin: 4px 0;
}
.rv .delete-actions { display: flex; gap: 0.75rem; padding-top: 8px; }
.rv .modal-btn {
    flex: 1; height: 46px; border-radius: 999px;
    border: 1.5px solid var(--line-strong);
    font-size: 0.88rem; font-weight: 800; cursor: pointer; transition: transform 0.1s;
    display: inline-flex; align-items: center; justify-content: center;
}
.rv .modal-btn:active:not(:disabled) { transform: translateY(3px); }
.rv .modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.rv .modal-btn-cancel { background: var(--surface); color: var(--tx); }
.rv .btn-delete { background: var(--danger); color: #fff; }

/* Spinner inside buttons */
.rv .btn-spinner {
    display: inline-block; width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0;
    border-radius: 50%; border: 2.5px solid currentColor; border-top-color: transparent;
    animation: btnSpin 0.6s linear infinite; vertical-align: middle;
}
.rv .btn-spinner.only { margin-right: 0; }

@media (prefers-color-scheme: dark) {
    .rv .delete-icon { background: rgba(220, 38, 38, 0.18); }
    .rv .contact-highlight { background: #f2f3f5; color: #0a0a0a; }
}

/* Details modal */
.rv .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.rv .detail-item { display: flex; flex-direction: column; min-width: 0; }
.rv .detail-item label {
    font-size: 0.66rem; font-weight: 900; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--tx-2); margin-bottom: 4px;
}
.rv .detail-item p {
    display: flex; align-items: center; gap: 6px; margin: 0;
    font-size: 0.88rem; font-weight: 600; overflow-wrap: anywhere;
}
.rv .detail-item a { color: var(--acc-tx); text-decoration: none; }
.rv .detail-item a:hover { text-decoration: underline; }
.rv .di-icon { color: var(--tx-3); flex-shrink: 0; }
.rv .message-content {
    background: var(--surface-2); border-radius: 12px; padding: 14px;
    white-space: pre-wrap; font-size: 0.88rem; border: 1.5px solid var(--line);
    min-height: 80px; line-height: 1.55;
}

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
.rv .ac-table { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 0.82rem; }
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
.rv .ac-link { color: var(--tx); text-decoration: none; font-weight: 600; }
.rv .ac-link:hover { color: var(--acc-tx); text-decoration: underline; }
.rv .ac-table td .flex { font-size: 0.8rem; color: var(--tx-2); white-space: nowrap; }
.rv .ac-table td .flex svg { color: var(--tx-3); flex-shrink: 0; }
.rv .message-preview {
    max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    color: var(--tx-2); font-style: italic;
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

.rv .flex { display: flex; }
.rv .items-center { align-items: center; }
.rv .gap-1 { gap: 0.25rem; }

/* ---------- Action buttons (table) ---------- */
.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
.rv .ac-action-btn {
    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
}
.rv .ac-action-info { color: #1da1e8; }
.rv .ac-action-delete { color: #ef4444; }
.rv .ac-action-btn.ac-action-info:hover { background: #eff6ff; }
.rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-info:hover { background: #1e3a5f; }
    .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
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
.rv .ac-card-btn.ac-action-info { color: #1da1e8; }
.rv .ac-card-btn.ac-action-info:hover, .rv .ac-card-btn.ac-action-info:active { background: #eff6ff; }
.rv .ac-card-btn.ac-action-delete { color: #ef4444; }
.rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #fef2f2; }
@media (prefers-color-scheme: dark) {
    .rv .ac-card-btn.ac-action-info:hover, .rv .ac-card-btn.ac-action-info:active { background: #1e3a5f; }
    .rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #7f1d1d; }
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
.rv .ac-mcard-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; font-size: 0.75rem; color: var(--tx-2); }
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; overflow-wrap: anywhere; }
.rv .ac-mcard-msg {
    background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px;
    padding: 10px 12px; font-size: 0.78rem; color: var(--tx-2); line-height: 1.5;
    margin-bottom: 4px; font-style: italic;
}

/* ---------- Cards view ---------- */
.rv .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }
.rv .car-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
    display: flex; flex-direction: column;
}
.rv .car-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18); }
.rv .contact-card { padding: 16px; }
.rv .contact-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.rv .contact-avatar {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 18px -6px rgba(245, 158, 11, 0.5);
}
.rv .contact-head-info { min-width: 0; flex: 1; }
.rv .contact-name-full { font-weight: 800; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .contact-meta-line { margin-top: 4px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.72rem; color: var(--tx-2); }
.rv .contact-info-block {
    display: flex; flex-direction: column; gap: 6px;
    padding: 10px 12px; background: var(--surface-2); border-radius: 10px;
    margin-bottom: 12px;
}
.rv .contact-info-line {
    display: flex; align-items: center; gap: 8px; font-size: 0.8rem;
    color: var(--tx-2); overflow-wrap: anywhere;
}
.rv .contact-info-line svg { color: var(--tx-3); flex-shrink: 0; }
.rv .contact-msg-block {
    background: var(--surface-2); border: 1.5px solid var(--line); border-radius: 12px;
    padding: 12px; margin-bottom: 4px;
}
.rv .contact-msg-label {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.65rem; font-weight: 900; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--tx-3); margin-bottom: 6px;
}
.rv .contact-msg-text {
    font-size: 0.8rem; color: var(--tx); line-height: 1.5;
    font-style: italic; overflow-wrap: anywhere;
}

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
@media (max-width: 768px) {
    .rv .ac-wrap { padding: 1rem; }
    .rv .rv-head { flex-direction: column; }
    .rv .rv-head-actions { width: 100%; gap: 6px; }
    .rv .rv-head-actions .ac-btn { flex: 1; height: 40px; padding: 0 10px; }
    .rv .ac-btn-text { display: none; }
    .rv .rv-stats { grid-template-columns: repeat(2, 1fr); }
    .rv .ac-filters { flex-direction: column; align-items: stretch; }
    .rv .ac-search { min-width: 100%; }
    .rv .ac-seg { align-self: stretch; }
    .rv .ac-seg-btn { flex: 1; justify-content: center; }
    .rv .ac-desktop-only { display: none !important; }
    .rv .ac-mobile-only { display: block !important; }
    .rv .cards-grid { grid-template-columns: 1fr; }

    /* iOS: 16px évite le zoom auto */
    .rv .ac-search input { font-size: 16px; height: 42px; }
    .rv .ac-dd-trigger { font-size: 16px; height: 46px; }
    .rv .ac-sortdir { height: 46px; width: 46px; }

    .rv .modal-overlay { align-items: flex-end; padding: 0; }
    .rv .modal {
        max-width: 100% !important; max-height: 92vh;
        border-radius: 24px 24px 0 0; border-bottom: 0;
        animation: rvSheet 0.28s ease;
    }
    .rv .details-grid { grid-template-columns: 1fr; }
    .rv .delete-actions { flex-direction: column-reverse; }
    .rv .delete-actions { gap: 10px; }
    .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }
    .rv .delete-modal { padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }
    .rv .modal-footer { flex-direction: column-reverse; padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); }
    .rv .modal-footer button { width: 100%; }
    .rv .message-preview { max-width: 140px; }
}
@media (prefers-reduced-motion: reduce) {
    .rv *, .rv *::before, .rv *::after { animation: none !important; transition: none !important; }
    .rv .btn-spinner { animation: btnSpin 0.6s linear infinite !important; }
}
    `}</style>
  );
}