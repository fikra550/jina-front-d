// src/pages/admin/AdminUsers.jsx
import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUtilisateurs,
  updateUtilisateurStatus,
  deleteUtilisateur,
  selectUtilisateurs,
  createUtilisateur,
  updateUtilisateur,
  selectUser,
} from "../../Redux/store";
import PaginationControls from "../../components/PaginationControls";
import {
  fetchPages,
  fetchUserPermissions,
  assignPermission,
  revokePermission,
} from "../../Redux/permissionSlice";
import { toast } from "sonner";
import {
  Trash2, User, RefreshCw, Search, Shield, ShieldCheck, Plus, Edit2, X,
  AlertTriangle, Users, Key, Lock, Unlock, UserCheck, UserX, Download,
  Crown, Briefcase, Activity, Sparkles, Star, ArrowUpDown, ArrowUp, ArrowDown,
  Bell, ChevronDown, Check, Save, List, LayoutGrid, Filter, CheckCircle2,
  Mail, Calendar,
} from "lucide-react";

/* ============================================================
   AcSelect — styled portaled dropdown (desktop & mobile)
   ============================================================ */
const AcSelect = ({
  value, onChange, options, id, ariaLabel,
  variant = "default", placeholder = "Sélectionner…", disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

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
  { value: "name", label: "Nom" },
  { value: "role", label: "Rôle" },
  { value: "status", label: "Statut" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "Tous rôles" },
  { value: "superadmin", label: "Super Admins" },
  { value: "admin", label: "Administrateurs" },
  { value: "employee", label: "Employés" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tous statuts" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
];

const RESET_FILTER_OPTIONS = [
  { value: "all", label: "Toutes demandes" },
  { value: "pending", label: "Réinitialisations" },
];

const STATUS_FORM_OPTIONS = [
  { value: "active", label: "✅ Actif" },
  { value: "inactive", label: "⛔ Inactif" },
];

/* ============================================================
   RemainingTime (permission countdown)
   ============================================================ */
const RemainingTime = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [percentage, setPercentage] = useState(100);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("Permanent");
      setPercentage(100);
      setIsExpired(false);
      return;
    }
    let interval;
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft("Expiré");
        setPercentage(0);
        setIsExpired(true);
        return;
      }
      setIsExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % 86400000) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % 3600000) / (1000 * 60));
      const seconds = Math.floor((diff % 60000) / 1000);
      let formatted = "";
      if (days > 0) formatted = `${days}j ${hours}h ${minutes}m ${seconds}s`;
      else if (hours > 0) formatted = `${hours}h ${minutes}m ${seconds}s`;
      else formatted = `${minutes}m ${seconds}s`;
      setTimeLeft(formatted);
      const createdAt = new Date(expiry.getTime() - (1000 * 60 * 60 * 24 * 30));
      const total = expiry - createdAt;
      const remaining = diff;
      let percent = (remaining / total) * 100;
      percent = Math.min(100, Math.max(0, percent));
      setPercentage(percent);
    };
    updateTimer();
    interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return <span className="permanent-badge">Permanente</span>;

  return (
    <div className="countdown-container">
      <div className="countdown-time">{timeLeft}</div>
      <div className="progress-bar-container">
        <div className={`progress-bar-fill ${isExpired ? "expired" : ""}`} style={{ width: `${percentage}%` }} />
      </div>
      {isExpired && <span className="expired-badge">Expiré</span>}
    </div>
  );
};

/* ============================================================
   Main Component
   ============================================================ */
export default function AdminUsers() {
  const dispatch = useDispatch();
  const users = useSelector(selectUtilisateurs);
  const pages = useSelector((state) => state.permissions.pages);
  const currentUser = useSelector(selectUser);

  const [loading, setLoading] = useState(true);
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
  const [userToDelete, setUserToDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resetFilter, setResetFilter] = useState("all");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // View mode + per-page (list vs cards)
  const [viewMode, setViewMode] = useState("list");
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [selectedPage, setSelectedPage] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [userPermissionsList, setUserPermissionsList] = useState([]);
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);

  const [formData, setFormData] = useState({
    Fullname: "",
    role: "employee",
    status: "active",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    const load = async () => {
      await dispatch(fetchUtilisateurs());
      setLoading(false);
    };
    load();
  }, [dispatch]);

  useEffect(() => {
    if (permissionModalOpen && selectedUserForPermissions) {
      dispatch(fetchPages());
      refreshUserPermissions();
    }
  }, [permissionModalOpen, selectedUserForPermissions, dispatch]);

  const refreshUserPermissions = async () => {
    setRefreshingPermissions(true);
    const res = await dispatch(fetchUserPermissions(selectedUserForPermissions.id));
    setUserPermissionsList(res.payload.permissions);
    setRefreshingPermissions(false);
  };

  const toggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const result = await dispatch(updateUtilisateurStatus({ utilisateurId: userId, status: newStatus }));
    if (result.error) toast.error(result.payload);
    else {
      toast.success(`Utilisateur ${newStatus === "active" ? "activé" : "désactivé"}`);
      await dispatch(fetchUtilisateurs(true));
    }
  };

  const handleDeleteClick = (user) => { setUserToDelete(user); setDeleteModalOpen(true); };

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
    if (!userToDelete) return;
    const result = await dispatch(deleteUtilisateur(userToDelete.id));
    if (result.error) toast.error(result.payload);
    else {
      toast.success("Utilisateur supprimé");
      await dispatch(fetchUtilisateurs(true));
    }
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleCreateUser = async (data) => {
    setSubmitting(true);
    try {
      const payload = { Fullname: data.Fullname, password: data.password, role: data.role, status: data.status };
      await dispatch(createUtilisateur(payload)).unwrap();
      toast.success("Utilisateur créé");
      setShowUserForm(false);
      setEditingUser(null);
      await dispatch(fetchUtilisateurs(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally { setSubmitting(false); }
  };

  const handleUpdateUser = async (data) => {
    setSubmitting(true);
    try {
      const payload = { Fullname: data.Fullname, role: data.role, status: data.status };
      if (data.password && data.password.trim() !== "") payload.password = data.password;
      await dispatch(updateUtilisateur({ id: editingUser.id, data: payload })).unwrap();
      toast.success("Utilisateur modifié");
      setShowUserForm(false);
      setEditingUser(null);
      await dispatch(fetchUtilisateurs(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally { setSubmitting(false); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      Fullname: user.Fullname || user.full_name || "",
      role: user.role || "employee",
      status: user.status || "active",
      password: "",
      password_confirmation: "",
    });
    setShowUserForm(true);
  };

  const handleAddNew = () => { setEditingUser(null); resetForm(); setShowUserForm(true); };

  const resetForm = () => setFormData({
    Fullname: "", role: "employee", status: "active", password: "", password_confirmation: "",
  });

  const refreshData = async () => {
    await dispatch(fetchUtilisateurs(true));
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = ["ID", "Nom complet", "Rôle", "Statut"];
    const csvData = filteredUsers.map((u) => [
      u.id,
      `"${u.Fullname || u.full_name || ""}"`,
      u.role === "superadmin" ? "Super Admin" : u.role === "admin" ? "Administrateur" : "Employé",
      u.status === "active" ? "Actif" : "Inactif",
    ].join(","));
    const blob = new Blob(["\uFEFF" + headers.join(",") + "\n" + csvData.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  const handleAssignPermission = async () => {
    if (!selectedPage) { toast.error("Veuillez sélectionner une page."); return; }
    const duration = durationMinutes ? parseInt(durationMinutes) : null;
    await dispatch(assignPermission({ userId: selectedUserForPermissions.id, pageSlug: selectedPage, durationMinutes: duration }));
    toast.success("Permission attribuée.");
    await refreshUserPermissions();
    setSelectedPage("");
    setDurationMinutes("");
  };

  const handleRevokePermission = async (pageSlug) => {
    await dispatch(revokePermission({ userId: selectedUserForPermissions.id, pageSlug }));
    toast.success("Permission révoquée.");
    setUserPermissionsList((prev) => prev.filter((p) => p.page_slug !== pageSlug));
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

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const fullName = (u.Fullname || u.full_name || "").toLowerCase();
        const matchesSearch = searchTerm === "" || fullName.includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        const matchesStatus = statusFilter === "all" || u.status === statusFilter;
        const matchesReset = resetFilter === "all" || (resetFilter === "pending" && u.remember_token === "reset_requested");
        return matchesSearch && matchesRole && matchesStatus && matchesReset;
      })
      .sort((a, b) => {
        let aVal, bVal;
        switch (sortField) {
          case "id": aVal = a.id; bVal = b.id; break;
          case "name": aVal = (a.Fullname || a.full_name || "").toLowerCase(); bVal = (b.Fullname || b.full_name || "").toLowerCase(); break;
          case "role": aVal = a.role || ""; bVal = b.role || ""; break;
          case "status": aVal = a.status || ""; bVal = b.status || ""; break;
          default: aVal = a.id; bVal = b.id;
        }
        if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
  }, [users, searchTerm, roleFilter, statusFilter, resetFilter, sortField, sortDirection]);

  const itemsPerView = viewMode === "list" ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerView);
  const paginated = filteredUsers.slice((currentPage - 1) * itemsPerView, currentPage * itemsPerView);
  const pendingResetCount = users.filter((u) => u.remember_token === "reset_requested").length;

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    admins: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
    employees: users.filter((u) => u.role === "employee").length,
    superadmins: users.filter((u) => u.role === "superadmin").length,
  };

  const statCards = [
    { label: "Total", value: stats.total, icon: <Users size={20} />, color: "blue" },
    { label: "Actifs", value: stats.active, icon: <UserCheck size={20} />, color: "green" },
    { label: "Inactifs", value: stats.inactive, icon: <UserX size={20} />, color: "red" },
    { label: "Admins", value: stats.admins, icon: <Crown size={20} />, color: "violet" },
    { label: "Super Admins", value: stats.superadmins, icon: <Star size={20} />, color: "cyan" },
    { label: "Employés", value: stats.employees, icon: <Briefcase size={20} />, color: "blue" },
  ];

  const getStatusBadge = (status) => {
    if (status === "active") return <span className="badge badge-success"><CheckCircle2 size={12} /> Actif</span>;
    return <span className="badge badge-danger"><X size={12} /> Inactif</span>;
  };

  const getRoleBadge = (role) => {
    if (role === "superadmin") return <span className="badge badge-amber"><Crown size={11} /> Super Admin</span>;
    if (role === "admin") return <span className="badge badge-purple"><Crown size={11} /> Admin</span>;
    return <span className="badge badge-blue"><Briefcase size={11} /> Employé</span>;
  };

  const closeForm = () => { setShowUserForm(false); setEditingUser(null); resetForm(); };

  const roleFormOptions = useMemo(() => {
    const opts = [
      { value: "employee", label: "Employé" },
      { value: "admin", label: "Administrateur" },
    ];
    if (currentUser?.role === "superadmin") opts.push({ value: "superadmin", label: "Super Admin" });
    return opts;
  }, [currentUser]);

  const pageOptions = useMemo(() => {
    return Object.entries(pages || {}).map(([slug, label]) => ({ value: slug, label }));
  }, [pages]);

  if (loading) {
    return (
      <div className="rv">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement des utilisateurs...</p>
        </div>
        <Styles />
      </div>
    );
  }

  /* ============================================================
     FORM VIEW
     ============================================================ */
  if (showUserForm) {
    const passwordMismatch =
      formData.password && formData.password_confirmation &&
      formData.password !== formData.password_confirmation;

    return (
      <div className="rv">
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editingUser ? <Sparkles size={28} /> : <Star size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
              <p>{editingUser ? "Modifiez les détails de l'utilisateur" : "Créez un nouvel utilisateur en quelques clics"}</p>
            </div>
            <button type="button" onClick={closeForm} className="inline-form-close" aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordMismatch) { toast.error("Les mots de passe ne correspondent pas"); return; }
              editingUser ? handleUpdateUser(formData) : handleCreateUser(formData);
            }}
            className="inline-form"
          >
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <User size={18} />
                    <h3>Informations personnelles</h3>
                  </div>
                  <div className="inline-field">
                    <label>Nom complet *</label>
                    <input
                      type="text"
                      className="inline-input"
                      value={formData.Fullname}
                      onChange={(e) => setFormData({ ...formData, Fullname: e.target.value })}
                      required
                      placeholder="Jean Dupont"
                    />
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Shield size={18} />
                    <h3>Rôle et permissions</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Rôle</label>
                      <AcSelect
                        value={formData.role}
                        onChange={(v) => setFormData({ ...formData, role: v })}
                        options={roleFormOptions}
                        ariaLabel="Rôle"
                        variant="inline"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <AcSelect
                        value={formData.status}
                        onChange={(v) => setFormData({ ...formData, status: v })}
                        options={STATUS_FORM_OPTIONS}
                        ariaLabel="Statut"
                        variant="inline"
                      />
                    </div>
                  </div>
                  {formData.role === "superadmin" && (
                    <div className="inline-info-msg">
                      <ShieldCheck size={16} />
                      <span>Tous les droits, peut gérer les permissions.</span>
                    </div>
                  )}
                  {formData.role === "admin" && (
                    <div className="inline-info-msg">
                      <ShieldCheck size={16} />
                      <span>Voit toutes les pages, ne gère pas les permissions.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Key size={18} />
                    <h3>Sécurité</h3>
                  </div>

                  {editingUser && (
                    <div className="inline-info-msg" style={{ marginTop: 0, marginBottom: 14 }}>
                      <Lock size={16} />
                      <span>Laisser vide pour conserver le mot de passe actuel.</span>
                    </div>
                  )}

                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>{editingUser ? "Nouveau mot de passe" : "Mot de passe *"}</label>
                      <input
                        type="password"
                        className="inline-input"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                        placeholder={editingUser ? "Nouveau mot de passe" : "••••••••"}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="inline-field">
                      <label>{editingUser ? "Confirmer" : "Confirmer *"}</label>
                      <input
                        type="password"
                        className="inline-input"
                        value={formData.password_confirmation}
                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                        required={!editingUser}
                        placeholder={editingUser ? "Confirmer" : "••••••••"}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {passwordMismatch && (
                    <div className="inline-error-msg">
                      <AlertTriangle size={16} />
                      <span>Les mots de passe ne correspondent pas</span>
                    </div>
                  )}
                  {editingUser?.remember_token === "reset_requested" && (
                    <div className="inline-warn-msg">
                      <AlertTriangle size={16} />
                      <span>Réinitialisation demandée. Entrez un nouveau mot de passe.</span>
                    </div>
                  )}
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Activity size={18} />
                    <h3>Informations système</h3>
                  </div>
                  <div className="inline-history">
                    <div className="inline-history-item">
                      <span className="inline-info-label">Date de création</span>
                      <span className="inline-info-value">
                        {editingUser?.created_at ? new Date(editingUser.created_at).toLocaleDateString("fr-FR") : "—"}
                      </span>
                    </div>
                    <div className="inline-history-item">
                      <span className="inline-info-label">Dernière modification</span>
                      <span className="inline-info-value">
                        {editingUser?.updated_at ? new Date(editingUser.updated_at).toLocaleDateString("fr-FR") : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={closeForm}>
                Annuler
              </button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {editingUser ? <Save size={16} /> : <Plus size={16} />}
                {submitting ? "Traitement..." : editingUser ? "Mettre à jour" : "Créer l'utilisateur"}
              </button>
            </div>
          </form>
        </div>
        <Styles />
      </div>
    );
  }

  /* ============================================================
     LIST VIEW
     ============================================================ */
  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === "list" ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredUsers.length}
      />
    </div>
  );

  return (
    <div className="rv">
      <div className="ac-wrap">
        {/* Reset banner */}
        {pendingResetCount > 0 && resetFilter !== "pending" && (
          <div className="rv-reset-banner">
            <Bell size={18} />
            <span><strong>{pendingResetCount}</strong> utilisateur(s) ont demandé une réinitialisation de mot de passe.</span>
            <button className="rv-banner-btn" onClick={() => { setResetFilter("pending"); setCurrentPage(1); }}>
              Voir les demandes
            </button>
            <button className="rv-banner-dismiss" onClick={() => setResetFilter("all")}>Masquer</button>
          </div>
        )}

        {/* Header */}
        <div className="rv-head">
          <div className="rv-head-left">
            <div className="rv-head-icon"><Users size={24} /></div>
            <div className="rv-head-text">
              <h1 className="rv-title">Gestion des Utilisateurs</h1>
              <p className="rv-sub">Gérez les accès à l'administration</p>
            </div>
          </div>
          <div className="rv-head-actions">
            <button type="button" onClick={() => runBusy("refresh", refreshData)} className="ac-btn" disabled={!!busy.refresh}>
              <RefreshCw size={15} className={busy.refresh ? "rv-spin" : ""} /><span className="ac-btn-text">Actualiser</span>
            </button>
            <button type="button" onClick={handleExport} className="ac-btn">
              <Download size={15} /><span className="ac-btn-text">Exporter</span>
            </button>
            <button type="button" onClick={handleAddNew} className="ac-btn ac-btn-primary">
              <Plus size={15} /><span className="ac-btn-text">Nouvel utilisateur</span>
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
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            {searchTerm && (
              <button type="button" className="ac-search-clear" onClick={() => { setSearchTerm(""); setCurrentPage(1); }} aria-label="Effacer">
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ width: 170, flexShrink: 0 }}>
            <AcSelect
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}
              options={ROLE_FILTER_OPTIONS}
              ariaLabel="Filtrer par rôle"
              variant="inline"
            />
          </div>

          <div style={{ width: 150, flexShrink: 0 }}>
            <AcSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
              options={STATUS_FILTER_OPTIONS}
              ariaLabel="Filtrer par statut"
              variant="inline"
            />
          </div>

          <div style={{ width: 170, flexShrink: 0 }}>
            <AcSelect
              value={resetFilter}
              onChange={(v) => { setResetFilter(v); setCurrentPage(1); }}
              options={RESET_FILTER_OPTIONS}
              ariaLabel="Filtrer par demande"
              variant="inline"
            />
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
          <p><strong>{filteredUsers.length}</strong> utilisateur(s) trouvé(s)</p>
          <p>Page {currentPage} / {totalPages || 1}</p>
        </div>

        {viewMode === "list" ? (
          <div className="ac-listwrap">
            {/* Desktop table */}
            <div className="ac-tablecard ac-desktop-only">
              <div className="ac-scroll">
                <table className="ac-table" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                      <th onClick={() => handleSort("name")} className="sortable-header">Nom {getSortIcon("name")}</th>
                      <th onClick={() => handleSort("role")} className="sortable-header">Rôle {getSortIcon("role")}</th>
                      <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="ac-empty-cell">
                          <Users size={40} />
                          <p>Aucun utilisateur trouvé</p>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((u) => (
                        <tr key={u.id}>
                          <td><span className="ac-id">#{u.id}</span></td>
                          <td>
                            <div className="au-name-cell">
                              <div className="au-avatar">{(u.Fullname || u.full_name || "?").charAt(0).toUpperCase()}</div>
                              <span className="ac-strong">{u.Fullname || u.full_name || "—"}</span>
                              {u.remember_token === "reset_requested" && (
                                <span className="badge badge-amber" title="Réinitialisation en attente">
                                  <RefreshCw size={11} /> Reset
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{getRoleBadge(u.role)}</td>
                          <td>{getStatusBadge(u.status)}</td>
                          <td className="text-right">
                            <div className="ac-actions">
                              <button type="button" onClick={() => handleEdit(u)} className="ac-action-btn ac-action-edit" title="Modifier">
                                <Edit2 size={15} />
                              </button>
                              <button type="button" onClick={() => runBusy(`toggle-${u.id}`, () => toggleStatus(u.id, u.status))} disabled={!!busy[`toggle-${u.id}`]} className="ac-action-btn ac-action-lock" title={u.status === "active" ? "Désactiver" : "Activer"}>
                                {busy[`toggle-${u.id}`] ? <span className="btn-spinner only" /> : (u.status === "active" ? <Lock size={15} /> : <Unlock size={15} />)}
                              </button>
                              {currentUser?.role === "superadmin" && (
                                <button type="button" onClick={() => { setSelectedUserForPermissions(u); setPermissionModalOpen(true); }} className="ac-action-btn ac-action-perm" title="Permissions">
                                  <Key size={15} />
                                </button>
                              )}
                              <button type="button" onClick={() => handleDeleteClick(u)} className="ac-action-btn ac-action-delete" title="Supprimer">
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
                <label htmlFor="au-sort">Trier</label>
                <AcSelect
                  id="au-sort"
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
                  <Users size={40} />
                  <p>Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div className="ac-mcards">
                  {paginated.map((u) => {
                    const name = u.Fullname || u.full_name || "";
                    const isReset = u.remember_token === "reset_requested";
                    const isSuper = currentUser?.role === "superadmin";
                    return (
                      <div key={u.id} className={`ac-mcard ${isReset ? "au-card-reset" : ""}`}>
                        <div className="ac-mcard-head">
                          <div className="au-avatar au-avatar-lg">{(name || "?").charAt(0).toUpperCase()}</div>
                          <div className="ac-mcard-info">
                            <div className="ac-mcard-name">{name || "—"}</div>
                            <div className="ac-mcard-sub">
                              <span className="ac-id">#{u.id}</span>
                              {isReset && (
                                <span className="badge badge-amber" style={{ marginLeft: 8 }}>
                                  <RefreshCw size={10} /> Reset
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="ac-mcard-badges">
                          {getRoleBadge(u.role)}
                          {getStatusBadge(u.status)}
                        </div>

                        <div className="ac-card-btns" style={{ gridTemplateColumns: `repeat(${isSuper ? 4 : 3}, 1fr)` }}>
                          <button type="button" onClick={() => handleEdit(u)} className="ac-card-btn ac-action-edit">
                            <Edit2 size={17} /><span>Modifier</span>
                          </button>
                          <button type="button" onClick={() => runBusy(`toggle-${u.id}`, () => toggleStatus(u.id, u.status))} disabled={!!busy[`toggle-${u.id}`]} className="ac-card-btn ac-action-lock">
                            {busy[`toggle-${u.id}`] ? <span className="btn-spinner only" /> : (u.status === "active" ? <Lock size={17} /> : <Unlock size={17} />)}
                            <span>{u.status === "active" ? "Désactiver" : "Activer"}</span>
                          </button>
                          {isSuper && (
                            <button
                              type="button"
                              onClick={() => { setSelectedUserForPermissions(u); setPermissionModalOpen(true); }}
                              className="ac-card-btn ac-action-perm"
                            >
                              <Key size={17} /><span>Droits</span>
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteClick(u)} className="ac-card-btn ac-action-delete">
                            <Trash2 size={17} /><span>Supprimer</span>
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
              <label htmlFor="au-sort">Trier</label>
              <AcSelect
                id="au-sort"
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
                <Users size={40} />
                <p>Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <div className="cards-grid">
                {paginated.map((u) => {
                  const name = u.Fullname || u.full_name || "";
                  const isReset = u.remember_token === "reset_requested";
                  const isSuper = currentUser?.role === "superadmin";
                  return (
                    <div key={u.id} className="car-card">
                      <div className="card-image" style={{ height: 120 }}>
                        <div className="au-avatar au-avatar-xl">{(name || "?").charAt(0).toUpperCase()}</div>
                        {isReset && (
                          <div className="card-status">
                            <span className="badge badge-amber"><RefreshCw size={10} /> Reset</span>
                          </div>
                        )}
                      </div>
                      <div className="card-content">
                        <div className="card-title">
                          <span>{name || "—"}</span>
                          <span className="ac-id">#{u.id}</span>
                        </div>
                        <div className="card-details">
                          <div className="detail-item">{getRoleBadge(u.role)}</div>
                          <div className="detail-item">{getStatusBadge(u.status)}</div>
                        </div>
                        <div className="ac-card-btns" style={{ gridTemplateColumns: `repeat(${isSuper ? 4 : 3}, 1fr)` }}>
                          <button type="button" onClick={() => handleEdit(u)} className="ac-card-btn ac-action-edit">
                            <Edit2 size={17} /><span>Modif.</span>
                          </button>
                          <button type="button" onClick={() => runBusy(`toggle-${u.id}`, () => toggleStatus(u.id, u.status))} disabled={!!busy[`toggle-${u.id}`]} className="ac-card-btn ac-action-lock">
                            {busy[`toggle-${u.id}`] ? <span className="btn-spinner only" /> : (u.status === "active" ? <Lock size={17} /> : <Unlock size={17} />)}
                            <span>{u.status === "active" ? "Désact." : "Activer"}</span>
                          </button>
                          {isSuper && (
                            <button
                              type="button"
                              onClick={() => { setSelectedUserForPermissions(u); setPermissionModalOpen(true); }}
                              className="ac-card-btn ac-action-perm"
                            >
                              <Key size={17} /><span>Droits</span>
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteClick(u)} className="ac-card-btn ac-action-delete">
                            <Trash2 size={17} /><span>Suppr.</span>
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

        {/* ========== DELETE MODAL ========== */}
        {deleteModalOpen && userToDelete && (
          <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-icon"><Trash2 size={32} /></div>
              <h3 className="delete-title">Confirmer la suppression</h3>
              <p className="delete-message">
                Êtes-vous sûr de vouloir supprimer l'utilisateur<br />
                <span className="reservation-id">{userToDelete.Fullname || userToDelete.full_name || "?"}</span> ?<br />
                Cette action est irréversible.
              </p>
              {userToDelete.role === "superadmin" && (
                <p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                  ⚠️ Cet utilisateur est Super Admin.
                </p>
              )}
              <div className="delete-actions">
                <button disabled={deleting} type="button" onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
                <button disabled={deleting} type="button" onClick={confirmDelete} className="modal-btn btn-delete">{deleting ? (<><span className="btn-spinner" /> Suppression...</>) : "Supprimer"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ========== PERMISSION MODAL ========== */}
        {permissionModalOpen && selectedUserForPermissions && currentUser?.role === "superadmin" && (
          <div className="modal-overlay" onClick={() => setPermissionModalOpen(false)}>
            <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  <Key size={20} />
                  Permissions — {selectedUserForPermissions.Fullname || selectedUserForPermissions.full_name}
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={refreshUserPermissions}
                    className="modal-close"
                    disabled={refreshingPermissions}
                    title="Actualiser"
                  >
                    <RefreshCw size={16} className={refreshingPermissions ? "rv-spin" : ""} />
                  </button>
                  <button type="button" onClick={() => setPermissionModalOpen(false)} className="modal-close" title="Fermer">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="modal-body" style={{ padding: "1.5rem" }}>
                <div className="inline-section" style={{ marginBottom: 18 }}>
                  <div className="inline-section-header">
                    <Plus size={18} />
                    <h3>Ajouter</h3>
                  </div>
                  <div className="inline-field" style={{ marginBottom: 14 }}>
                    <label>Page</label>
                    <AcSelect
                      value={selectedPage}
                      onChange={(v) => setSelectedPage(v)}
                      options={pageOptions}
                      placeholder="-- Choisir une page --"
                      ariaLabel="Page"
                      variant="inline"
                    />
                  </div>
                  <div className="inline-field">
                    <label>Durée (minutes) – vide = permanente</label>
                    <input
                      type="number"
                      min="1"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="inline-input"
                      placeholder="ex: 30"
                    />
                  </div>
                  <div className="inline-actions">
                    <button type="button" onClick={() => runBusy("assign", handleAssignPermission)} disabled={!!busy.assign} className="inline-primary-btn">
                      {busy.assign ? (<><span className="btn-spinner" /> Traitement...</>) : (<><Plus size={16} /> Attribuer</>)}
                    </button>
                  </div>
                </div>

                <div className="inline-history">
                  <h4><Shield size={14} /> Permissions actuelles</h4>
                  {userPermissionsList.length === 0 ? (
                    <div className="inline-history-item">
                      <span className="inline-history-notes">Aucune permission spéciale.</span>
                    </div>
                  ) : (
                    userPermissionsList.map((perm) => (
                      <div key={perm.page_slug} className="inline-history-item">
                        <div>
                          <strong style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>
                            {pages[perm.page_slug] || perm.page_slug}
                          </strong>
                          <RemainingTime expiresAt={perm.expires_at} />
                        </div>
                        <button
                          type="button"
                          onClick={() => runBusy(`revoke-${perm.page_slug}`, () => handleRevokePermission(perm.page_slug))}
                          disabled={!!busy[`revoke-${perm.page_slug}`]}
                          className="inline-history-delete"
                          title="Révoquer"
                        >
                          {busy[`revoke-${perm.page_slug}`] ? <span className="btn-spinner only" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions-footer" style={{ padding: "1rem 1.5rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setPermissionModalOpen(false)} className="inline-secondary-btn">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Styles />
    </div>
  );
}

/* ============================================================
   Styles — shared .rv design system
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
@keyframes rvSpin { to { transform: rotate(360deg); } }
.rv .rv-spin { animation: rvSpin 0.6s linear infinite; }

/* Modals */
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
.rv .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
.rv .modal-body { color: var(--tx); }
.rv .modal-actions-footer { display: flex; gap: 0.75rem; border-top: 2px dotted var(--line); }
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
.rv .inline-input:focus,
.rv .inline-select:focus,
.rv textarea.inline-input:focus { outline: none; border-color: var(--blue); }
.rv .inline-input:disabled { opacity: 0.55; cursor: not-allowed; }
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

.rv .inline-info-label { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); }
.rv .inline-info-value { font-size: 0.85rem; font-weight: 800; color: var(--tx); }

.rv .inline-secondary-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 42px; padding: 0 18px; border-radius: 999px;
    border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
    font-size: 0.8rem; font-weight: 800; cursor: pointer;
    transition: transform 0.1s, background 0.15s;
}
.rv .inline-secondary-btn:hover:not(:disabled) { background: var(--surface-2); transform: translateY(-1px); }
.rv .inline-secondary-btn:active:not(:disabled) { transform: translateY(2px); }
.rv .inline-secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

.rv .inline-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap; }
.rv .inline-form-footer {
    display: flex; justify-content: flex-end; gap: 14px;
    margin-top: 24px; padding-top: 22px; border-top: 2px dotted var(--line);
}

.rv .inline-history { background: var(--surface); border: 1.5px solid var(--line); border-radius: 16px; overflow: hidden; }
.rv .inline-history h4 {
    display: flex; align-items: center; gap: 8px; margin: 0; padding: 12px 16px;
    font-size: 0.7rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;
    background: var(--surface-2); border-bottom: 1.5px solid var(--line);
}
.rv .inline-history-item {
    display: flex; justify-content: space-between; align-items: center; gap: 10px;
    padding: 10px 16px; border-bottom: 1.5px dotted var(--line);
}
.rv .inline-history-item:last-child { border-bottom: 0; }
.rv .inline-history-notes { color: var(--tx-2); font-style: italic; font-size: 0.8rem; }
.rv .inline-history-delete { background: none; border: 0; color: var(--danger); cursor: pointer; padding: 8px; border-radius: 50%; }
.rv .inline-history-delete:hover { background: rgba(220,38,38,0.12); }

/* Reset banner */
.rv .rv-reset-banner {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 18px; margin-bottom: 1.25rem;
    background: rgba(234,179,8,0.14); border: 1.5px solid var(--acc);
    border-radius: 14px; font-size: 0.85rem; color: var(--acc-tx);
    font-weight: 700; flex-wrap: wrap;
}
.rv .rv-reset-banner strong { color: var(--tx); }
.rv .rv-reset-banner svg { flex-shrink: 0; }
.rv .rv-banner-btn {
    margin-left: auto; padding: 6px 14px;
    background: var(--acc); color: #0a0a0a; border: 0; border-radius: 8px;
    font-size: 0.78rem; font-weight: 800; cursor: pointer; transition: background 0.2s;
}
.rv .rv-banner-btn:hover { background: var(--acc-d); }
.rv .rv-banner-dismiss {
    background: transparent; border: 0; color: var(--acc-tx);
    font-size: 0.78rem; text-decoration: underline; cursor: pointer;
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
/* tableau */
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
.rv .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.4; vertical-align: middle; }
.rv .sort-icon.active { opacity: 1; color: #eab308; }
.rv .ac-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.75rem; font-weight: 600;
    background: var(--surface-2); color: var(--tx-2); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--line);
}
.rv .ac-strong { font-weight: 700; }
.rv .ac-empty-cell { text-align: center; padding: 48px 20px !important; color: var(--tx-3) !important; }
.rv .ac-empty-cell p { margin: 8px 0 0; font-size: 0.85rem; }
.rv .ac-empty-card {
    text-align: center; padding: 40px 20px; color: var(--tx-3);
    background: var(--surface); border: 1px dashed var(--line); border-radius: 14px;
}
.rv .ac-empty-card p { margin: 8px 0 0; font-size: 0.85rem; }

/* Badges */
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

/* User avatar cell */
.rv .au-name-cell { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rv .au-avatar {
    width: 32px; height: 32px; border-radius: 10px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 0.85rem; flex-shrink: 0;
}
.rv .au-avatar-lg { width: 44px; height: 44px; font-size: 1rem; border-radius: 12px; }
.rv .au-avatar-xl { width: 64px; height: 64px; font-size: 1.4rem; border-radius: 16px; }

/* Actions */
.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
.rv .ac-action-btn {
    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
    color: var(--tx-2);
}
.rv .ac-action-btn:hover { background: var(--surface-2); color: var(--tx); }
.rv .ac-action-edit { color: #10b981; }
.rv .ac-action-delete { color: #ef4444; }
.rv .ac-action-lock { color: #eab308; }
.rv .ac-action-perm { color: #8b5cf6; }
.rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
.rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
.rv .ac-action-btn.ac-action-lock:hover { background: #fefce8; }
.rv .ac-action-btn.ac-action-perm:hover { background: #f5f3ff; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
    .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
    .rv .ac-action-btn.ac-action-lock:hover { background: #422006; }
    .rv .ac-action-btn.ac-action-perm:hover { background: #4c1d95; }
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
.rv .ac-card-btn.ac-action-lock:hover { background: #fefce8; color: #eab308; }
.rv .ac-card-btn.ac-action-perm:hover { background: #f5f3ff; color: #8b5cf6; }
@media (prefers-color-scheme: dark) {
    .rv .ac-card-btn.ac-action-edit:hover { background: #064e3b; }
    .rv .ac-card-btn.ac-action-delete:hover { background: #7f1d1d; }
    .rv .ac-card-btn.ac-action-lock:hover { background: #422006; }
    .rv .ac-card-btn.ac-action-perm:hover { background: #4c1d95; }
}

/* Mobile cards (list mode) */
.rv .ac-mcards { display: flex; flex-direction: column; gap: 10px; }
.rv .ac-mcard {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.rv .ac-mcard.au-card-reset { border-color: var(--acc); box-shadow: 0 2px 12px -4px rgba(245,158,11,0.25); }
.rv .ac-mcard-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .ac-mcard-info { flex: 1; min-width: 0; }
.rv .ac-mcard-name { font-weight: 700; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .ac-mcard-sub { margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }

/* Cards view */
.rv .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.rv .car-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
}
.rv .car-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18); }
.rv .card-image {
    position: relative; background: var(--surface-2);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.rv .card-status { position: absolute; top: 0.75rem; right: 0.75rem; }
.rv .card-content { padding: 16px; }
.rv .card-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 0.75rem; font-size: 1.05rem; font-weight: 700; }
.rv .card-details {
    display: flex; gap: 8px; flex-wrap: wrap;
    margin: 0.5rem 0 0.75rem; padding: 0.75rem 0;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
}
.rv .detail-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--tx-2); min-width: 0; }

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

/* Custom dropdown */
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
.rv .ac-dd-inline .ac-dd-chevron { color: var(--tx-3); }
.rv .ac-dd-inline .ac-dd-trigger.open .ac-dd-chevron { color: var(--blue); }

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
.rv .ac-dd-menu-floating {
    z-index: 2000;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    box-shadow: 0 18px 44px -12px rgba(0, 0, 0, 0.35);
}
@media (max-width: 640px) {
    .rv .ac-dd-menu-floating .ac-dd-item {
        padding: 13px 14px;
        font-size: 0.95rem;
        min-height: 46px;
    }
    .rv .ac-dd-inline .ac-dd-trigger { font-size: 16px; }
    .rv .ac-dd-trigger { font-size: 16px; min-height: 44px; }
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
    .rv .ac-dd-menu-floating { animation: none !important; }
}

/* Countdown (permission modal) */
.rv .countdown-container { display: flex; flex-direction: column; gap: 4px; max-width: 220px; margin-top: 4px; }
.rv .countdown-time {
    font-size: 0.72rem; font-weight: 700; color: var(--acc-tx);
    background: rgba(234,179,8,0.16); padding: 2px 8px; border-radius: 6px;
    width: fit-content; font-family: ui-monospace, monospace;
}
.rv .progress-bar-container { background: var(--line); border-radius: 999px; height: 4px; width: 100%; overflow: hidden; }
.rv .progress-bar-fill { background: var(--acc); height: 100%; border-radius: 999px; transition: width 0.5s linear; }
.rv .progress-bar-fill.expired { background: var(--danger); }
.rv .permanent-badge {
    font-size: 0.7rem; font-weight: 700; color: #0f8a43;
    background: rgba(15,138,67,0.14); padding: 2px 8px; border-radius: 6px; width: fit-content;
}
.rv .expired-badge { font-size: 0.68rem; color: var(--danger); font-weight: 700; }

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

/* Responsive */
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
    .rv .ac-filters > div { width: 100% !important; }
    .rv .ac-seg { align-self: stretch; }
    .rv .ac-seg-btn { flex: 1; justify-content: center; }
    .rv .ac-desktop-only { display: none !important; }
    .rv .ac-mobile-only { display: block !important; }
    .rv .cards-grid { grid-template-columns: 1fr; }
    .rv .rv-reset-banner { flex-direction: column; align-items: flex-start; }
    .rv .rv-banner-btn { margin-left: 0; }
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
    .rv .modal-overlay { align-items: flex-end; padding: 0; }
    .rv .modal {
        max-width: 100% !important; max-height: 92vh;
        border-radius: 24px 24px 0 0; border-bottom: 0;
        animation: rvSheet 0.28s ease;
    }
    .rv .modal-actions-footer { flex-direction: column-reverse; padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)) !important; }
    .rv .modal-actions-footer button { width: 100%; }
    .rv .delete-actions { flex-direction: column-reverse; }
    .rv .delete-actions { gap: 10px; }
    .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }
    .rv .inline-input,
    .rv .inline-select { font-size: 16px; }
    .rv .inline-form-title h2 { overflow-wrap: anywhere; }
    .rv .inline-primary-btn,
    .rv .inline-secondary-btn { min-height: 48px; }
    .rv .delete-modal { padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }
    .rv .inline-history-item { flex-wrap: wrap; }
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