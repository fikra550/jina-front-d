// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector,useStore  } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchCars, fetchReservations, createClient, fetchClients, fetchAccidents, fetchMatricules, fetchContacts, fetchUtilisateurs,
  selectCars, selectCarsLoading, selectReservations, selectReservationsLoading,
  selectClients, selectAccidents, selectMatricules, selectContacts, selectUtilisateurs, selectUser,
  createReservation, updateReservation, refreshMatricules,selectSousLocations ,fetchSousLocations ,
  addPaymentToReservation, removePaymentFromReservation,
} from "../../Redux/store";
import {
  Car, CalendarCheck, UserCircle, AlertTriangle, TrendingUp,
  CreditCard, Euro, Calendar, BarChart3, PieChartIcon, FileText,
  Printer, X, User, Phone, Mail, IdCard, MapPin, DollarSign,
  CalendarDays, Clock, Gauge, Shield, Info, Settings, Eye, EyeOff,
  Save, Plus, Trash2, CheckCircle, AlertCircle, Building2, Key,
  Users, Wrench, Gauge as GaugeIcon, MessageCircle, CheckSquare,
  Clock as ClockIcon, Ban, UserCheck, CarFront, CarTaxiFront,
  AlertOctagon, ClipboardList, PhoneCall, CheckCircle2, XCircle, RefreshCw,
  Search, History, Wallet, Briefcase, FileText as FileIcon, Bell, BellRing,
  ChevronRight, ChevronDown, Filter, Download, Calendar as CalendarIcon,
  Euro as EuroIcon, Fuel, Cog, MapPin as MapPinIcon, Phone as PhoneIcon,
  Mail as MailIcon, AlertTriangle as AlertIcon, CheckCircle as SuccessIcon,
  XCircle as ErrorIcon, Info as InfoIcon, Sparkles, Star, Activity, Upload,
  FolderOpen, Edit, Save as SaveIcon, Zap, Loader, ChevronLeft,
  ChevronUp, Link2, Check,CalendarClock ,AlarmClock ,FileCheck ,CalendarPlus,UserPlus,Gem, ArrowRight, Coins } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import html2canvas from "html2canvas";

// Import images
import checklistImage from "../../assets/checklist.png";
import logoImage from "../../assets/logo.png";

// ==================== Helper Functions ====================
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const formatMoney = (val) => `${Number(val || 0).toFixed(2)} DH`;
const API_URL = "http://localhost:8000/api";
// Ajouter cette fonction après les imports
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
// ==================== Responsive helper ====================
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

// ==================== Report sheet pieces (contract style) ====================
const REPORT_LOGO = "/JinaLogo.png";

const ReportHead = ({ title = "RAPPORT MANUEL", number = "" }) => (
  <>
    <img src={REPORT_LOGO} alt="" className="rp-watermark" onError={(e) => (e.target.style.display = "none")} />
    <div className="rp-head">
      <div className="rp-head-row">
        <div className="rp-logo">
          <img src={REPORT_LOGO} alt="Jina Business" onError={(e) => (e.target.style.display = "none")} />
        </div>
        <div className="rp-mid">
          <div className="rp-small">Location de voiture</div>
          <div className="rp-big">{title}</div>
        </div>
        <div className="rp-no">
          <span>RAPPORT N°</span>
          <b>{number}</b>
        </div>
      </div>
      <div className="rp-date">Généré le {new Date().toLocaleDateString("fr-FR")}</div>
      <div className="rp-pill">DÉTAIL DES PAIEMENTS</div>
    </div>
  </>
);

const ReportFoot = () => (
  <div className="report-paper-footer rp-foot">
    <b>Siège Social :</b> LOT ERRACHAD N° 706 TR 02 MAG 01 MEDIOUNA, CASABLANCA - Maroc<br />
    <b>GSM :</b> 06 63 04 95 75 - 06 67 47 47 45 &nbsp; <b>Email :</b> jinabusiness0@gmail.com<br />
    <b>TP :</b> 37701443 - <b>RC :</b> 624023 - <b>IF :</b> 65912528 - <b>CNSS :</b> 5317601 - <b>N° I.C.E :</b> 003478448000020
  </div>
);

// ==================== Recent reservations (AdminReservations style) ====================
const RECENT_STATUS = {
  pending: { label: "En attente", Icon: Clock },
  confirmed: { label: "Confirmée", Icon: Check },
  contacted: { label: "Contacté", Icon: Phone },
  completed: { label: "Terminée", Icon: CheckCircle },
  cancelled: { label: "Annulée", Icon: XCircle },
  retard: { label: "En retard", Icon: AlertTriangle },
};

const recentDateParts = (value) => {
  const d = new Date(value);
  if (!value || isNaN(d.getTime())) return { day: "—", mon: "", year: "" };
  return {
    day: d.toLocaleDateString("fr-FR", { day: "2-digit" }),
    mon: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
    year: d.getFullYear(),
  };
};

const recentDays = (r) => {
  if (r.rental_days > 0) return r.rental_days;
  if (!r.start_date || !r.end_date) return 0;
  const s = new Date(r.start_date);
  const e = new Date(r.end_date);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  if (e < s) return 1;
  const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24));
  return diff === 0 ? 1 : diff;
};

const RecentReservations = ({ reservations, clients, cars, matricules, isMobile, onSeeAll, onOpen }) => {
  const resolve = (r) => {
    const client = r.client?.prenom || r.client?.nom ? r.client : (clients || []).find((c) => c.id === r.client_id);
    const car = (r.cars?.brand ? r.cars : null) || (r.car?.brand ? r.car : null) || (cars || []).find((c) => c.id === r.car_id);
    const mat = r.matricule || (matricules || []).find((m) => m.id === r.matricule_id);
    return { client, car, mat };
  };

  const initials = (client) => {
    if (!client) return "?";
    const l = `${(client.prenom || "").charAt(0)}${(client.nom || "").charAt(0)}`.toUpperCase();
    return l || "?";
  };

  const badge = (status) => {
    const c = RECENT_STATUS[status] || RECENT_STATUS.pending;
    const Icon = c.Icon;
    return (
      <span className={`rvr-badge rvr-st-${RECENT_STATUS[status] ? status : "pending"}`}>
        <Icon size={12} /> {c.label}
      </span>
    );
  };

  const money = (r) => {
    const total = Number(r.total_price) || 0;
    const paid = Number(r.amount_paid) || 0;
    const remaining =
      r.remaining_amount != null && r.remaining_amount !== ""
        ? Number(r.remaining_amount) || 0
        : Math.max(total - paid, 0);
    const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    return { total, paid, remaining, pct, settled: total > 0 && remaining <= 0 };
  };

  const plate = (mat) => (
    <span className="rvr-plate">
      <span className="rvr-plate-strip">MA</span>
      <span className="rvr-plate-code">{mat?.matricule_code || "—"}</span>
    </span>
  );

  const renderCard = (r) => {
    const { client, car, mat } = resolve(r);
    const days = recentDays(r);
    const m = money(r);
    const s = recentDateParts(r.start_date);
    const e = recentDateParts(r.end_date);
    return (
      <article key={r.id} className={`rvr-card ${r.status === "retard" ? "is-late" : ""}`}>
        <div className="rvr-card-top">
          <span className="rvr-card-no"><small>N°</small><b>{r.id}</b></span>
          {badge(r.status)}
        </div>

        <div className="rvr-card-client">
          <span className="rvr-avatar">{initials(client)}</span>
          <div className="rvr-client-name">{client ? `${client.prenom || ""} ${client.nom || ""}`.trim() : "—"}</div>
        </div>

        <div className="rvr-card-veh">
          <div className="rvr-veh">
            <span className="rvr-veh-name">{car ? `${car.brand} ${car.model}` : "—"}</span>
            {car?.color && (
              <span className="rvr-color"><span className="rvr-dot" style={{ backgroundColor: car.color }} /> {car.color}</span>
            )}
          </div>
          {plate(mat)}
        </div>

        <div className="rvr-route">
          <div className="rvr-date-block">
            <span className="dd">{s.day}</span><span className="mm">{s.mon}</span><span className="yy">{s.year}</span>
          </div>
          <div className="rvr-route-mid">
            <span className="rvr-chip"><CalendarDays size={13} /> {days} {days > 1 ? "jours" : "jour"}</span>
            <span className="line"><ArrowRight size={16} /></span>
          </div>
          <div className="rvr-date-block end">
            <span className="dd">{e.day}</span><span className="mm">{e.mon}</span><span className="yy">{e.year}</span>
          </div>
        </div>

        <div className="rvr-money">
          <div className="rvr-money-top">
            <div>
              <span className="lbl">Total</span>
              <span className="tot">{r.total_price}<small>DH</small></span>
            </div>
            <div className={`rvr-remaining ${m.settled ? "ok" : m.remaining > 0 ? "due" : ""}`}>
              {m.settled ? "Soldé ✓" : m.remaining > 0 ? `Reste ${m.remaining} DH` : ""}
            </div>
          </div>
          {m.total > 0 && (
            <div className={`rvr-bar ${m.settled ? "full" : ""}`} role="progressbar" aria-valuenow={m.pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${m.pct}%` }} />
            </div>
          )}
        </div>

        <div className="rvr-perf" />
        <div className="rvr-tiles">
          <button type="button" className={`rvr-tile view ${client?.telephone || client?.phone ? "" : "solo"}`} onClick={() => onOpen && onOpen(r)}>
            <Eye size={18} /><span>Voir</span>
          </button>
          {(client?.telephone || client?.phone) && (
            <a className="rvr-tile call" href={`tel:${client.telephone || client.phone}`} onClick={(ev) => ev.stopPropagation()}>
              <Phone size={18} /><span>Appeler</span>
            </a>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="rvr">
      <div className="rvr-head">
        <div className="rvr-head-left">
          <span className="rvr-head-icon"><CalendarDays size={20} /></span>
          <div>
            <h2 className="rvr-title">Réservations récentes</h2>
            <p className="rvr-sub">Les 6 dernières réservations enregistrées</p>
          </div>
        </div>
        <button type="button" className="rvr-btn" onClick={onSeeAll}>
          Voir tout <ChevronRight size={14} />
        </button>
      </div>

      {reservations.length === 0 ? (
        <p className="rvr-empty">Aucune réservation pour la période sélectionnée</p>
      ) : isMobile ? (
        <div className="rvr-cards">{reservations.map(renderCard)}</div>
      ) : (
        <div className="rvr-tablewrap">
          <div className="rvr-scroll">
            <table className="rvr-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Véhicule / Matricule</th>
                  <th>Période</th>
                  <th>Jours</th>
                  <th>Total</th>
                  <th>Reste</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => {
                  const { client, car, mat } = resolve(r);
                  const days = recentDays(r);
                  const m = money(r);
                  return (
                    <tr key={r.id} className="rvr-row" onClick={() => onOpen && onOpen(r)}>
                      <td>
                        <div className="rvr-client">
                          <span className="rvr-avatar">{initials(client)}</span>
                          <div className="rvr-client-name">{client ? `${client.prenom || ""} ${client.nom || ""}`.trim() : "—"}</div>
                        </div>
                      </td>
                      <td>
                        <div className="rvr-veh">
                          <span className="rvr-veh-name">{car ? `${car.brand} ${car.model}` : "—"}</span>
                          {plate(mat)}
                        </div>
                      </td>
                      <td>
                        <div className="rvr-period">
                          <span><Calendar size={13} /> {r.start_date ? new Date(r.start_date).toLocaleDateString("fr-FR") : "—"}</span>
                          <span><ArrowRight size={13} /> {r.end_date ? new Date(r.end_date).toLocaleDateString("fr-FR") : "—"}</span>
                        </div>
                      </td>
                      <td><span className="rvr-chip"><CalendarDays size={13} /> {days} {days > 1 ? "jours" : "jour"}</span></td>
                      <td><span className="rvr-price"><Coins size={14} /> {r.total_price} DH</span></td>
                      <td>
                        <span className={`rvr-rest ${m.settled ? "ok" : m.remaining > 0 ? "due" : ""}`}>
                          {m.settled ? "Soldé" : m.remaining > 0 ? `${m.remaining} DH` : "—"}
                        </span>
                      </td>
                      <td>{badge(r.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Report Modal Components ====================
// ---------- Create Report Modal (with dropdown above) ----------
const MultiRowReportModal = ({ isOpen, onClose, onReportSaved }) => {
  const dispatch = useDispatch();
  const clients = useSelector(selectClients);
  const reservations = useSelector(selectReservations);
// Ajoutez cette fonction
const getClientRemaining = (clientId) => {
  if (!clientId) return 0;
  const allowedStatuses = ['completed', 'confirmed', 'retard'];
  return reservations
    .filter(r => r.client_id === clientId && allowedStatuses.includes(r.status))
    .reduce((sum, r) => sum + (parseFloat(r.remaining_amount) || 0), 0);
};
  const [rows, setRows] = useState([
    { id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 },
  ]);
  const [generating, setGenerating] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState(1);
  const paperRef = useRef(null);
  const pdfPaperRef = useRef(null);
  const randRef = useRef(String(Math.floor(Math.random() * 10000)).padStart(4, "0"));

  // ✅ État de recherche par ligne (texte tapé)
  const [searchValues, setSearchValues] = useState({});
  const [activeRowId, setActiveRowId] = useState(null);
  // ✅ Positions pour le dropdown en fixed
  const [dropdownPositions, setDropdownPositions] = useState({});

  const getFilteredClients = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const lower = searchTerm.toLowerCase().trim();
    return clients.filter(c => {
      const fullName = `${c.prenom} ${c.nom}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.telephone || "").toLowerCase();
      return fullName.includes(lower) || email.includes(lower) || phone.includes(lower);
    }).slice(0, 10);
  };

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 },
    ]);
  };

  const createMultipleRows = () => {
    const num = parseInt(numberOfLines);
    if (isNaN(num) || num <= 0) {
      toast.warning("Entrez un nombre valide (1 ou plus)");
      return;
    }
    const newRows = [];
    for (let i = 0; i < num; i++) {
      newRows.push({
        id: Date.now() + i,
        date: new Date().toISOString().slice(0, 10),
        client_id: "",
        client_name: "",
        price: 0,
      });
    }
    setRows(prev => [...prev, ...newRows]);
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
      setSearchValues(prev => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
      setDropdownPositions(prev => {
        const newPos = { ...prev };
        delete newPos[id];
        return newPos;
      });
      if (activeRowId === id) setActiveRowId(null);
    }
  };

  const resetForm = () => {
    setRows([{ id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 }]);
    setNumberOfLines(1);
    setSearchValues({});
    setDropdownPositions({});
    setActiveRowId(null);
  };

  const handleSelectClient = (rowId, client) => {
    updateRow(rowId, 'client_id', client.id);
    updateRow(rowId, 'client_name', `${client.prenom} ${client.nom}`);
    setSearchValues(prev => ({ ...prev, [rowId]: `${client.prenom} ${client.nom}` }));
    setActiveRowId(null);
    setDropdownPositions(prev => {
      const newPos = { ...prev };
      delete newPos[rowId];
      return newPos;
    });
  };

  // ✅ Met à jour la position du dropdown en fonction de l'input
  const updateDropdownPosition = (rowId, inputElement) => {
    if (!inputElement) return;
    const rect = inputElement.getBoundingClientRect();
    setDropdownPositions(prev => ({
      ...prev,
      [rowId]: {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      }
    }));
  };

  // ============================================================
  // ✅ GENERATE PDF – version complète (inchangée)
  // ============================================================
  const generatePDF = async () => {
    // Resolve client_id from name if missing
    const updatedRows = rows.map(row => {
      if (!row.client_id && row.client_name) {
        const trimmed = row.client_name.trim();
        const found = clients.find(c => 
          `${c.prenom} ${c.nom}`.toLowerCase() === trimmed.toLowerCase()
        );
        if (found) {
          return { ...row, client_id: found.id };
        }
      }
      return row;
    });
    setRows(updatedRows);

    const validRows = updatedRows.filter((row) => row.client_id && parseFloat(row.price) > 0);
    if (validRows.length === 0) {
      toast.warning("Veuillez sélectionner un client existant (utilisez la recherche) et saisir un prix supérieur à 0.");
      return;
    }
for (const row of validRows) {
  const totalRemaining = getClientRemaining(row.client_id);
  if (row.price > totalRemaining) {
    const clientName = row.client_name || `Client ${row.client_id}`;
    toast.error(`❌ Le montant (${row.price} DH) pour ${clientName} dépasse le solde restant (${totalRemaining} DH).`);
    setGenerating(false);
    return; // arrête la génération
  }
}
    setGenerating(true);

    try {
      const paperElement = pdfPaperRef.current;
      if (!paperElement) {
        toast.error("Impossible de capturer le rapport");
        return;
      }

      const canvas = await html2canvas(paperElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        const scale = pageHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
      } else {
        const verticalOffset = 0;
        doc.addImage(imgData, 'PNG', 0, verticalOffset, imgWidth, imgHeight);
      }

      const fileName = `Rapport_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
      const pdfBlob = doc.output('blob');
      const pdfBase64 = await blobToBase64(pdfBlob);

      const token = localStorage.getItem("authToken");
      const saveReportResponse = await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_name: fileName,
          pdf_data: pdfBase64,
          rows: validRows.map(r => ({ date: r.date, client_name: r.client_name, client_id: r.client_id, price: r.price })),
          total_ht: validRows.reduce((sum, row) => sum + Number(row.price), 0),
        }),
      });

      if (!saveReportResponse.ok) {
        const err = await saveReportResponse.json();
        toast.error(err.message || "Erreur lors de la sauvegarde du rapport");
        return;
      }

      // Add payments
      // Dans MultiRowReportModal, remplacer la boucle for (const row of validRows) par ceci :
// Valider que chaque prix ne dépasse pas le solde restant du client
let paymentErrors = 0;
for (const row of validRows) {
  try {
    const clientReservations = reservations.filter(r => r.client_id === row.client_id);
    // Ordre de priorité : completed > confirmed > retard
    const priorityOrder = ['completed', 'confirmed', 'retard'];
    const sortedReservations = clientReservations
      .filter(r => r.remaining_amount > 0)
      .sort((a, b) => {
        const indexA = priorityOrder.indexOf(a.status);
        const indexB = priorityOrder.indexOf(b.status);
        if (indexA !== indexB) return indexA - indexB;
        // À statut égal, la plus ancienne en premier
        return new Date(a.start_date) - new Date(b.start_date);
      });

    let remainingAmount = row.price;
    let paymentsAdded = 0;

    for (const res of sortedReservations) {
      if (remainingAmount <= 0) break;
      const amountToPay = Math.min(remainingAmount, res.remaining_amount);
      if (amountToPay > 0) {
        await dispatch(addPaymentToReservation({
          reservationId: res.id,
          paymentData: {
            amount: amountToPay,
            date: row.date,
            method: 'cash',
            notes: `Rapport manuel (${fileName})`
          }
        })).unwrap();
        remainingAmount -= amountToPay;
        paymentsAdded++;
      }
    }

    if (remainingAmount > 0) {
      // Montant non affecté car plus de réservations éligibles
      console.warn(`Montant restant ${remainingAmount} non affecté pour ${row.client_name}`);
      // On peut décider de créer une note ou d'incrémenter paymentErrors
      // paymentErrors++; // décommenter si on veut signaler une erreur
    }
  } catch (err) {
    console.error(`Échec de l'ajout de paiement pour ${row.client_name} :`, err);
    paymentErrors++;
  }
}
// Définir une date de référence pour chaque client afin d'éviter les doublons lors des synchronisations futures
const now = new Date().toISOString();
for (const row of validRows) {
  const clientId = row.client_id;
  const date = new Date(row.date + 'T00:00:00Z');
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const storageKey = `report_last_sync_${clientId}_${year}_${month}`;
  localStorage.setItem(storageKey, now);
}
      if (paymentErrors > 0) {
        toast.warning(`Rapport sauvegardé, mais ${paymentErrors} paiement(s) n'ont pas pu être appliqués.`);
      } else {
        toast.success("Rapport sauvegardé et paiements enregistrés avec succès");
      }

      resetForm();
      onClose();
      if (onReportSaved) onReportSaved();

    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const firstClientName = rows.find(r => r.client_id)?.client_name || "";

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h2 className="report-modal-title">
            <FileText size={20} /> Rapport manuel
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="report-modal-body">
          <div className="report-controls">
            <span>📝 Nombre de lignes :</span>
            <input
              type="number"
              min="1"
              max="50"
              value={numberOfLines}
              onChange={(e) => setNumberOfLines(e.target.value)}
            />
            <button onClick={createMultipleRows} className="btn btn-primary">
              <Zap size={14} /> Créer {numberOfLines} ligne{parseInt(numberOfLines) > 1 ? "s" : ""}
            </button>
            <button onClick={addRow} className="btn btn-outline">
              <Plus size={14} /> Ajouter 1 ligne
            </button>
            <span className="report-line-count">📋 {rows.length} ligne(s)</span>
          </div>

          {/* ============ RAPPORT PAPER ============ */}
          <div className="report-paper" ref={paperRef}>
            <ReportHead title="RAPPORT MANUEL" number={firstClientName ? `${new Date().getFullYear()}-${firstClientName.slice(0, 4)}` : `${new Date().getFullYear()}-${randRef.current}`} />

            <div className="report-table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Date</th>
                    <th style={{ width: "45%" }}>Client</th>
                    <th style={{ width: "25%" }}>Prix HT (MAD)</th>
                    <th style={{ width: "10%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const searchTerm = searchValues[row.id] || "";
                    const filteredClients = getFilteredClients(searchTerm);
                    const isActive = activeRowId === row.id;
                    const dropdownPos = dropdownPositions[row.id];

                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="date"
                            className="report-input"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, "date", e.target.value)}
                          />
                        </td>
                        <td style={{ position: "relative" }}>
                          <input
                            type="text"
                            className="report-input"
                            value={searchTerm}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSearchValues(prev => ({ ...prev, [row.id]: val }));
                              setActiveRowId(row.id);
                              if (val === "") {
                                updateRow(row.id, "client_id", "");
                                updateRow(row.id, "client_name", "");
                              }
                              updateDropdownPosition(row.id, e.target);
                            }}
                            onFocus={(e) => {
                              setActiveRowId(row.id);
                              updateDropdownPosition(row.id, e.target);
                            }}
                            onBlur={() => setTimeout(() => setActiveRowId(null), 200)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setActiveRowId(null);
                                e.target.blur();
                              }
                            }}
                            placeholder="Rechercher un client..."
                            autoComplete="off"
                          />
                          {isActive && searchTerm.length >= 1 && dropdownPos && (
                            <div className="client-dropdown-fixed" style={{
                              position: 'fixed',
                              top: dropdownPos.top,
                              left: dropdownPos.left,
                              width: dropdownPos.width,
                              background: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              maxHeight: "200px",
                              overflowY: "auto",
                              zIndex: 9999,
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                            }}>
                              {filteredClients.length === 0 ? (
                                <div style={{ padding: "8px", color: "#94a3b8" }}>Aucun client trouvé</div>
                              ) : (
                                filteredClients.map(client => (
                                  <div
                                    key={client.id}
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f1f5f9",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectClient(row.id, client)}
                                  >
                                    <span>{client.prenom} {client.nom}</span>
                                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{client.telephone}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="report-input"
                            value={row.price || ""}
                            onChange={(e) =>
                              updateRow(row.id, "price", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            style={{ textAlign: "right" }}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.filter((r) => r.price > 0).length > 0 && (
              <div className="report-summary">
                <div className="report-summary-label">Total HT</div>
                <div className="report-summary-value">
                  {formatMoney(
                    rows.filter((r) => r.price > 0).reduce((sum, r) => sum + Number(r.price), 0)
                  )}
                </div>
              </div>
            )}

            <ReportFoot />
          </div>

          {/* ============ HIDDEN PDF CAPTURE AREA ============ */}
          <div className="rp-capture" style={{ position: 'absolute', left: '-9999px',
            top: 0,
            width: '794px',
            zIndex: -1,
            background: 'white',
          }} ref={pdfPaperRef}>
            <div className="report-paper">
              <ReportHead title="RAPPORT MANUEL" number={firstClientName ? `${new Date().getFullYear()}-${firstClientName.slice(0, 4)}` : `${new Date().getFullYear()}-${randRef.current}`} />
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Date</th>
                      <th style={{ width: "45%" }}>Client</th>
                      <th style={{ width: "30%" }}>Prix HT (MAD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.client_id && r.price > 0).map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td>{row.client_name}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.filter(r => r.price > 0).length > 0 && (
                <div className="report-summary">
                  <div className="report-summary-label">Total HT</div>
                  <div className="report-summary-value">
                    {formatMoney(
                      rows.filter(r => r.price > 0).reduce((sum, r) => sum + Number(r.price), 0)
                    )}
                  </div>
                </div>
              )}
              <ReportFoot />
            </div>
          </div>
        </div>
        <div className="report-modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={generating}>
            Annuler
          </button>
          <button onClick={generatePDF} className="btn btn-primary" disabled={generating}>
            {generating ? <Loader size={16} className="spinning" /> : <Printer size={16} />}
            {generating ? "Génération..." : "Générer PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== EditReportModal (FULLY REVISED) ====================
// ==================== EditReportModal (FULLY REVISED) ====================
const EditReportModal = ({ isOpen, onClose, report, onReportSaved, reservations }) => {
  const dispatch = useDispatch();
  const store = useStore(); // ✅ import useStore
  const clients = useSelector(selectClients);
// Ajoutez cette fonction
const getClientRemaining = (clientId) => {
  if (!clientId) return 0;
  const allowedStatuses = ['completed', 'confirmed', 'retard'];
  return reservations
    .filter(r => r.client_id === clientId && allowedStatuses.includes(r.status))
    .reduce((sum, r) => sum + (parseFloat(r.remaining_amount) || 0), 0);
};
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState(1);
  const paperRef = useRef(null);
  const pdfPaperRef = useRef(null);
  const randRef = useRef(String(Math.floor(Math.random() * 10000)).padStart(4, "0"));

  const [searchTerms, setSearchTerms] = useState({});
  const [activeRowId, setActiveRowId] = useState(null);

  // ---------- useEffect ----------
  useEffect(() => {
    if (report && report.rows) {
      const parsed =
        typeof report.rows === "string"
          ? JSON.parse(report.rows)
          : report.rows;

      const newRows = parsed.map((row) => ({
        id: Date.now() + Math.random(),
        date: row.date || new Date().toISOString().slice(0, 10),
        client_id: row.client_id || "",
        client_name: row.client_name || row.nom || "",
        price: row.price || 0,
        isOriginal: true,
      }));

      setRows(newRows);

      const initialSearchTerms = {};
      newRows.forEach((row) => {
        initialSearchTerms[row.id] = row.client_name;
      });

      setSearchTerms(initialSearchTerms);
    } else {
      setRows([]);
      setSearchTerms({});
    }
  }, [report]);

  // ---------- handleSelectClient ----------
  const handleSelectClient = (rowId, client) => {
    const fullName = `${client.prenom} ${client.nom}`;

    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              client_id: client.id,
              client_name: fullName,
            }
          : row
      )
    );

    setSearchTerms((prev) => ({
      ...prev,
      [rowId]: fullName,
    }));

    setActiveRowId(null);
  };

  const getFilteredClients = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const lower = searchTerm.toLowerCase().trim();
    return clients.filter(c => {
      const fullName = `${c.prenom} ${c.nom}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.telephone || "").toLowerCase();
      return fullName.includes(lower) || email.includes(lower) || phone.includes(lower);
    }).slice(0, 10);
  };

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 ,isOriginal: false},
    ]);
  };

  const createMultipleRows = () => {
    const num = parseInt(numberOfLines);
    if (isNaN(num) || num <= 0) {
      toast.warning("Entrez un nombre valide");
      return;
    }
    const newRows = [];
    for (let i = 0; i < num; i++) {
      newRows.push({
        id: Date.now() + i,
        date: new Date().toISOString().slice(0, 10),
        client_id: "",
        client_name: "",
        price: 0,
      });
    }
    setRows([...rows, ...newRows]);
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
      setSearchTerms(prev => {
        const newTerms = { ...prev };
        delete newTerms[id];
        return newTerms;
      });
      if (activeRowId === id) setActiveRowId(null);
    }
  };

  const calculateTotal = () => rows.reduce((sum, row) => sum + Number(row.price), 0);

 const handleSave = async () => {
  // 1. Valider et nettoyer les lignes
  const updatedRows = rows.map(row => {
    if (!row.client_id && row.client_name) {
      const trimmed = row.client_name.trim();
      const found = clients.find(c => 
        `${c.prenom} ${c.nom}`.toLowerCase() === trimmed.toLowerCase()
      );
      if (found) {
        return { ...row, client_id: found.id };
      }
    }
    return row;
  });
  setRows(updatedRows);

  const validRows = updatedRows.filter((row) => row.client_id && parseFloat(row.price) > 0);
  if (validRows.length === 0) {
    toast.warning("Ajoutez au moins une ligne valide");
    return;
  }

  setSaving(true);
  let unallocatedCount = 0;

  try {
    const reportFileName = report.file_name;

    // Récupérer les anciennes lignes du rapport
    let oldRows = [];
    if (report.rows) {
      try {
        oldRows = typeof report.rows === 'string' ? JSON.parse(report.rows) : report.rows;
      } catch { oldRows = []; }
    }
    if (!Array.isArray(oldRows)) oldRows = [];

    // Grouper les anciennes lignes par client_id
    const oldTotals = {};
    oldRows.forEach(row => {
      const clientId = row.client_id;
      if (!clientId) return;
      oldTotals[clientId] = (oldTotals[clientId] || 0) + Number(row.price);
    });

    // Grouper les nouvelles lignes par client_id
    const newTotals = {};
    validRows.forEach(row => {
      const clientId = row.client_id;
      if (!clientId) return;
      newTotals[clientId] = (newTotals[clientId] || 0) + Number(row.price);
    });

    // Récupérer les réservations fraîches du store
    const freshReservations = store.getState().reservations.list || [];
    for (const clientId of Object.keys(newTotals)) {
  const oldTotal = oldTotals[clientId] || 0;
  const newTotal = newTotals[clientId];
  if (newTotal > oldTotal) {
    const diff = newTotal - oldTotal;
    const clientReservations = freshReservations.filter(r => r.client_id == clientId);
    const totalRemaining = clientReservations.reduce((sum, r) => sum + (parseFloat(r.remaining_amount) || 0), 0);
    if (diff > totalRemaining) {
      const client = clients.find(c => c.id == clientId);
      const clientName = client ? `${client.prenom} ${client.nom}` : `Client ${clientId}`;
      toast.error(`❌ L'augmentation pour ${clientName} (${diff} DH) dépasse le solde restant (${totalRemaining} DH).`);
      setSaving(false);
      return;
    }
  }
}
    const remainingMap = {};
    freshReservations.forEach(r => {
      remainingMap[r.id] = r.remaining_amount || 0;
    });

    const priorityOrder = ['completed', 'confirmed', 'retard'];

    // Pour chaque client présent dans les nouvelles lignes
    for (const clientId of Object.keys(newTotals)) {
      const oldTotal = oldTotals[clientId] || 0;
      const newTotal = newTotals[clientId];
      const diff = newTotal - oldTotal;

      if (Math.abs(diff) < 0.01) continue; // pas de changement

      const clientReservations = freshReservations.filter(r => r.client_id == clientId);

      // --- CAS 1 : Augmentation ---
      if (diff > 0) {
        let amountToAdd = diff;

        // 1ère passe : réservations avec solde > 0
        const sortedPositive = clientReservations
          .filter(r => (remainingMap[r.id] || 0) > 0)
          .sort((a, b) => {
            const idxA = priorityOrder.indexOf(a.status);
            const idxB = priorityOrder.indexOf(b.status);
            if (idxA !== idxB) return idxA - idxB;
            return new Date(a.start_date) - new Date(b.start_date);
          });

        for (const res of sortedPositive) {
          if (amountToAdd <= 0) break;
          const available = remainingMap[res.id] || 0;
          const amountToPay = Math.min(amountToAdd, available);
          if (amountToPay > 0) {
            await dispatch(addPaymentToReservation({
              reservationId: res.id,
              paymentData: {
                amount: amountToPay,
                date: new Date().toISOString().slice(0, 10),
                method: 'cash',
                notes: `Rapport modifié (${reportFileName})`
              }
            })).unwrap();
            remainingMap[res.id] -= amountToPay;
            amountToAdd -= amountToPay;
          }
        }

        // 2ème passe : s'il reste, on met sur la réservation la plus prioritaire (même si solde = 0)
        if (amountToAdd > 0) {
          const sortedAll = clientReservations
            .sort((a, b) => {
              const idxA = priorityOrder.indexOf(a.status);
              const idxB = priorityOrder.indexOf(b.status);
              if (idxA !== idxB) return idxA - idxB;
              return new Date(a.start_date) - new Date(b.start_date);
            });
          if (sortedAll.length > 0) {
            const topRes = sortedAll[0];
            await dispatch(addPaymentToReservation({
              reservationId: topRes.id,
              paymentData: {
                amount: amountToAdd,
                date: new Date().toISOString().slice(0, 10),
                method: 'cash',
                notes: `Rapport modifié (${reportFileName})`
              }
            })).unwrap();
            remainingMap[topRes.id] -= amountToAdd;
            amountToAdd = 0;
          } else {
            unallocatedCount += amountToAdd;
            console.warn(`Aucune réservation pour le client ${clientId}, ${amountToAdd} DH non affectés`);
          }
        }
      }

      // --- CAS 2 : Diminution ---
      if (diff < 0) {
        const amountToRemove = -diff;
        let removed = 0;

        // Récupérer tous les paiements liés à ce rapport pour ce client
        const paymentsToConsider = [];
        for (const res of clientReservations) {
          if (res.payment_history && Array.isArray(res.payment_history)) {
            res.payment_history.forEach(p => {
              if (p.notes && p.notes.includes(reportFileName)) {
                paymentsToConsider.push({
                  ...p,
                  reservationId: res.id,
                });
              }
            });
          }
        }

        // Trier du plus récent au plus ancien
        paymentsToConsider.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

        for (const payment of paymentsToConsider) {
          if (removed >= amountToRemove) break;
          const remainingToRemove = amountToRemove - removed;
          const amountToDelete = Math.min(payment.amount, remainingToRemove);
          if (amountToDelete > 0) {
            // Supprimer le paiement complet (ou partiel ? On supprime complet)
            await dispatch(removePaymentFromReservation({
              reservationId: payment.reservationId,
              paymentId: payment.id
            })).unwrap();
            removed += payment.amount;
          }
        }

        if (removed < amountToRemove) {
          unallocatedCount += (amountToRemove - removed);
          console.warn(`Impossible de supprimer ${amountToRemove - removed} DH pour le client ${clientId} (pas assez de paiements)`);
        }
      }
    }

    // --- Mise à jour du rapport (PDF et base de données) ---
    const paperElement = pdfPaperRef.current;
    if (!paperElement) {
      toast.error("Impossible de capturer le rapport");
      return;
    }

    const canvas = await html2canvas(paperElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      const scale = pageHeight / imgHeight;
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
    } else {
      const verticalOffset = 0;
      doc.addImage(imgData, 'PNG', 0, verticalOffset, imgWidth, imgHeight);
    }

    const fileName = report.file_name || `Rapport_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
    const pdfBlob = doc.output('blob');
    const pdfBase64 = await blobToBase64(pdfBlob);

    const token = localStorage.getItem("authToken");
    const newTotal = validRows.reduce((sum, row) => sum + Number(row.price), 0);
    const response = await fetch(`${API_URL}/reports/${report.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        file_name: fileName,
        pdf_data: pdfBase64,
        rows: validRows.map(r => ({ date: r.date, client_name: r.client_name, client_id: r.client_id, price: r.price })),
        total_ht: newTotal,
      }),
    });

    if (!response.ok) {
      toast.error("Erreur lors de la modification");
      return;
    }
const now = new Date().toISOString();
for (const row of validRows) {
  const clientId = row.client_id;
  const date = new Date(row.date + 'T00:00:00Z');
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const storageKey = `report_last_sync_${clientId}_${year}_${month}`;
  localStorage.setItem(storageKey, now);
}
    // --- Toast final ---
    if (unallocatedCount > 0) {
      toast.warning(`Rapport modifié, mais ${unallocatedCount} DH non affectés.`);
    } else {
      toast.success("Rapport modifié avec succès");
    }

    onClose();
    if (onReportSaved) onReportSaved();

  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de la modification du rapport");
  } finally {
    setSaving(false);
  }
};

  // ========== RENDU (inchangé) ==========
  if (!isOpen || !report) return null;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2 className="edit-modal-title">
            <Edit size={20} /> Modifier le rapport
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="edit-modal-body">
          <div className="report-controls">
            <span>📝 Nombre de lignes :</span>
            <input
              type="number"
              min="1"
              max="50"
              value={numberOfLines}
              onChange={(e) => setNumberOfLines(e.target.value)}
            />
            <button onClick={createMultipleRows} className="btn btn-primary">
              <Zap size={14} /> Créer {numberOfLines} ligne{parseInt(numberOfLines) > 1 ? "s" : ""}
            </button>
            <button onClick={addRow} className="btn btn-outline">
              <Plus size={14} /> Ajouter 1 ligne
            </button>
            <span className="report-line-count">📋 {rows.length} ligne(s)</span>
          </div>

          <div className="report-paper" ref={paperRef}>
            <ReportHead title="MODIFIER LE RAPPORT" number={`${new Date().getFullYear()}-${randRef.current}`} />

            <div className="report-table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Date</th>
                    <th style={{ width: "45%" }}>Client</th>
                    <th style={{ width: "25%" }}>Prix HT (MAD)</th>
                    <th style={{ width: "10%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const searchTerm = searchTerms[row.id] || "";
                    const filteredClients = getFilteredClients(searchTerm);
                    const isActive = activeRowId === row.id;

                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="date"
                            className="report-input"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, "date", e.target.value)}
                            disabled={row.isOriginal}
                            style={row.isOriginal ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                          />
                        </td>
                        <td style={{ position: "relative" }}>
                          <input
                            type="text"
                            className="report-input"
                            value={searchTerms[row.id] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSearchTerms((prev) => ({
                                ...prev,
                                [row.id]: val,
                              }));
                              setRows((prevRows) =>
                                prevRows.map((r) =>
                                  r.id === row.id
                                    ? {
                                        ...r,
                                        client_name: val,
                                        client_id: val === "" ? "" : r.client_id,
                                      }
                                    : r
                                )
                              );
                              setActiveRowId(row.id);
                            }}
                            disabled={row.isOriginal}   // 👈
  style={row.isOriginal ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                            onFocus={() => setActiveRowId(row.id)}
                            placeholder="Rechercher un client..."
                            autoComplete="off"
                          />
                          {isActive && searchTerm.length >= 1 && (
                            <div className="client-dropdown" style={{
                              position: "absolute",
                              bottom: "100%",
                              left: 0,
                              right: 0,
                              background: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              maxHeight: "200px",
                              overflowY: "auto",
                              zIndex: 1000,
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              marginBottom: "4px"
                            }}>
                              {filteredClients.length === 0 ? (
                                <div style={{ padding: "8px", color: "#94a3b8" }}>Aucun client trouvé</div>
                              ) : (
                                filteredClients.map(client => (
                                  <div
                                    key={client.id}
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f1f5f9",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectClient(row.id, client)}
                                  >
                                    <span>{client.prenom} {client.nom}</span>
                                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{client.telephone}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="report-input"
                            value={row.price || ""}
                            onChange={(e) =>
                              updateRow(row.id, "price", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            style={{ textAlign: "right", ...(row.isOriginal ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}) }}
  disabled={row.isOriginal}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.filter((r) => r.price > 0).length > 0 && (
              <div className="report-summary">
                <div className="report-summary-label">Total HT</div>
                <div className="report-summary-value">
                  {formatMoney(calculateTotal())}
                </div>
              </div>
            )}

            <ReportFoot />
          </div>

          <div className="rp-capture" style={{ position: 'absolute', left: '-9999px',
            top: 0,
            width: '794px',
            zIndex: -1,
            background: 'white',
          }} ref={pdfPaperRef}>
            <div className="report-paper">
              <ReportHead title="RAPPORT MANUEL" number={`${new Date().getFullYear()}-${randRef.current}`} />
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Date</th>
                      <th style={{ width: "45%" }}>Client</th>
                      <th style={{ width: "30%" }}>Prix HT (MAD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.client_id && r.price > 0).map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td>{row.client_name}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.filter(r => r.price > 0).length > 0 && (
                <div className="report-summary">
                  <div className="report-summary-label">Total HT</div>
                  <div className="report-summary-value">
                    {formatMoney(calculateTotal())}
                  </div>
                </div>
              )}
              <ReportFoot />
            </div>
          </div>
        </div>
        <div className="edit-modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={saving}>
            Annuler
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? <Loader size={16} className="spinning" /> : <SaveIcon size={16} />}
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Saved Reports Section ----------
const SavedReportsSection = ({ onEditReport, refreshTrigger }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    reportId: null,
    reportName: "",
  });
  const [deleting, setDeleting] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports, refreshTrigger]);

  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = reports.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleDelete = async () => {
    const { reportId } = deleteModal;
    if (!reportId) return;
    setDeleting(reportId);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/reports/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Rapport supprimé");
        loadReports();
      } else {
        toast.error("Erreur de suppression");
      }
    } catch (err) {
      toast.error("Erreur");
    } finally {
      setDeleting(null);
      setDeleteModal({ isOpen: false, reportId: null, reportName: "" });
    }
  };

  // ✅ PDF téléchargé : même design que le contrat (logo, pilules rouges, tableau noir, pied de page)
  const downloadReport = async (report, e, mode = "download") => {
    e.stopPropagation();
    try {
      let rows = report.rows || [];
      if (typeof rows === "string") {
        try { rows = JSON.parse(rows); } catch { rows = []; }
      }
      if (!Array.isArray(rows)) rows = [];
      const total = Number(report.total_ht) || 0;

      const doc = new jsPDF('p', 'mm', 'a4');
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const RED = [229, 32, 46];
      const INK = [10, 10, 10];
      const GREY = [207, 207, 214];

      // Logo (base64) + dimensions
      let logoDataUrl = '';
      let logoRatio = 0.4;
      try {
        const response = await fetch('/JinaLogo.png');
        const blob = await response.blob();
        logoDataUrl = await blobToBase64(blob);
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (img.naturalWidth) logoRatio = img.naturalHeight / img.naturalWidth;
            resolve();
          };
          img.onerror = resolve;
          img.src = logoDataUrl;
        });
      } catch (err) {
        console.warn('Logo non chargé', err);
      }

      const drawFrame = (withWatermark) => {
        doc.setDrawColor(...GREY);
        doc.setLineWidth(0.3);
        doc.roundedRect(6, 6, W - 12, H - 12, 2, 2);
        if (withWatermark && logoDataUrl) {
          try {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.07 }));
            const wmW = W * 0.7;
            doc.addImage(logoDataUrl, 'PNG', (W - wmW) / 2, H * 0.34, wmW, wmW * logoRatio);
            doc.restoreGraphicsState();
          } catch (err) {
            console.warn('Filigrane ignoré', err);
          }
        }
      };

      drawFrame(true);

      // En-tête : logo | titre | numéro
      const logoW = 34;
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 14, 13, logoW, logoW * logoRatio);
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(11);
      doc.text('Location de voiture', W / 2, 20, { align: 'center' });
      doc.setFontSize(24);
      doc.setTextColor(...RED);
      doc.text('RAPPORT', W / 2, 30, { align: 'center' });

      const boxW = 40;
      const boxX = W - 14 - boxW;
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.5);
      doc.roundedRect(boxX, 13, boxW, 16, 3, 3);
      doc.setFontSize(7);
      doc.setTextColor(...RED);
      doc.text('RAPPORT N°', boxX + boxW / 2, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(17, 17, 17);
      doc.text(`${new Date(report.created_at || Date.now()).getFullYear()}/${String(report.id || 0).padStart(5, '0')}`, boxX + boxW / 2, 25.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, W / 2, 40, { align: 'center' });

      // Pilule rouge
      doc.setFillColor(...RED);
      doc.roundedRect(14, 45, 78, 8, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('DÉTAIL DES PAIEMENTS', 20, 50.4);

      // Tableau
      autoTable(doc, {
        head: [['Date', 'Client', 'Prix HT (MAD)']],
        body: rows.map((row) => [
          row.date ? String(row.date).slice(0, 10) : '',
          row.client_name || '',
          row.price ? Number(row.price).toFixed(2) : '0.00',
        ]),
        startY: 58,
        theme: 'grid',
        margin: { left: 14, right: 14, top: 14, bottom: 30 },
        styles: { lineColor: [170, 170, 178], lineWidth: 0.2, textColor: [10, 10, 10], fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        bodyStyles: { fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 250] },
        columnStyles: {
          0: { cellWidth: 34, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 42, halign: 'right' },
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) drawFrame(false);
        },
      });

      // Total (pilule rouge)
      let y = (doc.lastAutoTable?.finalY || 60) + 10;
      if (y > H - 40) {
        doc.addPage();
        drawFrame(false);
        y = 20;
      }
      const totalText = `Total HT : ${total.toFixed(2)} DH`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const pillW = Math.max(70, doc.getTextWidth(totalText) + 16);
      doc.setFillColor(...RED);
      doc.roundedRect(W - 14 - pillW, y, pillW, 10, 5, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(totalText, W - 14 - pillW / 2, y + 6.8, { align: 'center' });

      // Pied de page (dernière page)
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.4);
      doc.line(14, H - 28, W - 14, H - 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(17, 17, 17);
      doc.text('Siège Social : LOT ERRACHAD N° 706 TR 02 MAG 01 MEDIOUNA, CASABLANCA - Maroc', W / 2, H - 23, { align: 'center' });
      doc.text('GSM : 06 63 04 95 75 - 06 67 47 47 45   Email : jinabusiness0@gmail.com', W / 2, H - 18.5, { align: 'center' });
      doc.text('TP : 37701443 - RC : 624023 - IF : 65912528 - CNSS : 5317601 - N° I.C.E : 003478448000020', W / 2, H - 14, { align: 'center' });

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      if (mode === "print") {
        // Impression directe via un iframe caché (repli : ouvrir dans un nouvel onglet)
        try {
          const frame = document.createElement('iframe');
          frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
          frame.src = url;
          frame.onload = () => {
            try {
              frame.contentWindow.focus();
              frame.contentWindow.print();
            } catch (_) {
              window.open(url, '_blank');
            }
            setTimeout(() => { document.body.removeChild(frame); URL.revokeObjectURL(url); }, 60000);
          };
          document.body.appendChild(frame);
        } catch (_) {
          window.open(url, '_blank');
        }
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = report.file_name || `Rapport_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF téléchargé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du téléchargement");
    }
  };

  if (loading)
    return (
      <div style={{ padding: "1rem", textAlign: "center" }}>Chargement des rapports...</div>
    );

  return (
    <div className="saved-reports-section">
      <div className="sr-head">
        <span className="sr-head-icon"><FolderOpen size={20} /></span>
        <div>
          <h2>Rapports sauvegardés</h2>
          <small>Vos rapports manuels enregistrés</small>
        </div>
        <span className="sr-count">{reports.length}</span>
      </div>
      {reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
          <FileText size={32} />
          <p>Aucun rapport sauvegardé</p>
        </div>
      ) : (
        <>
          <div className="saved-reports-grid">
            {currentReports.map((report) => (
              <div key={report.id} className="saved-report-card">
                <div className="sr-top">
                  <span className="sr-icon"><FileText size={18} /></span>
                  <div className="sr-main">
                    <div className="sr-name" title={report.file_name}>{report.file_name}</div>
                    <div className="sr-date">
                      <Calendar size={11} /> {new Date(report.created_at).toLocaleDateString("fr-FR")}
                      <span className="sr-dot" /> {report.rows?.length || 0} ligne(s)
                    </div>
                  </div>
                </div>
                <div className="sr-total">
                  <span className="lbl">Total HT</span>
                  <b>{formatMoney(report.total_ht || 0)}</b>
                </div>
                <div className="sr-actions">
                  <button type="button" className="sr-btn edit" onClick={() => onEditReport(report)}>
                    <Edit size={17} /><span>Modifier</span>
                  </button>
                  <button type="button" className="sr-btn pdf" onClick={(e) => downloadReport(report, e)}>
                    <Download size={17} /><span>PDF</span>
                  </button>
                  <button type="button" className="sr-btn print" onClick={(e) => downloadReport(report, e, "print")}>
                    <Printer size={17} /><span>Imprimer</span>
                  </button>
                  <button
                    type="button"
                    className="sr-btn del"
                    onClick={() =>
                      setDeleteModal({ isOpen: true, reportId: report.id, reportName: report.file_name })
                    }
                  >
                    <Trash2 size={17} /><span>Suppr.</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e2e8f0",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: "0.25rem 0.75rem" }}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`btn ${page === currentPage ? "btn-primary" : "btn-outline"}`}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: "0.25rem 0.75rem",
                    minWidth: "2rem",
                    fontWeight: page === currentPage ? "bold" : "normal",
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                className="btn btn-outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: "0.25rem 0.75rem" }}
              >
                <ChevronRight size={16} />
              </button>
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "0.5rem" }}>
                Page {currentPage} sur {totalPages}
              </span>
            </div>
          )}
        </>
      )}

      {deleteModal.isOpen && (
        <div
          className="report-modal-overlay"
          onClick={() => setDeleteModal({ isOpen: false, reportId: null, reportName: "" })}
        >
          <div
            className="report-modal"
            style={{ maxWidth: "400px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="report-modal-header">
              <h2>
                <AlertTriangle size={20} style={{ color: "#ef4444" }} /> Confirmer la suppression
              </h2>
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, reportId: null, reportName: "" })
                }
              >
                <X size={20} />
              </button>
            </div>
            <div className="report-modal-body">
              <p>
                Supprimer <strong>{deleteModal.reportName}</strong> ?
              </p>
            </div>
            <div className="report-modal-footer">
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, reportId: null, reportName: "" })
                }
                className="btn btn-outline"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-primary"
                style={{ background: "#ef4444" }}
                disabled={deleting === deleteModal.reportId}
              >
                {deleting === deleteModal.reportId ? (
                  <Loader size={16} className="spinning" />
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Component: FormLine ====================
const FormLine = ({ label, value = "" }) => (
  <div className="form-line">
    <label>{label} :</label>
    <div className="dots-line">{value || "___________"}</div>
  </div>
);

// ==================== Component: Checkbox ====================
const CheckboxComponent = ({ checked = false }) => (
  <span className={`checkbox-square ${checked ? "checked" : ""}`}>
    {checked && "✓"}
  </span>
);

// ==================== Component: CarDiagram ====================
const CarDiagram = () => (
  <div className="car-diagram-container">
    <img
      src={checklistImage}
      alt="Car Checklist Diagram"
      className="checklist-image"
      onError={(e) => (e.target.style.display = "none")}
    />
  </div>
);

// ==================== Component: ObservationBox ====================
const ObservationBox = ({ title, isHalf = false, children, option = "show" }) => {
  if (option === "hide") return null;
  if (option === "dash") {
    return (
      <div className={`observation-box ${isHalf ? "half-width" : ""}`}>
        <label className="obs-title">{title} :</label>
        <div className="observation-content">___________</div>
      </div>
    );
  }
  return (
    <div className={`observation-box ${isHalf ? "half-width" : ""}`}>
      <label className="obs-title">{title} :</label>
      <div className="observation-content">{children}</div>
    </div>
  );
};

// ==================== Component: SignatureBlock ====================
const SignatureBlock = ({ label, signature = "", option = "show" }) => {
  if (option === "hide") return null;
  return (
    <div className="signature-block">
      <div className="signature-label">{label}</div>
      <div className="signature-box">
        {option === "dash" ? (
          <div className="signature-text">___________</div>
        ) : (
          signature && <div className="signature-text">{signature}</div>
        )}
      </div>
    </div>
  );
};

// ==================== Component: ManualContract ====================
// ==================== Component: ManualContract (révisé) ====================
const ManualContract = ({ 
  formData, 
  signatures, 
  paperwork, 
  displayOptions, 
  currentUser,
  containerId = "manual-contract-print" 
}) => {
  // Fonctions utilitaires (copiées de ContractLocation)
  const getCurrentUserName = () => {
    let userName = "";
    if (currentUser) {
      userName = currentUser.Fullname || currentUser.fullname || currentUser.name || currentUser.username || "";
    }
    if (!userName) {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userName = userData.Fullname || userData.fullname || userData.name || "";
        }
      } catch (error) {
        console.error("Error reading user from localStorage:", error);
      }
    }
    return userName || "___________";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("fr-FR");
    } catch {
      return "";
    }
  };

  const calculateRentalDays = () => {
  if (!reservation?.start_date || !reservation?.end_date) return null;
  const start = new Date(reservation.start_date);
  const end = new Date(reservation.end_date);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  // Vérifier que start <= end
  if (start > end) {
    // Inverser si besoin (ou forcer à 1)
    return 1;
  }
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays;
};

  const getDisplayOption = (section) => displayOptions[section] || "show";
  const getDisplayValue = (option, actualValue, dashValue = "___________", hideValue = "") => {
    if (option === "hide") return hideValue;
    if (option === "dash") return dashValue;
    return actualValue;
  };

  const currentUserName = getCurrentUserName();
  const rentalDays = formData.rental_days || calculateRentalDays();
  const dailyPrice = (formData.total_price && rentalDays) 
    ? (formData.total_price / rentalDays).toFixed(2) 
    : formData.price_per_day || "—";

  // Vérifier si un deuxième conducteur est présent
  const hasSecondDriver = formData.has_second_driver === true && (
    formData.second_driver_nom || formData.second_driver_prenom
  );

  // Rendu du contrat
  return (
    <div className="contract-container-print" id={containerId}>
      {/* En-tête */}
      <table className="contract-header-table" cellPadding="0" cellSpacing="0">
        <tbody>
          <tr>
            <td className="header-left">
              <div className="company-name">SMAITI CAR</div>
              <div className="company-slogan">LOCATION DE VOITURE</div>
              <div className="company-phone"><Phone size={12} style={{ marginRight: "4px", display: "inline" }} /> 0665 921 921</div>
            </td>
            <td className="header-center">
              <img src={logoImage} alt="Logo" className="contract-logo-print" />
            </td>
            <td className="header-right">
              <div className="contract-number-box stylish">
                <div className="contract-number-label">CONTRAT N°</div>
                <div className="contract-number-value">
                  MANUAL-{new Date().getFullYear()}-{Math.floor(Math.random() * 10000).toString().padStart(4, "0")}
                </div>
              </div>
              <div className="arabic-text">كراء السيارات</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="contract-title-print">CONTRAT DE LOCATION</div>

      {/* Deux colonnes */}
      <table className="contract-content-table" cellPadding="0" cellSpacing="0">
        <tbody>
          <tr>
            <td className="contract-left-col">
              {/* LOCATAIRE */}
              <div className="contract-section">
                <div className="section-title-print">LOCATAIRE</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_nom || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_prenom || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formatDate(formData.client_date_naissance) || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_lieu_naissance || "—")}</span></div>
                  <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_cin || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formatDate(formData.client_cin_expiry) || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_permis || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formatDate(formData.client_permis_expiry) || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_address || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_phone || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Email :</span><span className="field-value">{getDisplayValue(getDisplayOption("clientInfo"), formData.client_email || "—")}</span></div>
                </div>
              </div>

              {/* DEUXIÈME CONDUCTEUR */}
              <div className="contract-section">
                <div className="section-title-print">DEUXIÈME CONDUCTEUR</div>
                <div className="section-content">
                  {getDisplayOption("secondDriver") === "hide" ? (
                    <>
                      <div className="field-row"><span className="field-label">Nom :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">CIN :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Email :</span><span className="field-value"></span></div>
                    </>
                  ) : getDisplayOption("secondDriver") === "dash" ? (
                    <>
                      <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Email :</span><span className="field-value">___________</span></div>
                    </>
                  ) : (
                    hasSecondDriver ? (
                      <>
                        <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">{formData.second_driver_nom || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">{formData.second_driver_prenom || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">{formatDate(formData.second_driver_date_naissance) || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">{formData.second_driver_lieu_naissance || "—"}</span></div>
                        <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">{formData.second_driver_cin || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{formatDate(formData.second_driver_cin_expiry) || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">{formData.second_driver_permis || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{formatDate(formData.second_driver_permis_expiry) || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">{formData.second_driver_address || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">{formData.second_driver_phone || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Email :</span><span className="field-value">{formData.second_driver_email || "—"}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Email :</span><span className="field-value">—</span></div>
                      </>
                    )
                  )}
                </div>
              </div>
            </td>

            <td className="contract-right-col">
              {/* VÉHICULE */}
              <div className="contract-section">
                <div className="section-title-print">VÉHICULE</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Immatriculation :</span><span className="field-value matricule-code">{getDisplayValue(getDisplayOption("vehicleInfo"), formData.car_matricule || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Marque/Modèle :</span><span className="field-value">{getDisplayValue(getDisplayOption("vehicleInfo"), `${formData.car_brand || ""} ${formData.car_model || ""}`.trim() || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Couleur :</span><span className="field-value">{getDisplayValue(getDisplayOption("vehicleInfo"), formData.car_color || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Année :</span><span className="field-value">{getDisplayValue(getDisplayOption("vehicleInfo"), formData.car_year || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Carburant :</span><span className="field-value">{getDisplayValue(getDisplayOption("vehicleInfo"), formData.car_fuel || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Transmission :</span><span className="field-value">{getDisplayValue(getDisplayOption("vehicleInfo"), formData.car_transmission || "—")}</span></div>
                </div>
              </div>

              {/* LOCATION */}
              <div className="contract-section">
                <div className="section-title-print">LOCATION</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Départ :</span><span className="field-value">{getDisplayValue(getDisplayOption("rentalDates"), `${formatDate(formData.start_date)} à ${formData.start_time || "08:00"}`)}</span></div>
                  <div className="field-row"><span className="field-label">Retour :</span><span className="field-value">{getDisplayValue(getDisplayOption("rentalDates"), `${formatDate(formData.end_date)} à ${formData.end_time || "18:00"}`)}</span></div>
                  <div className="field-row"><span className="field-label">Durée :</span><span className="field-value">{getDisplayValue(getDisplayOption("rentalDays"), `${rentalDays} jours`)}</span></div>
                  <div className="field-row"><span className="field-label">Km départ :</span><span className="field-value">{getDisplayValue(getDisplayOption("kilometrage"), `${formData.kilometrage_depart || "—"} km`)}</span></div>
                  <div className="field-row"><span className="field-label">Km retour :</span><span className="field-value">{getDisplayValue(getDisplayOption("kilometrage"), formData.kilometrage_retour ? `${formData.kilometrage_retour} km` : "—")}</span></div>
                  <div className="field-row"><span className="field-label">Livré par :</span><span className="field-value">{getDisplayValue(getDisplayOption("deliveryReception"), currentUserName)}</span></div>
                  <div className="field-row"><span className="field-label">Reçu par :</span><span className="field-value">{getDisplayValue(getDisplayOption("deliveryReception"), currentUserName)}</span></div>
                </div>
              </div>

              {/* TARIFS */}
              <div className="contract-section pricing-section">
                <div className="section-title-print">TARIFS</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Prix journalier :</span><span className="field-value">{getDisplayValue(getDisplayOption("prices"), `${dailyPrice} DH`)}</span></div>
                  <div className="field-row total-row"><span className="field-label">Total TTC :</span><span className="field-value total-amount">{getDisplayValue(getDisplayOption("prices"), `${formData.total_price || "—"} DH`)}</span></div>
                  <div className="field-row"><span className="field-label">Montant payé :</span><span className="field-value">{getDisplayValue(getDisplayOption("prices"), `${formData.amount_paid || "0"} DH`)}</span></div>
                  <div className="field-row"><span className="field-label">Reste à payer :</span><span className="field-value remaining-amount">{getDisplayValue(getDisplayOption("prices"), `${formData.total_price - formData.amount_paid || "0"} DH`)}</span></div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* CHECKLIST */}
      <div className="contract-section checklist-section-print">
        <div className="section-title-print">CHECKLIST - ÉTAT DU VÉHICULE</div>
        <div className="checklist-content">
          <table className="checklist-table" cellPadding="0" cellSpacing="0">
            <tbody>
              <tr>
                <td className="checklist-cell">
                  <div className="checklist-label">État de départ :</div>
                  <CarDiagram />
                </td>
                <td className="checklist-cell">
                  <div className="checklist-label">État de retour :</div>
                  <CarDiagram />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="documents-row">
            <span className="documents-label">Documents remis :</span>
            <div className="documents-items">
              <span className="doc-item"><CheckboxComponent checked={paperwork.carteGrise} /> Carte grise</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.assurance} /> Assurance</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.vignette} /> Vignette</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.visiteTechnique} /> Visite technique</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.autorisation} /> Autorisation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clause kilométrage */}
      <div className="kilometrage-clause-section">
        <div className="kilometrage-clause-title">⚠️ IMPORTANT - CLAUSE DE DÉPASSEMENT DE KILOMÉTRAGE</div>
        <div className="kilometrage-clause-text">
          En cas de dépassement du kilométrage mentionné (200km par jour), vous allez payer 1.5 DH pour chaque kilomètre additionnel au-delà de la limite autorisée.
        </div>
      </div>

      {/* Observations et signatures */}
      <div className="observations-row-print">
        <ObservationBox title="Observations" option={getDisplayOption("observations")}>
          <div className="observation-text">
            {getDisplayValue(getDisplayOption("observations"),
              `Véhicule loué en bon état général. Le client s'engage à retourner le véhicule dans le même état.${formData.notes ? ` Notes: ${formData.notes}` : ""}`,
              "___________",
              ""
            )}
          </div>
        </ObservationBox>
        <ObservationBox title="Assurance" option={getDisplayOption("insurance")}>
          <div className="observation-text">
            {getDisplayValue(getDisplayOption("insurance"),
              "Assurance tous risques incluse. Franchise applicable en cas de sinistre.",
              "___________",
              ""
            )}
          </div>
        </ObservationBox>
        <ObservationBox title="Caution" isHalf option={getDisplayOption("depositGuarantee")}>
          <div className="observation-text">
            Caution: {getDisplayValue(getDisplayOption("depositGuarantee"), `${formData.amount_paid ? `${formData.amount_paid} DH` : "_________"} DH`, "_________", "")}
          </div>
        </ObservationBox>
      </div>

      <div className="signatures-row-print">
        <SignatureBlock label="Signature de l'agent" signature={signatures.agent} option={getDisplayOption("signatures")} />
        <SignatureBlock label="Signature du locataire" signature={signatures.locataire} option={getDisplayOption("signatures")} />
        <SignatureBlock label="Signature 2ème conducteur" signature={signatures.secondConducteur} option={getDisplayOption("signatures")} />
      </div>

      {/* Pied de page */}
      <div className="contract-footer-print">
        <div className="footer-line">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
            <Building2 size={8} /> SMAITI CAR SARL - Capital 100 000 DH
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "6px" }}>
            <FileCheck size={8} /> RC : 459659 - IF : 45640901 - TP : 30351369 - ICE : 002464789000069 - CNSS : 2473901
          </span>
        </div>
        <div className="footer-line">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
            <MapPin size={8} /> Bassatine Al Oulfa, Casablanca
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "6px" }}>
            <Phone size={8} /> 0665 92 19 21
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "6px" }}>
            <Mail size={8} /> smaiticar2@gmail.com
          </span>
        </div>
      </div>

      {/* Styles CSS identiques à ceux de ContractLocation */}
      <style>{`
        .contract-container-print {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #1a2c3e;
          line-height: 1.5;
          padding: 0 6px;
        }
        .contract-header-table {
          width: 100%;
          border-bottom: 2px solid #d4af37;
          margin-bottom: 10px;
          padding-bottom: 6px;
        }
        .header-left { width: 30%; vertical-align: top; }
        .header-center { width: 40%; text-align: center; vertical-align: middle; }
        .header-right { width: 30%; text-align: right; vertical-align: top; }
        .company-name { font-size: 20px; font-weight: 800; letter-spacing: 1.5px; color: #1e293b; }
        .company-slogan { font-size: 10px; font-weight: 600; margin-top: 2px; color: #b8860b; }
        .company-phone { font-size: 9px; margin-top: 4px; color: #475569; }
        .contract-logo-print { height: 75px; width: auto; object-fit: contain; }
        .contract-number-box { border: 1px solid #94a3b8; padding: 6px 12px; text-align: center; font-size: 10px; display: inline-block; background: #fefce8; border-radius: 8px; }
        .arabic-text { margin-top: 6px; font-size: 12px; font-weight: 500; color: #475569; }
        .contract-title-print {
          text-align: center;
          font-size: 17px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
          border-bottom: 1px solid #94a3b8;
          padding-bottom: 6px;
          color: #0f172a;
        }
        .contract-content-table { width: 100%; }
        .contract-left-col { width: 50%; vertical-align: top; padding-right: 12px; }
        .contract-right-col { width: 50%; vertical-align: top; padding-left: 12px; }
        .contract-section {
          margin-bottom: 8px;
          border: 1px solid #000000;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }
        .section-title-print {
          background: #cbd5e1;
          padding: 6px 12px;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #000000;
          color: #1e293b;
        }
        .checklist-section-print .checklist-table,
        .checklist-section-print .doc-item,
        .observation-box,
        .signature-box,
        .kilometrage-clause-section {
          border-color: #000000 !important;
        }
        .checklist-section-print .section-title-print {
          background: #cbd5e1 !important;
        }
        .obs-title {
          background: #cbd5e1 !important;
          border-bottom: 1px solid #000000;
        }
        .section-content { padding: 8px 12px; }
        .field-row {
          display: flex;
          margin-bottom: 4px;
          font-size: 10px;
          align-items: baseline;
        }
        .field-label {
          width: 100px;
          font-weight: 600;
          color: #475569;
          flex-shrink: 0;
        }
        .field-value {
          flex: 1;
          border-bottom: 1px dotted #cbd5e1;
          padding-left: 4px;
          color: #0f172a;
        }
        .matricule-code { font-family: 'Courier New', monospace; font-weight: 700; color: #b8860b; letter-spacing: 0.5px; }
        .total-row .total-amount { font-weight: 800; font-size: 12px; color: #b8860b; }
        .remaining-amount { font-weight: 700; color: #dc2626; }
        .pricing-section { border-left: 4px solid #d4af37; }
        .checklist-section-print { margin: 8px 0; }
        .checklist-table { width: 100%; margin-bottom: 8px; }
        .checklist-cell { width: 50%; text-align: center; vertical-align: top; padding: 0 6px; }
        .checklist-label { font-weight: 700; margin-bottom: 4px; font-size: 10px; color: #334155; }
        .documents-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 8px;
          margin-top: 6px;
          gap: 10px;
        }
        .documents-label { font-weight: 700; margin-right: 4px; font-size: 10px; color: #334155; }
        .documents-items { display: flex; flex-wrap: wrap; gap: 10px; }
        .doc-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          background: white;
          padding: 3px 8px;
          border-radius: 12px;
          border: 1px solid #94a3b8;
        }
        .checkbox-square {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 13px;
          height: 13px;
          border: 1.5px solid #334155;
          background: white;
          font-size: 9px;
          font-weight: bold;
          margin-right: 2px;
          border-radius: 2px;
        }
        .checkbox-square.checked { background: #d4af37 !important; border-color: #d4af37 !important; color: #0f172a !important; }
        .car-diagram-container img {
          width: 100%;
          max-width: 130px;
          height: auto;
          border: 1px solid #94a3b8;
          border-radius: 6px;
          background: #fafafa;
          padding: 4px;
        }
        .kilometrage-clause-section {
          margin: 10px 0;
          padding: 10px 16px;
          border: 2px solid #eab308;
          border-radius: 10px;
          background: #fefce8;
          box-shadow: 0 1px 4px rgba(234, 179, 8, 0.15);
        }
        .kilometrage-clause-title {
          font-size: 11px;
          font-weight: 800;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .kilometrage-clause-text {
          font-size: 10.5px;
          color: #1a2c3e;
          line-height: 1.5;
          font-weight: 500;
        }
        .observations-row-print { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0; }
        .observation-box {
          flex: 1;
          border: 1px solid #94a3b8;
          border-radius: 10px;
          overflow: hidden;
          background: white;
        }
        .observation-box.half-width { flex: 0 0 calc(33.33% - 8px); }
        .obs-title {
          display: block;
          padding: 6px 12px;
          background: #f8fafc;
          font-weight: 700;
          font-size: 10px;
          border-bottom: 1px solid #94a3b8;
          color: #1e293b;
        }
        .observation-content {
          padding: 8px 12px;
          font-size: 9.5px;
          min-height: 50px;
          color: #334155;
        }
        .signatures-row-print { display: flex; gap: 20px; margin: 10px 0; }
        .signature-block { flex: 1; text-align: center; }
        .signature-label { font-size: 9px; font-weight: 700; margin-bottom: 6px; color: #475569; }
        .signature-box {
          border: 1px solid #94a3b8;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          border-radius: 6px;
          overflow: hidden;
        }
        .signature-box img {
          max-height: 45px;
          max-width: 90%;
          object-fit: contain;
        }
        .signature-text {
          font-size: 9px;
          font-style: italic;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .contract-footer-print {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid #d4af37;
          text-align: center;
          font-size: 8px;
          color: #64748b;
        }
        .footer-line { margin-bottom: 2px; line-height: 1.3; }
        .contract-number-box.stylish {
          border: none;
          background: #fefce857;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          padding: 4px 14px;
        }
        .contract-number-box.stylish .contract-number-label { font-size: 9px; color: #92400e; letter-spacing: 1px; }
        .contract-number-box.stylish .contract-number-value { font-size: 20px; font-weight: 800; color: #1a1a2e; }
        @media print {
          .contract-container-print { margin: 0; padding: 0; background: white; }
          .checkbox-square.checked { background: black !important; border-color: black !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .section-title-print { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .documents-row { background: #f9f9f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .contract-number-box.stylish { background: #fefce8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .kilometrage-clause-section { background: #fefce8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .contract-container-print .field-value { font-weight: 600; }
        .contract-container-print .observation-content { font-weight: 500; }
        .contract-container-print .kilometrage-clause-text { font-weight: 600; }
      `}</style>
    </div>
  );
};

// ==================== Component: ContractDisplayOptions ====================
const ContractDisplayOptions = ({ options, onOptionChange, onResetAll }) => {
  const sections = [
    { id: "prices", label: "Prix et Montants", icon: DollarSign },
    { id: "clientInfo", label: "Informations du Locataire", icon: User },
    { id: "secondDriver", label: "Deuxième Conducteur", icon: UserCircle },
    { id: "vehicleInfo", label: "Informations du Véhicule", icon: Car },
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
    { value: "dash", label: "Remplacer par des traits", icon: () => <span style={{ fontSize: "12px" }}>—</span> }
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
                    {mode.value === "dash" ? <mode.icon /> : <mode.icon size={12} />}
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

// ==================== Component: GlobalSearchBar ====================
const GlobalSearchBar = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  loading,
  selectedResult,
  onSelectResult,
  onClear,
  searchType,
  setSearchType
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);
  const typeDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getResultIcon = (type) => {
    switch(type) {
      case 'client': return <User size={14} />;
      case 'matricule': return <Gauge size={14} />;
      case 'reservation': return <Calendar size={14} />;
      case 'accident': return <AlertTriangle size={14} />;
      default: return <Search size={14} />;
    }
  };

  const getResultColor = (type) => {
    switch(type) {
      case 'client': return '#3b82f6';
      case 'matricule': return '#10b981';
      case 'reservation': return '#eab308';
      case 'accident': return '#ef4444';
      default: return '#64748b';
    }
  };

  const searchTypeOptions = [
    { value: "all", label: "Tous", icon: Search, color: "#64748b" },
    { value: "client", label: "Clients", icon: User, color: "#3b82f6" },
    { value: "matricule", label: "Matricules", icon: Gauge, color: "#10b981" },
    { value: "reservation", label: "Réservations", icon: Calendar, color: "#eab308" },
    { value: "accident", label: "Accidents", icon: AlertTriangle, color: "#ef4444" }
  ];

  const getCurrentTypeLabel = () => {
    const option = searchTypeOptions.find(opt => opt.value === searchType);
    return option ? option.label : "Tous";
  };

  const getCurrentTypeIcon = () => {
    const option = searchTypeOptions.find(opt => opt.value === searchType);
    const IconComponent = option?.icon || Search;
    return <IconComponent size={14} />;
  };

  return (
    <div className="global-search-container" ref={searchInputRef}>
      <div className="global-search-wrapper">
        <div className="global-search-icon">
          <Search size={16} />
        </div>
        
        <input
          type="text"
          className="global-search-input"
          placeholder="Rechercher un client, une immatriculation, une réservation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />

        <div className="search-type-dropdown" ref={typeDropdownRef}>
          <button
            className="search-type-trigger"
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            type="button"
          >
            <span className="trigger-icon">{getCurrentTypeIcon()}</span>
            <span className="trigger-label">{getCurrentTypeLabel()}</span>
            <ChevronDown
              size={14}
              className={`trigger-chevron ${isTypeDropdownOpen ? 'open' : ''}`}
            />
          </button>
          
          {isTypeDropdownOpen && (
            <div className="search-type-menu">
              {searchTypeOptions.map(option => {
                const IconComponent = option.icon;
                const isActive = searchType === option.value;
                return (
                  <button
                    key={option.value}
                    className={`search-type-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSearchType(option.value);
                      setIsTypeDropdownOpen(false);
                    }}
                  >
                    <span className="item-icon" style={{ color: option.color }}>
                      <IconComponent size={14} />
                    </span>
                    <span className="item-label">{option.label}</span>
                    {isActive && <CheckCircle2 size={12} className="item-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {searchQuery && (
          <button className="global-search-clear" onClick={onClear}>
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && searchQuery.length > 1 && (
        <div className="global-search-results">
          {loading ? (
            <div className="search-loading">
              <div className="loading-spinner-small"></div>
              <span>Recherche en cours...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="search-results-header">
                <span>{searchResults.length} résultat(s) trouvé(s)</span>
              </div>
              <div className="search-results-list">
                {searchResults.slice(0, 10).map((result, index) => (
                  <div
                    key={index}
                    className={`search-result-item ${selectedResult?.id === result.id ? 'selected' : ''}`}
                    onClick={() => onSelectResult(result)}
                  >
                    <div className="result-icon" style={{ backgroundColor: getResultColor(result.type) + '20', color: getResultColor(result.type) }}>
                      {getResultIcon(result.type)}
                    </div>
                    <div className="result-content">
                      <div className="result-title">{result.title}</div>
                      <div className="result-subtitle">{result.subtitle}</div>
                    </div>
                    <div className="result-type-badge" style={{ backgroundColor: getResultColor(result.type) + '15', color: getResultColor(result.type) }}>
                      {result.type === 'client' ? 'Client' :
                       result.type === 'matricule' ? 'Matricule' :
                       result.type === 'reservation' ? 'Réservation' : 'Accident'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : searchQuery.length > 1 && (
            <div className="search-no-results">
              <p>Aucun résultat trouvé pour "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== Component: ClientDetailModal ====================
const ClientDetailModal = ({ client, onClose, reservations, accidents, matricules, payments }) => {
  const [activeTab, setActiveTab] = useState('reservations');
  const [showAllReservations, setShowAllReservations] = useState(false);
  const [showAllAccidents, setShowAllAccidents] = useState(false);
  const [showAllMatricules, setShowAllMatricules] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const clientReservations = reservations.filter(r => r.client_id === client?.id);
  const clientAccidents = accidents.filter(a => a.client_id === client?.id);
  const clientMatricules = matricules.filter(m =>
    clientReservations.some(r => r.matricule_id === m.id)
  );
  
  const clientPayments = payments?.filter(p =>
    clientReservations.some(r => r.id === p.reservation_id)
  ) || [];

  const totalRemaining = clientReservations.reduce((sum, r) => sum + (r.remaining_amount || 0), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      confirmed: { label: 'Confirmée', class: 'badge-confirmed' },
      completed: { label: 'Terminée', class: 'badge-completed' },
      cancelled: { label: 'Annulée', class: 'badge-cancelled' },
      retard: { label: 'En retard', class: 'badge-retard' },
      contacted: { label: 'Contacté', class: 'badge-contacted' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const getAccidentStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      evaluation_owner: { label: 'Évaluation propriétaire', class: 'badge-warning' },
      'contact expert': { label: 'Contact expert', class: 'badge-info' },
      evaluation_expert: { label: 'Évaluation expert', class: 'badge-info' },
      fixed: { label: 'Réparé', class: 'badge-success' },
      waiting: { label: 'En attente', class: 'badge-warning' },
      completed: { label: 'Terminé', class: 'badge-completed' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  if (!client) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="client-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <User size={20} />
            <span>Détails du client</span>
          </div>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="client-info-section">
          <div className="client-avatar">
            <div className="avatar-initials">
              {client.prenom?.[0]}{client.nom?.[0]}
            </div>
          </div>
          <div className="client-details">
            <h3>{client.prenom} {client.nom}</h3>
            <div className="client-contact-info">
              <span><Phone size={14} /> {client.telephone}</span>
              <span><Mail size={14} /> {client.email || 'Non renseigné'}</span>
              <span><MapPinIcon size={14} /> {client.city || 'Non renseigné'}</span>
            </div>
            <div className="client-id-info">
              <span><IdCard size={14} /> CIN: {client.cin_number || 'Non renseigné'}</span>
              <span><FileText size={14} /> Permis: {client.driver_license_number || 'Non renseigné'}</span>
            </div>
          </div>
          <div className="client-summary">
            <div className="summary-item">
              <div className="summary-value">{clientReservations.length}</div>
              <div className="summary-label">Réservations</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{clientAccidents.length}</div>
              <div className="summary-label">Accidents</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{totalRemaining.toLocaleString()} DH</div>
              <div className="summary-label">Reste à payer</div>
            </div>
          </div>
        </div>

        <div className="client-tabs">
          <button
            className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <Calendar size={16} /> Réservations ({clientReservations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'accidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('accidents')}
          >
            <AlertTriangle size={16} /> Accidents ({clientAccidents.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'matricules' ? 'active' : ''}`}
            onClick={() => setActiveTab('matricules')}
          >
            <Gauge size={16} /> Matricules utilisés ({clientMatricules.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <Wallet size={16} /> Paiements restants
          </button>
        </div>

        <div className="client-tab-content">
          {activeTab === 'reservations' && (
            <div className="reservations-list">
              <div className="list-header">
                <span>Date</span>
                <span>Véhicule</span>
                <span>Matricule</span>
                <span>Montant</span>
                <span>Payé</span>
                <span>Reste</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllReservations ? clientReservations : clientReservations.slice(0, 5)).map(res => (
                  <div key={res.id} className="list-row">
                    <span>{res.start_date} → {res.end_date}</span>
                    <span>{res.cars?.brand} {res.cars?.model}</span>
                    <span>{res.matricule?.matricule_code}</span>
                    <span>{res.total_price} DH</span>
                    <span>{res.amount_paid} DH</span>
                    <span className={res.remaining_amount > 0 ? 'text-warning' : 'text-success'}>
                      {res.remaining_amount} DH
                    </span>
                    <span>{getStatusBadge(res.status)}</span>
                  </div>
                ))}
              </div>
              {clientReservations.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllReservations(!showAllReservations)}>
                  {showAllReservations ? 'Voir moins' : `Voir plus (${clientReservations.length - 5})`}
                  {showAllReservations ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {clientReservations.length === 0 && (
                <div className="empty-state">Aucune réservation trouvée</div>
              )}
            </div>
          )}

          {activeTab === 'accidents' && (
            <div className="accidents-list">
              <div className="list-header">
                <span>Date</span>
                <span>Véhicule</span>
                <span>Matricule</span>
                <span>Montant sinistre</span>
                <span>Assurance</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllAccidents ? clientAccidents : clientAccidents.slice(0, 5)).map(acc => (
                  <div key={acc.id} className="list-row">
                    <span>{acc.date_accident}</span>
                    <span>{acc.car?.brand} {acc.car?.model}</span>
                    <span>{acc.matricule?.matricule_code}</span>
                    <span>{acc.amount_of_losses} DH</span>
                    <span>{acc.amount_assurance} DH</span>
                    <span>{getAccidentStatusBadge(acc.status)}</span>
                  </div>
                ))}
              </div>
              {clientAccidents.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllAccidents(!showAllAccidents)}>
                  {showAllAccidents ? 'Voir moins' : `Voir plus (${clientAccidents.length - 5})`}
                  {showAllAccidents ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {clientAccidents.length === 0 && (
                <div className="empty-state">Aucun accident trouvé</div>
              )}
            </div>
          )}

          {activeTab === 'matricules' && (
            <div className="matricules-list">
              <div className="list-header">
                <span>Code matricule</span>
                <span>Marque/Modèle</span>
                <span>Statut</span>
                <span>Dernière réservation</span>
              </div>
              <div className="list-body">
                {(showAllMatricules ? clientMatricules : clientMatricules.slice(0, 5)).map(mat => {
                  const lastReservation = clientReservations.find(r => r.matricule_id === mat.id);
                  return (
                    <div key={mat.id} className="list-row">
                      <span className="font-mono">{mat.matricule_code}</span>
                      <span>{mat.car?.brand} {mat.car?.model}</span>
                      <span>
                        <span className={`status-dot ${mat.status === 'active' ? 'status-active' : 'status-inactive'}`}></span>
                        {mat.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                      <span>{lastReservation ? `${lastReservation.start_date} → ${lastReservation.end_date}` : 'Jamais'}</span>
                    </div>
                  );
                })}
              </div>
              {clientMatricules.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllMatricules(!showAllMatricules)}>
                  {showAllMatricules ? 'Voir moins' : `Voir plus (${clientMatricules.length - 5})`}
                  {showAllMatricules ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {clientMatricules.length === 0 && (
                <div className="empty-state">Aucun matricule utilisé</div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="payments-list">
              <div className="total-remaining-card">
                <div className="total-remaining-label">Total restant à payer</div>
                <div className="total-remaining-value">{totalRemaining.toLocaleString()} DH</div>
              </div>
              <div className="list-header">
                <span>Réservation</span>
                <span>Date</span>
                <span>Montant total</span>
                <span>Payé</span>
                <span>Reste</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllPayments ? clientReservations : clientReservations.slice(0, 5)).map(res => (
                  <div key={res.id} className="list-row">
                    <span>#{res.id}</span>
                    <span>{res.start_date} → {res.end_date}</span>
                    <span>{res.total_price} DH</span>
                    <span>{res.amount_paid} DH</span>
                    <span className={res.remaining_amount > 0 ? 'text-warning' : 'text-success'}>
                      {res.remaining_amount} DH
                    </span>
                    <span>{getStatusBadge(res.status)}</span>
                  </div>
                ))}
              </div>
              {clientReservations.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllPayments(!showAllPayments)}>
                  {showAllPayments ? 'Voir moins' : `Voir plus (${clientReservations.length - 5})`}
                  {showAllPayments ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Component: MatriculeDetailModal ====================
const MatriculeDetailModal = ({ matricule, onClose, reservations, accidents, currentReservation }) => {
  const [activeTab, setActiveTab] = useState('history');
  const [showAllReservations, setShowAllReservations] = useState(false);

  const matriculeReservations = reservations.filter(r => r.matricule_id === matricule?.id);
  const matriculeAccidents = accidents.filter(a => a.matricule_id === matricule?.id);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      confirmed: { label: 'Confirmée', class: 'badge-confirmed' },
      completed: { label: 'Terminée', class: 'badge-completed' },
      cancelled: { label: 'Annulée', class: 'badge-cancelled' },
      retard: { label: 'En retard', class: 'badge-retard' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  if (!matricule) return null;

  const getAccidentStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      evaluation_owner: { label: 'Évaluation propriétaire', class: 'badge-warning' },
      'contact expert': { label: 'Contact expert', class: 'badge-info' },
      evaluation_expert: { label: 'Évaluation expert', class: 'badge-info' },
      fixed: { label: 'Réparé', class: 'badge-success' },
      waiting: { label: 'En attente', class: 'badge-warning' },
      completed: { label: 'Terminé', class: 'badge-completed' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="matricule-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Gauge size={20} />
            <span>Détails du matricule</span>
          </div>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="matricule-info-section">
          <div className="matricule-code-large">
            {matricule.matricule_code}
          </div>
          <div className="matricule-details">
            <div className="detail-row">
              <span className="detail-label">Véhicule:</span>
              <span>{matricule.car?.brand} {matricule.car?.model} ({matricule.car?.year})</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Kilométrage:</span>
              <span>{matricule.kilometrage?.toLocaleString()} km</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Statut:</span>
              <span>
                <span className={`status-dot ${matricule.status === 'active' ? 'status-active' : 'status-inactive'}`}></span>
                {matricule.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Visite technique:</span>
              <span className={matricule.visit_tech && new Date(matricule.visit_tech) < new Date() ? 'text-warning' : ''}>
                {matricule.visit_tech || 'Non renseignée'}
              </span>
            </div>
          </div>
          {currentReservation && (
            <div className="current-reservation-card">
              <div className="current-label">📍 En cours de location</div>
              <div className="current-client">
                Client: {currentReservation.client?.prenom} {currentReservation.client?.nom}
              </div>
              <div className="current-dates">
                Du {currentReservation.start_date} au {currentReservation.end_date}
              </div>
            </div>
          )}
        </div>

        <div className="matricule-tabs">
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} /> Historique des locations ({matriculeReservations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'accidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('accidents')}
          >
            <AlertTriangle size={16} /> Accidents ({matriculeAccidents.length})
          </button>
        </div>

        <div className="matricule-tab-content">
          {activeTab === 'history' && (
            <div className="history-list">
              <div className="list-header">
                <span>Client</span>
                <span>Période</span>
                <span>Montant</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllReservations ? matriculeReservations : matriculeReservations.slice(0, 5)).map(res => (
                  <div key={res.id} className="list-row">
                    <span>{res.client?.prenom} {res.client?.nom}</span>
                    <span>{res.start_date} → {res.end_date}</span>
                    <span>{res.total_price} DH</span>
                    <span>{getStatusBadge(res.status)}</span>
                  </div>
                ))}
              </div>
              {matriculeReservations.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllReservations(!showAllReservations)}>
                  {showAllReservations ? 'Voir moins' : `Voir plus (${matriculeReservations.length - 5})`}
                  {showAllReservations ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {matriculeReservations.length === 0 && (
                <div className="empty-state">Aucune location trouvée</div>
              )}
            </div>
          )}

          {activeTab === 'accidents' && (
            <div className="accidents-list">
              <div className="list-header">
                <span>Date</span>
                <span>Client</span>
                <span>Montant sinistre</span>
                <span>Assurance</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {matriculeAccidents.map(acc => (
                  <div key={acc.id} className="list-row">
                    <span>{acc.date_accident}</span>
                    <span>{acc.client?.prenom} {acc.client?.nom}</span>
                    <span>{acc.amount_of_losses} DH</span>
                    <span>{acc.amount_assurance} DH</span>
                    <span>{getAccidentStatusBadge(acc.status)}</span>
                  </div>
                ))}
              </div>
              {matriculeAccidents.length === 0 && (
                <div className="empty-state">Aucun accident trouvé</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Component: StatCard ====================
const StatCard = ({ icon: Icon, title, value, subtitle, color, onClick, clickable = true }) => (
  <div className={`stat-card ${clickable ? 'clickable' : ''}`} onClick={onClick}>
    <div className={`stat-card-bg stat-icon-${color}`}></div>
    <div className="stat-top">
      <div className={`stat-icon stat-icon-${color}`}>
        <Icon size={18} />
      </div>
      <span className="stat-chev"><ChevronRight size={14} /></span>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{title}</div>
    {subtitle && <div className="stat-subtitle">{subtitle}</div>}
  </div>
);

// ==================== Composant MatriculeCategoryCard (version complète) ====================
const MatriculeCategoryCard = ({
  title,
  icon: Icon,
  color,
  matricules,
  onReserve,
  onConfirm,
  onCancel,
  onConfirmDirect,
  onExpand,
  expanded,
  onToggleExpand,
  loading,
  badge,
  onComplete,
  onToggleExtend, // NOUVEAU : pour activer la prolongation
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded || false);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (onToggleExpand) onToggleExpand(!isExpanded);
    if (isExpanded) {
      setShowAll(false);
      setSearchTerm('');
      setShowTodayOnly(false);
    }
  };

  const filteredMatricules = useMemo(() => {
    let filtered = matricules;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(mat =>
        mat.matricule_code?.toLowerCase().includes(lower) ||
        mat.car?.brand?.toLowerCase().includes(lower) ||
        mat.car?.model?.toLowerCase().includes(lower) ||
        mat.currentReservation?.client?.prenom?.toLowerCase().includes(lower) ||
        mat.currentReservation?.client?.nom?.toLowerCase().includes(lower)
      );
    }
    if (showTodayOnly && title === 'Retour imminent') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(mat => {
        const endDate = mat.currentReservation?.end_date;
        if (!endDate) return false;
        const d = new Date(endDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
    }
    return filtered;
  }, [matricules, searchTerm, showTodayOnly, title]);

  const displayMatricules = showAll ? filteredMatricules : filteredMatricules.slice(0, 5);
  const hasMore = filteredMatricules.length > 5;

  const handleExpandMore = () => setShowAll(true);
  const handleCollapse = () => setShowAll(false);

  const isPendingCard = title === 'En attente de confirmation';
  const isRetourImminent = title === 'Retour imminent';

 const getDaysLeft = (endDate) => {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays; // peut être négatif, on gère dans l'affichage
};

  // Fonction PDF (inchangée)
  const downloadPDF = () => {
    const filtered = filteredMatricules;
    if (filtered.length === 0) {
      toast.warning("Aucune donnée à exporter");
      return;
    }
    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('SMAITI CAR', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(184, 134, 11);
    doc.text('LOCATION DE VOITURE', pageWidth / 2, 28, { align: 'center' });
    doc.setDrawColor(212, 175, 55);
    doc.line(20, 32, pageWidth - 20, 32);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Liste des matricules - ${title}`, pageWidth / 2, 42, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, 50, { align: 'center' });
    doc.text(`Total : ${filtered.length} matricule(s)`, pageWidth / 2, 56, { align: 'center' });
    const tableData = filtered.map(mat => [
      mat.matricule_code || '',
      `${mat.car?.brand || ''} ${mat.car?.model || ''}`.trim(),
      mat.kilometrage?.toLocaleString() || '',
      mat.currentReservation?.client ? `${mat.currentReservation.client.prenom} ${mat.currentReservation.client.nom}` : '',
      formatDateDisplay(mat.currentReservation?.end_date),
      mat.status === 'active' ? 'Actif' : 'Inactif'
    ]);
    autoTable(doc, {
      head: [['Matricule', 'Marque/Modèle', 'Km', 'Client', 'Date retour', 'Statut']],
      body: tableData,
      startY: 62,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
      },
      bodyStyles: {
        halign: 'center',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
    });
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('SMAITI CAR — Document généré automatiquement.', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.save(`matricules_${title.replace(/\s/g, '_')}.pdf`);
    toast.success("PDF téléchargé");
  };

  return (
    <div className={`matricule-category-card ${color}`}>
      <div className="card-header" onClick={toggleExpand}>
        <span className="card-icon"><Icon size={16} /></span>
        <span className="card-value">{matricules.length}</span>
        <span className="card-label">{title}</span>
        <span className="card-chev">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </div>

      {isExpanded && (
        <div className="card-dropdown">
          <div className="dropdown-search" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
            <Search size={14} className="search-icon" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Rechercher une immatriculation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: '1 1 auto',
                minWidth: '60px',
                border: 'none',
                outline: 'none',
                fontSize: '0.8rem',
                background: 'transparent',
                padding: '0.2rem 0',
              }}
            />
            {searchTerm && (
              <X 
                size={14} 
                className="clear-search" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                }}
                style={{ flexShrink: 0, cursor: 'pointer' }}
              />
            )}
            {isRetourImminent && (
              <button 
                className={`today-filter-btn ${showTodayOnly ? 'active' : ''}`}
                onClick={() => setShowTodayOnly(!showTodayOnly)}
                style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  background: showTodayOnly ? '#eab308' : 'white',
                  color: showTodayOnly ? 'white' : '#1e293b',
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                📅 Aujourd'hui
              </button>
            )}
            <button
              onClick={downloadPDF}
              style={{
                padding: '0.15rem 0.5rem',
                borderRadius: '1rem',
                border: '1px solid #e2e8f0',
                background: 'white',
                fontSize: '0.6rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              ⬇️ PDF
            </button>
          </div>

          {loading ? (
            <div className="dropdown-loading">Chargement...</div>
          ) : filteredMatricules.length === 0 ? (
            <div className="dropdown-empty">Aucun matricule trouvé</div>
          ) : (
            <>
              <div className="dropdown-list">
                {displayMatricules.map((mat) => {
                  let daysLeft = null;
                  if (isRetourImminent && mat.currentReservation?.end_date) {
                    daysLeft = getDaysLeft(mat.currentReservation.end_date);
                  }

                  const reservation = mat.currentReservation;
                  const canExtend = reservation?.can_extend_days;

                  return (
                    <div
                      key={mat.id}
                      className={`dropdown-item ${canExtend ? 'extendable' : ''}`}
                    >
                      <div className="item-info">
                        <span className="item-code">{mat.matricule_code}</span>
                        <span className="item-car">{mat.car?.brand} {mat.car?.model}</span>
                        <span className="item-km">{mat.kilometrage?.toLocaleString()} km</span>
                        {mat.currentReservation && (
                          <span className="item-client">
                            {mat.currentReservation.client?.prenom} {mat.currentReservation.client?.nom}
                            {mat.currentReservation.end_date && (
                              <span className="item-end-date">
                                (retour: {new Date(mat.currentReservation.end_date).toLocaleDateString('fr-FR')})
                              </span>
                            )}
                          </span>
                        )}
                        {isRetourImminent && daysLeft !== null && (
  <span className="days-left-badge" style={{
    background: daysLeft < 0 ? '#fee2e2' : daysLeft === 0 ? '#fef2f2' : '#fef3c7',
    color: daysLeft < 0 ? '#dc2626' : daysLeft === 0 ? '#dc2626' : '#d97706',
    padding: '0.1rem 0.6rem',
    borderRadius: '1rem',
    fontSize: '0.65rem',
    fontWeight: 600,
    whiteSpace: 'nowrap'
  }}>
    {daysLeft < 0 ? `Retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}` :
     daysLeft === 0 ? 'Retour aujourd\'hui' :
     daysLeft === 1 ? '1 jour restant' :
     `${daysLeft} jours restants`}
  </span>
)}
                      </div>
                      <div className="item-actions">
                        {title === 'Disponibles' && (
                          <>
                            <button
                              className="btn-reserve"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReserve(mat);
                              }}
                            >
                              <Plus size={12} /> Réserver
                            </button>
                            <button
                              className="btn-confirm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirmDirect(mat);
                              }}
                            >
                              <Check size={12} /> Confirmer
                            </button>
                          </>
                        )}
                        {isPendingCard && mat.currentReservation && (
                          <>
                            <button
                              className="btn-confirm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirm(mat.currentReservation);
                              }}
                            >
                              <Check size={12} /> Confirmer
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancel(mat.currentReservation);
                              }}
                            >
                              <X size={12} /> Annuler
                            </button>
                          </>
                        )}
                        {(title === 'Retour imminent' || title === 'En retard') && 
                          onComplete && mat.currentReservation && 
                          (mat.currentReservation.status === 'confirmed' || mat.currentReservation.status === 'retard') && (
                            <>
                              {/* ===== BOUTON PROLONGATION ===== */}
                              {isRetourImminent && reservation && (
                                <>
                                  {canExtend ? (
                                    <span className="extend-badge"><CheckCircle size={12} /> Prolongation activée</span>
                                  ) : (
                                    <button
                                      className="btn-extend"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleExtend(reservation);
                                      }}
                                    >
                                      Activer prolongation
                                    </button>
                                  )}
                                </>
                              )}
                              {/* ============================== */}
                              <button
                                className="btn-complete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onComplete(mat.currentReservation);
                                }}
                              >
                                <CheckCircle size={12} /> Terminer
                              </button>
                            </>
                        )}
                        {title === 'En panne (Accident)' && (
                          <span className="return-badge">⛔ En réparation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="dropdown-footer">
                  {!showAll ? (
                    <button className="btn-show-more" onClick={handleExpandMore}>
                      Voir tout ({filteredMatricules.length})
                    </button>
                  ) : (
                    <button className="btn-show-more" onClick={handleCollapse}>
                      Voir moins
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
// ==================== SecondDriverSearch (version adaptée aux modals) ====================
const SecondDriverSearch = ({ clients, selectedClientId, selectedSecondDriverId, onSelect }) => {
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
      <div className="new-driver-form" style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input type="text" className="form-control" placeholder="Prénom *" value={newDriverData.prenom} onChange={(e) => setNewDriverData(prev => ({ ...prev, prenom: e.target.value }))} />
          <input type="text" className="form-control" placeholder="Nom *" value={newDriverData.nom} onChange={(e) => setNewDriverData(prev => ({ ...prev, nom: e.target.value }))} />
          <input type="tel" className="form-control" placeholder="Téléphone *" value={newDriverData.telephone} onChange={(e) => setNewDriverData(prev => ({ ...prev, telephone: e.target.value }))} />
          <input type="email" className="form-control" placeholder="Email" value={newDriverData.email} onChange={(e) => setNewDriverData(prev => ({ ...prev, email: e.target.value }))} />
          <input type="text" className="form-control" placeholder="Ville" value={newDriverData.city} onChange={(e) => setNewDriverData(prev => ({ ...prev, city: e.target.value }))} />
          <input type="text" className="form-control" placeholder="CIN" value={newDriverData.cin_number} onChange={(e) => setNewDriverData(prev => ({ ...prev, cin_number: e.target.value }))} />
          <input type="text" className="form-control" placeholder="Permis" value={newDriverData.driver_license_number} onChange={(e) => setNewDriverData(prev => ({ ...prev, driver_license_number: e.target.value }))} style={{ gridColumn: "span 2" }} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-outline" onClick={handleCancelNew}>Annuler</button>
          <button type="button" className="btn btn-primary" onClick={handleSaveNewDriver} disabled={creatingDriver}>
            {creatingDriver ? "Création..." : "Créer le conducteur"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher un conducteur par nom, email ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {filteredDrivers.length > 0 && (
          <div className="client-list-container" style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "0.5rem", marginTop: "0.25rem" }}>
            {filteredDrivers.map(driver => (
              <div
                key={driver.id}
                className={`client-list-item ${selectedSecondDriverId === driver.id ? "selected" : ""}`}
                onClick={() => handleSelect(driver)}
                style={{
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: selectedSecondDriverId === driver.id ? "#fef3c7" : "transparent"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={(e) => {
                  if (selectedSecondDriverId !== driver.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontWeight: 500 }}>{driver.prenom} {driver.nom}</span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{driver.telephone}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="btn btn-outline" onClick={handleCreateNew} style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center" }}>
        <Plus size={14} /> Créer un nouveau conducteur
      </button>
    </div>
  );
};
// ==================== Component: ReserveModal (avec création de client et deuxième conducteur) ====================
const ReserveModal = ({ isOpen, onClose, matricule, clients, cars, onConfirm }) => {
  const dispatch = useDispatch();
  const sousLocations = useSelector(selectSousLocations);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,10));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // États pour le deuxième conducteur
  const [hasSecondDriver, setHasSecondDriver] = useState(false);
  const [secondDriverClientId, setSecondDriverClientId] = useState('');

  const [sousLocationSearch, setSousLocationSearch] = useState('');
  const [selectedSousLocationId, setSelectedSousLocationId] = useState('');
  const [showSousDropdown, setShowSousDropdown] = useState(false);
  const sousRef = useRef(null);

  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    city: '',
    cin_number: '',
    driver_license_number: '',
  });

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSousLocations());
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    const handler = (e) => {
      if (sousRef.current && !sousRef.current.contains(e.target)) {
        setShowSousDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays;
  }, [startDate, endDate]);

  const totalPrice = useMemo(() => {
    if (!matricule || !startDate || !endDate) return 0;
    const car = cars.find(c => c.id === matricule.car_id);
    if (!car) return 0;
    return (car.price_per_day || 0) * rentalDays;
  }, [matricule, startDate, endDate, cars, rentalDays]);

  const filteredClients = clients.filter(c =>
    `${c.prenom} ${c.nom} ${c.telephone} ${c.email || ''}`
      .toLowerCase()
      .includes(clientSearch.toLowerCase())
  );

  const filteredSousLocations = sousLocations.filter(sl =>
    sl.name.toLowerCase().includes(sousLocationSearch.toLowerCase()) ||
    (sl.description && sl.description.toLowerCase().includes(sousLocationSearch.toLowerCase()))
  );

  const handleCreateClient = async () => {
    if (!newClientData.nom || !newClientData.prenom || !newClientData.telephone) {
      toast.error('Veuillez remplir les champs obligatoires (Nom, Prénom, Téléphone)');
      return;
    }
    setCreatingClient(true);
    try {
      const result = await dispatch(createClient(newClientData)).unwrap();
      const client = result?.data || result?.client || result;
      const id = client.id || result.id;
      const prenom = client.prenom || result.prenom || '';
      const nom = client.nom || result.nom || '';
      const fullName = `${prenom} ${nom}`.trim() || 'Nouveau client';
      
      setSelectedClientId(id);
      setSelectedClientName(fullName);
      setClientSearch(fullName);
      setShowCreateClientForm(false);
      setNewClientData({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        city: '',
        cin_number: '',
        driver_license_number: '',
      });
      await dispatch(fetchClients());
      toast.success(`Client "${fullName}" créé avec succès`);
    } catch (error) {
      let errorMsg = 'Erreur lors de la création du client';
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (status === 409) {
          errorMsg = 'Un client avec ces informations existe déjà (téléphone, email ou CIN).';
        } else if (data && data.message) {
          errorMsg = data.message;
        } else if (data && data.errors) {
          const messages = Object.values(data.errors).flat().join(', ');
          errorMsg = messages;
        } else if (data && data.error) {
          errorMsg = data.error;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    } finally {
      setCreatingClient(false);
    }
  };

  if (!isOpen || !matricule) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    const data = {
      client_id: selectedClientId,
      matricule_id: matricule.id,
      car_id: matricule.car_id,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      amount_paid: 0,
      remaining_amount: totalPrice,
      status: status,
      notes: notes,
      sous_location_id: selectedSousLocationId || null,
      rental_days: rentalDays,
      has_second_driver: hasSecondDriver,
      second_driver_client_id: hasSecondDriver ? secondDriverClientId : null,
    };
    setSubmitting(true);
    try {
      await onConfirm(data);
      onClose();
    } catch (error) {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal mat-modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title mm-title">
            <span className="mm-icon mm-gold"><CalendarPlus size={18} /></span>
            <span className="mm-title-text">
              <small>Nouvelle réservation</small>Réserver
            </span>
          </h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="mm-summary">
            <span className="mm-plate"><i>MA</i><em>{matricule.matricule_code}</em></span>
            <div>
              <b>{`${matricule.car?.brand || ''} ${matricule.car?.model || ''}`.trim() || 'Véhicule'}</b>
              <small>{matricule.kilometrage != null ? `${Number(matricule.kilometrage).toLocaleString()} km` : 'Kilométrage non renseigné'}</small>
            </div>
          </div>
          {/* Client search (inchangé) */}
          <div className="form-group">
            <label>Client *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => {
                const val = e.target.value;
                setClientSearch(val);
                if (!val) {
                  setSelectedClientId('');
                  setSelectedClientName('');
                }
              }}
            />
            <div className="client-list-container" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.25rem' }}>
              {filteredClients.length === 0 ? (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {clientSearch ? 'Aucun client trouvé' : 'Tapez pour rechercher'}
                </div>
              ) : (
                filteredClients.map(c => (
                  <div
                    key={c.id}
                    className={`client-list-item ${selectedClientId === c.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      const fullName = `${c.prenom} ${c.nom}`;
                      setSelectedClientName(fullName);
                      setClientSearch(fullName);
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: selectedClientId === c.id ? '#fef3c7' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => {
                      if (selectedClientId !== c.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{c.prenom} {c.nom}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.telephone}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              {!showCreateClientForm ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setShowCreateClientForm(true)}
                >
                  <Plus size={14} /> Créer un nouveau client
                </button>
              ) : (
                <div style={{ padding: '0.5rem 0', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#f8fafc', padding: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nom *"
                      value={newClientData.nom}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, nom: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Prénom *"
                      value={newClientData.prenom}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, prenom: e.target.value }))}
                    />
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Téléphone *"
                      value={newClientData.telephone}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, telephone: e.target.value }))}
                    />
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Email (optionnel)"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ville (optionnel)"
                      value={newClientData.city}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, city: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="CIN (optionnel)"
                      value={newClientData.cin_number}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, cin_number: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Permis (optionnel)"
                      value={newClientData.driver_license_number}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, driver_license_number: e.target.value }))}
                      style={{ gridColumn: 'span 2' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowCreateClientForm(false)}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCreateClient}
                      disabled={creatingClient}
                    >
                      {creatingClient ? <Loader size={16} className="spinning" /> : 'Créer'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedClientId && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                ✅ Client sélectionné: {selectedClientName}
              </div>
            )}
          </div>

          {/* DEUXIÈME CONDUCTEUR */}
          <div className="form-group">
            <label className="inline-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasSecondDriver}
                onChange={(e) => {
                  setHasSecondDriver(e.target.checked);
                  if (!e.target.checked) setSecondDriverClientId('');
                }}
              />
              <span>Ajouter un deuxième conducteur</span>
            </label>
            {hasSecondDriver && (
              <SecondDriverSearch
                clients={clients}
                selectedClientId={selectedClientId}
                selectedSecondDriverId={secondDriverClientId}
                onSelect={(client) => setSecondDriverClientId(client.id)}
                onCreateNew={() => {}}
              />
            )}
            {secondDriverClientId && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                ✅ Deuxième conducteur sélectionné
              </div>
            )}
          </div>

          {/* Reste du formulaire (dates, sous‑location, etc.) */}
          <div className="form-group">
            <label>Date de début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de début</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Date de fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de fin</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Prix total estimé</label>
            <input type="text" className="form-control" value={`${totalPrice} DH`} disabled style={{ backgroundColor: '#f3f4f6' }} />
          </div>

          <div className="form-group">
            <label>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-control">
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="contacted">Contacté</option>
            </select>
          </div>

          <div className="form-group" ref={sousRef}>
            <label>Sous‑location (optionnel)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher une sous‑location..."
              value={sousLocationSearch}
              onChange={(e) => {
                setSousLocationSearch(e.target.value);
                setShowSousDropdown(true);
                if (!e.target.value) setSelectedSousLocationId('');
              }}
              onFocus={() => setShowSousDropdown(true)}
            />
            {showSousDropdown && (
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                marginTop: '0.25rem',
                background: 'white',
                position: 'relative',
                zIndex: 10,
              }}>
                {filteredSousLocations.length === 0 ? (
                  <div style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {sousLocationSearch ? 'Aucune sous‑location trouvée' : 'Tapez pour rechercher'}
                  </div>
                ) : (
                  filteredSousLocations.map(sl => (
                    <div
                      key={sl.id}
                      style={{
                        padding: '0.4rem 0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        background: selectedSousLocationId === sl.id ? '#fef3c7' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => {
                        setSelectedSousLocationId(sl.id);
                        setSousLocationSearch(sl.name);
                        setShowSousDropdown(false);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => {
                        if (selectedSousLocationId !== sl.id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>{sl.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{sl.status}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedSousLocationId && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                ✅ Sous‑location sélectionnée: {sousLocations.find(sl => sl.id === selectedSousLocationId)?.name}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control" rows="2"></textarea>
          </div>

          <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader size={16} className="spinning" /> : 'Réserver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// ==================== Component: DirectConfirmModal (avec création de client) ====================
// ==================== Component: DirectConfirmModal (avec création de client et deuxième conducteur) ====================
const DirectConfirmModal = ({ isOpen, onClose, matricule, clients, cars, onConfirm }) => {
  const dispatch = useDispatch();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // États pour le deuxième conducteur
  const [hasSecondDriver, setHasSecondDriver] = useState(false);
  const [secondDriverClientId, setSecondDriverClientId] = useState('');

  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    city: '',
    cin_number: '',
    driver_license_number: '',
  });

  // Mise à jour de l'heure de début à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setStartTime(new Date().toTimeString().slice(0, 5));
    }
  }, [isOpen]);

  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays;
  }, [startDate, endDate]);

  const totalPrice = useMemo(() => {
    if (!matricule || !startDate || !endDate) return 0;
    const car = cars.find(c => c.id === matricule.car_id);
    if (!car) return 0;
    return (car.price_per_day || 0) * rentalDays;
  }, [matricule, startDate, endDate, cars, rentalDays]);

  const filteredClients = clients.filter(c =>
    `${c.prenom} ${c.nom} ${c.telephone} ${c.email || ''}`
      .toLowerCase()
      .includes(clientSearch.toLowerCase())
  );

  const handleCreateClient = async () => {
    if (!newClientData.nom || !newClientData.prenom || !newClientData.telephone) {
      toast.error('Veuillez remplir les champs obligatoires (Nom, Prénom, Téléphone)');
      return;
    }
    setCreatingClient(true);
    try {
      const result = await dispatch(createClient(newClientData)).unwrap();
      const client = result?.data || result?.client || result;
      const id = client.id || result.id;
      const prenom = client.prenom || result.prenom || '';
      const nom = client.nom || result.nom || '';
      const fullName = `${prenom} ${nom}`.trim() || 'Nouveau client';
      
      setSelectedClientId(id);
      setSelectedClientName(fullName);
      setClientSearch(fullName);
      setShowCreateClientForm(false);
      setNewClientData({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        city: '',
        cin_number: '',
        driver_license_number: '',
      });
      await dispatch(fetchClients());
      toast.success(`Client "${fullName}" créé avec succès`);
    } catch (error) {
      let errorMsg = 'Erreur lors de la création du client';
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (status === 409) {
          errorMsg = 'Un client avec ces informations existe déjà (téléphone, email ou CIN).';
        } else if (data && data.message) {
          errorMsg = data.message;
        } else if (data && data.errors) {
          const messages = Object.values(data.errors).flat().join(', ');
          errorMsg = messages;
        } else if (data && data.error) {
          errorMsg = data.error;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    } finally {
      setCreatingClient(false);
    }
  };

  if (!isOpen || !matricule) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    const data = {
      client_id: selectedClientId,
      matricule_id: matricule.id,
      car_id: matricule.car_id,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      amount_paid: 0,
      remaining_amount: totalPrice,
      status: 'confirmed',
      notes: notes,
      rental_days: rentalDays,
      has_second_driver: hasSecondDriver,
      second_driver_client_id: hasSecondDriver ? secondDriverClientId : null,
    };
    setSubmitting(true);
    try {
      await onConfirm(data);
      onClose();
    } catch (error) {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal mat-modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title mm-title">
            <span className="mm-icon mm-green"><CheckCircle size={18} /></span>
            <span className="mm-title-text">
              <small>Confirmation directe</small>Confirmer
            </span>
          </h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="mm-summary">
            <span className="mm-plate"><i>MA</i><em>{matricule.matricule_code}</em></span>
            <div>
              <b>{`${matricule.car?.brand || ''} ${matricule.car?.model || ''}`.trim() || 'Véhicule'}</b>
              <small>{matricule.kilometrage != null ? `${Number(matricule.kilometrage).toLocaleString()} km` : 'Kilométrage non renseigné'}</small>
            </div>
          </div>
          {/* Client search (inchangé) */}
          <div className="form-group">
            <label>Client *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => {
                const val = e.target.value;
                setClientSearch(val);
                if (!val) {
                  setSelectedClientId('');
                  setSelectedClientName('');
                }
              }}
            />
            <div className="client-list-container" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.25rem' }}>
              {filteredClients.length === 0 ? (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {clientSearch ? 'Aucun client trouvé' : 'Tapez pour rechercher'}
                </div>
              ) : (
                filteredClients.map(c => (
                  <div
                    key={c.id}
                    className={`client-list-item ${selectedClientId === c.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      const fullName = `${c.prenom} ${c.nom}`;
                      setSelectedClientName(fullName);
                      setClientSearch(fullName);
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: selectedClientId === c.id ? '#fef3c7' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => {
                      if (selectedClientId !== c.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{c.prenom} {c.nom}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.telephone}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              {!showCreateClientForm ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setShowCreateClientForm(true)}
                >
                  <Plus size={14} /> Créer un nouveau client
                </button>
              ) : (
                <div style={{ padding: '0.5rem 0', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#f8fafc', padding: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nom *"
                      value={newClientData.nom}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, nom: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Prénom *"
                      value={newClientData.prenom}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, prenom: e.target.value }))}
                    />
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Téléphone *"
                      value={newClientData.telephone}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, telephone: e.target.value }))}
                    />
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Email (optionnel)"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ville (optionnel)"
                      value={newClientData.city}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, city: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="CIN (optionnel)"
                      value={newClientData.cin_number}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, cin_number: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Permis (optionnel)"
                      value={newClientData.driver_license_number}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, driver_license_number: e.target.value }))}
                      style={{ gridColumn: 'span 2' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowCreateClientForm(false)}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCreateClient}
                      disabled={creatingClient}
                    >
                      {creatingClient ? <Loader size={16} className="spinning" /> : 'Créer'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedClientId && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                ✅ Client sélectionné: {selectedClientName}
              </div>
            )}
          </div>

          {/* DEUXIÈME CONDUCTEUR */}
          <div className="form-group">
            <label className="inline-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasSecondDriver}
                onChange={(e) => {
                  setHasSecondDriver(e.target.checked);
                  if (!e.target.checked) setSecondDriverClientId('');
                }}
              />
              <span>Ajouter un deuxième conducteur</span>
            </label>
            {hasSecondDriver && (
              <SecondDriverSearch
                clients={clients}
                selectedClientId={selectedClientId}
                selectedSecondDriverId={secondDriverClientId}
                onSelect={(client) => setSecondDriverClientId(client.id)}
                onCreateNew={() => {}}
              />
            )}
            {secondDriverClientId && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                ✅ Deuxième conducteur sélectionné
              </div>
            )}
          </div>

          {/* Dates, prix, notes */}
          <div className="form-group">
            <label>Date de début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de début</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Date de fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de fin</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Prix total</label>
            <input type="text" className="form-control" value={`${totalPrice} DH`} disabled style={{ backgroundColor: '#f3f4f6' }} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control" rows="2"></textarea>
          </div>

          <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader size={16} className="spinning" /> : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== FilterDropdown ====================
const FilterDropdown = ({ options, value, onChange, label, icon: IconComponent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || label;

  return (
    <div className="filter-dropdown-wrapper" ref={dropdownRef}>
      <button
        className="filter-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {IconComponent && <IconComponent size={14} className="filter-dropdown-icon" />}
        <span className="filter-dropdown-label">{selectedLabel}</span>
        <ChevronDown size={14} className={`filter-dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      {isOpen && (
        <div className="filter-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              className={`filter-dropdown-item ${option.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="item-label">{option.label}</span>
              {option.value === value && <CheckCircle2 size={12} className="item-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== Main AdminDashboard ====================
const dashRedesignCss = `
.dash-hero { position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.25rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 1.75rem; padding: 1.6rem 2rem; margin-bottom: 1.25rem;
  box-shadow: 0 24px 50px -26px rgba(15,23,42,.6); }
.dash-hero::before { content: ""; position: absolute; right: -80px; top: -90px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(234,179,8,.28), transparent 68%); }
.dash-hero::after { content: ""; position: absolute; left: 36%; bottom: -120px; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, rgba(59,130,246,.18), transparent 70%); }
.dash-hero > * { position: relative; z-index: 1; }
.dash-hero-title { display: flex; flex-direction: column; }
.dash-eyebrow { font-size: .7rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #eab308; margin-bottom: .35rem; }
.dash-h1 { margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: -.03em; color: #fff; }
.dash-sub { margin: .3rem 0 0; font-size: .85rem; color: rgba(255,255,255,.65); }
.dash-hero .header-actions { gap: .8rem; }
.dash-hero .contract-manual-btn { background: rgba(255,255,255,.08); border-color: rgba(234,179,8,.55); }
.dash-hero .contract-manual-btn:hover { background: rgba(234,179,8,.18); }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.kpi-card { background: #fff; border: 1px solid #e8edf4; border-radius: 1.5rem; padding: 1.15rem 1.3rem 1.25rem; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.2); }
.kpi-card.kpi-gold { background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); border-color: transparent; color: #1a1a2e; }
.kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: .9rem; }
.kpi-icon { width: 2.5rem; height: 2.5rem; border-radius: .9rem; background: #f4f6fa; display: inline-flex; align-items: center; justify-content: center; color: #1a1a2e; }
.kpi-gold .kpi-icon { background: rgba(255,255,255,.35); }
.kpi-tag { font-size: .68rem; font-weight: 700; padding: .25rem .65rem; border-radius: 999px; background: #f4f6fa; color: #475569; }
.kpi-gold .kpi-tag { background: rgba(26,26,46,.12); color: #1a1a2e; }
.kpi-value { font-size: 1.85rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.1; }
.kpi-value small { font-size: .85rem; font-weight: 600; opacity: .6; letter-spacing: 0; }
.kpi-label { margin-top: .3rem; font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
.kpi-gold .kpi-label { color: rgba(26,26,46,.75); }
.kpi-bar { height: 6px; background: #eef2f7; border-radius: 6px; overflow: hidden; margin-top: .85rem; }
.kpi-bar i { display: block; height: 100%; background: #eab308; border-radius: 6px; }
.kpi-bar.blue i { background: #3b82f6; }

.dash-row { display: grid; gap: 1.1rem; margin-bottom: 1.1rem; }
.dash-row-a { grid-template-columns: 1.9fr 1fr; }
.dash-row-b { grid-template-columns: repeat(3, 1fr); }
.dash-row-c { grid-template-columns: repeat(2, 1fr); }
.dash-row .chart-card { border-radius: 1.5rem; border: 1px solid #e8edf4; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.18); padding: 1.3rem 1.4rem 1rem; min-width: 0; }
.stat-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; }
.stat-chev { display: none; }
.matricule-category-card .card-icon { display: inline-flex; }
/* ===== Rapports sauvegardés ===== */
.sr-head { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
.sr-head-icon { width: 2.5rem; height: 2.5rem; border-radius: .9rem; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(135deg, #eab308, #f59e0b); box-shadow: 0 8px 20px -8px rgba(245,158,11,.55); }
.sr-head h2 { margin: 0; font-size: 1.05rem; font-weight: 800; letter-spacing: -.01em; }
.sr-head small { display: block; margin-top: 2px; font-size: .72rem; font-weight: 500; color: #64748b; }
.sr-count { margin-left: auto; font-size: .72rem; font-weight: 700; padding: .3rem .8rem; border-radius: 999px; background: #f4f6fa; color: #475569; }
.saved-report-card { display: flex; flex-direction: column; gap: .8rem; min-width: 0; }
.sr-top { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.sr-icon { width: 2.5rem; height: 2.5rem; border-radius: .9rem; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(135deg, #3b82f6, #06b6d4); }
.sr-main { min-width: 0; flex: 1; }
.sr-name { font-weight: 700; font-size: .88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-date { display: flex; align-items: center; gap: .35rem; margin-top: .15rem; font-size: .7rem; color: #64748b; }
.sr-dot { width: 3px; height: 3px; border-radius: 50%; background: #94a3b8; }
.sr-total { display: flex; align-items: flex-end; justify-content: space-between; gap: .5rem; padding: .65rem .85rem; border-radius: 1rem; background: #f6f8fb; }
.sr-total .lbl { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
.sr-total b { font-size: 1.15rem; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; }
.sr-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: .45rem; }
.sr-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .25rem; min-height: 48px; padding: 6px 4px; border-radius: .8rem; border: 1.5px solid #e8edf4; background: #fff; cursor: pointer; font-family: inherit; transition: background .15s, transform .1s; }
.sr-btn span { font-size: .58rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; line-height: 1; }
.sr-btn:hover { background: #f6f8fb; }
.sr-btn:active { transform: scale(.97); }
.sr-btn.edit { color: #8b5cf6; }
.sr-btn.pdf { color: #2563eb; }
.sr-btn.print { color: #0f8a43; }
.sr-btn.del { color: #ef4444; }
@media (prefers-color-scheme: dark) {
  .sr-count, .sr-total, .sr-btn { background: #0f172a; }
  .sr-btn { border-color: #334155; }
  .sr-btn:hover { background: #1e293b; }
  .sr-head small, .sr-date, .sr-total .lbl { color: #94a3b8; }
}
.chart-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: .6rem; }
.chart-head .chart-subtitle { margin-bottom: 0; }

.dash-list { display: flex; flex-direction: column; gap: .55rem; padding-bottom: .4rem; }
.dash-item { display: flex; align-items: center; gap: .8rem; padding: .7rem .9rem; border-radius: 1rem; background: #f6f8fb; }
.dash-dot { width: .6rem; height: .6rem; border-radius: 50%; background: #eab308; flex-shrink: 0; }
.dash-dot.late { background: #ef4444; }
.dash-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dash-item-main b { font-size: .86rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash-item-main small { font-size: .72rem; color: #64748b; }
.dash-pill { font-size: .7rem; font-weight: 700; padding: .28rem .7rem; border-radius: 999px; background: #fef3c7; color: #92400e; white-space: nowrap; }
.dash-pill.warn { background: #fde68a; }
.dash-pill.late { background: #fee2e2; color: #991b1b; }
.dash-empty { padding: 2rem 1rem; text-align: center; color: #94a3b8; font-size: .85rem; }

.dash-section-title { display: flex; align-items: center; gap: .9rem; margin: 1.75rem 0 1rem; }
.dash-section-title span { font-size: .75rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #64748b; }
.dash-section-title::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, #cbd5e1, transparent); }

.stats-section { background: #fff; border: 1px solid #e8edf4; border-radius: 1.5rem; padding: 1.2rem 1.3rem 1.3rem; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.14); }
.category-title { border-bottom: 0; padding-bottom: 0; margin-bottom: 1rem; font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; color: #475569; }
.category-icon { background: #fef9c3; padding: .35rem; border-radius: .6rem; box-sizing: content-box; }
.recent-card { border-radius: 1.5rem; padding: 1.3rem 1.4rem; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.14); }

@media (max-width: 1100px) { .dash-row-a, .dash-row-b { grid-template-columns: 1fr 1fr; } .dash-row-a > :first-child { grid-column: span 2; } }
@media (max-width: 720px) { .dash-row-a, .dash-row-b, .dash-row-c { grid-template-columns: 1fr; } .dash-row-a > :first-child { grid-column: auto; } .dash-hero { padding: 1.3rem; } .dash-h1 { font-size: 1.55rem; } }
@media (prefers-color-scheme: dark) {
  .kpi-card, .dash-row .chart-card, .stats-section { background: #1e293b; border-color: #334155; }
  .kpi-card.kpi-gold { background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); }
  .kpi-icon, .kpi-tag, .dash-item { background: #0f172a; }
  .kpi-bar { background: #334155; }
  .category-icon { background: #334155; }
}
`;

// ==================== Report paper = contract look ====================
const reportContractCss = `
.report-paper {
  --cr: #e5202e; --cb: #1da1e8; --ci: #0a0a0a;
  position: relative;
  background: #fff !important;
  color: #111 !important;
  border: 1px solid #cfcfd6 !important;
  border-radius: 6px !important;
  padding: 9mm 10mm 8mm !important;
  font-family: Archivo, 'Segoe UI', Arial, sans-serif !important;
  box-shadow: 0 4px 18px rgba(0,0,0,.12) !important;
}
.report-paper > *:not(.rp-watermark) { position: relative; z-index: 1; }
.rp-watermark { position: absolute; left: 50%; top: 52%; width: 70%; transform: translate(-50%, -50%); opacity: .07; pointer-events: none; z-index: 0; }

.rp-head-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.rp-logo img { height: 68px; width: auto; display: block; }
.rp-mid { flex: 1; text-align: center; }
.rp-small { font: 800 15px Archivo, Arial, sans-serif; line-height: 1.1; color: #111; }
.rp-big { font: 900 24px Archivo, Arial, sans-serif; color: var(--cr); letter-spacing: .8px; line-height: 1.15; }
.rp-no { border: 1.5px solid #111; border-radius: 10px; padding: 3px 10px; text-align: center; line-height: 1.2; background: #fff; }
.rp-no span { display: block; font-size: 7.5px; font-weight: 800; letter-spacing: .8px; color: var(--cr); }
.rp-no b { font-size: 15px; font-weight: 900; color: #111; }
.rp-date { margin: 6px 0 8px; text-align: center; font-size: 10px; font-weight: 700; color: #555; }
.rp-pill { display: block; width: 62%; text-align: left; font: 800 14px Archivo, Arial, sans-serif; letter-spacing: .3px; padding: 3px 14px; border-radius: 999px 0 0 999px; background: var(--cr); color: #fff; margin-bottom: 8px; }

.report-paper .report-table-container { border: 1.5px solid #111 !important; border-radius: 12px !important; margin-top: 4px !important; }
.report-paper .report-table th { background: var(--ci) !important; color: #fff !important; border: 0 !important; text-transform: uppercase; letter-spacing: .06em; font-size: 11px !important; font-weight: 800 !important; }
.report-paper .report-table td { border-bottom: 1.5px dotted #666 !important; color: #0a0a0a !important; font-weight: 700; }
.report-paper .report-table tr:last-child td { border-bottom: 0 !important; }
.report-paper .report-input { background: #fff !important; color: #111 !important; border: 1px solid #cfcfd6 !important; }
.report-paper .report-input:focus { border-color: var(--cb) !important; box-shadow: 0 0 0 2px rgba(29,161,232,.15) !important; }
.report-paper .report-summary { background: transparent !important; justify-content: flex-end; margin-top: 14px !important; padding: 0 !important; }
.report-paper .report-summary-label,
.report-paper .report-summary-value { background: var(--cr); color: #fff !important; padding: 5px 16px; font-weight: 900; }
.report-paper .report-summary-label { border-radius: 999px 0 0 999px; font-size: 13px !important; padding-right: 8px; }
.report-paper .report-summary-value { border-radius: 0 999px 999px 0; font-size: 15px !important; padding-left: 8px; }
.report-paper .report-summary { gap: 0 !important; }
.report-paper .rp-foot { margin-top: 22px !important; padding-top: 8px !important; border-top: 1.5px solid #111 !important; text-align: center; font-size: 9.5px !important; line-height: 1.5; color: #111 !important; }
.report-paper .rp-foot b { font-weight: 800; }

/* hidden capture area = exactly one A4 page */
.rp-capture .report-paper { min-height: 1122px; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; padding: 9mm 10mm 8mm !important; }
.rp-capture .rp-head-row { flex-wrap: nowrap !important; }
`;

// ==================== Recent reservations (same look as AdminReservations) ====================
const rvRecentCss = `
.rvr {
  --acc: #eab308; --acc-tx: #a16207; --danger: #dc2626; --blue: #1da1e8; --blue-d: #0f84c4; --ink: #0a0a0a;
  --surface: #ffffff; --surface-2: #f4f5f8; --tx: #111216; --tx-2: #5b6070; --tx-3: #8a90a0; --line: #e1e4ea;
  font-family: Archivo, "Segoe UI", system-ui, -apple-system, sans-serif;
  color: var(--tx); background: var(--surface);
  border: 1px solid var(--line); border-radius: 1.5rem;
  padding: 1.3rem 1.4rem; margin-top: 1.5rem;
  box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.14);
}
@media (prefers-color-scheme: dark) {
  .rvr { --surface: #1e293b; --surface-2: #0f172a; --tx: #f2f3f5; --tx-2: #a4aab8; --tx-3: #747b8c; --line: #334155; --acc-tx: #facc15; }
}
.rvr *, .rvr *::before, .rvr *::after { box-sizing: border-box; }
.rvr button { font-family: inherit; }

.rvr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 1.1rem; }
.rvr-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.rvr-head-icon { width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 8px 20px -6px rgba(245,158,11,.5); }
.rvr-title { margin: 0; font-size: 1.15rem; font-weight: 800; letter-spacing: -.01em; }
.rvr-sub { margin: 2px 0 0; font-size: .78rem; color: var(--tx-2); }
.rvr-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--tx); font-size: .78rem; font-weight: 600; cursor: pointer; }
.rvr-btn:hover { border-color: var(--tx-3); background: var(--surface-2); }
.rvr-empty { text-align: center; padding: 2.5rem 1rem; color: var(--tx-2); font-weight: 700; }

/* table */
.rvr-tablewrap { border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.rvr-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.rvr-table { width: 100%; min-width: 820px; border-collapse: collapse; font-size: .82rem; }
.rvr-table thead th { background: var(--surface-2); color: var(--tx-2); text-align: left; padding: 12px 16px; font-size: .72rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.rvr-table tbody td { padding: 12px 16px; border-top: 1px solid var(--line); vertical-align: middle; }
.rvr-row { cursor: pointer; }
.rvr-row:hover { background: var(--surface-2); }

.rvr-client { display: flex; align-items: center; gap: 10px; min-width: 150px; }
.rvr-avatar { width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff; font-weight: 800; font-size: .8rem; letter-spacing: .03em; }
.rvr-client-name { font-weight: 600; }
.rvr-veh { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.rvr-veh-name { font-weight: 800; font-size: .85rem; }
.rvr-color { display: inline-flex; align-items: center; gap: 6px; font-size: .72rem; font-weight: 600; color: var(--tx-2); }
.rvr-dot { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid rgba(10,10,10,.35); display: inline-block; flex-shrink: 0; }
.rvr-period { display: flex; flex-direction: column; gap: 3px; font-size: .78rem; font-weight: 700; }
.rvr-period span { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.rvr-period svg { color: var(--acc-tx); }

.rvr-plate { display: inline-flex; align-items: stretch; border: 2px solid #0a0a0a; border-radius: 8px; overflow: hidden; background: #fff; color: #0a0a0a; line-height: 1; }
.rvr-plate-strip { background: var(--blue); color: #fff; font-size: .55rem; font-weight: 900; letter-spacing: .06em; padding: 6px 5px; display: flex; align-items: flex-end; }
.rvr-plate-code { padding: 6px 10px; font-weight: 900; font-size: .92rem; letter-spacing: .1em; font-variant-numeric: tabular-nums; white-space: nowrap; }

.rvr-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px; font-size: .72rem; font-weight: 800; background: var(--surface-2); color: var(--tx); border: 1.5px solid var(--line); white-space: nowrap; }
.rvr-chip svg { color: var(--acc-tx); flex-shrink: 0; }
.rvr-price { display: inline-flex; align-items: center; gap: 5px; font-weight: 900; font-size: .95rem; background: linear-gradient(transparent 62%, rgba(234,179,8,.38) 62%); padding: 0 2px; white-space: nowrap; }
.rvr-price svg { color: var(--acc-tx); }
.rvr-rest { font-weight: 800; font-size: .8rem; color: var(--tx-3); }
.rvr-rest.due { color: var(--danger); }
.rvr-rest.ok { color: #0f8a43; }

.rvr-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px 4px 9px; border-radius: 999px; font-size: .72rem; font-weight: 800; letter-spacing: .02em; white-space: nowrap; border: 1.5px solid currentColor; }
.rvr-st-pending { color: #b36b00; background: #fff4d6; }
.rvr-st-confirmed { color: #0f8a43; background: #e3f7ea; }
.rvr-st-contacted { color: #5b34b8; background: #efe9fb; }
.rvr-st-completed { color: var(--blue-d); background: #e3f3fc; }
.rvr-st-cancelled { color: #5b6070; background: #eceef2; }
.rvr-st-retard { color: #fff; background: var(--danger); border-color: var(--danger); }
@media (prefers-color-scheme: dark) {
  .rvr-st-pending { background: rgba(217,138,0,.16); color: #ffc247; }
  .rvr-st-confirmed { background: rgba(22,163,74,.16); color: #4ade80; }
  .rvr-st-contacted { background: rgba(124,77,255,.18); color: #b79cff; }
  .rvr-st-completed { background: rgba(29,161,232,.16); color: #5cc3f5; }
  .rvr-st-cancelled { background: rgba(138,144,160,.16); color: #b6bccb; }
}

/* mobile cards */
.rvr-cards { display: flex; flex-direction: column; gap: 12px; }
.rvr-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04); overflow: hidden; }
.rvr-card.is-late { border-color: var(--danger); }
.rvr-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 0; }
.rvr-card-no { display: inline-flex; align-items: baseline; gap: 4px; border-radius: 6px; padding: 2px 8px; background: var(--surface-2); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.2; }
.rvr-card-no small { font-size: .55rem; font-weight: 900; letter-spacing: .04em; color: var(--tx-3); }
.rvr-card-no b { font-size: .78rem; font-weight: 700; color: var(--tx-2); }
.rvr-card-client { display: flex; align-items: center; gap: 10px; padding: 10px 14px 0; }
.rvr-card-client .rvr-avatar { width: 40px; height: 40px; border-radius: 12px; font-size: .85rem; }
.rvr-card-client .rvr-client-name { font-weight: 700; font-size: .98rem; line-height: 1.15; }
.rvr-card-veh { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 8px 14px 0; }
.rvr-card-veh .rvr-veh-name { font-size: .88rem; }
.rvr-route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin: 10px 14px 0; padding: 8px 10px; background: var(--surface-2); border-radius: 10px; }
.rvr-date-block { display: flex; flex-direction: column; line-height: 1; }
.rvr-date-block.end { text-align: right; align-items: flex-end; }
.rvr-date-block .dd { font-size: 1.05rem; font-weight: 900; letter-spacing: -.01em; }
.rvr-date-block .mm { font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--acc-tx); margin-top: 2px; }
.rvr-date-block .yy { font-size: .58rem; font-weight: 600; color: var(--tx-3); margin-top: 1px; }
.rvr-route-mid { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; }
.rvr-route-mid .line { display: flex; align-items: center; width: 100%; color: var(--tx-3); }
.rvr-route-mid .line::before, .rvr-route-mid .line::after { content: ""; flex: 1; border-top: 2px dotted var(--tx-3); }
.rvr-route-mid .line svg { flex-shrink: 0; color: var(--acc-tx); }
.rvr-money { margin: 10px 14px 12px; }
.rvr-money-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.rvr-money-top .lbl { font-size: .62rem; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; color: var(--tx-3); display: block; margin-bottom: 2px; }
.rvr-money-top .tot { font-size: 1.15rem; font-weight: 900; letter-spacing: -.02em; line-height: 1; }
.rvr-money-top .tot small { font-size: .75rem; font-weight: 800; margin-left: 3px; color: var(--tx-2); }
.rvr-remaining { font-size: .8rem; font-weight: 800; text-align: right; }
.rvr-remaining.due { color: var(--danger); }
.rvr-remaining.ok { color: #0f8a43; }
.rvr-bar { height: 8px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--line); overflow: hidden; }
.rvr-bar i { display: block; height: 100%; border-radius: 999px; background: repeating-linear-gradient(-45deg, var(--blue) 0 8px, #5cc3f5 8px 16px); }
.rvr-bar.full i { background: #16a34a; }
.rvr-perf { border-top: 1px solid var(--line); margin: 0 14px; }
.rvr-tiles { padding: 12px 14px 14px; }
.rvr-tile { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 6px 10px; border-radius: 10px; border: 0; background: var(--surface-2); color: #0891b2; cursor: pointer; }
.rvr-tile span { font-size: .78rem; font-weight: 700; color: var(--tx-2); }
.rvr-tile:active { transform: scale(.97); }
`;

// ==================== Mobile dashboard (same feel as AdminReservations) ====================
const mobileDashCss = `
@keyframes dashSheet { from { transform: translateY(100%); } to { transform: none; } }
@media (max-width: 820px) {
  .dashboard { font-family: Archivo, "Segoe UI", system-ui, sans-serif; padding-left: 16px !important; padding-right: 16px !important; box-sizing: border-box; }

  .filter-toolbar { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .5rem; padding: .7rem; border-radius: 1.1rem; }
  .filter-toolbar .filter-nav, .filter-toolbar > div:last-child { display: none; }
  .filter-toolbar .filter-main { display: contents; }
  .filter-toolbar .calendar-icon { display: none; }
  .filter-dropdown-wrapper { min-width: 0; }
  .filter-dropdown-trigger { width: 100%; justify-content: space-between; border-radius: 10px; height: 2.4rem; }
  .filter-dropdown-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .dash-hero { padding: 1.1rem; border-radius: 1.25rem; gap: .9rem; }
  .dash-hero .header-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
  .dash-hero .global-search-container { grid-column: 1 / -1; width: 100%; }
  .dash-hero .contract-manual-btn { justify-content: center; height: 44px; border-radius: 999px; font-size: .78rem; }
  .dash-hero .revenue-card { grid-column: 1 / -1; justify-content: center; }

  .kpi-row { grid-template-columns: repeat(2, 1fr); gap: .7rem; }
  .kpi-card { border-radius: 1.1rem; padding: .9rem; }
  .kpi-value { font-size: 1.4rem; }
  .kpi-label { font-size: .64rem; }

  .dash-row { gap: .8rem; }
  .dash-row .chart-card { border-radius: 1.1rem; padding: 1rem; }

  /* ===== Category sections: cards sit directly on the page, like the KPI row ===== */
  .stats-section { background: transparent; border: 0; box-shadow: none; border-radius: 0; padding: 0; margin-bottom: 1.4rem; }
  .category-title { margin-bottom: .8rem; font-size: .74rem; }

  /* ===== Shared KPI-card shell ===== */
  .stat-card, .matricule-category-card, .saved-report-card {
    background: #fff; border: 1px solid #e8edf4; border-radius: 1.1rem;
    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.2);
  }

  /* Stat cards */
  .stats-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .7rem; overflow: visible; margin: 0; padding: 0; }
  .stats-grid > :last-child:nth-child(odd) { grid-column: 1 / -1; }
  .stats-grid > .stat-card { flex: none; min-width: 0; }
  .stat-card { display: flex; flex-direction: column; padding: .9rem; min-width: 0; }
  .stat-card.clickable:hover { transform: none; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.2); }
  .stat-card:active { transform: scale(.98); }
  .stat-card-bg { display: none; }
  .stat-top { align-items: center; margin-bottom: .9rem; }
  .stat-icon { width: 2.5rem; height: 2.5rem; border-radius: .9rem; margin-bottom: 0; }
  .stat-chev { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border-radius: 999px; background: #f4f6fa; color: #475569; }
  .stat-value { margin-top: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.1; }
  .stat-label { margin-top: .3rem; font-size: .64rem; font-weight: 600; letter-spacing: .07em; color: #64748b; }
  .stat-subtitle { margin-top: .25rem; font-size: .66rem; line-height: 1.3; color: #94a3b8; }

  /* Matricule category cards */
  .matricule-cards-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .7rem; }
  .matricule-cards-grid > :last-child:nth-child(odd), .matricule-cards-grid > .matricule-category-card:has(.card-dropdown) { grid-column: 1 / -1; }
  .matricule-category-card { flex: none; width: 100%; min-width: 0; overflow: hidden; align-self: start; }
  .matricule-category-card .card-header { flex-direction: column; align-items: flex-start; }
  .matricule-category-card .card-title { width: 100%; flex-direction: column; align-items: flex-start; gap: .6rem; }
  .matricule-category-card .card-actions { width: 100%; justify-content: space-between; }
  .matricule-category-card .card-header,
  .matricule-category-card.blue .card-header, .matricule-category-card.yellow .card-header,
  .matricule-category-card.green .card-header, .matricule-category-card.red .card-header,
  .matricule-category-card.purple .card-header { border-left: 0; background: transparent; padding: .9rem; gap: .6rem; }
  .matricule-category-card .card-title { flex: 1; min-width: 0; gap: .75rem; font-size: .85rem; font-weight: 700; letter-spacing: -.01em; }
  .matricule-category-card .card-title-text { min-width: 0; line-height: 1.2; }
  .matricule-category-card .card-icon { width: 2.5rem; height: 2.5rem; border-radius: .9rem; flex-shrink: 0; align-items: center; justify-content: center; color: #fff; }
  .matricule-category-card.blue .card-icon { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
  .matricule-category-card.yellow .card-icon { background: linear-gradient(135deg, #eab308, #f59e0b); color: #1a1a2e; }
  .matricule-category-card.green .card-icon { background: linear-gradient(135deg, #22c55e, #14b8a6); }
  .matricule-category-card.red .card-icon { background: linear-gradient(135deg, #ef4444, #f43f5e); }
  .matricule-category-card.purple .card-icon { background: linear-gradient(135deg, #8b5cf6, #d946ef); }
  .matricule-category-card .card-badge { margin-left: 0; flex-shrink: 0; }
  .matricule-category-card .card-actions { gap: .5rem; flex-shrink: 0; color: #64748b; }
  .matricule-category-card .card-count { padding: .25rem .65rem; font-size: .68rem; font-weight: 700; background: #f4f6fa; color: #475569; }
  .matricule-category-card .card-dropdown { border-top: 1px solid #eef2f7; padding: .75rem .9rem .9rem; }
  .matricule-category-card .dropdown-item { border-radius: 1rem; background: #f6f8fb; border-color: transparent; }

  /* Saved reports */
  .saved-reports-section { background: transparent; border: 0; box-shadow: none; padding: 0; border-radius: 0; }
  .saved-reports-grid { grid-template-columns: 1fr; gap: .7rem; }
  .saved-report-card { padding: .9rem; }
  .saved-report-card:hover { transform: none; border-color: #e8edf4; }

  /* Chart cards: same shell */
  .dash-row .chart-card { border-color: #e8edf4; }

  /* modals -> bottom sheets */
  .modal-overlay, .report-modal-overlay, .edit-modal-overlay { align-items: flex-end; padding: 0; }
  .modal, .report-modal, .edit-modal-container, .client-detail-modal, .matricule-detail-modal {
    max-width: 100% !important; width: 100%; max-height: 92vh;
    border-radius: 24px 24px 0 0; animation: dashSheet .28s ease;
  }
  .report-modal-body, .edit-modal-body { padding: 1rem; }
  .report-modal-footer, .edit-modal-footer, .modal-actions-footer { flex-direction: column-reverse; padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); }
  .report-modal-footer .btn, .edit-modal-footer .btn, .modal-actions-footer .btn { width: 100%; justify-content: center; height: 44px; border-radius: 999px; }
  .report-controls { gap: .5rem; }
  .report-controls .btn { flex: 1 1 auto; justify-content: center; }
  .report-line-count { margin-left: 0; width: 100%; }

  /* report sheet on phones */
  .report-paper { padding: 14px !important; }
  .rp-head-row { flex-wrap: wrap; justify-content: center; }
  .rp-logo img { height: 52px; }
  .rp-big { font-size: 19px; }
  .rp-pill { width: 80%; font-size: 12px; }
  .report-paper .report-input { font-size: .75rem; padding: .4rem; }

  /* the hidden capture sheet must stay an A4 page */
  .rp-capture .report-paper { padding: 9mm 10mm 8mm !important; }
  .rp-capture .rp-head-row { flex-wrap: nowrap !important; }
  .rp-capture .rp-logo img { height: 68px; }
  .rp-capture .rp-big { font-size: 24px; }
  .rp-capture .rp-pill { width: 62%; font-size: 14px; }

  /* recent reservations: cards sit directly on the page, like AdminReservations */
  .rvr { padding: 0; margin-top: 1.25rem; background: transparent; border: 0; box-shadow: none; border-radius: 0; }
  .rvr-head { margin-bottom: .9rem; }
  .rvr-head-icon { width: 40px; height: 40px; border-radius: 12px; }
  .rvr-title { font-size: 1.05rem; }
  .rvr-cards { gap: 12px; }
  .rvr-card { border-radius: 14px; }
  .rvr-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; }
  .rvr-tile { flex-direction: column; gap: 4px; min-height: 52px; border: 1.5px solid var(--line); background: var(--surface); border-radius: 12px; text-decoration: none; }
  .rvr-tile span { font-size: .62rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; color: var(--tx); line-height: 1; }
  .rvr-tile.call { color: #0f8a43; }
  .rvr-tile.view { color: #0891b2; }
  .rvr-tile.solo { grid-column: 1 / -1; }
}
@media (max-width: 820px) and (prefers-color-scheme: dark) {
  .stat-card, .matricule-category-card, .saved-report-card { background: #1e293b; border-color: #334155; }
  .stat-chev, .matricule-category-card .card-count { background: #0f172a; color: #94a3b8; }
  .stat-label { color: #94a3b8; }
  .matricule-category-card .card-title { color: #f1f5f9; }
  .matricule-category-card .card-dropdown { border-top-color: #334155; }
  .matricule-category-card .dropdown-item { background: #0f172a; }
  .matricule-category-card .card-header, .matricule-category-card .card-header:hover { background: transparent; }
  .stats-section, .saved-reports-section { background: transparent; border: 0; }
}
@media (max-width: 420px) {
  .stats-grid, .kpi-row { gap: .55rem; }
  .filter-toolbar { grid-template-columns: 1fr 1fr; }
}
`;

const matModalCss = `
/* ===== Dropdown of the Gestion des Immatriculations cards ===== */
.matricule-category-card .dropdown-search { border-radius: .9rem; padding: .45rem .7rem; background: #f6f8fb; border: 1.5px solid #e8edf4; }
.matricule-category-card .dropdown-search:focus-within { background: #fff; border-color: #eab308; box-shadow: 0 0 0 4px rgba(234,179,8,.15); }
.matricule-category-card .dropdown-list { display: flex; flex-direction: column; gap: .6rem; }
.matricule-category-card .dropdown-item { display: flex; flex-direction: column; align-items: stretch; gap: .7rem; padding: .8rem; border-radius: 1rem; background: #f6f8fb; border: 1px solid transparent; }
.matricule-category-card .item-info { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem .5rem; width: 100%; }
.matricule-category-card .item-code { display: inline-flex; align-items: center; min-height: 2rem; padding: 0 .65rem 0 0; border: 2px solid #0a0a0a; border-radius: 8px; overflow: hidden; background: #fff; color: #0a0a0a; font-size: .88rem; font-weight: 900; letter-spacing: .1em; line-height: 1; font-variant-numeric: tabular-nums; }
.matricule-category-card .item-code::before { content: "MA"; align-self: stretch; display: flex; align-items: flex-end; margin-right: .55rem; padding: 6px 5px; background: #1da1e8; color: #fff; font-size: .5rem; font-weight: 900; letter-spacing: .06em; }
.matricule-category-card .item-car { flex: 1 1 auto; min-width: 0; font-size: .86rem; font-weight: 800; color: #0f172a; }
.matricule-category-card .item-km { padding: .2rem .65rem; border-radius: 999px; font-size: .66rem; font-weight: 700; }
.matricule-category-card .item-client { display: flex; flex-wrap: wrap; align-items: center; gap: .15rem .4rem; width: 100%; padding: .5rem .7rem; border-radius: .8rem; font-size: .75rem; font-weight: 700; }
.matricule-category-card .item-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: .45rem; align-items: stretch; width: 100%; }
.matricule-category-card .item-actions button,
.matricule-category-card .item-actions .extend-badge,
.matricule-category-card .item-actions .return-badge { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; min-height: 2.5rem; margin: 0; padding: 0 .6rem; border-radius: .8rem; font-size: .72rem; font-weight: 800; text-align: center; width: auto; }
.matricule-category-card .item-actions .btn-extend { font-size: .68rem; }
.matricule-category-card .item-actions .return-badge { grid-column: 1 / -1; }
.matricule-category-card .dropdown-footer .btn-show-more { width: 100%; padding: .65rem; border-radius: .8rem; background: #f4f6fa; font-weight: 800; }

/* ===== Gestion des Immatriculations: header looks like a stat card ===== */
.matricule-category-card .card-header,
.matricule-category-card.blue .card-header, .matricule-category-card.yellow .card-header,
.matricule-category-card.green .card-header, .matricule-category-card.red .card-header,
.matricule-category-card.purple .card-header { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; justify-content: flex-start; gap: .55rem;     padding: 1.2rem 1.35rem 1.2rem 1.5rem; background: transparent; }
.matricule-category-card .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: .9rem; }
.matricule-category-card .card-icon { width: 2rem; height: 2rem; border-radius: .7rem; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.matricule-category-card.blue .card-icon { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
.matricule-category-card.yellow .card-icon { background: linear-gradient(135deg, #eab308, #f59e0b); }
.matricule-category-card.green .card-icon { background: linear-gradient(135deg, #22c55e, #14b8a6); }
.matricule-category-card.red .card-icon { background: linear-gradient(135deg, #ef4444, #f43f5e); }
.matricule-category-card.purple .card-icon { background: linear-gradient(135deg, #8b5cf6, #d946ef); }
.matricule-category-card .card-chev { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 1.4rem; height: 1.4rem; border-radius: 999px; background: #f4f6fa; color: #475569; }
.matricule-category-card .card-value { flex-shrink: 0; font-size: 1.15rem; font-weight: 800; letter-spacing: -.03em; line-height: 1; color: #0f172a; }
.matricule-category-card .card-label { flex: 1; min-width: 0; margin: 0; font-size: .64rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; line-height: 1.2; color: #475569; }
.matricule-category-card .card-header:active { transform: scale(.99); }
@media (prefers-color-scheme: dark) {
  .matricule-category-card .card-chev { background: #0f172a; color: #94a3b8; }
  .matricule-category-card .card-value { color: #f1f5f9; }
  .matricule-category-card .card-label { color: #cbd5e1; }
  .matricule-category-card .card-header, .matricule-category-card .card-header:hover { background: transparent; }
}

/* ===== Reserve / Confirm / Terminer / Prolongation modals ===== */
.modal.mat-modal { padding: 0; border-radius: 1.5rem; background: #fff; border: 1px solid #e8edf4; box-shadow: 0 30px 70px -24px rgba(15,23,42,.5); }
/* the modal itself never scrolls (clean rounded border, like Prolongation); only the content inside does */
.modal.mat-modal { display: flex; flex-direction: column; overflow: hidden; }
.mat-modal .modal-header { position: relative; flex-shrink: 0; }
.mat-modal form, .mat-modal .mm-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.mat-modal .modal-actions-footer { flex-shrink: 0; }
.mat-modal .modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid #eef2f7; background: #fff; }
.mat-modal .modal-title { margin: 0; gap: .75rem; align-items: center; font-size: 1rem; font-weight: 800; letter-spacing: -.01em; }
.mat-modal .modal-close { width: 2.25rem; height: 2.25rem; border-radius: .8rem; background: #f4f6fa; color: #475569; }
.mm-icon { width: 2.5rem; height: 2.5rem; border-radius: .9rem; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.mm-gold { background: linear-gradient(135deg, #eab308, #f59e0b); box-shadow: 0 8px 20px -8px rgba(245,158,11,.6); }
.mm-green { background: linear-gradient(135deg, #22c55e, #14b8a6); }
.mm-blue { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
.mm-title-text { display: flex; flex-direction: column; align-items: flex-start; gap: .25rem; min-width: 0; }
.mm-title-text small { font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #64748b; }
.mm-plate { display: inline-flex; align-items: stretch; border: 2px solid #0a0a0a; border-radius: 8px; overflow: hidden; background: #fff; color: #0a0a0a; line-height: 1; }
.mm-plate i { display: flex; align-items: flex-end; padding: 6px 5px; background: #1da1e8; color: #fff; font-style: normal; font-size: .5rem; font-weight: 900; letter-spacing: .06em; }
.mm-plate em { padding: 6px 10px; font-style: normal; font-size: .9rem; font-weight: 900; letter-spacing: .1em; }

/* form layout: date + time side by side */
.mat-modal form { display: grid !important; grid-template-columns: 1fr 1fr; column-gap: .75rem; align-content: start; padding: 1.1rem 1.25rem 1.25rem !important; }
.mat-modal form > * { grid-column: 1 / -1; min-width: 0; }
.mat-modal form > .form-group:has(input[type="date"]),
.mat-modal form > .form-group:has(input[type="time"]) { grid-column: auto; }
.mat-modal .form-group { margin-bottom: .9rem; }
.mat-modal .form-group label { margin-bottom: .35rem; font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
.mat-modal .form-control { height: 2.75rem; padding: 0 .9rem; border: 1.5px solid #e8edf4; border-radius: .85rem; background: #f6f8fb; color: #0f172a; font-family: inherit; font-size: .9rem; font-weight: 600; }
.mat-modal textarea.form-control { height: auto; padding: .7rem .9rem; resize: vertical; }
.mat-modal .form-control:focus { border-color: #eab308; background: #fff; box-shadow: 0 0 0 4px rgba(234,179,8,.15); }
.mat-modal .form-control:disabled { background: #fef9c3 !important; border-color: #fde68a; color: #92400e; font-weight: 900; opacity: 1; }
.mat-modal .client-list-container { margin-top: .4rem !important; border: 1.5px solid #e8edf4 !important; border-radius: 1rem !important; background: #fff; }
.mat-modal .client-list-item { padding: .65rem .9rem !important; border-bottom: 1px solid #eef2f7 !important; font-size: .86rem; }
.mat-modal .client-list-item:last-child { border-bottom: 0 !important; }
.mat-modal .btn-outline[style*="width: 100%"] { height: 2.6rem; border-style: dashed; border-radius: .85rem; font-weight: 700; }
.mat-modal .form-group label.inline-checkbox { padding: .7rem .85rem; border: 1.5px solid #e8edf4; border-radius: 1rem; background: #f6f8fb; margin-bottom: 0; text-transform: none; letter-spacing: 0; font-size: .85rem; font-weight: 700; color: #0f172a; }
.mat-modal .inline-checkbox input { width: 1.1rem; height: 1.1rem; accent-color: #eab308; }

/* sticky footer */
.mat-modal .modal-footer, .mat-modal .modal-actions-footer { position: sticky; bottom: 0; z-index: 5; gap: .6rem; background: #fff; border-top: 1px solid #eef2f7 !important; }
.mat-modal form .modal-footer { margin: 1rem -1.25rem -1.25rem !important; padding: .85rem 1.25rem calc(.85rem + env(safe-area-inset-bottom, 0px)); }
.mat-modal .modal-footer .btn, .mat-modal .modal-actions-footer .btn { flex: 1; justify-content: center; height: 2.75rem; padding: 0 1.25rem; border-radius: 999px; font-weight: 700; }
.mat-modal .modal-footer .btn-primary, .mat-modal .modal-actions-footer .btn-primary { flex: 1.4; }

/* prolongation */
.mm-body { padding: 1.1rem 1.25rem 1.25rem; }
.mm-summary { display: flex; align-items: center; gap: .75rem; margin-bottom: 1.1rem; padding: .7rem .85rem; border-radius: 1rem; background: #f6f8fb; }
.mm-avatar { width: 2.25rem; height: 2.25rem; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: .75rem; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff; font-size: .8rem; font-weight: 800; }
.mm-summary b { display: block; font-size: .88rem; font-weight: 800; }
.mm-summary small { font-size: .72rem; color: #64748b; }
.mm-label { display: block; margin-bottom: .5rem; font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
.mm-stepper { display: grid; grid-template-columns: 3rem 1fr 3rem; gap: .5rem; align-items: center; }
.mm-stepper button { height: 3rem; display: flex; align-items: center; justify-content: center; border: 1.5px solid #e8edf4; border-radius: .9rem; background: #fff; color: #0f172a; font-size: 1.4rem; font-weight: 800; cursor: pointer; }
.mm-stepper button:active { transform: scale(.95); }
.mm-stepper input { width: 100%; min-width: 0; height: 3rem; border: 1.5px solid #e8edf4; border-radius: .9rem; background: #f6f8fb; color: #0f172a; text-align: center; font-family: inherit; font-size: 1.4rem; font-weight: 900; outline: none; -moz-appearance: textfield; }
.mm-stepper input::-webkit-outer-spin-button, .mm-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.mm-stepper input:focus { border-color: #eab308; background: #fff; box-shadow: 0 0 0 4px rgba(234,179,8,.15); }
.mm-chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .7rem; }
.mm-chip { padding: .35rem .8rem; border: 1.5px solid #e8edf4; border-radius: 999px; background: #fff; color: #0f172a; font-family: inherit; font-size: .75rem; font-weight: 800; cursor: pointer; }
.mm-chip.on { background: #eab308; border-color: #eab308; color: #1a1a2e; }
.mm-newdate { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-top: 1rem; padding: .7rem .85rem; border-radius: 1rem; background: #fef9c3; color: #92400e; font-size: .78rem; font-weight: 700; }
.mm-newdate b { font-size: .95rem; font-weight: 900; }

@media (max-width: 820px) {
  .modal.mat-modal { max-width: 100% !important; border-radius: 24px 24px 0 0; }
  .mat-modal .modal-header { padding-top: 1.25rem; }
  .mat-modal .modal-header::before { content: ""; position: absolute; top: 7px; left: 50%; width: 38px; height: 4px; border-radius: 4px; background: #cbd5e1; transform: translateX(-50%); }
  .mat-modal .modal-actions-footer { flex-direction: row !important; }
  .mat-modal .modal-actions-footer .btn { width: auto !important; }
}

@media (prefers-color-scheme: dark) {
  .matricule-category-card .dropdown-search, .matricule-category-card .dropdown-footer .btn-show-more { background: #0f172a; border-color: #334155; }
  .matricule-category-card .dropdown-search:focus-within { background: #1e293b; }
  .matricule-category-card .item-car { color: #f1f5f9; }
  .matricule-category-card .item-code { background: #fff; color: #0a0a0a; }
  .modal.mat-modal { background: #1e293b; border-color: #334155; }
  .mat-modal .modal-header, .mat-modal .modal-footer, .mat-modal .modal-actions-footer { background: #1e293b; border-color: #334155 !important; }
  .mat-modal .modal-title { color: #f1f5f9; }
  .mat-modal .form-control, .mat-modal .form-group label.inline-checkbox, .mm-summary, .mm-stepper input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
  .mat-modal .form-control:focus, .mm-stepper input:focus { background: #0f172a; }
  .mat-modal .form-control:disabled { background: rgba(234,179,8,.14) !important; border-color: rgba(234,179,8,.4); color: #fde68a; }
  .mat-modal .client-list-container { background: #0f172a; border-color: #334155 !important; }
  .mat-modal .client-list-item { border-bottom-color: #334155 !important; color: #f1f5f9; }
  .mm-stepper button, .mm-chip { background: #0f172a; border-color: #334155; color: #f1f5f9; }
  .mm-chip.on { background: #eab308; border-color: #eab308; color: #1a1a2e; }
  .mm-summary b, .mm-summary small, .mm-title-text small, .mm-label { color: #cbd5e1; }
  .mm-newdate { background: rgba(234,179,8,.14); color: #fde68a; }
  .mat-modal .modal-header::before { background: #475569; }
}
`;

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cars = useSelector(selectCars);
  const carsLoading = useSelector(selectCarsLoading);
  const reservations = useSelector(selectReservations);
  const reservationsLoading = useSelector(selectReservationsLoading);
  const clients = useSelector(selectClients);
  const accidents = useSelector(selectAccidents);
  const matricules = useSelector(selectMatricules);
  const contacts = useSelector(selectContacts);
  const utilisateurs = useSelector(selectUtilisateurs);
  const currentUser = useSelector(selectUser);
  const isMobile = useMediaQuery("(max-width: 820px)");

  // NEW: Get permissions from Redux to check 'reports' access
  const myPermissions = useSelector((state) => state.permissions?.myPermissions || []);

  // Helper to check if user can view reports
  const canViewReports = () => {
    const userRole = currentUser?.role;
    // Superadmin always has access
    if (userRole === 'superadmin') return true;
    // Admin might have default access? We'll use the permission system.
    // If you want admins to always see reports, uncomment the next line:
    // if (userRole === 'admin') return true;
    // Otherwise, check if the user has a 'reports' permission
    if (Array.isArray(myPermissions)) {
      // myPermissions can be array of strings or objects with page_slug
      const hasPerm = myPermissions.some(p => p === 'reports' || p?.page_slug === 'reports');
      return hasPerm;
    }
    return false;
  };

  // Report state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [refreshReports, setRefreshReports] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMatricule, setSelectedMatricule] = useState(null);
  const [searchType, setSearchType] = useState("all");

  // Chart state
  const [byStatus, setByStatus] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [topCars, setTopCars] = useState([]);

  // Manual contract modal state
  const [manualContractOpen, setManualContractOpen] = useState(false);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [contractSignatures, setContractSignatures] = useState({
    agent: "",
    locataire: "",
    secondConducteur: "",
  });
  const [contractPaperwork, setContractPaperwork] = useState({
    circulation: false,
    carteGrise: false,
    assurance: false,
    vignette: false,
    visiteTechnique: false,
    autorisation: false,
  });
  const [contractDisplayOptions, setContractDisplayOptions] = useState({
    prices: "show",
    clientInfo: "show",
    secondDriver: "show",
    vehicleInfo: "show",
    rentalDates: "show",
    kilometrage: "show",
    rentalDays: "show",
    observations: "show",
    insurance: "show",
    depositGuarantee: "show",
    signatures: "show",
  });
  const [manualFormData, setManualFormData] = useState({
    client_nom: "",
    client_prenom: "",
    client_date_naissance: "",
    client_lieu_naissance: "",
    client_cin: "",
    client_cin_expiry: "",
    client_permis: "",
    client_permis_expiry: "",
    client_address: "",
    client_phone: "",
    client_email: "",
    has_second_driver: false,
    second_driver_nom: "",
    second_driver_prenom: "",
    second_driver_date_naissance: "",
    second_driver_lieu_naissance: "",
    second_driver_cin: "",
    second_driver_permis: "",
    second_driver_phone: "",
    car_matricule: "",
    car_brand: "",
    car_model: "",
    car_color: "",
    car_year: "",
    car_fuel: "",
    car_transmission: "",
    car_seats: "",
    car_doors: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    start_time: "08:00",
    end_time: "18:00",
    kilometrage_depart: "",
    kilometrage_retour: "",
    price_per_day: "",
    total_price: "",
    amount_paid: "",
    notes: "",
  });

  // Matricule category state
  const [expandedCategories, setExpandedCategories] = useState({
    disponibles: false,
    enAttente: false,
    retourImminent: false,
    enRetard: false,
    enPanne: false,
  });
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedMatriculeForReserve, setSelectedMatriculeForReserve] = useState(null);
  const [reserving, setReserving] = useState(false);

  // Direct Confirm state
  const [confirmDirectModalOpen, setConfirmDirectModalOpen] = useState(false);
  const [selectedMatriculeForDirectConfirm, setSelectedMatriculeForDirectConfirm] = useState(null);

  // === État pour le modal de terminaison ===
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [prolongationModal, setProlongationModal] = useState({
  isOpen: false,
  reservation: null,
  days: 1,
});
  const [completeReservationId, setCompleteReservationId] = useState(null);
  const [kilometrageRetour, setKilometrageRetour] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [completing, setCompleting] = useState(false);
  const [originalRentalDays, setOriginalRentalDays] = useState(null);
  // Filter state
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
useEffect(() => {
  const loadData = async () => {
    await Promise.all([
      dispatch(fetchClients()),
      dispatch(fetchReservations()),
      dispatch(fetchAccidents()),
      dispatch(fetchCars()),
      dispatch(fetchMatricules()),
      dispatch(fetchContacts()),
      dispatch(fetchUtilisateurs())
    ]);
  };
  loadData();
}, [dispatch]);
  const monthOptions = [
    { value: "all", label: "Tous" },
    { value: 'janvier', label: 'Janvier' },
    { value: 'février', label: 'Février' },
    { value: 'mars', label: 'Mars' },
    { value: 'avril', label: 'Avril' },
    { value: 'mai', label: 'Mai' },
    { value: 'juin', label: 'Juin' },
    { value: 'juillet', label: 'Juillet' },
    { value: 'août', label: 'Août' },
    { value: 'septembre', label: 'Septembre' },
    { value: 'octobre', label: 'Octobre' },
    { value: 'novembre', label: 'Novembre' },
    { value: 'décembre', label: 'Décembre' },
  ];
  const currentYear = new Date().getFullYear();
const yearOptions = useMemo(() => {
  const years = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push({ value: String(y), label: String(y) });
  }
  return [{ value: "all", label: "Tous" }, ...years];
}, []);
  const periodOptions = [
    { value: 'all', label: 'Tous les jours' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  // Filtered reservations
  const filteredReservations = useMemo(() => {
  let filtered = reservations;

  const monthMap = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11
  };

  // Month & Year filters
  if (selectedMonth !== "all" && selectedYear !== "all") {
    const monthNum = monthMap[selectedMonth.toLowerCase()];
    if (monthNum !== undefined) {
      filtered = filtered.filter(r => {
        const d = new Date(r.start_date);
        return d.getMonth() === monthNum && d.getFullYear() === parseInt(selectedYear);
      });
    }
  } else if (selectedMonth !== "all") {
    const monthNum = monthMap[selectedMonth.toLowerCase()];
    if (monthNum !== undefined) {
      filtered = filtered.filter(r => new Date(r.start_date).getMonth() === monthNum);
    }
  } else if (selectedYear !== "all") {
    filtered = filtered.filter(r => new Date(r.start_date).getFullYear() === parseInt(selectedYear));
  }

  // Period filter
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (selectedPeriod === 'today') {
    filtered = filtered.filter(r => {
      const d = new Date(r.start_date);
      return d >= today && d < new Date(today.getTime() + 86400000);
    });
  } else if (selectedPeriod === 'week') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    filtered = filtered.filter(r => new Date(r.start_date) >= startOfWeek);
  } else if (selectedPeriod === 'month') {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    filtered = filtered.filter(r => new Date(r.start_date) >= startOfMonth);
  }

  return filtered;
}, [reservations, selectedMonth, selectedYear, selectedPeriod]);

  const totalReservations = filteredReservations.length;
  const reservationsEnAttente = filteredReservations.filter((r) => r.status === "pending").length;
  const reservationsConfirmees = filteredReservations.filter((r) => r.status === "confirmed").length;
  const reservationsTerminees = filteredReservations.filter((r) => r.status === "completed").length;
  const reservationsContactees = filteredReservations.filter((r) => r.status === "contacted").length;
  const reservationsAnnulees = filteredReservations.filter((r) => r.status === "cancelled").length;
  const reservationsEnRetard = filteredReservations.filter((r) => r.status === "retard").length;
  const revenue = filteredReservations
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((sum, r) => sum + Number(r.total_price || 0), 0);

  const filteredByStatus = useMemo(() => {
    const statusMap = {};
    filteredReservations.forEach((res) => {
      const displayName =
        res.status === "retard"
          ? "En retard"
          : res.status === "pending"
          ? "En attente"
          : res.status === "confirmed"
          ? "Confirmé"
          : res.status === "contacted"
          ? "Contacté"
          : res.status === "completed"
          ? "Terminé"
          : res.status === "cancelled"
          ? "Annulé"
          : res.status;
      statusMap[displayName] = (statusMap[displayName] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [filteredReservations]);

  const filteredByMonth = useMemo(() => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Map French month names to 0–11
  const monthMap = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11
  };

  const filterYear = selectedYear !== "all" ? parseInt(selectedYear) : null;
  const filterMonth = selectedMonth !== "all" ? monthMap[selectedMonth.toLowerCase()] : null;

  // ─── DAILY VIEW (when a specific month is selected) ────────────────────────
  if (filterMonth !== null) {
    const targetYear = filterYear !== null ? filterYear : currentYear;
    const daysInMonth = new Date(targetYear, filterMonth + 1, 0).getDate();
    const dailyMap = {};

    // Fill every day of the month
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = {
        month: String(d),          // X‑axis labels: 1, 2, 3, …
        reservations: 0,
        revenue: 0,
      };
    }

    // Count reservations that fall on each day (only for the selected month/year)
    filteredReservations.forEach((res) => {
      const d = new Date(res.start_date);
      if (d.getMonth() === filterMonth && d.getFullYear() === targetYear) {
        const dayNum = d.getDate();
        if (dailyMap[dayNum]) {
          dailyMap[dayNum].reservations += 1;
          if (res.status === "confirmed" || res.status === "completed") {
            dailyMap[dayNum].revenue += Number(res.total_price || 0);
          }
        }
      }
    });

    return Object.values(dailyMap);
  }

  // ─── MONTHLY VIEW (when no specific month is selected) ─────────────────────
  let startYear, startMonth, endYear, endMonth;

  if (filterYear !== null) {
    // Only a year selected → show all 12 months of that year
    startYear = filterYear;
    startMonth = 0;
    endYear = filterYear;
    endMonth = 11;
  } else {
    // No filter → last 6 months from today
    startYear = currentYear;
    startMonth = currentMonth - 5;
    endYear = currentYear;
    endMonth = currentMonth;
    if (startMonth < 0) {
      startMonth += 12;
      startYear -= 1;
    }
  }

  const months = {};
  let d = new Date(startYear, startMonth, 1);
  while (d.getFullYear() < endYear || (d.getFullYear() === endYear && d.getMonth() <= endMonth)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = {
      month: d.toLocaleDateString("fr-FR", { month: "short" }), // e.g. "janv."
      reservations: 0,
      revenue: 0,
    };
    d.setMonth(d.getMonth() + 1);
  }

  filteredReservations.forEach((res) => {
    const d = new Date(res.start_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) {
      months[key].reservations += 1;
      if (res.status === "confirmed" || res.status === "completed") {
        months[key].revenue += Number(res.total_price || 0);
      }
    }
  });

  return Object.values(months);
}, [filteredReservations, selectedMonth, selectedYear, selectedPeriod]);

  const filteredTopCars = useMemo(() => {
    const carMap = {};
    filteredReservations.forEach((res) => {
      const carName =
        res.cars?.brand && res.cars?.model
          ? `${res.cars.brand} ${res.cars.model}`
          : res.car_name || "Voiture";
      carMap[carName] = (carMap[carName] || 0) + 1;
    });
    return Object.entries(carMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredReservations]);

  useEffect(() => {
    setByStatus(filteredByStatus);
    setByMonth(filteredByMonth);
    setTopCars(filteredTopCars);
  }, [filteredByStatus, filteredByMonth, filteredTopCars]);

  // Manual contract auto-calc
  useEffect(() => {
    if (manualFormData.price_per_day && manualFormData.start_date && manualFormData.end_date) {
      const start = new Date(manualFormData.start_date);
      const end = new Date(manualFormData.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const total = (manualFormData.price_per_day || 0) * days;
      setManualFormData((prev) => ({ ...prev, total_price: total }));
    }
  }, [manualFormData.price_per_day, manualFormData.start_date, manualFormData.end_date]);

  // Search
  const performSearch = useCallback(
    async (query, type) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      setTimeout(() => {
        const results = [];
        const lowerQuery = query.toLowerCase();
        if (type === "all" || type === "client") {
          clients.forEach((client) => {
            const fullName = `${client.prenom} ${client.nom}`.toLowerCase();
            const phoneMatch = client.telephone?.toLowerCase().includes(lowerQuery);
            const emailMatch = client.email?.toLowerCase().includes(lowerQuery);
            const cinMatch = client.cin_number?.toLowerCase().includes(lowerQuery);
            if (fullName.includes(lowerQuery) || phoneMatch || emailMatch || cinMatch) {
              results.push({
                id: client.id,
                type: "client",
                title: `${client.prenom} ${client.nom}`,
                subtitle: `${client.telephone} | ${client.email || "Pas d'email"}`,
                data: client,
              });
            }
          });
        }
        if (type === "all" || type === "matricule") {
          matricules.forEach((matricule) => {
            if (matricule.matricule_code?.toLowerCase().includes(lowerQuery)) {
              const currentRes = reservations.find(
                (r) =>
                  r.matricule_id === matricule.id &&
                  (r.status === "confirmed" || r.status === "retard")
              );
              results.push({
                id: matricule.id,
                type: "matricule",
                title: matricule.matricule_code,
                subtitle: `${matricule.car?.brand} ${matricule.car?.model} | ${matricule.kilometrage?.toLocaleString()} km`,
                data: matricule,
                currentReservation: currentRes,
              });
            }
          });
        }
        if (type === "all" || type === "reservation") {
          reservations.forEach((reservation) => {
            const clientName = `${reservation.client?.prenom} ${reservation.client?.nom}`.toLowerCase();
            if (clientName.includes(lowerQuery) || `#${reservation.id}`.includes(lowerQuery)) {
              results.push({
                id: reservation.id,
                type: "reservation",
                title: `Réservation #${reservation.id}`,
                subtitle: `${reservation.client?.prenom} ${reservation.client?.nom} | ${reservation.start_date} → ${reservation.end_date}`,
                data: reservation,
              });
            }
          });
        }
        if (type === "all" || type === "accident") {
          accidents.forEach((accident) => {
            const clientName = `${accident.client?.prenom} ${accident.client?.nom}`.toLowerCase();
            if (
              clientName.includes(lowerQuery) ||
              accident.matricule?.matricule_code?.toLowerCase().includes(lowerQuery)
            ) {
              results.push({
                id: accident.id,
                type: "accident",
                title: `Accident du ${accident.date_accident}`,
                subtitle: `${accident.client?.prenom} ${accident.client?.nom} | ${accident.matricule?.matricule_code}`,
                data: accident,
              });
            }
          });
        }
        setSearchResults(results);
        setSearchLoading(false);
      }, 300);
    },
    [clients, matricules, reservations, accidents]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery, searchType);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchType, performSearch]);

  const handleSelectResult = (result) => {
    setSearchQuery("");
    setSearchResults([]);
    if (result.type === "client") {
      setSelectedClient(result.data);
    } else if (result.type === "matricule") {
      setSelectedMatricule({
        ...result.data,
        currentReservation: result.currentReservation,
      });
    } else if (result.type === "reservation") {
      navigate("/reservations");
      setTimeout(() => {
        const event = new CustomEvent("focusReservation", { detail: { id: result.data.id } });
        window.dispatchEvent(event);
      }, 100);
    } else if (result.type === "accident") {
      navigate("/accidents");
      setTimeout(() => {
        const event = new CustomEvent("focusAccident", { detail: { id: result.data.id } });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  // Manual Contract PDF generation
 // ==================== Génération du PDF du contrat manuel ====================
const generateManualContractPDF = async () => {
  try {
    toast.loading("Génération du contrat en cours...", { id: "contract-pdf" });

    // Récupérer l'élément du contrat (caché)
    const contractElement = document.getElementById("manual-contract-print");
    if (!contractElement) {
      toast.error("Élément du contrat non trouvé", { id: "contract-pdf" });
      return;
    }

    // Cloner le contrat pour modifications
    const contractClone = contractElement.cloneNode(true);

    // ---- Ajustements pour réduire la taille et tenir sur une page A4 ----
    contractClone.style.width = "180mm";          // Réduction de la largeur
    contractClone.style.height = "auto";
    contractClone.style.padding = "6px";
    contractClone.style.margin = "0";
    contractClone.style.boxSizing = "border-box";
    contractClone.style.backgroundColor = "white";
    contractClone.style.fontSize = "9px";
    contractClone.style.lineHeight = "1.3";

    // Réduction des marges des sections
    contractClone.querySelectorAll('.contract-section').forEach(s => {
      s.style.marginBottom = "3px";
      const content = s.querySelector('.section-content');
      if (content) content.style.padding = "3px 6px";
    });

    // Réduction des titres de section
    contractClone.querySelectorAll('.section-title-print').forEach(t => {
      t.style.padding = "3px 8px";
      t.style.fontSize = "8px";
    });

    // Réduction des champs
    contractClone.querySelectorAll('.field-row').forEach(row => {
      row.style.fontSize = "8px";
      row.style.marginBottom = "1px";
    });
    contractClone.querySelectorAll('.field-label').forEach(label => {
      label.style.width = "70px";
      label.style.fontSize = "8px";
    });

    // Logo et en-tête plus petits
    const logo = contractClone.querySelector('.contract-logo-print');
    if (logo) logo.style.height = "45px";
    const companyName = contractClone.querySelector('.company-name');
    if (companyName) companyName.style.fontSize = "15px";
    const companySlogan = contractClone.querySelector('.company-slogan');
    if (companySlogan) companySlogan.style.fontSize = "7px";
    const companyPhone = contractClone.querySelector('.company-phone');
    if (companyPhone) companyPhone.style.fontSize = "7px";
    const contractTitle = contractClone.querySelector('.contract-title-print');
    if (contractTitle) {
      contractTitle.style.fontSize = "13px";
      contractTitle.style.marginBottom = "4px";
      contractTitle.style.paddingBottom = "3px";
    }

    // Réduction des blocs de signature
    contractClone.querySelectorAll('.signature-box').forEach(box => {
      box.style.height = "30px";
    });
    contractClone.querySelectorAll('.signature-label').forEach(label => {
      label.style.fontSize = "7px";
      label.style.marginBottom = "2px";
    });

    // Observations
    contractClone.querySelectorAll('.observation-box').forEach(box => {
      const content = box.querySelector('.observation-content');
      if (content) {
        content.style.padding = "3px 6px";
        content.style.fontSize = "7px";
        content.style.minHeight = "20px";
      }
      const title = box.querySelector('.obs-title');
      if (title) {
        title.style.padding = "3px 8px";
        title.style.fontSize = "7px";
      }
    });

    // Clause kilométrage
    const clause = contractClone.querySelector('.kilometrage-clause-section');
    if (clause) {
      clause.style.padding = "4px 10px";
      clause.style.margin = "4px 0";
      const title = clause.querySelector('.kilometrage-clause-title');
      if (title) title.style.fontSize = "8px";
      const text = clause.querySelector('.kilometrage-clause-text');
      if (text) text.style.fontSize = "7px";
    }

    // Pied de page
    const footer = contractClone.querySelector('.contract-footer-print');
    if (footer) {
      footer.style.fontSize = "6px";
      footer.style.paddingTop = "3px";
      footer.style.marginTop = "3px";
    }

    // Documents
    contractClone.querySelectorAll('.doc-item').forEach(item => {
      item.style.fontSize = "7px";
      item.style.padding = "2px 5px";
    });
    const docsRow = contractClone.querySelector('.documents-row');
    if (docsRow) {
      docsRow.style.padding = "3px 6px";
      docsRow.style.gap = "4px";
    }

    // Numéro de contrat
    const numBox = contractClone.querySelector('.contract-number-box');
    if (numBox) {
      numBox.style.padding = "2px 6px";
      const value = numBox.querySelector('.contract-number-value');
      if (value) value.style.fontSize = "15px";
      const label = numBox.querySelector('.contract-number-label');
      if (label) label.style.fontSize = "6px";
    }

    // ---- Préparation du canvas ----
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "0";
    tempContainer.style.width = "180mm";
    tempContainer.style.height = "auto";
    tempContainer.style.background = "white";
    tempContainer.appendChild(contractClone);
    document.body.appendChild(tempContainer);

    // Attendre le chargement des images
    const images = contractClone.querySelectorAll("img");
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    }));
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capturer
    const canvas = await html2canvas(contractClone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: contractClone.scrollWidth,
      height: contractClone.scrollHeight,
      windowWidth: contractClone.scrollWidth,
      windowHeight: contractClone.scrollHeight
    });

    document.body.removeChild(tempContainer);

    // ---- Génération du PDF ----
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const imgData = canvas.toDataURL('image/png');
    // On réduit la largeur de l'image pour laisser des marges
    const imgWidth = pageWidth - 16; // 8mm de chaque côté
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Si l'image est trop haute, on la redimensionne pour tenir dans la page
    if (imgHeight > pageHeight - 16) {
      const scale = (pageHeight - 16) / imgHeight;
      imgHeight = pageHeight - 16;
      // On ajuste la largeur en conséquence pour garder les proportions
      // mais on laisse la largeur constante (on peut aussi recalculer)
    }

    // Centrage vertical
    const xOffset = (pageWidth - imgWidth) / 2;
    const yOffset = (pageHeight - imgHeight) / 2;

    doc.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

    const filename = `contrat-manuel-${new Date().toISOString().split("T")[0]}.pdf`;
    downloadAndOpenPDF(doc, filename);
    toast.success("Contrat généré avec succès!", { id: "contract-pdf" });
  } catch (error) {
    console.error("Erreur de génération du contrat:", error);
    toast.error("Erreur lors de la génération du contrat", { id: "contract-pdf" });
  }
};

  const handleDisplayOptionChange = (section, value) => {
    setContractDisplayOptions(prev => ({ ...prev, [section]: value }));
  };

  const handleResetAllOptions = () => {
    setContractDisplayOptions({
      prices: "show",
      clientInfo: "show",
      secondDriver: "show",
      vehicleInfo: "show",
      rentalDates: "show",
      kilometrage: "show",
      rentalDays: "show",
      observations: "show",
      insurance: "show",
      depositGuarantee: "show",
      signatures: "show"
    });
  };

  const handleManualFormChange = (field, value) => {
    setManualFormData(prev => ({ ...prev, [field]: value }));
  };

  // Navigation handlers
  const navigateToCars = (filter) => {
    navigate("/cars");
    setTimeout(() => {
      if (filter === "disponible") {
        const event = new CustomEvent("filterCars", { detail: { status: "disponible" } });
        window.dispatchEvent(event);
      } else if (filter === "non disponible") {
        const event = new CustomEvent("filterCars", { detail: { status: "non disponible" } });
        window.dispatchEvent(event);
      }
    }, 100);
  };

  const navigateToReservations = (status) => {
    navigate("/reservations");
    setTimeout(() => {
      const event = new CustomEvent("filterReservations", { detail: { status } });
      window.dispatchEvent(event);
    }, 100);
  };

  const navigateToMatricules = (filter) => {
    navigate("/matricules");
    setTimeout(() => {
      if (filter === "active") {
        const event = new CustomEvent("filterMatricules", { detail: { status: "active" } });
        window.dispatchEvent(event);
      } else if (filter === "inactive") {
        const event = new CustomEvent("filterMatricules", { detail: { status: "inactive" } });
        window.dispatchEvent(event);
      } else if (filter === "reserved") {
        const event = new CustomEvent("filterMatricules", { detail: { reserved: true } });
        window.dispatchEvent(event);
      } else if (filter === "late") {
        const event = new CustomEvent("filterMatricules", { detail: { late: true } });
        window.dispatchEvent(event);
      }
    }, 100);
  };

  const navigateToAccidents = () => navigate("/accidents");
  const navigateToClients = () => navigate("/clients");
  const navigateToUtilisateurs = () => navigate("/users");
  const navigateToContacts = () => navigate("/contacts");

  // Statistics
  const totalCars = cars.length;
  const disponibles = cars.filter((c) => c.status === "disponible").length;
  const indisponibles = cars.filter((c) => c.status === "non disponible").length;
  const utilisateursActifs = utilisateurs.filter((u) => u.status === "active").length;
  const matriculesActifs = matricules.filter((m) => m.status === "active").length;
  const matriculesInactifs = matricules.filter((m) => m.status === "inactive").length;
  const matriculesReserves = reservations.filter(
    (r) => r.status === "confirmed" && r.matricule_id
  ).length;
  const totalAccidents = accidents.length;
  const accidentsEnAttente = accidents.filter((a) => a.status === "pending").length;
  const visitesTechniques = matricules.filter((m) => {
    if (!m.visit_tech) return false;
    const visitDate = new Date(m.visit_tech);
    const today = new Date();
    const diffDays = Math.ceil((visitDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  }).length;
  const vidangesNeeded = matricules.filter((m) => m.vidange_status === "not done").length;
  const totalContacts = contacts.length;
  const totalClients = clients.length;

  // Matricule category computations
  const activeReservationMatriculeIds = reservations
    .filter(r => r.status === 'pending' || r.status === 'confirmed' || r.status === 'retard')
    .map(r => r.matricule_id)
    .filter(Boolean);

  const openAccidentMatriculeIds = accidents
    .filter(a => a.status !== 'closed')
    .map(a => a.matricule_id)
    .filter(Boolean);

  const disponiblesMatricules = matricules.filter(m =>
    m.status === 'active' &&
    !activeReservationMatriculeIds.includes(m.id) &&
    !openAccidentMatriculeIds.includes(m.id)
  );

  const pendingReservationIds = reservations
    .filter(r => r.status === 'pending')
    .map(r => r.matricule_id)
    .filter(Boolean);
  const enAttenteMatricules = matricules.filter(m => pendingReservationIds.includes(m.id));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  const retourImminentReservationIds = reservations
    .filter(r => {
      if (r.status !== 'confirmed') return false;
      const endDate = new Date(r.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today && endDate <= threeDaysLater;
    })
    .map(r => r.matricule_id)
    .filter(Boolean);
  const retourImminentMatricules = matricules.filter(m => retourImminentReservationIds.includes(m.id));

  const retardReservationIds = reservations
    .filter(r => r.status === 'retard')
    .map(r => r.matricule_id)
    .filter(Boolean);
  const enRetardMatricules = matricules.filter(m => retardReservationIds.includes(m.id));

  const enPanneMatricules = matricules.filter(m => openAccidentMatriculeIds.includes(m.id));

  const enrichWithReservation = (matList) => {
    return matList.map(m => {
      const res = reservations.find(r => r.matricule_id === m.id && (r.status === 'confirmed' || r.status === 'retard' || r.status === 'pending'));
      return { ...m, currentReservation: res || null };
    });
  };

  const disponiblesWithRes = enrichWithReservation(disponiblesMatricules);
  const enAttenteWithRes = enrichWithReservation(enAttenteMatricules);
  const retourImminentWithRes = enrichWithReservation(retourImminentMatricules);
  const enRetardWithRes = enrichWithReservation(enRetardMatricules);
  const enPanneWithRes = enrichWithReservation(enPanneMatricules);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleReserveClick = (matricule) => {
    setSelectedMatriculeForReserve(matricule);
    setReserveModalOpen(true);
  };

  const handleDirectConfirm = (matricule) => {
    setSelectedMatriculeForDirectConfirm(matricule);
    setConfirmDirectModalOpen(true);
  };

  const handleDirectConfirmReservation = async (data) => {
  setReserving(true);
  try {
    const result = await dispatch(createReservation(data)).unwrap();
    const reservation = result.reservation || result.data || result;
    toast.success('Réservation confirmée avec succès');
    dispatch(refreshMatricules());
    dispatch(fetchReservations(true));
    setConfirmDirectModalOpen(false);
    navigate('/reservations', { state: { contractReservation: reservation } });
  } catch (error) {
    toast.error('Erreur lors de la création de la réservation');
    console.error(error);
  } finally {
    setReserving(false);
  }
};

  const handleConfirmPending = async (reservation) => {
  try {
    const now = new Date();
    const result = await dispatch(updateReservation({
      id: reservation.id,
      data: {
        status: 'confirmed',
        start_time: now.toTimeString().slice(0, 5),   // heure actuelle
        total_price: reservation.total_price,         // on renvoie le prix
      }
    })).unwrap();
    toast.success(`Réservation #${reservation.id} confirmée`);
    dispatch(refreshMatricules());
    dispatch(fetchReservations(true));
    navigate('/reservations', { state: { contractReservation: result.reservation || result } });
  } catch (error) {
    toast.error('Erreur lors de la confirmation');
    console.error(error);
  }
};

  const handleConfirmReservation = async (data) => {
  try {
    setReserving(true);
    const result = await dispatch(createReservation(data)).unwrap();
    toast.success('Réservation créée avec succès (en attente)');
    dispatch(refreshMatricules());
    dispatch(fetchReservations(true));
    setReserveModalOpen(false);
  } catch (error) {
    toast.error('Erreur lors de la création de la réservation');
    console.error(error);
  } finally {
    setReserving(false);
  }
};

  const handleCancelPending = async (reservation) => {
    try {
      await dispatch(updateReservation({
        id: reservation.id,
        data: { status: 'cancelled' }
      })).unwrap();
      toast.success(`Réservation #${reservation.id} annulée`);
      dispatch(refreshMatricules());
      dispatch(fetchReservations(true));
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
      console.error(error);
    }
  };
const handleToggleExtend = (reservation) => {
  setProlongationModal({
    isOpen: true,
    reservation,
    days: 1,
  });
};
  // === Fonctions pour la terminaison ===
  const handleComplete = (reservation) => {
  setCompleteReservationId(reservation.id);
  setOriginalRentalDays(reservation.rental_days); // 👈 sauvegarde des jours d'origine
  const kmRetour = reservation.kilometrage_entree || reservation.matricule?.kilometrage || '';
  setKilometrageRetour(kmRetour);
  const now = new Date();
  setReturnDate(now.toISOString().split('T')[0]);
  setReturnTime(now.toTimeString().slice(0, 5));
  setCompleteModalOpen(true);
};

  const confirmComplete = async () => {
  if (!kilometrageRetour || isNaN(kilometrageRetour) || parseFloat(kilometrageRetour) < 0) {
    toast.error("Veuillez entrer un kilométrage retour valide.");
    return;
  }
  setCompleting(true);
  try {
    await dispatch(updateReservation({
      id: completeReservationId,
      data: {
        status: 'completed',
        end_date: returnDate,
        end_time: returnTime,
        kilometrage_entree: parseFloat(kilometrageRetour),
        rental_days: originalRentalDays, // 👈 envoi des jours d'origine
      }
    })).unwrap();
    toast.success("Réservation terminée avec succès !");
  } catch (error) {
    toast.error(error.message || "Erreur lors de la terminaison");
  } finally {
    setCompleting(false);
    setCompleteModalOpen(false);
    setCompleteReservationId(null);
    setOriginalRentalDays(null);
    setKilometrageRetour('');
    setReturnDate('');
    setReturnTime('');
  }
};

  if (carsLoading || reservationsLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  // Render contract manual form if open
  if (manualContractOpen) {
    return (
      <div className="inline-form-container">
        <div className="inline-form-header">
          <div className="inline-form-icon">
            <FileText size={28} />
          </div>
          <div className="inline-form-title">
            <h2>Contrat de location manuel</h2>
            <p>Remplissez tous les champs pour générer un contrat PDF</p>
          </div>
          <button onClick={() => setManualContractOpen(false)} className="inline-form-close">
            <X size={24} />
          </button>
        </div>

        <div className="inline-form">
          <div style={{ marginBottom: "1.5rem", textAlign: "right" }}>
            <button
              onClick={() => setShowDisplayOptions(!showDisplayOptions)}
              className="inline-secondary-btn"
              style={{ background: "transparent", borderColor: "#eab308" }}
            >
              <Settings size={16} />
              {showDisplayOptions ? "Masquer" : "Afficher"} les options d'affichage
            </button>
          </div>

          {showDisplayOptions && (
            <ContractDisplayOptions
              options={contractDisplayOptions}
              onOptionChange={handleDisplayOptionChange}
              onResetAll={handleResetAllOptions}
            />
          )}

          <div className="inline-section">
            <div className="inline-section-header">
              <FileText size={18} />
              <h3>Signatures</h3>
            </div>
            <div className="inline-grid-2">
              <div className="inline-field">
                <label>Signature Agent</label>
                <input
                  type="text"
                  className="inline-input"
                  value={contractSignatures.agent}
                  onChange={(e) => setContractSignatures(prev => ({ ...prev, agent: e.target.value }))}
                  placeholder="Nom de l'agent"
                />
              </div>
              <div className="inline-field">
                <label>Signature Locataire</label>
                <input
                  type="text"
                  className="inline-input"
                  value={contractSignatures.locataire}
                  onChange={(e) => setContractSignatures(prev => ({ ...prev, locataire: e.target.value }))}
                  placeholder="Nom du locataire"
                />
              </div>
              <div className="inline-field">
                <label>Deuxième Conducteur</label>
                <input
                  type="text"
                  className="inline-input"
                  value={contractSignatures.secondConducteur}
                  onChange={(e) => setContractSignatures(prev => ({ ...prev, secondConducteur: e.target.value }))}
                  placeholder="Nom du conducteur"
                />
              </div>
            </div>
          </div>

          <div className="inline-section">
            <div className="inline-section-header">
              <CheckCircle2 size={18} />
              <h3>Documents remis</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.carteGrise} onChange={() => setContractPaperwork(prev => ({ ...prev, carteGrise: !prev.carteGrise }))} /> Carte grise
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.assurance} onChange={() => setContractPaperwork(prev => ({ ...prev, assurance: !prev.assurance }))} /> Assurance
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.vignette} onChange={() => setContractPaperwork(prev => ({ ...prev, vignette: !prev.vignette }))} /> Vignette
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.visiteTechnique} onChange={() => setContractPaperwork(prev => ({ ...prev, visiteTechnique: !prev.visiteTechnique }))} /> Visite technique
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.autorisation} onChange={() => setContractPaperwork(prev => ({ ...prev, autorisation: !prev.autorisation }))} /> Autorisation
              </label>
            </div>
          </div>

          <div className="inline-form-grid">
            <div className="inline-form-col">
              <div className="inline-section">
                <div className="inline-section-header">
                  <User size={18} />
                  <h3>Informations du locataire</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Nom</label><input className="inline-input" value={manualFormData.client_nom} onChange={(e) => handleManualFormChange("client_nom", e.target.value)} /></div>
                  <div className="inline-field"><label>Prénom</label><input className="inline-input" value={manualFormData.client_prenom} onChange={(e) => handleManualFormChange("client_prenom", e.target.value)} /></div>
                  <div className="inline-field"><label>Date de naissance</label><input type="date" className="inline-input" value={manualFormData.client_date_naissance} onChange={(e) => handleManualFormChange("client_date_naissance", e.target.value)} /></div>
                  <div className="inline-field"><label>Lieu de naissance</label><input className="inline-input" value={manualFormData.client_lieu_naissance} onChange={(e) => handleManualFormChange("client_lieu_naissance", e.target.value)} /></div>
                  <div className="inline-field"><label>CIN</label><input className="inline-input" value={manualFormData.client_cin} onChange={(e) => handleManualFormChange("client_cin", e.target.value)} /></div>
                  <div className="inline-field"><label>CIN expire le</label><input type="date" className="inline-input" value={manualFormData.client_cin_expiry} onChange={(e) => handleManualFormChange("client_cin_expiry", e.target.value)} /></div>
                  <div className="inline-field"><label>Permis N°</label><input className="inline-input" value={manualFormData.client_permis} onChange={(e) => handleManualFormChange("client_permis", e.target.value)} /></div>
                  <div className="inline-field"><label>Permis expire le</label><input type="date" className="inline-input" value={manualFormData.client_permis_expiry} onChange={(e) => handleManualFormChange("client_permis_expiry", e.target.value)} /></div>
                  <div className="inline-field"><label>Adresse</label><input className="inline-input" value={manualFormData.client_address} onChange={(e) => handleManualFormChange("client_address", e.target.value)} /></div>
                  <div className="inline-field"><label>Téléphone</label><input className="inline-input" value={manualFormData.client_phone} onChange={(e) => handleManualFormChange("client_phone", e.target.value)} /></div>
                  <div className="inline-field"><label>Email</label><input type="email" className="inline-input" value={manualFormData.client_email} onChange={(e) => handleManualFormChange("client_email", e.target.value)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="checkbox-group" style={{ marginBottom: "0.5rem" }}>
                  <input type="checkbox" id="hasSecondDriver" checked={manualFormData.has_second_driver} onChange={(e) => handleManualFormChange("has_second_driver", e.target.checked)} />
                  <label htmlFor="hasSecondDriver">Ajouter un deuxième conducteur</label>
                </div>
                {manualFormData.has_second_driver && (
                  <>
                    <div className="inline-section-header">
                      <UserCircle size={18} />
                      <h3>Deuxième conducteur</h3>
                    </div>
                    <div className="inline-grid-2">
                      <div className="inline-field"><label>Nom</label><input className="inline-input" value={manualFormData.second_driver_nom} onChange={(e) => handleManualFormChange("second_driver_nom", e.target.value)} /></div>
                      <div className="inline-field"><label>Prénom</label><input className="inline-input" value={manualFormData.second_driver_prenom} onChange={(e) => handleManualFormChange("second_driver_prenom", e.target.value)} /></div>
                      <div className="inline-field"><label>Date naissance</label><input type="date" className="inline-input" value={manualFormData.second_driver_date_naissance} onChange={(e) => handleManualFormChange("second_driver_date_naissance", e.target.value)} /></div>
                      <div className="inline-field"><label>Lieu naissance</label><input className="inline-input" value={manualFormData.second_driver_lieu_naissance} onChange={(e) => handleManualFormChange("second_driver_lieu_naissance", e.target.value)} /></div>
                      <div className="inline-field"><label>CIN</label><input className="inline-input" value={manualFormData.second_driver_cin} onChange={(e) => handleManualFormChange("second_driver_cin", e.target.value)} /></div>
                      <div className="inline-field"><label>Permis</label><input className="inline-input" value={manualFormData.second_driver_permis} onChange={(e) => handleManualFormChange("second_driver_permis", e.target.value)} /></div>
                      <div className="inline-field"><label>Téléphone</label><input className="inline-input" value={manualFormData.second_driver_phone} onChange={(e) => handleManualFormChange("second_driver_phone", e.target.value)} /></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="inline-form-col">
              <div className="inline-section">
                <div className="inline-section-header">
                  <Car size={18} />
                  <h3>Informations du véhicule</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Immatriculation</label><input className="inline-input" value={manualFormData.car_matricule} onChange={(e) => handleManualFormChange("car_matricule", e.target.value)} /></div>
                  <div className="inline-field"><label>Marque</label><input className="inline-input" value={manualFormData.car_brand} onChange={(e) => handleManualFormChange("car_brand", e.target.value)} /></div>
                  <div className="inline-field"><label>Modèle</label><input className="inline-input" value={manualFormData.car_model} onChange={(e) => handleManualFormChange("car_model", e.target.value)} /></div>
                  <div className="inline-field"><label>Couleur</label><input className="inline-input" value={manualFormData.car_color} onChange={(e) => handleManualFormChange("car_color", e.target.value)} /></div>
                  <div className="inline-field"><label>Année</label><input className="inline-input" value={manualFormData.car_year} onChange={(e) => handleManualFormChange("car_year", e.target.value)} /></div>
                  <div className="inline-field"><label>Carburant</label><select className="inline-select" value={manualFormData.car_fuel} onChange={(e) => handleManualFormChange("car_fuel", e.target.value)}><option value="">Sélectionner</option><option value="petrol">Essence</option><option value="diesel">Diesel</option><option value="electric">Électrique</option></select></div>
                  <div className="inline-field"><label>Transmission</label><select className="inline-select" value={manualFormData.car_transmission} onChange={(e) => handleManualFormChange("car_transmission", e.target.value)}><option value="">Sélectionner</option><option value="manual">Manuelle</option><option value="automatic">Automatique</option></select></div>
                  <div className="inline-field"><label>Places</label><input className="inline-input" value={manualFormData.car_seats} onChange={(e) => handleManualFormChange("car_seats", e.target.value)} /></div>
                  <div className="inline-field"><label>Portes</label><input className="inline-input" value={manualFormData.car_doors} onChange={(e) => handleManualFormChange("car_doors", e.target.value)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="inline-section-header">
                  <Calendar size={18} />
                  <h3>Dates et kilométrage</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Date de départ</label><input type="date" className="inline-input" value={manualFormData.start_date} onChange={(e) => handleManualFormChange("start_date", e.target.value)} /></div>
                  <div className="inline-field"><label>Heure départ</label><input type="time" className="inline-input" value={manualFormData.start_time} onChange={(e) => handleManualFormChange("start_time", e.target.value)} /></div>
                  <div className="inline-field"><label>Date de retour</label><input type="date" className="inline-input" value={manualFormData.end_date} onChange={(e) => handleManualFormChange("end_date", e.target.value)} /></div>
                  <div className="inline-field"><label>Heure retour</label><input type="time" className="inline-input" value={manualFormData.end_time} onChange={(e) => handleManualFormChange("end_time", e.target.value)} /></div>
                  <div className="inline-field"><label>Km départ</label><input type="number" className="inline-input" value={manualFormData.kilometrage_depart} onChange={(e) => handleManualFormChange("kilometrage_depart", e.target.value)} /></div>
                  <div className="inline-field"><label>Km retour</label><input type="number" className="inline-input" value={manualFormData.kilometrage_retour} onChange={(e) => handleManualFormChange("kilometrage_retour", e.target.value)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="inline-section-header">
                  <DollarSign size={18} />
                  <h3>Tarifs</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Prix par jour (DH)</label><input type="number" className="inline-input" value={manualFormData.price_per_day} onChange={(e) => handleManualFormChange("price_per_day", parseFloat(e.target.value) || 0)} /></div>
                  <div className="inline-field"><label>Montant total (DH)</label><input type="number" className="inline-input" value={manualFormData.total_price} onChange={(e) => handleManualFormChange("total_price", parseFloat(e.target.value) || 0)} /></div>
                  <div className="inline-field"><label>Montant payé (DH)</label><input type="number" className="inline-input" value={manualFormData.amount_paid} onChange={(e) => handleManualFormChange("amount_paid", parseFloat(e.target.value) || 0)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="inline-section-header">
                  <Info size={18} />
                  <h3>Notes supplémentaires</h3>
                </div>
                <textarea className="inline-input" rows="3" value={manualFormData.notes} onChange={(e) => handleManualFormChange("notes", e.target.value)} placeholder="Notes..." style={{ resize: "vertical" }}></textarea>
              </div>
            </div>
          </div>

          <div style={{ display: "none" }}>
            <ManualContract
              formData={manualFormData}
              signatures={contractSignatures}
              paperwork={contractPaperwork}
              displayOptions={contractDisplayOptions}
              currentUser={currentUser}
            />
          </div>

          <div className="inline-form-footer">
            <button className="inline-secondary-btn" onClick={() => setManualContractOpen(false)}>
              Annuler
            </button>
            <button className="inline-primary-btn" onClick={generateManualContractPDF}>
              <Printer size={16} /> Voir et imprimer le contrat
            </button>
          </div>
        </div>

        <style>{`
          .inline-form-container {
            background: white;
            border-radius: 32px;
            margin: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
          }
          .inline-form-header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 24px 32px;
            display: flex;
            align-items: center;
            gap: 20px;
            position: relative;
          }
          .inline-form-icon {
            width: 56px;
            height: 56px;
            background: #eab308;
            border-radius: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a1a2e;
          }
          .inline-form-title h2 {
            color: #eab308;
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0;
          }
          .inline-form-title p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.875rem;
            margin: 4px 0 0 0;
          }
          .inline-form-close {
            position: absolute;
            top: 24px;
            right: 28px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 40px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: white;
            transition: all 0.2s;
          }
          .inline-form-close:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
          }
          .inline-form {
            padding: 28px 32px;
          }
          .inline-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
          .inline-form-col {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .inline-section {
            background: #f8fafc;
            border-radius: 24px;
            padding: 20px;
            border: 1px solid #e2e8f0;
          }
          .inline-section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #eab308;
          }
          .inline-section-header h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
            margin: 0;
          }
          .inline-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .inline-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .inline-field label {
            font-size: 0.7rem;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .inline-input, .inline-select {
            padding: 10px 14px;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            font-size: 0.875rem;
            transition: all 0.2s;
            background: white;
            font-family: inherit;
          }
          .inline-input:focus, .inline-select:focus {
            outline: none;
            border-color: #eab308;
            box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
          }
          .inline-info-message {
            background: #fefce8;
            border: 1px solid #fde047;
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.75rem;
            color: #854d0e;
            margin-top: 16px;
          }
          .inline-error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.75rem;
            color: #dc2626;
            margin-top: 16px;
          }
          .inline-info-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .inline-info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .inline-info-item .info-label {
            font-size: 0.75rem;
            color: #64748b;
          }
          .inline-info-item .info-value {
            font-size: 0.875rem;
            font-weight: 500;
            color: #1e293b;
          }
          .inline-secondary-btn {
            background: white;
            border: 1.5px solid #e2e8f0;
            padding: 10px 24px;
            border-radius: 40px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .inline-secondary-btn:hover {
            border-color: #eab308;
            color: #eab308;
          }
          .inline-primary-btn {
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: none;
            padding: 12px 28px;
            border-radius: 40px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #eab308;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .inline-primary-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(26, 26, 46, 0.4);
            color: #fbbf24;
          }
          .inline-primary-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          .inline-form-footer {
            display: flex;
            justify-content: flex-end;
            gap: 16px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            margin-top: 24px;
          }
          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            cursor: pointer;
          }
          .display-options-panel {
            background: #f8fafc;
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1px solid #e2e8f0;
          }
          .display-options-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .reset-all-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 2rem;
            cursor: pointer;
            font-size: 0.75rem;
          }
          .display-options-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 0.75rem;
          }
          .display-option-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            background: white;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .display-option-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
          }
          .display-option-buttons {
            display: flex;
            gap: 0.25rem;
          }
          .mode-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.25rem 0.5rem;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            cursor: pointer;
          }
          .mode-btn.active {
            background: #0f172a;
            border-color: #0f172a;
            color: white;
          }
          @media (max-width: 1024px) {
            .inline-form-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 768px) {
            .inline-form-container { margin: 1rem; }
            .inline-form-header { padding: 16px 20px; }
            .inline-form-header h2 { font-size: 1.25rem; }
            .inline-form { padding: 20px; }
            .inline-grid-2 { grid-template-columns: 1fr; }
          }
          @media (prefers-color-scheme: dark) {
            .inline-form-container { background: #1e293b; border-color: #334155; }
            .inline-section { background: #0f172a; border-color: #334155; }
            .inline-section-header h3 { color: #f1f5f9; }
            .inline-field label { color: #94a3b8; }
            .inline-input, .inline-select { background: #0f172a; border-color: #334155; color: #f1f5f9; }
            .display-options-panel { background: #0f172a; border-color: #334155; }
            .display-option-item { background: #1e293b; border-color: #475569; }
            .mode-btn { background: #334155; border-color: #475569; color: #cbd5e1; }
            .mode-btn.active { background: #eab308; color: #0f172a; }
            .inline-secondary-btn { background: #1e293b; border-color: #475569; color: #cbd5e1; }
            .inline-secondary-btn:hover { border-color: #eab308; color: #eab308; }
          }
        `}</style>
      </div>
    );
  }

  // Main dashboard render
  // ---------- extra analytics for the redesigned dashboard (plain computation, no hooks) ----------
  const dashExtra = (() => {
    const pad = (n) => String(n).padStart(2, "0");
    const toDate = (v) => {
      if (!v) return null;
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
        const [y, m, dd] = v.slice(0, 10).split("-").map(Number);
        return new Date(y, m - 1, dd);
      }
      const x = new Date(v);
      return isNaN(x.getTime()) ? null : x;
    };
    const keyOf = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(today); dt.setDate(dt.getDate() - i);
      days.push({ key: keyOf(dt), label: `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`, count: 0 });
    }
    const dayMap = Object.fromEntries(days.map((x) => [x.key, x]));
    const weekdays = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((n) => ({ name: n, count: 0 }));
    const clientCount = {};
    (reservations || []).forEach((r) => {
      const c = toDate(r.created_at || r.start_date);
      if (c && dayMap[keyOf(c)]) dayMap[keyOf(c)].count += 1;
    });
    (filteredReservations || []).forEach((r) => {
      const s = toDate(r.start_date);
      if (s) weekdays[s.getDay()].count += 1;
      const nm = r.client?.prenom ? `${r.client.prenom} ${r.client.nom || ""}`.trim() : null;
      if (nm) clientCount[nm] = (clientCount[nm] || 0) + 1;
    });
    const topClients = Object.entries(clientCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const fleetMap = {};
    (cars || []).forEach((c) => {
      const label = c.status === "disponible" ? "Disponibles" : c.status === "non disponible" ? "Indisponibles" : (c.status || "Autre");
      fleetMap[label] = (fleetMap[label] || 0) + 1;
    });
    const fleet = Object.entries(fleetMap).map(([name, value]) => ({ name, value }));

    const accMap = {};
    (accidents || []).forEach((a) => { const k = a.status || "Non défini"; accMap[k] = (accMap[k] || 0) + 1; });
    const accStatus = Object.entries(accMap).map(([name, value]) => ({ name, value }));

    const nameOf = (r) => (r.client?.prenom ? `${r.client.prenom} ${r.client.nom || ""}`.trim() : "Client");
    const carOf = (r) => `${r.cars?.brand || ""} ${r.cars?.model || ""}`.trim() || "Véhicule";
    const upcoming = (reservations || [])
      .filter((r) => r.status === "confirmed")
      .map((r) => ({ r, end: toDate(r.end_date) }))
      .filter((x) => x.end)
      .map((x) => ({ id: x.r.id, who: nameOf(x.r), car: carOf(x.r), left: Math.round((x.end - today) / 86400000) }))
      .filter((x) => x.left >= 0 && x.left <= 7)
      .sort((a, b) => a.left - b.left).slice(0, 6);
    const late = (reservations || [])
      .filter((r) => r.status === "retard")
      .map((r) => ({ id: r.id, who: nameOf(r), car: carOf(r), end: r.end_date ? String(r.end_date).slice(0, 10) : "" }))
      .slice(0, 6);

    const done = reservationsConfirmees + reservationsTerminees;
    return {
      days, weekdays, topClients, fleet, accStatus, upcoming, late,
      occupancy: totalCars > 0 ? Math.round((reservationsConfirmees / totalCars) * 100) : 0,
      conversion: totalReservations > 0 ? Math.round((done / totalReservations) * 100) : 0,
      avgRevenue: done > 0 ? Math.round(revenue / done) : 0,
      pal: ["#eab308", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec489a"],
      tip: { background: "white", border: "1px solid #e2e8f0", borderRadius: "0.75rem", boxShadow: "0 10px 25px -10px rgba(0,0,0,0.2)" },
    };
  })();

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap");
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }

        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 1rem; }
        .loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #eab308; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dashboard { max-width: 1400px; }

        .filter-toolbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          background: #f1f5f9;
          border-radius: 2rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          justify-content: space-between;
        }
        .filter-toolbar .filter-nav {
          display: flex;
          gap: 0.25rem;
        }
        .filter-toolbar .filter-nav-btn {
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #7f1d1d;
        }
        .filter-toolbar .filter-nav-btn:hover {
          background: #fef3c7;
          border-color: #d97706;
        }
        .filter-toolbar .filter-main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .filter-toolbar .filter-main .calendar-icon {
          color: #64748b;
          display: flex;
          align-items: center;
          margin-right: 0.25rem;
        }

        .filter-dropdown-wrapper {
          position: relative;
          display: inline-block;
        }
        .filter-dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 2rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.15s ease;
          height: 2.2rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          white-space: nowrap;
        }
        .filter-dropdown-trigger:hover {
          border-color: #d4af37;
          background: #fefcf5;
        }
        .filter-dropdown-icon {
          color: #64748b;
        }
        .filter-dropdown-label {
          font-weight: 500;
        }
        .filter-dropdown-chevron {
          color: #94a3b8;
          transition: transform 0.2s ease;
        }
        .filter-dropdown-chevron.open {
          transform: rotate(180deg);
        }
        .filter-dropdown-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          min-width: 160px;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          z-index: 1001;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .filter-dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.5rem 0.875rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.75rem;
          color: #334155;
          transition: all 0.15s ease;
          text-align: left;
        }
        .filter-dropdown-item:hover {
          background: #f8fafc;
        }
        .filter-dropdown-item.active {
          background: #fef3c7;
          color: #d97706;
        }
        .filter-dropdown-item .item-label {
          flex: 1;
          font-weight: 500;
        }
        .filter-dropdown-item .item-check {
          color: #eab308;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .header-title-section {
          display: flex;
          flex-direction: column;
        }

        .dashboard-title { font-size: 1.25rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; margin: 0; }
        .dashboard-subtitle { font-size: 0.7rem; color: #64748b; margin-top: 0.125rem; }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .revenue-card { background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); border-radius: 2rem; padding: 0.5rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3); }
        .revenue-label { font-size: 0.6rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
        .revenue-value { font-size: 1rem; font-weight: 700; line-height: 1.2; }

        .contract-manual-btn { background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #eab308; color: #eab308; border-radius: 2rem; padding: 0.5rem 1rem; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500; font-size: 0.75rem; transition: all 0.2s; }
        .contract-manual-btn:hover { background: linear-gradient(135deg, #334155, #1e293b); transform: translateY(-1px); }

        .stats-section { margin-bottom: 1.5rem; }
        .stats-category { margin-bottom: 1.5rem; }
        .category-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #eab308; display: inline-flex; align-items: center; gap: 0.5rem; }
        .category-icon { color: #eab308; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }

        .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; transition: all 0.2s ease; position: relative; overflow: hidden; cursor: pointer; }
        .stat-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -12px rgba(0,0,0,0.1); }
        .stat-card-bg { position: absolute; top: -1.5rem; right: -1.5rem; width: 5rem; height: 5rem; border-radius: 50%; opacity: 0.1; transition: opacity 0.2s; }
        .stat-card:hover .stat-card-bg { opacity: 0.2; }

        .stat-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; color: white; position: relative; z-index: 1; }
        .stat-icon-blue { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
        .stat-icon-amber { background: linear-gradient(135deg, #f59e0b, #ea580c); }
        .stat-icon-emerald { background: linear-gradient(135deg, #10b981, #14b8a6); }
        .stat-icon-red { background: linear-gradient(135deg, #ef4444, #f43f5e); }
        .stat-icon-purple { background: linear-gradient(135deg, #8b5cf6, #d946ef); }
        .stat-icon-indigo { background: linear-gradient(135deg, #6366f1, #818cf8); }
        .stat-icon-pink { background: linear-gradient(135deg, #ec489a, #f472b6); }
        .stat-icon-teal { background: linear-gradient(135deg, #14b8a6, #2dd4bf); }
        .stat-icon-orange { background: linear-gradient(135deg, #f97316, #fb923c); }
        .stat-icon-cyan { background: linear-gradient(135deg, #06b6d4, #22d3ee); }

        .stat-value { font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; position: relative; z-index: 1; }
        .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; position: relative; z-index: 1; margin-top: 0.25rem; }
        .stat-subtitle { font-size: 0.6rem; color: #94a3b8; margin-top: 0.25rem; position: relative; z-index: 1; }

        .charts-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
        .chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; transition: box-shadow 0.2s; }
        .chart-card:hover { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .chart-card-full { grid-column: span 2; }
        .chart-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .chart-subtitle { font-size: 0.7rem; color: #64748b; margin-bottom: 1rem; }

        .recent-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; margin-top: 1.5rem; }
        .recent-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .recent-subtitle { font-size: 0.7rem; color: #64748b; margin-bottom: 1rem; }

        .table-wrapper { overflow-x: auto; }
        .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
        .table th { text-align: left; padding: 0.75rem 0; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0; }
        .table td { padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; }
        .table tr:last-child td { border-bottom: none; }

        .badge { display: inline-flex; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
        .badge-pending { background: rgba(234, 179, 8, 0.1); color: #ca8a04; }
        .badge-confirmed { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
        .badge-completed { background: rgba(59, 130, 242, 0.1); color: #2563eb; }
        .badge-retard { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
        .badge-contacted { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
        .badge-cancelled { background: rgba(100, 116, 139, 0.1); color: #475569; }
        .badge-warning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
        .badge-info { background: rgba(59, 130, 242, 0.1); color: #2563eb; }
        .badge-success { background: rgba(34, 197, 94, 0.1); color: #16a34a; }

        .text-warning { color: #d97706; }
        .text-success { color: #16a34a; }
        .font-mono { font-family: monospace; }

        /* Global Search */
        .global-search-container { position: relative; width: 420px; }
        .global-search-wrapper { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 2rem; padding: 0.375rem 0.75rem; transition: all 0.2s; }
        .global-search-wrapper:focus-within { border-color: #eab308; box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.1); background: white; }
        .global-search-icon { color: #94a3b8; display: flex; align-items: center; flex-shrink: 0; }
        .global-search-input { flex: 1; border: none; outline: none; font-size: 0.75rem; background: transparent; min-width: 180px; }
        .global-search-input::placeholder { color: #94a3b8; font-size: 0.7rem; }
        .search-type-dropdown { position: relative; flex-shrink: 0; }
        .search-type-trigger { display: flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; background: #e2e8f0; border: none; border-radius: 1.5rem; cursor: pointer; font-size: 0.7rem; font-weight: 500; color: #1e293b; transition: all 0.2s ease; white-space: nowrap; }
        .search-type-trigger:hover { background: #cbd5e1; }
        .trigger-icon { display: flex; align-items: center; }
        .trigger-label { font-weight: 600; }
        .trigger-chevron { transition: transform 0.2s ease; color: #64748b; }
        .trigger-chevron.open { transform: rotate(180deg); }
        .search-type-menu { position: absolute; top: calc(100% + 0.5rem); right: 0; min-width: 160px; background: white; border-radius: 0.75rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; z-index: 1001; animation: slideDown 0.2s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .search-type-item { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.5rem 0.875rem; background: transparent; border: none; cursor: pointer; font-size: 0.75rem; color: #334155; transition: all 0.15s ease; text-align: left; }
        .search-type-item:hover { background: #f8fafc; }
        .search-type-item.active { background: #fef3c7; color: #d97706; }
        .item-icon { display: flex; align-items: center; width: 20px; }
        .item-label { flex: 1; font-weight: 500; }
        .item-check { color: #eab308; }
        .global-search-clear { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0.25rem; display: flex; align-items: center; border-radius: 50%; flex-shrink: 0; }
        .global-search-clear:hover { background: #f1f5f9; color: #64748b; }
        .global-search-results { position: absolute; top: calc(100% + 0.5rem); left: 0; right: 0; background: white; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; z-index: 1000; max-height: 400px; overflow-y: auto; }
        .search-loading { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 1rem; color: #64748b; }
        .loading-spinner-small { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #eab308; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .search-results-header { padding: 0.5rem 1rem; border-bottom: 1px solid #e2e8f0; font-size: 0.65rem; color: #64748b; }
        .search-results-list { max-height: 350px; overflow-y: auto; }
        .search-result-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid #f1f5f9; }
        .search-result-item:hover { background: #f8fafc; }
        .search-result-item.selected { background: #fef3c7; }
        .result-icon { width: 28px; height: 28px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .result-content { flex: 1; min-width: 0; }
        .result-title { font-size: 0.75rem; font-weight: 600; color: #1e293b; }
        .result-subtitle { font-size: 0.6rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .result-type-badge { padding: 0.125rem 0.375rem; border-radius: 0.375rem; font-size: 0.55rem; font-weight: 600; flex-shrink: 0; }
        .search-no-results { padding: 1rem; text-align: center; color: #64748b; font-size: 0.75rem; }

        /* Report Styles */
        .report-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out; }
        .report-modal { background: white; border-radius: 1.5rem; width: 95%; max-width: 1200px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideInUp 0.3s ease-out; }
        .report-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); }
        .report-modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: #1e293b; }
        .report-modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
        .report-modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .report-table-container { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 0.75rem; margin-top: 1rem; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 0.813rem; }
        .report-table th { background: #f1f5f9; padding: 0.75rem; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
        .report-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
        .report-input { width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 0.813rem; transition: all 0.2s; }
        .report-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        .saved-reports-section { margin-top: 2rem; padding: 1.25rem; background: white; border-radius: 1.25rem; border: 1px solid #e2e8f0; }
        .saved-reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem; }
        .saved-report-card { background: #f8fafc; border-radius: 1rem; padding: 1rem; border: 1px solid #e2e8f0; transition: all 0.2s; cursor: default; }
        .saved-report-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: #3b82f6; }
        .saved-report-title { font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
        .saved-report-meta { font-size: 0.7rem; color: #64748b; display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .action-btn { background: transparent; border: none; padding: 0.25rem; border-radius: 0.5rem; cursor: pointer; color: #64748b; transition: all 0.2s; }
        .action-btn:hover { background: #e2e8f0; }
        .action-btn.edit:hover { color: #8b5cf6; }
        .action-btn.delete:hover { color: #ef4444; }
        .edit-modal-overlay { position: fixed; inset: 0; z-index: 1100; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out; }
        .edit-modal-container { background: white; border-radius: 1.5rem; width: 95%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideInUp 0.3s ease-out; }
        .edit-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); }
        .edit-modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: #1e293b; }
        .edit-modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
        .edit-modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-outline { background: white; border: 1px solid #e2e8f0; color: #1e293b; }
        .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
        .btn-primary { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; box-shadow: 0 2px 4px rgba(59,130,246,0.2); }
        .btn-primary:hover { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(59,130,246,0.3); }
        .btn-secondary { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; }
        .btn-secondary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.3); }
        .summary-box { background: #f8fafc; border-radius: 0.75rem; padding: 0.75rem; margin-top: 1rem; display: flex; justify-content: flex-end; }
        .spinning { animation: spin 0.8s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .modal { background: white; border-radius: 1.5rem; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideInUp 0.3s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 0 1.5rem; position: sticky; top: 0; background: white; z-index: 10; border-bottom: 1px solid #e2e8f0; }
        .modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        .modal-close { background: #f1f5f9; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: #e2e8f0; }

        .client-detail-modal, .matricule-detail-modal { background: white; border-radius: 1.5rem; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideInUp 0.3s ease; }

        .client-info-section { display: flex; gap: 1.5rem; padding: 1.5rem; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
        .client-avatar { flex-shrink: 0; }
        .avatar-initials { width: 5rem; height: 5rem; border-radius: 50%; background: linear-gradient(135deg, #eab308, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: white; }
        .client-details { flex: 1; }
        .client-details h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .client-contact-info { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; font-size: 0.875rem; color: #475569; }
        .client-contact-info span { display: flex; align-items: center; gap: 0.25rem; }
        .client-id-info { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; color: #64748b; }
        .client-id-info span { display: flex; align-items: center; gap: 0.25rem; }
        .client-summary { display: flex; gap: 1.5rem; padding: 0.75rem 1rem; background: #f8fafc; border-radius: 1rem; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 1.25rem; font-weight: 700; color: #1e293b; }
        .summary-label { font-size: 0.7rem; color: #64748b; }

        .matricule-info-section { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .matricule-code-large { font-size: 2rem; font-weight: 700; font-family: monospace; color: #eab308; margin-bottom: 1rem; }
        .matricule-details { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .detail-row { font-size: 0.875rem; }
        .detail-label { font-weight: 600; color: #64748b; margin-right: 0.5rem; }
        .current-reservation-card { background: #fef3c7; border-radius: 0.75rem; padding: 0.75rem 1rem; margin-top: 1rem; }
        .current-label { font-weight: 600; color: #d97706; margin-bottom: 0.25rem; }
        .current-client, .current-dates { font-size: 0.875rem; color: #78350f; }

        .status-dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; margin-right: 0.5rem; }
        .status-active { background: #10b981; }
        .status-inactive { background: #ef4444; }

        .client-tabs, .matricule-tabs { display: flex; gap: 0.5rem; padding: 0 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #64748b; transition: all 0.2s; border-bottom: 2px solid transparent; }
        .tab-btn:hover { color: #1e293b; }
        .tab-btn.active { color: #eab308; border-bottom-color: #eab308; }

        .client-tab-content, .matricule-tab-content { padding: 1.5rem; }
        .list-header { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem; padding: 0.5rem 0; font-size: 0.7rem; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
        .list-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem; padding: 0.75rem 0; font-size: 0.75rem; border-bottom: 1px solid #f1f5f9; align-items: center; }
        .empty-state { text-align: center; padding: 2rem; color: #94a3b8; }
        .show-more-btn { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; padding: 0.5rem 1rem; background: #f1f5f9; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.75rem; color: #475569; transition: all 0.2s; }
        .show-more-btn:hover { background: #e2e8f0; }

        .total-remaining-card { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 1rem; padding: 1rem; margin-bottom: 1rem; text-align: center; }
        .total-remaining-label { font-size: 0.75rem; color: #92400e; }
        .total-remaining-value { font-size: 1.5rem; font-weight: 700; color: #d97706; }

        /* Report paper styles */
        .report-paper {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px 28px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          font-size: 13px;
          color: #1a2c3e;
        }

        .report-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .report-controls input[type="number"] {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
        }

        .report-line-count {
          margin-left: auto;
          font-size: 12px;
          color: #64748b;
        }

        .report-summary {
          display: flex;
          justify-content: flex-end;
          align-items: baseline;
          gap: 16px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          margin-top: 16px;
        }

        .report-summary-label {
          font-weight: 600;
          color: #475569;
          font-size: 14px;
        }

        .report-summary-value {
          font-size: 18px;
          font-weight: 700;
          color: #059669;
        }

        .report-paper-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #94a3b8;
          text-align: center;
        }

        /* Matricule Cards - Styles améliorés pour les boutons */
        .matricule-category-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e9edf2;
          overflow: hidden;
          transition: all 0.25s ease;
          flex: 1 1 300px;
          min-width: 280px;
          max-width: 100%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .matricule-category-card:hover {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }
        .matricule-category-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          transition: background 0.15s ease;
          background: #fcfcfd;
        }
        .matricule-category-card .card-header:hover {
          background: #f8fafc;
        }
        .matricule-category-card .card-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .matricule-category-card .card-badge {
          background: #eab308;
          color: white;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.15rem 0.6rem;
          border-radius: 1rem;
          margin-left: 0.3rem;
        }
        .matricule-category-card .card-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .matricule-category-card .card-count {
          background: #e9edf2;
          padding: 0.1rem 0.7rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
        }
        .matricule-category-card .card-dropdown {
          padding: 4px 16px 16px 16px;
          border-top: 1px solid #e9edf2;
          background: white;
        }
        .matricule-category-card .dropdown-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e9edf2;
          border-radius: 2rem;
          padding: 0.25rem 0.75rem;
          margin-bottom: 1rem;
          transition: all 0.2s ease;
        }
        .matricule-category-card .dropdown-search:focus-within {
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
          background: white;
        }
        .matricule-category-card .dropdown-search .search-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }
        .matricule-category-card .dropdown-search input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.8rem;
          padding: 0.4rem 0;
          background: transparent;
          color: #1e293b;
          min-width: 120px;
        }
        .matricule-category-card .dropdown-search input::placeholder {
          color: #94a3b8;
        }
        .matricule-category-card .dropdown-search .clear-search {
          color: #94a3b8;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0.2rem;
          border-radius: 50%;
          transition: all 0.15s ease;
        }
        .matricule-category-card .dropdown-search .clear-search:hover {
          background: #e9edf2;
          color: #475569;
        }
        .matricule-category-card .dropdown-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 320px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .matricule-category-card .dropdown-list::-webkit-scrollbar {
          width: 4px;
        }
        .matricule-category-card .dropdown-list::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .matricule-category-card .dropdown-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .matricule-category-card .dropdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.8rem;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 0.5rem;
          transition: all 0.15s ease;
        }
        .matricule-category-card .dropdown-item:hover {
          background: #f1f5f9;
          border-color: #e2e8f0;
        }
        .matricule-category-card .item-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          flex-wrap: wrap;
          font-size: 0.8rem;
        }
        .matricule-category-card .item-code {
          font-weight: 700;
          color: #0f172a;
          font-family: monospace;
          background: #e9edf2;
          padding: 0.1rem 0.5rem;
          border-radius: 0.5rem;
        }
        .matricule-category-card .item-car {
          color: #475569;
        }
        .matricule-category-card .item-km {
          color: #64748b;
          font-size: 0.7rem;
          background: #e9edf2;
          padding: 0.1rem 0.4rem;
          border-radius: 0.5rem;
        }
        .matricule-category-card .item-client {
          background: #dbeafe;
          padding: 0.1rem 0.6rem;
          border-radius: 1rem;
          font-size: 0.65rem;
          color: #1d4ed8;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
        }
        .matricule-category-card .item-end-date {
          font-size: 0.6rem;
          color: #3b82f6;
          margin-left: 0.25rem;
          font-weight: 500;
        }
        .matricule-category-card .item-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        /* Boutons unifiés */
        .matricule-category-card .btn-reserve {
          background: #eab308;
          border: none;
          color: white;
          padding: 0.25rem 0.8rem;
          border-radius: 1.5rem;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .matricule-category-card .btn-reserve:hover {
          background: #ca8a04;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(234, 179, 8, 0.3);
        }
        .matricule-category-card .btn-confirm {
          background: #22c55e;
          border: none;
          color: white;
          padding: 0.25rem 0.8rem;
          border-radius: 1.5rem;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .matricule-category-card .btn-confirm:hover {
          background: #16a34a;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
        }
        .matricule-category-card .btn-cancel {
          background: #ef4444;
          border: none;
          color: white;
          padding: 0.25rem 0.8rem;
          border-radius: 1.5rem;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .matricule-category-card .btn-cancel:hover {
          background: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }
        .matricule-category-card .btn-complete {
          background: #3b82f6;
          border: none;
          color: white;
          padding: 0.25rem 0.8rem;
          border-radius: 1.5rem;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .matricule-category-card .btn-complete:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        .matricule-category-card .return-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #fef3c7;
          color: #92400e;
          padding: 0.15rem 0.6rem;
          border-radius: 1rem;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .matricule-category-card .dropdown-footer {
          margin-top: 0.75rem;
          text-align: center;
        }
        .matricule-category-card .btn-show-more {
          background: transparent;
          border: none;
          color: #3b82f6;
          font-weight: 500;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 0.3rem 1rem;
          border-radius: 1.5rem;
          transition: all 0.15s ease;
        }
        .matricule-category-card .btn-show-more:hover {
          background: #eff6ff;
          text-decoration: none;
        }
        .matricule-category-card .dropdown-loading,
        .matricule-category-card .dropdown-empty {
          padding: 0.75rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .matricule-category-card.blue .card-header { border-left: 4px solid #3b82f6; }
        .matricule-category-card.yellow .card-header { border-left: 4px solid #eab308; }
        .matricule-category-card.green .card-header { border-left: 4px solid #22c55e; }
        .matricule-category-card.red .card-header { border-left: 4px solid #ef4444; }
        .matricule-category-card.purple .card-header { border-left: 4px solid #8b5cf6; }

        .matricule-cards-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: flex-start;
        }

        .client-list-container {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          margin-top: 0.25rem;
        }
        .client-list-item {
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .client-list-item:last-child {
          border-bottom: none;
        }
        .client-list-item:hover {
          background: #f8fafc;
        }
        .client-list-item.selected {
          background: #fef3c7;
        }
        .client-list-item .client-name {
          font-weight: 500;
        }
        .client-list-item .client-phone {
          font-size: 0.75rem;
          color: #64748b;
        }

        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-weight: 500;
          font-size: 0.8rem;
          color: #475569;
          margin-bottom: 0.25rem;
        }
        .form-control {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }
        .form-control:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.1);
        }

        /* Today filter button */
        .today-filter-btn.active {
          background: #eab308;
          color: white;
          border-color: #eab308;
        }
        .today-filter-btn:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .charts-section { grid-template-columns: 1fr; }
          .chart-card-full { grid-column: span 1; }
          .stats-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
          .dashboard-header { flex-direction: column; align-items: stretch; }
          .global-search-container { max-width: 100%; width: 100%; }
          .header-actions { justify-content: flex-start; }
          .list-header, .list-row { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
          .global-search-input { min-width: 100px; }
          .trigger-label { display: none; }
          .search-type-trigger { padding: 0.25rem 0.5rem; }
          .client-info-section { flex-direction: column; align-items: center; text-align: center; }
          .client-contact-info { justify-content: center; }
          .client-id-info { justify-content: center; }
          .client-summary { width: 100%; justify-content: center; }
          .matricule-category-card {
            flex: 1 1 100%;
            min-width: unset;
          }
          .matricule-category-card .dropdown-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .matricule-category-card .item-info {
            gap: 0.5rem;
          }
          .matricule-category-card .item-actions {
            width: 100%;
          }
          .matricule-category-card .btn-reserve,
          .matricule-category-card .btn-confirm,
          .matricule-category-card .btn-cancel,
          .matricule-category-card .btn-complete {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
          .filter-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding: 0.75rem;
            border-radius: 1.5rem;
          }
          .filter-toolbar .filter-main {
            justify-content: center;
            flex-wrap: wrap;
          }
          .filter-toolbar .filter-nav {
            justify-content: center;
          }
          .filter-dropdown-wrapper {
            flex: 1;
            min-width: 120px;
          }
          .filter-dropdown-trigger {
            width: 100%;
            justify-content: center;
          }
        }
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .stat-card, .chart-card, .recent-card, .modal, .client-detail-modal, .matricule-detail-modal, .dashboard-header,
          .report-modal, .edit-modal-container, .saved-reports-section { background: #1e293b; border-color: #334155; }
          .stat-label, .chart-subtitle, .recent-subtitle, .table th, .text-muted, .dashboard-subtitle,
          .saved-report-meta, .summary-box { color: #94a3b8; }
          .dashboard-title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; }
          .global-search-wrapper { background: #0f172a; border-color: #334155; }
          .global-search-wrapper:focus-within { background: #1e293b; }
          .search-type-trigger { background: #334155; color: #f1f5f9; }
          .search-type-trigger:hover { background: #475569; }
          .search-type-menu { background: #1e293b; border-color: #334155; }
          .search-type-item { color: #cbd5e1; }
          .search-type-item:hover { background: #334155; }
          .search-type-item.active { background: #422006; color: #fbbf24; }
          .global-search-input { color: #f1f5f9; }
          .global-search-results { background: #1e293b; border-color: #334155; }
          .result-title { color: #f1f5f9; }
          .search-result-item:hover { background: #334155; }
          .search-result-item.selected { background: #422006; }
          .client-summary { background: #0f172a; }
          .summary-value { color: #f1f5f9; }
          .current-reservation-card { background: #422006; }
          .current-label { color: #fbbf24; }
          .current-client, .current-dates { color: #fde68a; }
          .total-remaining-card { background: linear-gradient(135deg, #422006, #451a03); }
          .total-remaining-label { color: #fde68a; }
          .total-remaining-value { color: #fbbf24; }
          .report-modal-header, .edit-modal-header { background: #1e293b; border-color: #334155; }
          .report-modal-title, .edit-modal-title { color: #f1f5f9; }
          .report-modal-footer, .edit-modal-footer { background: #0f172a; border-color: #334155; }
          .saved-report-card { background: #0f172a; border-color: #334155; }
          .saved-report-title { color: #f1f5f9; }
          .btn-outline { background: #1e293b; border-color: #475569; color: #cbd5e1; }
          .btn-outline:hover { background: #334155; border-color: #64748b; }
          .modal-header { background: #1e293b; border-color: #334155; }
          .modal-title { color: #f1f5f9; }
          .modal-close { background: #334155; color: #cbd5e1; }
          .modal-close:hover { background: #475569; }
          .report-controls input[type="number"] { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .matricule-category-card { background: #1e293b; border-color: #334155; }
          .matricule-category-card .card-header { background: #1e293b; }
          .matricule-category-card .card-header:hover { background: #0f172a; }
          .matricule-category-card .card-title { color: #f1f5f9; }
          .matricule-category-card .card-count { background: #334155; color: #cbd5e1; }
          .matricule-category-card .card-dropdown { background: #1e293b; border-color: #334155; }
          .matricule-category-card .dropdown-item { background: #0f172a; border-color: #334155; }
          .matricule-category-card .dropdown-item:hover { background: #334155; border-color: #475569; }
          .matricule-category-card .item-code { color: #f1f5f9; background: #334155; }
          .matricule-category-card .item-car { color: #94a3b8; }
          .matricule-category-card .item-km { color: #64748b; background: #334155; }
          .matricule-category-card .item-client { background: #1e3a5f; color: #60a5fa; }
          .matricule-category-card .item-end-date { color: #60a5fa; }
          .matricule-category-card .days-left-badge { background: #422006; color: #fbbf24; }
          .matricule-category-card .btn-reserve { background: #ca8a04; }
          .matricule-category-card .btn-reserve:hover { background: #a16207; }
          .matricule-category-card .btn-confirm { background: #16a34a; }
          .matricule-category-card .btn-confirm:hover { background: #15803d; }
          .matricule-category-card .btn-cancel { background: #dc2626; }
          .matricule-category-card .btn-cancel:hover { background: #b91c1c; }
          .matricule-category-card .btn-complete { background: #2563eb; }
          .matricule-category-card .btn-complete:hover { background: #1d4ed8; }
          .matricule-category-card .return-badge { background: #422006; color: #fbbf24; }
          .matricule-category-card .btn-show-more { color: #60a5fa; }
          .matricule-category-card .btn-show-more:hover { background: #1e3a5f; }
          .matricule-category-card .dropdown-search { background: #0f172a; border-color: #334155; }
          .matricule-category-card .dropdown-search:focus-within { background: #1e293b; border-color: #eab308; }
          .matricule-category-card .dropdown-search input { color: #f1f5f9; }
          .matricule-category-card .dropdown-search input::placeholder { color: #64748b; }
          .form-control { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .form-control:focus { border-color: #eab308; }
          .form-group label { color: #94a3b8; }
          .client-list-item { border-bottom-color: #334155; }
          .client-list-item:hover { background: #334155; }
          .client-list-item.selected { background: #422006; }
          .client-list-item .client-phone { color: #94a3b8; }
          .filter-toolbar { background: #1e293b; border-color: #334155; }
          .filter-toolbar .filter-nav-btn { background: #0f172a; border-color: #334155; color: #fca5a5; }
          .filter-toolbar .filter-nav-btn:hover { background: #422006; border-color: #d97706; }
          .filter-dropdown-trigger { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .filter-dropdown-trigger:hover { border-color: #d4af37; background: #1e293b; }
          .filter-dropdown-menu { background: #1e293b; border-color: #334155; }
          .filter-dropdown-item { color: #cbd5e1; }
          .filter-dropdown-item:hover { background: #334155; }
          .filter-dropdown-item.active { background: #422006; color: #fbbf24; }
          .filter-dropdown-icon { color: #94a3b8; }
          .filter-dropdown-chevron { color: #64748b; }
          .filter-toolbar .calendar-icon { color: #94a3b8; }
          .today-filter-btn.active { background: #eab308; color: #0f172a; }
        }
          /* Bouton Activer prolongation */
.btn-extend {
  background: #22c55e;
  border: none;
  color: white;
  padding: 0.15rem 0.6rem;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.btn-extend:hover {
  background: #16a34a;
  transform: scale(1.05);
}

/* Fond jaune pour les prolongations activées */
.dropdown-item.extendable {
  background-color: #fef3c7 !important;   /* jaune clair */
  border-left: 4px solid #f59e0b;         /* bordure orange */
}
.dropdown-item.extendable:hover {
  background-color: #fde68a !important;   /* jaune plus soutenu au survol */
}
  /* Badge "Prolongation" (quand déjà activée) */
.extend-badge {
  background: #15803d;
  color: white;
  padding: 0.1rem 0.6rem;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 600;
  display: inline-block;
  margin-left: 0.3rem;
  white-space: nowrap;
}

/* Bouton "Activer prolongation" (quand non activée) */
.btn-extend {
  background: #f59e0b;    /* orange */
  border: none;
  color: white;
  padding: 0.15rem 0.6rem;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-left: 0.3rem;
}
.btn-extend:hover {
  background: #d97706;    /* orange plus foncé */
  transform: scale(1.05);
}

/* Fond jaune pour les lignes avec prolongation activée */
.dropdown-item.extendable {
  background-color: #fef3c7 !important;
  border-left: 4px solid #f59e0b;
}
.dropdown-item.extendable:hover {
  background-color: #fde68a !important;
}
      `}</style>

      <div className="dashboard">
        {/* ===== FILTER TOOLBAR ===== */}
        <div className="filter-toolbar">
          <div className="filter-nav">
            <button className="filter-nav-btn" aria-label="Précédent" onClick={() => {}}>
              <ChevronLeft size={18} />
            </button>
            <button className="filter-nav-btn" aria-label="Suivant" onClick={() => {}}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="filter-main">
            <span className="calendar-icon">
              <Calendar size={16} />
            </span>
            <FilterDropdown
              options={monthOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
              label="Mois"
            />
            <FilterDropdown
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
              label="Année"
            />
            <FilterDropdown
              options={periodOptions}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              label="Période"
            />
          </div>
          <div style={{ width: '2.2rem' }}></div>
        </div>

        {/* ====== HERO ====== */}
        <style>{dashRedesignCss}</style>
        <style>{reportContractCss}</style>
        <style>{rvRecentCss}</style>
        <style>{mobileDashCss}</style>
        <style>{matModalCss}</style>
        <div className="dash-hero">
          <div className="dash-hero-title">
            <span className="dash-eyebrow">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
            <h1 className="dash-h1">Tableau de bord</h1>
            <p className="dash-sub">Vue d'ensemble de votre activité de location</p>
          </div>
          <div className="header-actions">
            <GlobalSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              loading={searchLoading}
              selectedResult={selectedClient || selectedMatricule}
              onSelectResult={handleSelectResult}
              onClear={handleClearSearch}
              searchType={searchType}
              setSearchType={setSearchType}
            />
            {/* Conditionally show "Rapport manuel" button */}
            {canViewReports() && (
              <button className="contract-manual-btn" onClick={() => setReportModalOpen(true)}>
                <FileText size={16} /> Rapport manuel
              </button>
            )}
            <button className="contract-manual-btn" onClick={() => setManualContractOpen(true)}>
              <FileText size={16} /> Contrat Manuel
            </button>
            {/* Conditionally show "Revenu confirmé" card */}
            {canViewReports() && (
              <div className="revenue-card">
                <TrendingUp size={20} />
                <div>
                  <div className="revenue-label">Revenu confirmé</div>
                  <div className="revenue-value">{revenue.toLocaleString()} DH</div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* ====== KPI STRIP ====== */}
        <div className="kpi-row">
          {canViewReports() && (
            <div className="kpi-card kpi-gold">
              <div className="kpi-top"><span className="kpi-icon"><Wallet size={18} /></span><span className="kpi-tag">Période</span></div>
              <div className="kpi-value">{revenue.toLocaleString()} <small>DH</small></div>
              <div className="kpi-label">Revenu confirmé</div>
            </div>
          )}
          <div className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon"><Car size={18} /></span><span className="kpi-tag">{dashExtra.occupancy}%</span></div>
            <div className="kpi-value">{reservationsConfirmees} <small>/ {totalCars}</small></div>
            <div className="kpi-label">Taux d'occupation</div>
            <div className="kpi-bar"><i style={{ width: `${Math.min(100, dashExtra.occupancy)}%` }} /></div>
          </div>
          <div className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon"><CheckCircle2 size={18} /></span><span className="kpi-tag">{dashExtra.conversion}%</span></div>
            <div className="kpi-value">{reservationsConfirmees + reservationsTerminees} <small>/ {totalReservations}</small></div>
            <div className="kpi-label">Taux de conversion</div>
            <div className="kpi-bar blue"><i style={{ width: `${Math.min(100, dashExtra.conversion)}%` }} /></div>
          </div>
          {canViewReports() && (
            <div className="kpi-card">
              <div className="kpi-top"><span className="kpi-icon"><TrendingUp size={18} /></span><span className="kpi-tag">moy.</span></div>
              <div className="kpi-value">{dashExtra.avgRevenue.toLocaleString()} <small>DH</small></div>
              <div className="kpi-label">Revenu moyen / réservation</div>
            </div>
          )}
          <div className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon"><AlertOctagon size={18} /></span><span className="kpi-tag">{reservationsEnAttente} en attente</span></div>
            <div className="kpi-value">{reservationsEnRetard}</div>
            <div className="kpi-label">Réservations en retard</div>
          </div>
        </div>

        <div className="dash-section-title"><span>Détails par catégorie</span></div>

        {/* ====== STATS SECTIONS ====== */}
        <div className="stats-section">
          <div className="category-title"><Car size={18} className="category-icon" /> Parc Automobile</div>
          <div className="stats-grid">
            <StatCard icon={CheckCircle} title="Disponibles" value={disponibles} subtitle="Prêtes à la location" color="emerald" onClick={() => navigateToCars('disponible')} />
            <StatCard icon={XCircle} title="Indisponibles" value={indisponibles} subtitle="Maintenance ou accidents" color="red" onClick={() => navigateToCars('non disponible')} />
            <StatCard icon={Wrench} title="Visites Techniques" value={visitesTechniques} subtitle="Dans les 30 jours" color="orange" onClick={() => navigateToMatricules()} />
            <StatCard icon={GaugeIcon} title="Vidanges" value={vidangesNeeded} subtitle="À effectuer" color="purple" onClick={() => navigateToMatricules()} />
          </div>
        </div>

        {/* ====== GESTION DES IMMATRICULATIONS ====== */}
        <div className="stats-section">
          <div className="category-title"><CreditCard size={18} className="category-icon" /> Gestion des Immatriculations</div>
          <div className="matricule-cards-grid">
  <MatriculeCategoryCard
    title="Disponibles"
    icon={CheckCircle}
    color="blue"
    matricules={disponiblesWithRes}
    onReserve={handleReserveClick}
    onConfirmDirect={handleDirectConfirm}
    expanded={expandedCategories.disponibles}
    onToggleExpand={() => toggleCategory('disponibles')}
    badge={disponiblesWithRes.length}
  />
  <MatriculeCategoryCard
    title="En attente de confirmation"
    icon={Clock}
    color="yellow"
    matricules={enAttenteWithRes}
    onConfirm={handleConfirmPending}
    onCancel={handleCancelPending}
    expanded={expandedCategories.enAttente}
    onToggleExpand={() => toggleCategory('enAttente')}
    badge={enAttenteWithRes.length}
  />
  <MatriculeCategoryCard
  title="Retour imminent"
  icon={CalendarClock}
  color="green"
  matricules={retourImminentWithRes}
  expanded={expandedCategories.retourImminent}
  onToggleExpand={() => toggleCategory('retourImminent')}
  badge={retourImminentWithRes.length}
  onComplete={handleComplete}
  onToggleExtend={handleToggleExtend}   // <-- AJOUTER CETTE LIGNE
/>
  <MatriculeCategoryCard
    title="En retard"
    icon={AlarmClock}
    color="red"
    matricules={enRetardWithRes}
    expanded={expandedCategories.enRetard}
    onToggleExpand={() => toggleCategory('enRetard')}
    badge={enRetardWithRes.length}
    onComplete={handleComplete}
  />
  <MatriculeCategoryCard
    title="En panne (Accident)"
    icon={Wrench}
    color="purple"
    matricules={enPanneWithRes}
    expanded={expandedCategories.enPanne}
    onToggleExpand={() => toggleCategory('enPanne')}
    badge={enPanneWithRes.length}
  />
</div>
        </div>

        {/* ====== Clients & Utilisateurs ====== */}
        <div className="stats-section">
          <div className="category-title"><Users size={18} className="category-icon" /> Clients & Utilisateurs</div>
          <div className="stats-grid">
            <StatCard icon={Users} title="Total Clients" value={totalClients} subtitle="Base de données" color="indigo" onClick={() => navigateToClients()} />
            <StatCard icon={UserCheck} title="Utilisateurs actifs" value={utilisateursActifs} subtitle="Personnel" color="cyan" onClick={() => navigateToUtilisateurs()} />
            <StatCard icon={MessageCircle} title="Messages de Contact" value={totalContacts} subtitle="Nouvelles demandes" color="pink" onClick={() => navigateToContacts()} />
          </div>
        </div>

        {/* ====== Réservations ====== */}
        <div className="stats-section">
          <div className="category-title"><Calendar size={18} className="category-icon" /> Réservations</div>
          <div className="stats-grid">
            <StatCard icon={CalendarCheck} title="Total Réservations" value={totalReservations} subtitle="Tous statuts" color="blue" onClick={() => navigateToReservations()} />
            <StatCard icon={ClockIcon} title="En Attente" value={reservationsEnAttente} subtitle="En attente de confirmation" color="amber" onClick={() => navigateToReservations('pending')} />
            <StatCard icon={CheckCircle2} title="Confirmées" value={reservationsConfirmees} subtitle="Locations actives" color="emerald" onClick={() => navigateToReservations('confirmed')} />
            <StatCard icon={CheckSquare} title="Terminées" value={reservationsTerminees} subtitle="Locations terminées" color="teal" onClick={() => navigateToReservations('completed')} />
            <StatCard icon={PhoneCall} title="Contactées" value={reservationsContactees} subtitle="Client contacté" color="purple" onClick={() => navigateToReservations('contacted')} />
            <StatCard icon={Ban} title="Annulées" value={reservationsAnnulees} subtitle="Réservations annulées" color="red" onClick={() => navigateToReservations('cancelled')} />
            <StatCard icon={AlertOctagon} title="En Retard" value={reservationsEnRetard} subtitle="Attention requise" color="red" onClick={() => navigateToReservations('retard')} />
          </div>
        </div>

        {/* ====== Sinistres ====== */}
        <div className="stats-section">
          <div className="category-title"><AlertTriangle size={18} className="category-icon" /> Sinistres</div>
          <div className="stats-grid">
            <StatCard icon={AlertTriangle} title="Total Accidents" value={totalAccidents} subtitle="Tous sinistres" color="red" onClick={() => navigateToAccidents()} />
            <StatCard icon={ClockIcon} title="En Attente" value={accidentsEnAttente} subtitle="À traiter" color="amber" onClick={() => navigateToAccidents()} />
          </div>
        </div>

        {/* ====== Recent Reservations ====== */}
        <RecentReservations
          reservations={[...filteredReservations]
            .sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date))
            .slice(0, 6)}
          clients={clients}
          cars={cars}
          matricules={matricules}
          isMobile={isMobile}
          onSeeAll={() => navigate("/reservations")}
          onOpen={(r) => {
            navigate("/reservations");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("focusReservation", { detail: { id: r.id } }));
            }, 100);
          }}
        />

        {/* ====== CHARTS ====== */}
        <div className="dash-row dash-row-a">
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Tendance mensuelle</h2><p className="chart-subtitle">Réservations et revenus sur les 6 derniers mois</p></div></div>
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={byMonth}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reservationsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={dashExtra.tip} />
                <Legend />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenu (DH)" stroke="#eab308" fill="url(#revenueGradient)" strokeWidth={2.5} />
                <Area yAxisId="left" type="monotone" dataKey="reservations" name="Réservations" stroke="#3b82f6" fill="url(#reservationsGradient)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Répartition des statuts</h2><p className="chart-subtitle">Distribution des réservations</p></div></div>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={3}>
                  {byStatus.map((_, index) => (<Cell key={`cell-${index}`} fill={dashExtra.pal[index % 6]} />))}
                </Pie>
                <Tooltip contentStyle={dashExtra.tip} />
                <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-row dash-row-b">
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Activité récente</h2><p className="chart-subtitle">Nouvelles réservations sur 14 jours</p></div></div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dashExtra.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={1} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <Tooltip contentStyle={dashExtra.tip} />
                <Line type="monotone" dataKey="count" name="Réservations" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Jours de départ</h2><p className="chart-subtitle">Quels jours les locations démarrent</p></div></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashExtra.weekdays}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <Tooltip contentStyle={dashExtra.tip} />
                <Bar dataKey="count" name="Départs" fill="#eab308" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">État du parc</h2><p className="chart-subtitle">Disponibilité des véhicules</p></div></div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dashExtra.fleet} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {dashExtra.fleet.map((_, index) => (<Cell key={`fleet-${index}`} fill={dashExtra.pal[(index + 2) % 6]} />))}
                </Pie>
                <Tooltip contentStyle={dashExtra.tip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-row dash-row-b">
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Top véhicules</h2><p className="chart-subtitle">Les voitures les plus réservées</p></div></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topCars} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={90} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={dashExtra.tip} />
                <Bar dataKey="count" name="Réservations" fill="#eab308" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Meilleurs clients</h2><p className="chart-subtitle">Le plus de réservations</p></div></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dashExtra.topClients} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={90} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={dashExtra.tip} />
                <Bar dataKey="count" name="Réservations" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Accidents</h2><p className="chart-subtitle">Répartition par statut</p></div></div>
            {dashExtra.accStatus.length === 0 ? (
              <div className="dash-empty">Aucun accident enregistré</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={dashExtra.accStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={3}>
                    {dashExtra.accStatus.map((_, index) => (<Cell key={`acc-${index}`} fill={dashExtra.pal[(index + 3) % 6]} />))}
                  </Pie>
                  <Tooltip contentStyle={dashExtra.tip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dash-row dash-row-c">
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Retours à venir</h2><p className="chart-subtitle">Locations qui se terminent dans les 7 prochains jours</p></div></div>
            <div className="dash-list">
              {dashExtra.upcoming.length === 0 && <div className="dash-empty">Aucun retour prévu cette semaine</div>}
              {dashExtra.upcoming.map((u) => (
                <div className="dash-item" key={u.id}>
                  <span className="dash-dot" />
                  <div className="dash-item-main"><b>{u.who}</b><small>{u.car}</small></div>
                  <span className={`dash-pill ${u.left <= 1 ? "warn" : ""}`}>{u.left === 0 ? "Aujourd'hui" : u.left === 1 ? "Demain" : `Dans ${u.left} j`}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-head"><div><h2 className="chart-title">Réservations en retard</h2><p className="chart-subtitle">À relancer en priorité</p></div></div>
            <div className="dash-list">
              {dashExtra.late.length === 0 && <div className="dash-empty">Aucun retard, tout est en ordre</div>}
              {dashExtra.late.map((u) => (
                <div className="dash-item" key={u.id}>
                  <span className="dash-dot late" />
                  <div className="dash-item-main"><b>{u.who}</b><small>{u.car}</small></div>
                  <span className="dash-pill late">{u.end}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ====== SAVED REPORTS SECTION ====== */}
        {/* Conditionally show saved reports */}
        {canViewReports() && (
          <SavedReportsSection
            onEditReport={(report) => setEditReport(report)}
            refreshTrigger={refreshReports}
          />
        )}

        {/* ====== MODALS ====== */}
        {selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            reservations={reservations}
            accidents={accidents}
            matricules={matricules}
            payments={[]}
          />
        )}

        {selectedMatricule && (
          <MatriculeDetailModal
            matricule={selectedMatricule}
            onClose={() => setSelectedMatricule(null)}
            reservations={reservations}
            accidents={accidents}
            currentReservation={selectedMatricule.currentReservation}
          />
        )}

        <MultiRowReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          onReportSaved={() => setRefreshReports(prev => prev + 1)}
        />

        <EditReportModal
          isOpen={!!editReport}
          onClose={() => setEditReport(null)}
          report={editReport}
          onReportSaved={() => { setRefreshReports(prev => prev + 1); setEditReport(null); }}
          reservations={reservations}
        />

        <ReserveModal
          isOpen={reserveModalOpen}
          onClose={() => setReserveModalOpen(false)}
          matricule={selectedMatriculeForReserve}
          clients={clients}
          cars={cars}  
          onConfirm={handleConfirmReservation}
        />

        <DirectConfirmModal
          isOpen={confirmDirectModalOpen}
          onClose={() => setConfirmDirectModalOpen(false)}
          matricule={selectedMatriculeForDirectConfirm}
          clients={clients}
          cars={cars} 
          onConfirm={handleDirectConfirmReservation}
        />

        {/* ====== MODAL DE TERMINAISON (style Réserver) ====== */}
{completeModalOpen && (
  <div className="modal-overlay" onClick={() => setCompleteModalOpen(false)}>
    <div className="modal mat-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 className="modal-title mm-title">
          <span className="mm-icon mm-blue"><CheckCircle size={18} /></span>
          <span className="mm-title-text"><small>Retour du véhicule</small>Terminer la réservation</span>
        </h2>
        <button onClick={() => setCompleteModalOpen(false)} className="modal-close">
          <X size={20} />
        </button>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div className="form-group">
          <label>Date de retour</label>
          <input
            type="date"
            className="form-control"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Heure de retour</label>
          <input
            type="time"
            className="form-control"
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Km retour *</label>
          <input
            type="number"
            className="form-control"
            value={kilometrageRetour}
            onChange={(e) => setKilometrageRetour(e.target.value)}
            placeholder="Ex: 12345"
            step="0.01"
          />
        </div>
      </div>
      <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={() => {
  setCompleteModalOpen(false);
  setOriginalRentalDays(null);
}} className="btn btn-outline">
  Annuler
</button>
        <button
  onClick={confirmComplete}
  className="btn btn-primary"
  disabled={!kilometrageRetour || isNaN(kilometrageRetour) || parseFloat(kilometrageRetour) < 0 || completing}
>
  {completing ? <Loader size={16} className="spinning" /> : <CheckCircle size={16} />}
  {completing ? "Traitement..." : "Terminer"}
</button>
      </div>
    </div>
  </div>
)}
{/* ====== PROLONGATION MODAL ====== */}
{prolongationModal.isOpen && (
  <div className="modal-overlay" onClick={() => setProlongationModal({ isOpen: false, reservation: null, days: 1 })}>
    <div className="modal mat-modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 className="modal-title mm-title">
          <span className="mm-icon mm-gold"><CalendarPlus size={18} /></span>
          <span className="mm-title-text"><small>Réservation en cours</small>Prolongation</span>
        </h2>
        <button onClick={() => setProlongationModal({ isOpen: false, reservation: null, days: 1 })} className="modal-close">
          <X size={20} />
        </button>
      </div>
      <div className="modal-body mm-body">
        {prolongationModal.reservation && (
          <div className="mm-summary">
            <span className="mm-avatar">
              {`${(prolongationModal.reservation.client?.prenom || '').charAt(0)}${(prolongationModal.reservation.client?.nom || '').charAt(0)}`.toUpperCase() || '?'}
            </span>
            <div>
              <b>{`${prolongationModal.reservation.client?.prenom || ''} ${prolongationModal.reservation.client?.nom || ''}`.trim() || 'Client'}</b>
              <small>
                {prolongationModal.reservation.end_date
                  ? `Retour prévu le ${new Date(prolongationModal.reservation.end_date).toLocaleDateString('fr-FR')}`
                  : 'Date de retour non définie'}
              </small>
            </div>
          </div>
        )}

        <label className="mm-label" htmlFor="prolongation-days">Jours à ajouter</label>
        <div className="mm-stepper">
          <button
            type="button"
            aria-label="Moins"
            onClick={() => setProlongationModal(prev => ({ ...prev, days: Math.max(1, (parseInt(prev.days) || 1) - 1) }))}
          >−</button>
          <input
            id="prolongation-days"
            type="number"
            inputMode="numeric"
            value={prolongationModal.days}
            onChange={(e) => setProlongationModal(prev => ({ ...prev, days: parseInt(e.target.value) || '' }))}
            min="1"
          />
          <button
            type="button"
            aria-label="Plus"
            onClick={() => setProlongationModal(prev => ({ ...prev, days: (parseInt(prev.days) || 0) + 1 }))}
          ><Plus size={18} /></button>
        </div>
        <div className="mm-chips">
          {[1, 2, 3, 5, 7].map((n) => (
            <button
              key={n}
              type="button"
              className={`mm-chip ${Number(prolongationModal.days) === n ? 'on' : ''}`}
              onClick={() => setProlongationModal(prev => ({ ...prev, days: n }))}
            >
              +{n} {n > 1 ? 'jours' : 'jour'}
            </button>
          ))}
        </div>

        {(() => {
          const r = prolongationModal.reservation;
          const d = parseInt(prolongationModal.days);
          if (!r?.end_date || !d || d < 1) return null;
          const x = new Date(r.end_date);
          if (isNaN(x.getTime())) return null;
          x.setDate(x.getDate() + d);
          return (
            <div className="mm-newdate">
              <span>Nouvelle date de retour</span>
              <b>{x.toLocaleDateString('fr-FR')}</b>
            </div>
          );
        })()}
      </div>
      <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={() => setProlongationModal({ isOpen: false, reservation: null, days: 1 })} className="btn btn-secondary">
          Annuler
        </button>
        <button
          onClick={async () => {
            const { reservation, days } = prolongationModal;
            if (!reservation || days < 1) {
              toast.error('Veuillez entrer un nombre de jours valide.');
              return;
            }
            try {
              await dispatch(updateReservation({
                id: reservation.id,
                data: {
                  can_extend_days: true,
                  prolongation_days: days,
                }
              })).unwrap();
              toast.success(`Prolongation de ${days} jour(s) ajoutée.`);
              dispatch(refreshMatricules());
              dispatch(fetchReservations(true));
              navigate('/reservations', { state: { contractId: reservation.id } });
            } catch (error) {
              toast.error(error.message || 'Erreur lors de la prolongation.');
            }
            setProlongationModal({ isOpen: false, reservation: null, days: 1 });
          }}
          className="btn btn-primary"
        >
          <CheckCircle size={16} /> Confirmer
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </>
  );
}