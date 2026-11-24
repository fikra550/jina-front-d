// src/pages/admin/AdminLaveurs.jsx
// Jina Auto Service — gestion des laveurs et calcul de leur paiement
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../Redux/store';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import {
  Users, Plus, Pencil, Trash2, X, RefreshCw, CreditCard, Wallet, Save,
  Search, Calendar, User, CheckCircle2, AlertCircle, Phone, Clock,
} from 'lucide-react';

/* ============================================================ */
const EMPTY_LAVEUR = { name: '', phone: '', pay_type: 'percentage', pay_rate: '', is_active: true, notes: '' };
const today = () => new Date().toISOString().slice(0, 10);

const dh = (n) =>
  `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const payRuleLabel = (l) =>
  l.pay_type === 'fixed' ? `${dh(l.pay_rate)} par lavage` : `${Number(l.pay_rate || 0)} % du prix`;

const apiError = (e, fallback = 'Erreur') =>
  e?.response?.data?.message ||
  Object.values(e?.response?.data?.errors || {})[0]?.[0] ||
  fallback;

const METHOD_LABEL = { cash: 'Espèces', check: 'Chèque', card: 'Carte', transfer: 'Virement' };

const CONFIRM_META = {
  laveur:  { title: 'Supprimer le laveur', btn: 'Supprimer', msg: 'Voulez-vous supprimer le laveur',
             warn: 'Impossible si le laveur a déjà des lavages ou des paiements (désactivez-le alors).' },
  payment: { title: 'Supprimer le paiement', btn: 'Supprimer', msg: 'Voulez-vous supprimer ce paiement de', warn: '' },
};

/* ============================================================ */
export default function AdminLaveurs() {
  const [laveurs, setLaveurs]   = useState([]);
  const [totals, setTotals]     = useState(null);
  const [loading, setLoading]   = useState(false);

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod]             = useState({ from: '', to: '' });

  const [view, setView]             = useState('list'); // list | form | pay
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_LAVEUR);
  const [submitting, setSubmitting] = useState(false);

  const [detail, setDetail]   = useState(null); // { laveur, summary, lavages, payments }
  const [payForm, setPayForm] = useState({ amount: '', payment_date: today(), method: 'cash', notes: '' });

  const [confirmDlg, setConfirmDlg] = useState(null);

  useResetScrollOnOpen([view, confirmDlg]);

  /* ---- data ---- */
  const periodParams = (p = period) => {
    const params = {};
    if (p.from) params.from = p.from;
    if (p.to)   params.to   = p.to;
    return params;
  };

  const load = async (p = period) => {
    setLoading(true);
    try {
      const r = await api.get('/laveurs', { params: periodParams(p) });
      setLaveurs(r.data.laveurs || []);
      setTotals(r.data.totals || null);
    } catch (e) {
      toast.error(apiError(e, 'Impossible de charger les laveurs'));
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id, prefill = false, p = period) => {
    try {
      const r = await api.get(`/laveurs/${id}`, { params: periodParams(p) });
      setDetail(r.data);
      if (prefill) {
        const bal = Number(r.data.summary?.balance) || 0;
        setPayForm((f) => ({ ...f, amount: bal > 0 ? bal.toFixed(2) : '' }));
      }
      return true;
    } catch (e) {
      toast.error(apiError(e, 'Impossible de charger le détail'));
      return false;
    }
  };

  useEffect(() => {
    load();
    if (detail?.laveur?.id) loadDetail(detail.laveur.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.from, period.to]);

  /* ---- laveur form ---- */
  const openCreate = () => { setEditing(null); setForm(EMPTY_LAVEUR); setView('form'); };
  const openEdit = (l) => {
    setEditing(l);
    setForm({
      name: l.name || '', phone: l.phone || '', pay_type: l.pay_type || 'percentage',
      pay_rate: l.pay_rate ?? '', is_active: !!l.is_active, notes: l.notes || '',
    });
    setView('form');
  };
  const closeForm = () => { setView('list'); setEditing(null); };

  const submit = async (e) => {
    e.preventDefault();
    const name = (form.name || '').trim();
    if (!name) return toast.error('Le nom du laveur est obligatoire');
    const rate = Number(form.pay_rate);
    if (form.pay_rate === '' || !(rate >= 0)) return toast.error('Saisissez la rémunération du laveur');
    if (form.pay_type === 'percentage' && rate > 100) return toast.error('Le pourcentage ne peut pas dépasser 100');

    const payload = {
      name,
      phone: (form.phone || '').trim() || null,
      pay_type: form.pay_type,
      pay_rate: rate,
      is_active: !!form.is_active,
      notes: (form.notes || '').trim() || null,
    };
    setSubmitting(true);
    try {
      if (editing) await api.put(`/laveurs/${editing.id}`, payload);
      else await api.post('/laveurs', payload);
      toast.success(editing ? 'Laveur mis à jour' : 'Laveur ajouté');
      setView('list');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- paie ---- */
  const openPay = async (l) => {
    const ok = await loadDetail(l.id, true);
    if (ok) setView('pay');
  };
  const closePay = () => { setView('list'); setDetail(null); load(); };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!detail) return;
    if (!(Number(payForm.amount) > 0)) return toast.error('Saisissez un montant');
    try {
      await api.post(`/laveurs/${detail.laveur.id}/payments`, {
        amount: Number(payForm.amount),
        payment_date: payForm.payment_date,
        method: payForm.method,
        notes: (payForm.notes || '').trim() || null,
      });
      toast.success('Paiement enregistré');
      setPayForm((f) => ({ ...f, amount: '', notes: '' }));
      await loadDetail(detail.laveur.id);
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  /* ---- confirmations ---- */
  const askDeleteLaveur  = (l) => setConfirmDlg({ kind: 'laveur', name: l.name, id: l.id });
  const askDeletePayment = (p) => setConfirmDlg({ kind: 'payment', name: detail?.laveur?.name || '', id: p.id });

  const confirmAction = async () => {
    const d = confirmDlg;
    if (!d) return;
    try {
      if (d.kind === 'laveur') {
        await api.delete(`/laveurs/${d.id}`);
        toast.success('Laveur supprimé');
        await load();
      } else if (d.kind === 'payment' && detail) {
        await api.delete(`/laveurs/${detail.laveur.id}/payments/${d.id}`);
        toast.success('Paiement supprimé');
        await loadDetail(detail.laveur.id);
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setConfirmDlg(null);
    }
  };

  /* ---- liste filtrée ---- */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return laveurs.filter((l) => {
      if (statusFilter === 'active' && !l.is_active) return false;
      if (statusFilter === 'inactive' && l.is_active) return false;
      if (!term) return true;
      return (l.name || '').toLowerCase().includes(term) || (l.phone || '').toLowerCase().includes(term);
    });
  }, [laveurs, search, statusFilter]);

  const statCards = [
    { label: 'Laveurs actifs',   value: laveurs.filter((l) => l.is_active).length,   icon: <Users size={20} />,        color: 'blue' },
    { label: 'Lavages terminés', value: totals?.lavages ?? 0,                        icon: <CheckCircle2 size={20} />, color: 'cyan' },
    { label: 'Gagné',            value: dh(totals?.earned),                          icon: <Wallet size={20} />,       color: 'violet' },
    { label: 'Payé',             value: dh(totals?.paid),                            icon: <CreditCard size={20} />,   color: 'green' },
    { label: 'Reste à payer',    value: dh(totals?.balance),                         icon: <AlertCircle size={20} />,  color: (totals?.balance || 0) > 0 ? 'amber' : 'green' },
  ];

  const periodActive = !!(period.from || period.to);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="rv">
      {/* ============ FORMULAIRE LAVEUR ============ */}
      {view === 'form' && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><Users size={28} /></div>
            <div className="inline-form-title">
              <h2>{editing ? `Modifier — ${editing.name}` : 'Nouveau laveur'}</h2>
              <p>Nom et règle de rémunération utilisée pour calculer sa paie</p>
            </div>
            <button type="button" className="inline-form-close" onClick={closeForm} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={submit} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><User size={18} /><h3>Informations</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Nom *</label>
                      <input required className="inline-input" value={form.name}
                             onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Téléphone</label>
                      <input className="inline-input" value={form.phone}
                             onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Notes</label>
                      <input className="inline-input" value={form.notes}
                             onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={!!form.is_active}
                               onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                        Laveur actif (proposé dans le formulaire de lavage)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Wallet size={18} /><h3>Rémunération</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Type *</label>
                      <select className="inline-select" value={form.pay_type}
                              onChange={(e) => setForm({ ...form, pay_type: e.target.value })}>
                        <option value="percentage">Pourcentage du prix du lavage</option>
                        <option value="fixed">Montant fixe par lavage</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>{form.pay_type === 'percentage' ? 'Pourcentage (%) *' : 'Montant par lavage (DH) *'}</label>
                      <input type="number" min="0" step="0.01" required className="inline-input" value={form.pay_rate}
                             max={form.pay_type === 'percentage' ? 100 : undefined}
                             onChange={(e) => setForm({ ...form, pay_rate: e.target.value })} />
                    </div>
                  </div>
                  <div className="inline-info-msg" style={{ marginTop: 14 }}>
                    <AlertCircle size={16} />
                    <span>
                      {form.pay_type === 'percentage'
                        ? 'Exemple : 30 % sur un lavage à 100 DH = 30 DH pour le laveur.'
                        : 'Exemple : 20 DH par lavage terminé, quel que soit le prix.'}
                      {' '}Seuls les lavages terminés sont comptés.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={closeForm}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                <Save size={16} /> {submitting ? 'Enregistrement...' : (editing ? 'Mettre à jour' : 'Ajouter')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ PAIE D'UN LAVEUR ============ */}
      {view === 'pay' && detail && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><CreditCard size={28} /></div>
            <div className="inline-form-title">
              <h2>Paie — {detail.laveur.name}</h2>
              <p>{payRuleLabel(detail.laveur)}{periodActive ? ' · période filtrée' : ' · toute la période'}</p>
            </div>
            <button type="button" className="inline-form-close" onClick={closePay} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <div className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Wallet size={18} /><h3>Récapitulatif</h3></div>
                  <div className="inline-info-msg">
                    <Wallet size={16} />
                    <span>
                      {detail.summary.lavages_count} lavage(s) terminé(s) — Gagné : <b>{dh(detail.summary.earned)}</b> — Payé : <b>{dh(detail.summary.paid)}</b> — Reste à payer : <b>{dh(detail.summary.balance)}</b>
                    </span>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><CreditCard size={18} /><h3>Nouveau paiement</h3></div>
                  <form onSubmit={submitPayment}>
                    <div className="inline-grid-2">
                      <div className="inline-field">
                        <label>Montant *</label>
                        <input type="number" min="0.01" step="0.01" required className="inline-input"
                               value={payForm.amount}
                               onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                      </div>
                      <div className="inline-field">
                        <label>Date *</label>
                        <input type="date" required className="inline-input" value={payForm.payment_date}
                               onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} />
                      </div>
                      <div className="inline-field">
                        <label>Méthode</label>
                        <select className="inline-select" value={payForm.method}
                                onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                          <option value="cash">Espèces</option>
                          <option value="check">Chèque</option>
                          <option value="card">Carte</option>
                          <option value="transfer">Virement</option>
                        </select>
                      </div>
                      <div className="inline-field">
                        <label>Notes</label>
                        <input className="inline-input" value={payForm.notes}
                               onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                      </div>
                    </div>
                    <button type="submit" className="inline-primary-btn" style={{ marginTop: 14 }}>
                      <Save size={16} /> Enregistrer le paiement
                    </button>
                  </form>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Clock size={18} /><h3>Paiements versés ({detail.payments.length})</h3></div>
                  {detail.payments.length === 0 && <div className="inline-empty-hint">Aucun paiement enregistré</div>}
                  {detail.payments.map((p) => (
                    <div key={p.id} className="history-row">
                      <span>
                        {new Date(p.payment_date).toLocaleDateString('fr-FR')} — <b>{dh(p.amount)}</b> ({METHOD_LABEL[p.method] || p.method})
                        {p.notes ? ` · ${p.notes}` : ''}
                      </span>
                      <button type="button" className="row-remove-btn" onClick={() => askDeletePayment(p)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><CheckCircle2 size={18} /><h3>Détail du calcul ({detail.lavages.length})</h3></div>
                  {detail.lavages.length === 0 && <div className="inline-empty-hint">Aucun lavage terminé sur la période</div>}
                  {detail.lavages.map((x) => (
                    <div key={x.id} className="history-row">
                      <span>
                        {new Date(x.date_lavage).toLocaleDateString('fr-FR')} — {x.client_name || '—'}
                        {x.vehicle_plate ? ` (${x.vehicle_plate})` : ''} — {dh(x.price)} → <b>{dh(x.laveur_amount)}</b>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={closePay}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ LISTE ============ */}
      {view === 'list' && (
        <div className="ac-wrap">
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><Users size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">Laveurs</h1>
                <p className="rv-sub">{laveurs.length} laveur(s) — Jina Auto Service</p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button type="button" className="ac-btn" onClick={() => load()} disabled={loading}>
                <RefreshCw size={15} /><span className="ac-btn-text">Actualiser</span>
              </button>
              <button type="button" className="ac-btn ac-btn-primary" onClick={openCreate}>
                <Plus size={15} /><span className="ac-btn-text">Nouveau laveur</span>
              </button>
            </div>
          </div>

          <div className="rv-stats">
            {statCards.map((st) => (
              <div key={st.label} className="rv-stat-card">
                <div className={`rv-stat-icon rv-stat-${st.color}`}>{st.icon}</div>
                <div>
                  <p className="rv-stat-label">{st.label}</p>
                  <p className="rv-stat-value" style={{ fontSize: '1.15rem' }}>{st.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="ac-filters">
            <div className="ac-search">
              <Search size={16} />
              <input type="text" placeholder="Rechercher un laveur..." value={search}
                     onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button type="button" className="ac-search-clear" onClick={() => setSearch('')} aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="ac-seg" role="group" aria-label="Statut">
              {[['all', 'Tous'], ['active', 'Actifs'], ['inactive', 'Inactifs']].map(([k, label]) => (
                <button key={k} type="button" className={`ac-seg-btn ${statusFilter === k ? 'active' : ''}`}
                        onClick={() => setStatusFilter(k)}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Calendar size={16} />
              <input type="date" className="inline-input" aria-label="Du" style={{ width: 'auto', height: 40 }}
                     value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} />
              <span>→</span>
              <input type="date" className="inline-input" aria-label="Au" style={{ width: 'auto', height: 40 }}
                     value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} />
              {periodActive && (
                <button type="button" className="ac-btn" onClick={() => setPeriod({ from: '', to: '' })}>
                  <X size={14} /><span className="ac-btn-text">Toute la période</span>
                </button>
              )}
            </div>
          </div>

          <div className="ac-listwrap">
            {/* Desktop table */}
            <div className="ac-tablecard ac-desktop-only">
              <div className="ac-scroll">
                <table className="ac-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th>Laveur</th>
                      <th>Rémunération</th>
                      <th>Lavages</th>
                      <th>Gagné</th>
                      <th>Payé</th>
                      <th>Reste</th>
                      <th>Statut</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="ac-empty-cell">
                          <Users size={40} /><p>Aucun laveur trouvé</p>
                        </td>
                      </tr>
                    ) : filtered.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <div className="ac-strong">{l.name}</div>
                          {l.phone && <div className="ac-model" style={{ fontSize: '0.72rem' }}>{l.phone}</div>}
                        </td>
                        <td>{payRuleLabel(l)}</td>
                        <td>{l.lavages_count}</td>
                        <td>{dh(l.earned)}</td>
                        <td>{dh(l.paid)}</td>
                        <td>
                          <span className={`badge ${l.balance > 0 ? 'badge-amber' : 'badge-success'}`}>{dh(l.balance)}</span>
                        </td>
                        <td>
                          {l.is_active
                            ? <span className="badge badge-success"><CheckCircle2 size={12} /> Actif</span>
                            : <span className="badge badge-gray">Inactif</span>}
                        </td>
                        <td className="text-right">
                          <div className="ac-actions">
                            <button type="button" className="ac-action-btn ac-action-info" onClick={() => openPay(l)} title="Paie">
                              <CreditCard size={15} />
                            </button>
                            <button type="button" className="ac-action-btn ac-action-edit" onClick={() => openEdit(l)} title="Modifier">
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="ac-action-btn ac-action-delete" onClick={() => askDeleteLaveur(l)} title="Supprimer">
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

            {/* Mobile cards */}
            <div className="ac-mobile-only">
              {filtered.length === 0 ? (
                <div className="ac-empty-card"><Users size={40} /><p>Aucun laveur trouvé</p></div>
              ) : (
                <div className="ac-mcards">
                  {filtered.map((l) => (
                    <div key={l.id} className="ac-mcard">
                      <div className="ac-mcard-head">
                        <div className="ac-mcard-avatar"><User size={20} /></div>
                        <div className="ac-mcard-info">
                          <div className="ac-mcard-name">{l.name}</div>
                          <div className="ac-mcard-sub">{payRuleLabel(l)}</div>
                        </div>
                        <div className="ac-mcard-price">
                          {Number(l.balance || 0).toFixed(2)}<small> DH</small>
                        </div>
                      </div>

                      <div className="ac-mcard-badges">
                        {l.is_active
                          ? <span className="badge badge-success"><CheckCircle2 size={12} /> Actif</span>
                          : <span className="badge badge-gray">Inactif</span>}
                        <span className={`badge ${l.balance > 0 ? 'badge-amber' : 'badge-success'}`}>
                          {l.balance > 0 ? 'Reste à payer' : 'À jour'}
                        </span>
                      </div>

                      <div className="ac-mcard-meta">
                        <span><CheckCircle2 size={13} /> {l.lavages_count} lavage(s)</span>
                        <span><Wallet size={13} /> Gagné {dh(l.earned)}</span>
                        <span><CreditCard size={13} /> Payé {dh(l.paid)}</span>
                        {l.phone && <span><Phone size={13} /> {l.phone}</span>}
                      </div>

                      <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <button type="button" onClick={() => openPay(l)} className="ac-card-btn ac-action-info">
                          <CreditCard size={17} /><span>Paie</span>
                        </button>
                        <button type="button" onClick={() => openEdit(l)} className="ac-card-btn ac-action-edit">
                          <Pencil size={17} /><span>Modifier</span>
                        </button>
                        <button type="button" onClick={() => askDeleteLaveur(l)} className="ac-card-btn ac-action-delete">
                          <Trash2 size={17} /><span>Suppr.</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ CONFIRMATION ============ */}
      {confirmDlg && (() => {
        const meta = CONFIRM_META[confirmDlg.kind];
        return (
          <div className="modal-overlay" onClick={() => setConfirmDlg(null)}>
            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-icon"><Trash2 size={32} /></div>
              <h3 className="delete-title">{meta.title}</h3>
              <p className="delete-message">
                {meta.msg} <br />
                <span className="reservation-id">{confirmDlg.name}</span> ?<br />
                {meta.warn && (
                  <><span style={{ color: '#dc2626', fontSize: '0.8rem' }}>⚠️ {meta.warn}</span><br /></>
                )}
                Cette action est irréversible.
              </p>
              <div className="delete-actions">
                <button type="button" onClick={() => setConfirmDlg(null)} className="modal-btn modal-btn-cancel">Retour</button>
                <button type="button" onClick={confirmAction} className="modal-btn btn-delete">{meta.btn}</button>
              </div>
            </div>
          </div>
        );
      })()}

      <Styles />
    </div>
  );
}

/* ============================================================
   STYLES — même design scoped .rv que AdminLavages
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
.rv .inline-textarea {
    width: 100%; min-height: 44px; padding: 10px 14px;
    border: 1.5px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--tx);
    font-size: 0.9rem; font-family: inherit; transition: border-color 0.15s;
}
.rv .inline-textarea { resize: vertical; min-height: 70px; }
.rv .inline-select {
    appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 38px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23a16207' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
}
.rv .inline-input:focus,
.rv .inline-select:focus,
.rv .inline-textarea:focus { outline: none; border-color: var(--blue); }
.rv .inline-input::placeholder,
.rv .inline-textarea::placeholder { color: var(--tx-3); }

.rv .inline-info-msg {
    display: flex; align-items: center; gap: 10px;
    margin-top: 14px; padding: 11px 14px; border-radius: 12px;
    font-size: 0.78rem; font-weight: 700; border: 1.5px solid;
    background: rgba(29,161,232,0.12); border-color: var(--blue); color: var(--blue-d);
}
.rv .inline-info-msg svg { flex-shrink: 0; }
.rv .inline-empty-hint { font-size: 0.78rem; color: var(--tx-3); font-style: italic; }

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
.rv .inline-secondary-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 46px; padding: 0 22px; border-radius: 999px;
    border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
    font-size: 0.88rem; font-weight: 800; cursor: pointer;
    transition: transform 0.1s, background 0.15s;
}
.rv .inline-secondary-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
.rv .inline-secondary-btn:active { transform: translateY(2px); }

.rv .inline-form-footer {
    display: flex; justify-content: flex-end; gap: 14px;
    margin-top: 24px; padding-top: 22px; border-top: 2px dotted var(--line);
}

/* Form row helpers */
.rv .section-header-inline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.rv .section-label { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); }
.rv .add-inline-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 12px; border-radius: 8px; border: 0;
    background: var(--acc); color: #0a0a0a; font-size: 0.72rem; font-weight: 800; cursor: pointer;
}
.rv .add-inline-btn:hover { background: var(--acc-d); }
.rv .row-grid-services,
.rv .row-grid-products { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.rv .row-remove-btn {
    width: 38px; height: 38px; border: 0; border-radius: 10px;
    background: rgba(220,38,38,0.12); color: var(--danger);
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background 0.15s;
}
.rv .row-remove-btn:hover { background: rgba(220,38,38,0.2); }
.rv .row-remove-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.rv .subtotal-text { font-size: 0.78rem; color: var(--tx-2); margin-top: 4px; text-align: right; }
.rv .subtotal-text b { color: var(--acc-tx); font-weight: 900; }

.rv .photo-previews { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.rv .photo-preview { position: relative; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); }
.rv .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.rv .photo-preview-remove {
    position: absolute; top: 2px; right: 2px;
    background: rgba(0,0,0,0.7); color: #fff; border: none; border-radius: 50%;
    width: 20px; height: 20px; font-size: 14px; line-height: 1; cursor: pointer;
}
.rv .history-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 0.82rem; gap: 10px;
}
.rv .history-row:last-child { border-bottom: none; }

/* ---------- Modal confirmation (style produits) ---------- */
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
.rv .delete-title { font-size: 1.25rem; font-weight: 900; margin: 0 0 8px; }
.rv .delete-message { font-size: 0.88rem; color: var(--tx-2); margin: 0 0 12px; line-height: 1.5; }
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

/* ---------- Bouton facture ---------- */
.rv .ac-action-invoice { color: #8b5cf6; }
.rv .ac-action-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:active { background: #f3e8ff; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:active { background: #4c1d95; }
}

/* ---------- Page wrap ---------- */
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
.rv .ac-table { width: 100%; min-width: 1100px; border-collapse: collapse; font-size: 0.82rem; }
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
.rv .ac-model { color: var(--tx-2); font-weight: 500; }
.rv .ac-price-pill {
    display: inline-block; padding: 4px 10px; border-radius: 8px; white-space: nowrap;
    background: rgba(234, 179, 8, 0.14); color: var(--acc-tx);
    font-weight: 800; font-size: 0.8rem;
}
.rv .ac-table td .flex { font-size: 0.8rem; color: var(--tx-2); white-space: nowrap; }
.rv .ac-table td .flex svg { color: var(--tx-3); flex-shrink: 0; }
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

/* ---------- Badges ---------- */
.rv .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
.rv .badge-success { background: #dcfce7; color: #166534; }
.rv .badge-danger { background: #fee2e2; color: #991b1b; }
.rv .badge-amber { background: #fef3c7; color: #92400e; }
.rv .badge-blue { background: #dbeafe; color: #1e40af; }
.rv .badge-emerald { background: #d1fae5; color: #065f46; }
.rv .badge-purple { background: #f3e8ff; color: #6b21a5; }
.rv .badge-gray { background: #f1f5f9; color: #475569; }
@media (prefers-color-scheme: dark) {
    .rv .badge-success { background: #14532d; color: #4ade80; }
    .rv .badge-danger { background: #7f1d1d; color: #fca5a5; }
    .rv .badge-amber { background: #78350f; color: #fde68a; }
    .rv .badge-blue { background: #1e3a5f; color: #60a5fa; }
    .rv .badge-emerald { background: #064e3b; color: #34d399; }
    .rv .badge-purple { background: #4c1d95; color: #c084fc; }
    .rv .badge-gray { background: #1e293b; color: #cbd5e1; }
}

/* ---------- Action buttons (table) ---------- */
.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }
.rv .ac-action-btn {
    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
}
.rv .ac-action-edit { color: #10b981; }
.rv .ac-action-delete { color: #ef4444; }
.rv .ac-action-info { color: #1da1e8; }
.rv .ac-action-primary { color: #eab308; }
.rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
.rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
.rv .ac-action-btn.ac-action-info:hover { background: #eff6ff; }
.rv .ac-action-btn.ac-action-primary:hover { background: #fef3c7; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
    .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
    .rv .ac-action-btn.ac-action-info:hover { background: #1e3a5f; }
    .rv .ac-action-btn.ac-action-primary:hover { background: #422006; }
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
.rv .ac-card-btn.ac-action-edit { color: #10b981; }
.rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #ecfdf5; }
.rv .ac-card-btn.ac-action-delete { color: #ef4444; }
.rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #fef2f2; }
.rv .ac-card-btn.ac-action-info { color: #1da1e8; }
.rv .ac-card-btn.ac-action-info:hover, .rv .ac-card-btn.ac-action-info:active { background: #eff6ff; }
.rv .ac-card-btn.ac-action-primary { color: #eab308; }
.rv .ac-card-btn.ac-action-primary:hover, .rv .ac-card-btn.ac-action-primary:active { background: #fef3c7; }
@media (prefers-color-scheme: dark) {
    .rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #064e3b; }
    .rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #7f1d1d; }
    .rv .ac-card-btn.ac-action-info:hover, .rv .ac-card-btn.ac-action-info:active { background: #1e3a5f; }
    .rv .ac-card-btn.ac-action-primary:hover, .rv .ac-card-btn.ac-action-primary:active { background: #422006; }
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
.rv .ac-mcard-price { font-weight: 800; font-size: 1rem; white-space: nowrap; color: var(--acc-tx); }
.rv .ac-mcard-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
.rv .ac-mcard-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rv .ac-mcard-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; font-size: 0.75rem; color: var(--tx-2); }
.rv .ac-mcard-meta span { display: inline-flex; align-items: center; gap: 5px; overflow-wrap: anywhere; }

/* ---------- Cards view ---------- */
.rv .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }
.rv .car-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
    display: flex; flex-direction: column;
}
.rv .car-card:hover { transform: translateY(-3px); box-shadow: 0 16px 30px -14px rgba(0, 0, 0, 0.18); }
.rv .lavage-card { padding: 16px; }
.rv .lavage-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rv .lavage-avatar {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 18px -6px rgba(245, 158, 11, 0.5);
}
.rv .lavage-head-info { min-width: 0; flex: 1; }
.rv .lavage-name { font-weight: 800; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv .lavage-meta-line { margin-top: 4px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.72rem; color: var(--tx-2); }
.rv .lavage-price { font-weight: 900; font-size: 1.1rem; color: var(--acc-tx); white-space: nowrap; }
.rv .lavage-price small { font-size: 0.65rem; font-weight: 600; color: var(--tx-2); }
.rv .lavage-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.rv .lavage-details {
    background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px;
    padding: 10px 12px; margin-bottom: 4px; display: flex; flex-direction: column; gap: 6px;
}
.rv .lavage-info-line { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--tx-2); overflow-wrap: anywhere; }
.rv .lavage-info-line svg { color: var(--tx-3); flex-shrink: 0; }

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
    .rv .ac-filters > .ac-dd { width: 100%; }
    .rv .ac-seg { align-self: stretch; }
    .rv .ac-seg-btn { flex: 1; justify-content: center; }
    .rv .ac-desktop-only { display: none !important; }
    .rv .ac-mobile-only { display: block !important; }
    .rv .cards-grid { grid-template-columns: 1fr; }

    /* iOS : 16px évite le zoom automatique */
    .rv .ac-search input { font-size: 16px; height: 42px; }
    .rv .ac-dd-trigger { font-size: 16px; height: 46px; }
    .rv .ac-sortdir { height: 46px; width: 46px; }
    .rv .inline-input,
    .rv .inline-select,
    .rv .inline-textarea { font-size: 16px; }

    .rv .inline-form-container { margin: 0.6rem; border-radius: 22px; }
    .rv .inline-form-header { padding: 18px 64px 18px 18px; gap: 14px; }
    .rv .inline-form-icon { width: 48px; height: 48px; border-radius: 14px; }
    .rv .inline-form-title h2 { font-size: 1.2rem; }
    .rv .inline-form-close { right: 14px; width: 40px; height: 40px; }
    .rv .inline-form { padding: 16px; }
    .rv .inline-section { padding: 16px; border-radius: 18px; }
    .rv .inline-grid-2 { grid-template-columns: 1fr; }
    .rv .inline-form-footer { flex-direction: column-reverse; padding-bottom: calc(0px + env(safe-area-inset-bottom, 0px)); }
    .rv .inline-form-footer > * { width: 100%; }
    .rv .inline-section-header h3 { white-space: normal; font-size: 0.76rem; }
    .rv .modal-overlay { align-items: flex-end; padding: 0; }
    .rv .modal {
        max-width: 100% !important; max-height: 92vh;
        border-radius: 24px 24px 0 0; border-bottom: 0;
        animation: rvSheet 0.28s ease;
    }
    .rv .delete-actions { flex-direction: column-reverse; }
    .rv .delete-actions { gap: 10px; }
    .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }
    .rv .delete-modal { padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }
    .rv .row-grid-services,
    .rv .row-grid-products { grid-template-columns: 1fr; }
}
@media (max-width: 380px) {
    .rv .inline-form-container { margin: 0.4rem; }
    .rv .inline-form-header { padding: 14px 56px 14px 14px; }
    .rv .inline-form-icon { width: 42px; height: 42px; }
    .rv .inline-form-title h2 { font-size: 1.05rem; }
    .rv .inline-form { padding: 12px; }
}
/* ---------- Boutons photos avant / après ---------- */
.rv .photo-input-hidden { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.rv .photo-btn {
    --pb: #1da1e8; --pb-bg: rgba(29, 161, 232, 0.08); --pb-tx: #0f84c4;
    position: relative; display: flex; align-items: center; gap: 14px; width: 100%;
    min-height: 68px; padding: 12px 16px; text-align: left; cursor: pointer;
    border: 2px dashed var(--pb); border-radius: 16px;
    background: var(--pb-bg); color: var(--tx); font-family: inherit;
    transition: transform 0.12s, background 0.15s, border-style 0.15s, box-shadow 0.15s;
}
.rv .photo-btn-after { --pb: #10b981; --pb-bg: rgba(16, 185, 129, 0.08); --pb-tx: #047857; }
.rv .photo-btn:hover, .rv .photo-btn.drag {
    border-style: solid; transform: translateY(-1px);
    box-shadow: 0 10px 22px -14px var(--pb);
}
.rv .photo-btn.drag { background: var(--pb-bg); box-shadow: 0 0 0 4px var(--pb-bg); }
.rv .photo-btn:active { transform: translateY(2px); }
.rv .photo-btn:focus-visible { outline: 3px solid var(--pb-bg); outline-offset: 2px; }
.rv .photo-btn-ico {
    width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
    background: var(--pb); color: #fff;
    display: flex; align-items: center; justify-content: center;
    transform: rotate(-5deg);
}
.rv .photo-btn-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rv .photo-btn-text strong { font-size: 0.88rem; font-weight: 800; color: var(--pb-tx); }
.rv .photo-btn-text small { font-size: 0.72rem; color: var(--tx-2); font-weight: 600; }
.rv .photo-btn-count {
    margin-left: auto; min-width: 28px; height: 28px; padding: 0 9px; border-radius: 999px;
    background: var(--pb); color: #fff; font-size: 0.78rem; font-weight: 900;
    display: inline-flex; align-items: center; justify-content: center;
}
@media (prefers-color-scheme: dark) {
    .rv .photo-btn { --pb-tx: #7dd3fc; }
    .rv .photo-btn-after { --pb-tx: #6ee7b7; }
}
.rv .photo-previews { gap: 10px; }
.rv .photo-preview { width: 72px; height: 72px; border-radius: 12px; }

/* ---------- Facture : avec / sans cachet ---------- */
.rv .invoice-modal { max-width: 460px; }
.rv .invoice-icon {
    width: 72px; height: 72px; margin: 0 auto 14px; border-radius: 50%;
    background: #f3e8ff; border: 2px solid #8b5cf6; color: #8b5cf6;
    display: flex; align-items: center; justify-content: center;
}
.rv .invoice-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 4px 0 14px; }
.rv .invoice-choice {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    min-height: 132px; padding: 14px 10px; border-radius: 18px;
    border: 1.5px solid var(--line-strong); background: var(--surface-2); color: var(--tx);
    cursor: pointer; font-family: inherit; transition: transform 0.12s, background 0.15s, box-shadow 0.15s;
}
.rv .invoice-choice strong { font-size: 0.92rem; font-weight: 900; }
.rv .invoice-choice small { font-size: 0.72rem; color: var(--tx-2); font-weight: 600; }
.rv .invoice-choice svg { color: var(--tx-2); }
.rv .invoice-choice:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(0, 0, 0, 0.35); }
.rv .invoice-choice:active { transform: translateY(2px); }
.rv .invoice-choice-primary { background: var(--acc); color: #0a0a0a; }
.rv .invoice-choice-primary small { color: rgba(10, 10, 10, 0.7); }
.rv .invoice-choice-primary:hover { background: var(--acc-d); }
.rv .invoice-cachet-preview {
    width: 64px; height: 46px; object-fit: contain; border-radius: 8px;
    background: #fff; padding: 3px; border: 1px solid rgba(10, 10, 10, 0.15);
}
@media (prefers-color-scheme: dark) {
    .rv .invoice-icon { background: rgba(139, 92, 246, 0.18); }
}
@media (max-width: 768px) {
    .rv .invoice-modal .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; }
    .rv .invoice-choice { min-height: 120px; }
}

/* ---------- Bouton voir facture ---------- */
.rv .ac-action-view { color: #0891b2; }
.rv .ac-action-btn.ac-action-view:hover, .rv .ac-card-btn.ac-action-view:hover, .rv .ac-card-btn.ac-action-view:active { background: #cffafe; }
@media (prefers-color-scheme: dark) {
    .rv .ac-action-btn.ac-action-view:hover, .rv .ac-card-btn.ac-action-view:hover, .rv .ac-card-btn.ac-action-view:active { background: rgba(8, 145, 178, 0.25); }
}

@media (prefers-reduced-motion: reduce) {
    .rv *, .rv *::before, .rv *::after { animation: none !important; transition: none !important; }
}
    `}</style>
  );
}