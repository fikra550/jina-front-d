// components/admin/NotificationBell.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Bell, X, AlertTriangle, Calendar, Car, CreditCard, RefreshCw,
  Search, Filter, Download, ChevronDown, FileText, FileSpreadsheet,
  CalendarDays, XCircle, SlidersHorizontal, Inbox
} from "lucide-react";
import {
  calculateAllNotifications,
  toggleNotificationPanel,
  closeNotificationPanel,
} from "../../Redux/notificationSlice";
import { Link } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import { NotificationsPDF } from "../../components/pdf/NotificationsPDF";

/* ---------- Custom Select ---------- */
const CustomSelect = ({ value, onChange, options, placeholder = "Sélectionner..." }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="nb-custom-select" ref={ref}>
      <button type="button" className="nb-cs-trigger" onClick={() => setOpen(!open)}>
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={13} className={open ? "rotated" : ""} />
      </button>
      {open && (
        <div className="nb-cs-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`nb-cs-option ${value === opt.value ? "selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Date Input ---------- */
const DateInput = ({ value, onChange, placeholder = "Date" }) => (
  <div className="nb-date-wrapper">
    <CalendarDays size={13} className="nb-date-icon" />
    <input
      type="date"
      className="nb-date-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default function NotificationBell() {
  const dispatch = useDispatch();
  const { notifications, loading, isOpen, lastUpdated } = useSelector(
    (state) => state.notifications
  );
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  /* ---------- Position calc ---------- */
  useEffect(() => {
    const calc = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const sidebar = document.querySelector(".sidebar-desktop");
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          setPanelPosition({ top: rect.bottom + 8, left: sidebarRect.left + 16 });
        } else {
          setPanelPosition({ top: rect.bottom + 8, left: rect.left });
        }
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [isOpen]);

  /* ---------- Click outside ---------- */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        const bellButton = buttonRef.current;
        if (bellButton && !bellButton.contains(event.target)) {
          dispatch(closeNotificationPanel());
        }
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dispatch, isOpen]);

  useEffect(() => {
    dispatch(calculateAllNotifications());
  }, [dispatch]);

  /* ---------- Icons / links ---------- */
  const getNotificationIcon = (type) => {
    switch (type) {
      case "technical_visit":
      case "insurance":
        return <Car size={14} />;
      case "reservation":
        return <Calendar size={14} />;
      case "accident":
        return <AlertTriangle size={14} />;
      case "payment_overdue":
      case "payment_upcoming":
        return <CreditCard size={14} />;
      default:
        return <Bell size={14} />;
    }
  };

  const getTypeClass = (type) => {
    switch (type) {
      case "technical_visit":
      case "insurance":
        return "nb-type-amber";
      case "reservation":
        return "nb-type-blue";
      case "accident":
        return "nb-type-red";
      case "payment_overdue":
      case "payment_upcoming":
        return "nb-type-green";
      default:
        return "nb-type-gray";
    }
  };

  const getNotificationLink = (item) => {
    switch (item.type) {
      case "technical_visit":
      case "insurance":
        return "/matricules";
      case "reservation":
        return "/reservations";
      case "accident":
        return "/accidents";
      case "payment_overdue":
      case "payment_upcoming":
        return "/payments";
      default:
        return "#";
    }
  };

  /* ---------- Data ---------- */
  const allNotifications = [
    ...notifications.matricules.items.map((i) => ({ ...i, category: "matricules" })),
    ...notifications.reservations.items.map((i) => ({ ...i, category: "reservations" })),
    ...notifications.accidents.items.map((i) => ({ ...i, category: "accidents" })),
    ...notifications.payments.items.map((i) => ({ ...i, category: "payments" })),
  ];

  const getNormalizedDate = (item) => {
    let dateStr = item.date || item.dueDate || item.endDate || null;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  };

  const filteredNotifications = allNotifications.filter((item) => {
    if (filterType !== "all") {
      const t = item.type;
      if (filterType === "insurance" && t !== "insurance") return false;
      if (filterType === "technical_visit" && t !== "technical_visit") return false;
      if (filterType === "reservation" && t !== "reservation") return false;
      if (filterType === "accident" && t !== "accident") return false;
      if (filterType === "payment_overdue" && t !== "payment_overdue") return false;
      if (filterType === "payment_upcoming" && t !== "payment_upcoming") return false;
    }
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const code = (item.matriculeCode || "").toLowerCase();
      const dossier = (item.dossierNumber || "").toLowerCase();
      if (
        !title.includes(term) &&
        !desc.includes(term) &&
        !code.includes(term) &&
        !dossier.includes(term)
      )
        return false;
    }
    const normalizedDate = getNormalizedDate(item);
    if (dateFrom && normalizedDate && normalizedDate < dateFrom) return false;
    if (dateTo && normalizedDate && normalizedDate > dateTo) return false;
    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const aCrit =
      a.isExpired ||
      a.isLate ||
      (a.daysRemaining !== undefined && a.daysRemaining <= 3) ||
      (a.daysSince !== undefined && a.daysSince <= 3);
    const bCrit =
      b.isExpired ||
      b.isLate ||
      (b.daysRemaining !== undefined && b.daysRemaining <= 3) ||
      (b.daysSince !== undefined && b.daysSince <= 3);
    if (aCrit && !bCrit) return -1;
    if (!aCrit && bCrit) return 1;
    const aDays =
      a.daysRemaining !== undefined ? a.daysRemaining : a.daysSince !== undefined ? -a.daysSince : 999;
    const bDays =
      b.daysRemaining !== undefined ? b.daysRemaining : b.daysSince !== undefined ? -b.daysSince : 999;
    return aDays - bDays;
  });

  const totalCount = allNotifications.length;

  /* ---------- Export ---------- */
  const getExportFilterDescription = () => {
    const parts = [];
    if (filterType !== "all") {
      const labels = {
        insurance: "Assurance",
        technical_visit: "Visite technique",
        reservation: "Réservation",
        accident: "Accident",
        payment_overdue: "Paiement en retard",
        payment_upcoming: "Paiement à venir",
      };
      parts.push(`Type: ${labels[filterType] || filterType}`);
    }
    if (searchTerm.trim()) parts.push(`Recherche: "${searchTerm.trim()}"`);
    if (dateFrom) parts.push(`Du: ${dateFrom}`);
    if (dateTo) parts.push(`Au: ${dateTo}`);
    return parts.length ? `Filtres: ${parts.join(" | ")}` : "Toutes les notifications";
  };

  const downloadCSV = () => {
    if (sortedNotifications.length === 0) {
      alert("Aucune notification à exporter.");
      return;
    }
    const filterDesc = getExportFilterDescription();
    const headers = ["Type", "Catégorie", "Titre", "Description", "Statut", "Date/Échéance", "Montant (DH)"];
    const rows = sortedNotifications.map((item) => {
      let status = "";
      if (item.isExpired) status = "Expiré";
      else if (item.isLate || item.isOverdue) status = "En retard";
      else if (item.daysRemaining !== undefined && item.daysRemaining > 0)
        status = `${item.daysRemaining} jours restant`;
      else if (item.daysSince !== undefined)
        status = `Il y a ${item.daysSince} jour${item.daysSince > 1 ? "s" : ""}`;
      else status = "—";
      const date = item.date || item.dueDate || item.endDate || "";
      const amount =
        item.amount && !isNaN(parseFloat(item.amount)) ? parseFloat(item.amount).toFixed(2) : "";
      return [item.type || "—", item.category || "—", item.title || "—", item.description || "—", status, date, amount];
    });
    const csvContent = [`# ${filterDesc}`, headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notifications_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const downloadPDF = async () => {
    if (sortedNotifications.length === 0) {
      alert("Aucune notification à exporter.");
      return;
    }
    const filterDesc = getExportFilterDescription();
    const blob = await pdf(
      <NotificationsPDF notifications={sortedNotifications} filterDescription={filterDesc} />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notifications_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  /* ---------- UI ---------- */
  const panel = isOpen ? (
    <div
      ref={panelRef}
      className="nb-panel"
      style={{ top: panelPosition.top, left: panelPosition.left }}
    >
      {/* Header */}
      <div className="nb-panel-header">
        <div className="nb-panel-header-left">
          <div className="nb-panel-header-icon">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="nb-panel-title">Notifications</h3>
            <p className="nb-panel-subtitle">
              {totalCount} notification{totalCount > 1 ? "s" : ""}
              {lastUpdated && (
                <>
                  {" · "}
                  {new Date(lastUpdated).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="nb-panel-header-actions">
          <button
            className="nb-icon-btn"
            onClick={() => dispatch(calculateAllNotifications())}
            title="Actualiser"
          >
            <RefreshCw size={14} className={loading ? "nb-spin" : ""} />
          </button>
          <div className="nb-export-wrapper">
            <button
              className="nb-icon-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Exporter"
            >
              <Download size={14} />
            </button>
            {showExportMenu && (
              <div className="nb-export-menu">
                <button onClick={downloadCSV} className="nb-export-option">
                  <FileSpreadsheet size={14} /> Exporter CSV
                </button>
                <button onClick={downloadPDF} className="nb-export-option">
                  <FileText size={14} /> Exporter PDF
                </button>
              </div>
            )}
          </div>
          <button
            className="nb-icon-btn"
            onClick={() => dispatch(closeNotificationPanel())}
            title="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="nb-filters">
        <div className="nb-search-wrapper">
          <Search size={13} className="nb-search-icon" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="nb-search-input"
          />
          {searchTerm && (
            <button className="nb-search-clear" onClick={() => setSearchTerm("")}>
              <X size={11} />
            </button>
          )}
        </div>
        <div className="nb-filter-row">
          <div className="nb-filter-item">
            <Filter size={12} className="nb-filter-icon" />
            <CustomSelect
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: "all", label: "Tous les types" },
                { value: "insurance", label: "Assurance" },
                { value: "technical_visit", label: "Visite technique" },
                { value: "reservation", label: "Réservation" },
                { value: "accident", label: "Accident" },
                { value: "payment_overdue", label: "Paiement en retard" },
                { value: "payment_upcoming", label: "Paiement à venir" },
              ]}
            />
          </div>
          <DateInput value={dateFrom} onChange={setDateFrom} placeholder="Du" />
          <DateInput value={dateTo} onChange={setDateTo} placeholder="Au" />
        </div>
      </div>

      {/* List */}
      <div className="nb-list">
        {loading ? (
          <div className="nb-loading">
            <div className="nb-spinner" />
            <p>Chargement...</p>
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="nb-empty">
            <Inbox size={36} />
            <h4>Aucune notification</h4>
            <p>Vous êtes à jour !</p>
          </div>
        ) : (
          sortedNotifications.map((item, idx) => {
            const isCritical =
              item.isExpired ||
              item.isLate ||
              (item.daysRemaining !== undefined && item.daysRemaining <= 3) ||
              (item.daysSince !== undefined && item.daysSince <= 3);
            return (
              <Link
                key={`${item.category}-${item.type}-${idx}`}
                to={getNotificationLink(item)}
                className={`nb-item ${isCritical ? "nb-item-critical" : ""}`}
                onClick={() => dispatch(closeNotificationPanel())}
              >
                <div className={`nb-item-icon ${getTypeClass(item.type)}`}>
                  {getNotificationIcon(item.type)}
                </div>
                <div className="nb-item-body">
                  <div className="nb-item-title-row">
                    <h4 className="nb-item-title">{item.title}</h4>
                    {isCritical && <span className="nb-critical-dot" />}
                  </div>
                  <p className="nb-item-desc">{item.description}</p>
                  <div className="nb-item-meta">
                    {item.date && (
                      <span className="nb-meta-chip">
                        <Calendar size={10} /> {item.date}
                      </span>
                    )}
                    {item.daysRemaining !== undefined && item.daysRemaining > 0 && (
                      <span className="nb-meta-chip nb-chip-amber">
                        {item.daysRemaining}j restant{item.daysRemaining > 1 ? "s" : ""}
                      </span>
                    )}
                    {item.isExpired && <span className="nb-meta-chip nb-chip-red">Expiré</span>}
                    {item.isLate && <span className="nb-meta-chip nb-chip-red">En retard</span>}
                    {item.amount && (
                      <span className="nb-meta-chip nb-chip-green">
                        {parseFloat(item.amount).toFixed(2)} DH
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="nb-panel-footer">
        <Link
          to="/notifications"
          className="nb-footer-link"
          onClick={() => dispatch(closeNotificationPanel())}
        >
          Voir toutes les notifications
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        className="nb-bell-btn"
        onClick={() => dispatch(toggleNotificationPanel())}
        title="Notifications"
      >
        <Bell size={18} />
        {totalCount > 0 && (
          <span className="nb-bell-badge">{totalCount > 99 ? "99+" : totalCount}</span>
        )}
      </button>

      {isOpen && createPortal(panel, document.body)}

      <style>{`
        /* ---------- Bell button ---------- */
        .nb-bell-btn {
          position: relative;
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nb-bell-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
          transform: translateY(-1px);
        }
        .nb-bell-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 0.62rem;
          font-weight: 700;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(239,68,68,0.4);
        }

        /* ---------- Panel ---------- */
        .nb-panel {
          position: fixed;
          width: 420px;
          max-width: calc(100vw - 32px);
          max-height: 600px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          z-index: 9999;
          overflow: hidden;
          animation: nbSlideDown 0.25s ease;
        }
        @keyframes nbSlideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ---------- Header ---------- */
        .nb-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }
        .nb-panel-header-left { display: flex; align-items: center; gap: 10px; }
        .nb-panel-header-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .nb-panel-title { font-size: 0.92rem; font-weight: 700; margin: 0; color: white; }
        .nb-panel-subtitle { font-size: 0.7rem; color: rgba(255,255,255,0.6); margin: 2px 0 0; }
        .nb-panel-header-actions { display: flex; gap: 4px; }
        .nb-icon-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nb-icon-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .nb-spin { animation: nbSpin 0.7s linear infinite; }
        @keyframes nbSpin { to { transform: rotate(360deg); } }

        /* ---------- Export menu ---------- */
        .nb-export-wrapper { position: relative; }
        .nb-export-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.2);
          padding: 4px;
          min-width: 160px;
          z-index: 10000;
          animation: nbFadeIn 0.15s ease;
        }
        .nb-export-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 7px;
          font-size: 0.78rem;
          color: #334155;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }
        .nb-export-option:hover { background: #f1f5f9; }
        @keyframes nbFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* ---------- Filters ---------- */
        .nb-filters {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nb-search-wrapper { position: relative; }
        .nb-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .nb-search-input {
          width: 100%;
          height: 32px;
          padding: 0 32px 0 30px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.78rem;
          color: #334155;
          transition: all 0.2s;
        }
        .nb-search-input:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
        }
        .nb-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
        }
        .nb-filter-row {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .nb-filter-item { display: flex; align-items: center; gap: 5px; flex: 1; min-width: 140px; }
        .nb-filter-icon { color: #94a3b8; flex-shrink: 0; }

        /* ---------- Custom select (compact) ---------- */
        .nb-custom-select { position: relative; flex: 1; min-width: 130px; }
        .nb-cs-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          width: 100%;
          height: 30px;
          padding: 0 10px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nb-cs-trigger:hover { border-color: #cbd5e1; }
        .nb-cs-trigger svg { color: #64748b; transition: transform 0.2s; }
        .nb-cs-trigger svg.rotated { transform: rotate(180deg); }
        .nb-cs-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.15);
          padding: 4px;
          z-index: 10001;
          animation: nbFadeIn 0.15s ease;
          max-height: 220px;
          overflow-y: auto;
        }
        .nb-cs-option {
          display: block;
          width: 100%;
          padding: 6px 10px;
          background: transparent;
          border: none;
          border-radius: 6px;
          font-size: 0.72rem;
          color: #334155;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }
        .nb-cs-option:hover { background: #f1f5f9; }
        .nb-cs-option.selected { background: #fef3c7; color: #92400e; font-weight: 600; }

        /* ---------- Date input (compact) ---------- */
        .nb-date-wrapper { position: relative; display: flex; align-items: center; flex: 1; min-width: 120px; }
        .nb-date-icon { position: absolute; left: 8px; color: #94a3b8; pointer-events: none; z-index: 1; }
        .nb-date-input {
          width: 100%;
          height: 30px;
          padding: 0 8px 0 26px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.72rem;
          color: #334155;
          transition: all 0.2s;
        }
        .nb-date-input:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
        }

        /* ---------- List ---------- */
        .nb-list {
          flex: 1;
          overflow-y: auto;
          max-height: 380px;
          padding: 6px;
          background: #fafafa;
        }
        .nb-list::-webkit-scrollbar { width: 6px; }
        .nb-list::-webkit-scrollbar-track { background: transparent; }
        .nb-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .nb-list::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .nb-item {
          display: flex;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
          border: 1px solid transparent;
          margin-bottom: 2px;
        }
        .nb-item:hover {
          background: white;
          border-color: #e2e8f0;
          box-shadow: 0 2px 8px -2px rgba(0,0,0,0.06);
        }
        .nb-item-critical { border-left: 3px solid #ef4444; padding-left: 10px; }

        .nb-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .nb-type-amber { background: #fef3c7; color: #d97706; }
        .nb-type-blue { background: #dbeafe; color: #2563eb; }
        .nb-type-red { background: #fee2e2; color: #dc2626; }
        .nb-type-green { background: #dcfce7; color: #16a34a; }
        .nb-type-gray { background: #f1f5f9; color: #64748b; }

        .nb-item-body { flex: 1; min-width: 0; }
        .nb-item-title-row { display: flex; align-items: center; gap: 6px; }
        .nb-item-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nb-critical-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
          animation: nbPulse 1.5s ease-in-out infinite;
        }
        @keyframes nbPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .nb-item-desc {
          font-size: 0.72rem;
          color: #64748b;
          margin: 3px 0 6px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .nb-item-meta { display: flex; flex-wrap: wrap; gap: 4px; }
        .nb-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 0.65rem;
          font-weight: 600;
          background: #f1f5f9;
          color: #475569;
        }
        .nb-chip-amber { background: #fef3c7; color: #92400e; }
        .nb-chip-red { background: #fee2e2; color: #991b1b; }
        .nb-chip-green { background: #dcfce7; color: #166534; }

        /* ---------- Loading / empty ---------- */
        .nb-loading, .nb-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
          color: #94a3b8;
        }
        .nb-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e2e8f0;
          border-top-color: #eab308;
          border-radius: 50%;
          animation: nbSpin 0.7s linear infinite;
        }
        .nb-empty h4 { font-size: 0.88rem; color: #475569; margin: 4px 0 0; }
        .nb-empty p { font-size: 0.75rem; margin: 0; }

        /* ---------- Footer ---------- */
        .nb-panel-footer {
          padding: 10px 16px;
          border-top: 1px solid #f1f5f9;
          background: white;
          text-align: center;
        }
        .nb-footer-link {
          font-size: 0.78rem;
          font-weight: 600;
          color: #d97706;
          text-decoration: none;
          transition: color 0.2s;
        }
        .nb-footer-link:hover { color: #b45309; text-decoration: underline; }

        /* ---------- Dark mode ---------- */
        @media (prefers-color-scheme: dark) {
          .nb-bell-btn { background: #1e293b; border-color: #334155; color: #cbd5e1; }
          .nb-bell-btn:hover { background: #334155; color: #f1f5f9; }
          .nb-bell-badge { border-color: #1e293b; }
          .nb-panel { background: #1e293b; border-color: #334155; }
          .nb-filters { background: #0f172a; border-bottom-color: #334155; }
          .nb-search-input, .nb-cs-trigger, .nb-date-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .nb-cs-menu, .nb-export-menu { background: #1e293b; border-color: #334155; }
          .nb-cs-option, .nb-export-option { color: #cbd5e1; }
          .nb-cs-option:hover, .nb-export-option:hover { background: #334155; }
          .nb-cs-option.selected { background: #422006; color: #fde68a; }
          .nb-list { background: #0f172a; }
          .nb-item:hover { background: #1e293b; border-color: #334155; }
          .nb-item-title { color: #f1f5f9; }
          .nb-item-desc { color: #94a3b8; }
          .nb-meta-chip { background: #334155; color: #cbd5e1; }
          .nb-chip-amber { background: #78350f; color: #fde68a; }
          .nb-chip-red { background: #7f1d1d; color: #fca5a5; }
          .nb-chip-green { background: #14532d; color: #4ade80; }
          .nb-type-amber { background: #78350f; color: #fbbf24; }
          .nb-type-blue { background: #1e3a5f; color: #60a5fa; }
          .nb-type-red { background: #7f1d1d; color: #fca5a5; }
          .nb-type-green { background: #14532d; color: #4ade80; }
          .nb-type-gray { background: #334155; color: #cbd5e1; }
          .nb-empty h4 { color: #cbd5e1; }
          .nb-panel-footer { background: #1e293b; border-top-color: #334155; }
          .nb-footer-link { color: #fbbf24; }
          .nb-footer-link:hover { color: #fde68a; }
        }

        /* ---------- Responsive ---------- */
        @media (max-width: 480px) {
          .nb-panel { width: calc(100vw - 16px); }
          .nb-filter-row { flex-direction: column; }
          .nb-filter-item, .nb-date-wrapper { min-width: 100%; width: 100%; }
        }
      `}</style>
    </>
  );
}