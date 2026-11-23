// src/pages/admin/AdminProducts.jsx
import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  fetchProductSales, recordProductSale, deleteProductSale,
  fetchProductCategories, createProductCategory, updateProductCategory, deleteProductCategory,
  selectProducts, selectProductsStats, selectProductSales, selectProductCategories,
  api,
} from '../../Redux/store';
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import InvoiceViewPage, { downloadInvoice } from '../../components/invoice/InvoiceDocument';
import cachetImage from '../../assets/cache2.png';
import {
  Package, Plus, Pencil, Trash2, X, ShoppingCart, AlertTriangle,
  Droplet, Droplets, Filter, Wrench, Tag, Layers, CheckCircle2, RefreshCw,
  Save, Sparkles, Image as ImageIcon, FileText, Car, User,
  Search, List, LayoutGrid, ChevronDown, Check, ArrowUp, ArrowDown,
  ArrowUpDown, Info, DollarSign, TrendingUp, AlertCircle, Building2,
  CheckCircle, XCircle, Warehouse, Calendar, CreditCard, Star,
  History, Receipt, Eye,
} from 'lucide-react';

/* ============================================================ */
const ICON_MAP = { Droplet, Droplets, Filter, Wrench, Package, Tag, Layers };
const getCategoryIcon = (iconName) => ICON_MAP[iconName] || Package;

const ICON_OPTIONS  = ['Droplet', 'Droplets', 'Filter', 'Wrench', 'Package', 'Tag', 'Layers'];
const COLOR_OPTIONS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#64748b', '#ec4899', '#14b8a6'];

const EMPTY_PRODUCT = {
  name: '', reference: '', description: '', category_id: '',
  unit: 'unité', purchase_price: 0, selling_price: 0,
  stock_quantity: 0, alert_threshold: 5, image: '', is_active: true,
  stock_reason: '', volume_per_unit: '', open_volume: 0,
};
const EMPTY_CATEGORY = {
  name: '', slug: '', color: '#64748b', icon: 'Package',
  description: '', is_active: true, sort_order: 0,
};

/* Facture : voir src/components/invoice/InvoiceDocument.jsx */

/* ============================================================
   Choix : facture avec ou sans cachet (cachet = assets/cache2.png)
   ============================================================ */
const InvoiceCachetModal = ({ subtitle, onClose, onChoose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal delete-modal invoice-modal" onClick={(e) => e.stopPropagation()}>
      <div className="invoice-icon"><Receipt size={32} /></div>
      <h3 className="delete-title">Télécharger la facture</h3>
      <p className="delete-message">
        {subtitle && <><span className="reservation-id">{subtitle}</span><br /></>}
        Voulez-vous la facture avec ou sans cachet ?
      </p>
      <div className="invoice-choices">
        <button type="button" className="invoice-choice" onClick={() => onChoose(false)}>
          <FileText size={26} />
          <strong>Sans cachet</strong>
          <small>Facture simple</small>
        </button>
        <button type="button" className="invoice-choice invoice-choice-primary" onClick={() => onChoose(true)}>
          <img src={cachetImage} alt="" className="invoice-cachet-preview" />
          <strong>Avec cachet</strong>
          <small>Cachet de l'agence</small>
        </button>
      </div>
      <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose} style={{ width: '100%' }}>
        Annuler
      </button>
    </div>
  </div>
);

const stockText = (p) =>
  `${p.stock_quantity} ${p.unit || ''}`.trim() +
  (Number(p.volume_per_unit) > 0 ? ` · ${Number(p.total_volume ?? 0).toFixed(2)} L` : '');

const saleClientName = (s) => {
  const n = (s.client_name || '').trim();
  if (n) return n;
  if (s.client) return `${s.client.prenom || ''} ${s.client.nom || ''}`.trim() || '—';
  return '—';
};

const buildSaleInvoice = (s) => ({
  number: `FAC-V-${String(s.id).padStart(5, '0')}`,
  date: s.sale_date,
  clientName: saleClientName(s),
  lines: [{
    label: s.product?.name || 'Produit',
    qty: s.quantity,
    unit: Number(s.unit_price) || 0,
    total: Number(s.total_price) || 0,
  }],
  total: Number(s.total_price) || 0,
  paid: Number(s.amount_paid) || 0,
  notes: s.notes || '',
});

/* ---- Historique de stock ---- */
const movementInfo = (m) => {
  const q = Number(m.quantity) || 0;
  let signed; let tone; let label;
  if (m.type === 'in') { signed = Math.abs(q); tone = 'in'; label = 'Entrée'; }
  else if (m.type === 'out') { signed = -Math.abs(q); tone = 'out'; label = 'Sortie'; }
  else { signed = q; tone = q >= 0 ? 'in' : 'out'; label = 'Ajustement'; }

  const who = m.client_name ? ` — ${m.client_name}` : '';
  let source = 'Mise à jour manuelle du stock';
  if (m.lavage_id) source = `Lavage #${m.lavage_id}${who}`;
  else if (m.product_sale_id) source = `Vente #${m.product_sale_id}${who}`;
  else if (m.reason) source = m.reason;
  const reason = (m.lavage_id || m.product_sale_id) && m.reason ? m.reason : '';
  const volume = m.volume !== null && m.volume !== undefined ? Number(m.volume) : null;
  return { label, signed, tone, source, reason, volume };
};

const SORT_OPTIONS = [
  { value: 'id',             label: 'ID' },
  { value: 'name',           label: 'Nom' },
  { value: 'purchase_price', label: 'Prix achat' },
  { value: 'selling_price',  label: 'Prix vente' },
  { value: 'stock_quantity', label: 'Stock' },
];

/* ============================================================ */
/* Dropdown personnalisé                                         */
/* ============================================================ */
const AcSelect = ({ value, onChange, options, id, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (ev) => {
      if (ev.type === 'keydown') {
        if (ev.key === 'Escape') setOpen(false);
        return;
      }
      if (ref.current && !ref.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [open]);

  const current = options.find((o) => String(o.value) === String(value)) || options[0];

  return (
    <div className="ac-dd" ref={ref}>
      <button
        type="button" id={id}
        className={`ac-dd-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
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
                  className={`ac-dd-item ${active ? 'active' : ''}`}
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

/* ============================================================ */
export default function AdminProducts() {
  const dispatch = useDispatch();
  const products   = useSelector(selectProducts);
  const stats      = useSelector(selectProductsStats);
  const sales      = useSelector(selectProductSales);
  const categories = useSelector(selectProductCategories);

  const [tab, setTab] = useState('products');

  /* ---- Forms ---- */
  const [showProductModal, setShowProductModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);

  const [saleModal, setSaleModal] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [saleForm, setSaleForm] = useState({
    product_id: '', client_name: '',
    quantity: 1, unit_price: 0, payment_status: 'paid',
    amount_paid: 0, notes: '', sale_date: new Date().toISOString().slice(0, 10),
  });

  /* ---- Historique stock ---- */
  const [historyProduct, setHistoryProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ---- Filters / sort / pagination ---- */
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  /* ---- Delete modal ---- */
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
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchProducts(true));
    dispatch(fetchProductCategories(true));
    dispatch(fetchProductSales());
  }, [dispatch]);

  useResetScrollOnOpen([
  showProductModal,
  showCategoryModal,
  saleModal,
  historyProduct,
  deleteModalOpen,
  viewSale,
]);

  /* ============================================================ */
  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };
  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />;
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
          p.name?.toLowerCase().includes(s) ||
          p.reference?.toLowerCase().includes(s) ||
          (p.category?.name || '').toLowerCase().includes(s)
        );
      })
      .sort((a, b) => {
        let aVal, bVal;
        switch (sortField) {
          case 'id': aVal = a.id; bVal = b.id; break;
          case 'name': aVal = (a.name || '').toLowerCase(); bVal = (b.name || '').toLowerCase(); break;
          case 'purchase_price': aVal = Number(a.purchase_price) || 0; bVal = Number(b.purchase_price) || 0; break;
          case 'selling_price': aVal = Number(a.selling_price) || 0; bVal = Number(b.selling_price) || 0; break;
          case 'stock_quantity': aVal = Number(a.stock_quantity) || 0; bVal = Number(b.stock_quantity) || 0; break;
          default: aVal = a.id; bVal = b.id;
        }
        if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
  }, [products, searchTerm, sortField, sortDirection]);

  const historyTotals = useMemo(() => {
    let inQ = 0; let outQ = 0; let inL = 0; let outL = 0;
    movements.forEach((m) => {
      const info = movementInfo(m);
      if (info.volume !== null) {
        if (info.volume >= 0) inL += info.volume; else outL += Math.abs(info.volume);
      } else if (info.signed >= 0) inQ += info.signed;
      else outQ += Math.abs(info.signed);
    });
    return { inQ, outQ, inL, outL };
  }, [movements]);

  const openHistory = async (p) => {
    setHistoryProduct(p);
    setMovements([]);
    setHistoryLoading(true);
    try {
      const r = await api.get(`/products/${p.id}/stock-movements`);
      const list = r.data?.movements || r.data?.data || r.data || [];
      setMovements(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Impossible de charger l'historique");
    } finally {
      setHistoryLoading(false);
    }
  };

  const itemsPerView = viewMode === 'list' ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerView);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerView,
    currentPage * itemsPerView
  );

  /* ============================================================ */
  /* Actions produits                                              */
  /* ============================================================ */
  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_PRODUCT, category_id: categories[0]?.id || '' });
    setShowProductModal(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...EMPTY_PRODUCT, ...p, category_id: p.category_id || '', image: '', stock_reason: '' });
    setShowProductModal(true);
  };
  const submitProduct = (e) => {
    e.preventDefault();
    return runBusy("submitProduct", () => runSubmitProduct(e));
  };
  const runSubmitProduct = async (e) => {
    e.preventDefault();
    const payload = { ...form, category_id: Number(form.category_id) };
    const liquid = Number(form.volume_per_unit) > 0;
    payload.volume_per_unit = liquid ? Number(form.volume_per_unit) : null;
    payload.open_volume = liquid ? Number(form.open_volume) || 0 : 0;
    if (!payload.image) delete payload.image;
    const stockChanged = !!editing && Number(payload.stock_quantity) !== Number(editing.stock_quantity);
    if (!stockChanged || !String(payload.stock_reason || '').trim()) delete payload.stock_reason;
    if (!payload.category_id) return toast.error('Sélectionnez une catégorie');

    const action = editing
      ? updateProduct({ id: editing.id, data: payload })
      : createProduct(payload);
    const res = await dispatch(action);
    if (res.error) toast.error(res.payload);
    else {
      toast.success(editing
        ? (stockChanged ? 'Produit mis à jour — mouvement de stock enregistré' : 'Produit mis à jour')
        : 'Produit créé');
      setShowProductModal(false);
      await dispatch(fetchProducts(true));
    }
  };
  const imageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  /* ============================================================ */
  /* Actions catégories                                            */
  /* ============================================================ */
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY);
    setShowCategoryModal(true);
  };
  const openEditCategory = (c) => {
    setEditingCategory(c);
    setCategoryForm({
      name: c.name, slug: c.slug, color: c.color || '#64748b',
      icon: c.icon || 'Package', description: c.description || '',
      is_active: c.is_active, sort_order: c.sort_order || 0,
    });
    setShowCategoryModal(true);
  };
  const submitCategory = (e) => {
    e.preventDefault();
    return runBusy("submitCategory", () => runSubmitCategory(e));
  };
  const runSubmitCategory = async (e) => {
    e.preventDefault();
    const action = editingCategory
      ? updateProductCategory({ id: editingCategory.id, data: categoryForm })
      : createProductCategory(categoryForm);
    const res = await dispatch(action);
    if (res.error) toast.error(res.payload);
    else {
      toast.success(editingCategory ? 'Catégorie mise à jour' : 'Catégorie créée');
      setShowCategoryModal(false);
      await dispatch(fetchProductCategories(true));
    }
  };

  /* ============================================================ */
  /* Actions ventes                                                */
  /* ============================================================ */
  const openSale = (product) => {
    setSaleForm({
      product_id: product.id, client_name: '',
      quantity: 1, unit_price: product.selling_price, payment_status: 'paid',
      amount_paid: product.selling_price, notes: '',
      sale_date: new Date().toISOString().slice(0, 10),
    });
    setSaleModal(true);
  };
  const onSaleProductChange = (id) => {
    const prod = products.find((p) => String(p.id) === String(id));
    setSaleForm((f) => ({ ...f, product_id: id, unit_price: prod ? prod.selling_price : f.unit_price }));
  };
  const submitSale = (e) => {
    e.preventDefault();
    return runBusy("submitSale", () => runSubmitSale(e));
  };
  const runSubmitSale = async (e) => {
    e.preventDefault();
    if (!saleForm.product_id) return toast.error('Sélectionnez un produit');
    const qty = Number(saleForm.quantity);
    const unit = Number(saleForm.unit_price);
    const total = qty * unit;
    const payload = {
      ...saleForm,
      product_id: Number(saleForm.product_id),
      client_name: (saleForm.client_name || '').trim(),
      quantity: qty,
      unit_price: unit,
      amount_paid:
        saleForm.payment_status === 'paid' ? total
        : saleForm.payment_status === 'unpaid' ? 0
        : Number(saleForm.amount_paid) || 0,
    };
    if (!payload.client_name) delete payload.client_name;
    const res = await dispatch(recordProductSale(payload));
    if (res.error) toast.error(res.payload);
    else {
      toast.success('Vente enregistrée');
      setSaleModal(false);
      await dispatch(fetchProducts(true));
      await dispatch(fetchProductSales());
    }
  };

  /* ============================================================ */
  const askDelete = (type, item) => {
    setDeleteTarget({ type, item });
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
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;
    try {
      if (type === 'product') {
        const res = await dispatch(deleteProduct(item.id));
        if (res.error) toast.error(res.payload);
        else { toast.success('Produit supprimé'); await dispatch(fetchProducts(true)); }
      } else if (type === 'category') {
        const count = item.products_count || 0;
        let payload = { id: item.id, force: false, move_to_category_id: null };
        if (count > 0) {
          const fallback = categories.find((c) => c.id !== item.id);
          payload = { id: item.id, force: true, move_to_category_id: fallback?.id || null };
        }
        const res = await dispatch(deleteProductCategory(payload));
        if (res.error) toast.error(res.payload);
        else {
          toast.success('Catégorie supprimée');
          await dispatch(fetchProductCategories(true));
          await dispatch(fetchProducts(true));
        }
      } else if (type === 'sale') {
        const res = await dispatch(deleteProductSale(item.id));
        if (res.error) toast.error(res.payload);
        else {
          toast.success('Vente annulée');
          await dispatch(fetchProducts(true));
          await dispatch(fetchProductSales());
        }
      }
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  /* ============================================================ */
  const statCards = [
    { label: 'Produits',     value: stats.total_products || 0,                            icon: <Package size={20} />,     color: 'blue' },
    { label: 'Stock bas',    value: stats.low_stock || 0,                                 icon: <AlertCircle size={20} />, color: 'amber' },
    { label: 'Rupture',      value: stats.out_of_stock || 0,                              icon: <XCircle size={20} />,     color: 'red' },
    { label: 'Valeur stock', value: `${Number(stats.inventory_value || 0).toFixed(0)} DH`, icon: <DollarSign size={20} />,  color: 'cyan' },
    { label: 'Catégories',   value: categories.length,                                    icon: <Tag size={20} />,         color: 'violet' },
  ];

  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === 'list' ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredProducts.length}
      />
    </div>
  );

  const anyModalOpen = showProductModal || showCategoryModal || saleModal || !!historyProduct || !!viewSale;

  /* ============================================================ */
  return (
    <div className="rv">
      {/* ============ FORM PRODUIT ============ */}
      {showProductModal && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editing ? <Sparkles size={28} /> : <Star size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editing ? 'Modifier produit' : 'Nouveau produit'}</h2>
              <p>{editing ? editing.name : 'Ajouter un produit au catalogue'}</p>
            </div>
            <button
              type="button" className="inline-form-close"
              onClick={() => setShowProductModal(false)} aria-label="Fermer"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={submitProduct} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Package size={18} /><h3>Informations produit</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Nom *</label>
                      <input required className="inline-input" value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Référence</label>
                      <input className="inline-input" value={form.reference || ''}
                        onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                    </div>
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Catégorie *</label>
                      <select required className="inline-select" value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                        <option value="">— Sélectionner une catégorie —</option>
                        {categories.filter((c) => c.is_active).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><Tag size={18} /><h3>Stock & tarifs</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Unité</label>
                      <input className="inline-input" value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Contenance par unité (L)</label>
                      <input type="number" min="0" step="0.01" className="inline-input"
                        placeholder="Ex: 5 pour un bidon de 5 L (vide si non liquide)"
                        value={form.volume_per_unit ?? ''}
                        onChange={(e) => setForm({ ...form, volume_per_unit: e.target.value })} />
                    </div>
                    {Number(form.volume_per_unit) > 0 && (
                      <>
                        <div className="inline-field">
                          <label>Volume déjà entamé (L)</label>
                          <input type="number" min="0" step="0.01" className="inline-input"
                            value={form.open_volume ?? 0}
                            onChange={(e) => setForm({ ...form, open_volume: e.target.value })} />
                        </div>
                        <div className="inline-info-msg" style={{ gridColumn: '1 / -1', marginTop: 0 }}>
                          <Droplet size={16} />
                          <span>
                            Total disponible :{' '}
                            <b>{((Number(form.stock_quantity) || 0) * Number(form.volume_per_unit) + (Number(form.open_volume) || 0)).toFixed(2)} L</b>
                            {' '}({Number(form.stock_quantity) || 0} × {Number(form.volume_per_unit)} L + {Number(form.open_volume) || 0} L entamé)
                          </span>
                        </div>
                      </>
                    )}
                    <div className="inline-field">
                      <label>Stock{Number(form.volume_per_unit) > 0 ? ' (unités fermées)' : ''}</label>
                      <input type="number" min="0" className="inline-input" value={form.stock_quantity}
                        onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
                    </div>
                    {editing && Number(form.stock_quantity) !== Number(editing.stock_quantity) && (
                      <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Motif du changement de stock ({editing.stock_quantity} → {Number(form.stock_quantity) || 0})</label>
                        <input className="inline-input" placeholder="Ex: Réception fournisseur, inventaire, casse…"
                          value={form.stock_reason || ''}
                          onChange={(e) => setForm({ ...form, stock_reason: e.target.value })} />
                      </div>
                    )}
                    <div className="inline-field">
                      <label>Prix achat (DH) *</label>
                      <input required type="number" min="0" step="0.01" className="inline-input"
                        value={form.purchase_price}
                        onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Prix vente (DH) *</label>
                      <input required type="number" min="0" step="0.01" className="inline-input"
                        value={form.selling_price}
                        onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Seuil alerte</label>
                      <input type="number" min="0" className="inline-input" value={form.alert_threshold}
                        onChange={(e) => setForm({ ...form, alert_threshold: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <select className="inline-select" value={form.is_active ? '1' : '0'}
                        onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}>
                        <option value="1">✅ Actif</option>
                        <option value="0">❌ Inactif</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><ImageIcon size={18} /><h3>Média</h3></div>
                  <div className="image-upload-area"
                    onClick={() => document.getElementById('productImageInput').click()}>
                    <ImageIcon size={32} />
                    <p>Cliquez pour télécharger une image</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>PNG, JPG</p>
                    <input type="file" id="productImageInput" accept="image/*"
                      onChange={imageChange} style={{ display: 'none' }} />
                  </div>
                  {form.image && (
                    <div className="image-preview-container">
                      <img src={form.image} alt="" className="image-preview" />
                      <button type="button" className="remove-image-btn"
                        onClick={() => setForm({ ...form, image: '' })}>
                        <X size={14} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><FileText size={18} /><h3>Description</h3></div>
                  <div className="inline-field">
                    <textarea rows={6} className="inline-input"
                      style={{ resize: 'vertical', minHeight: 100 }}
                      value={form.description || ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" disabled={!!busy.submitProduct}
                onClick={() => setShowProductModal(false)}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={!!busy.submitProduct}>
                {busy.submitProduct ? (<><span className="btn-spinner" /> Traitement...</>) : (<><Save size={16} /> Enregistrer</>)}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ FORM CATÉGORIE ============ */}
      {showCategoryModal && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><Tag size={28} /></div>
            <div className="inline-form-title">
              <h2>{editingCategory ? 'Modifier catégorie' : 'Nouvelle catégorie'}</h2>
              <p>Organiser les produits par catégorie</p>
            </div>
            <button type="button" className="inline-form-close"
              onClick={() => setShowCategoryModal(false)} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={submitCategory} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Tag size={18} /><h3>Informations</h3></div>
                  <div className="inline-field">
                    <label>Nom *</label>
                    <input required className="inline-input" value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
                  </div>
                  <div className="inline-grid-2" style={{ marginTop: '0.75rem' }}>
                    <div className="inline-field">
                      <label>Ordre d'affichage</label>
                      <input type="number" min="0" className="inline-input" value={categoryForm.sort_order}
                        onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <select className="inline-select" value={categoryForm.is_active ? '1' : '0'}
                        onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.value === '1' })}>
                        <option value="1">✅ Actif</option>
                        <option value="0">❌ Inactif</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><FileText size={18} /><h3>Description</h3></div>
                  <div className="inline-field">
                    <textarea rows={4} className="inline-input"
                      style={{ resize: 'vertical', minHeight: 100 }}
                      value={categoryForm.description || ''}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Tag size={18} /><h3>Apparence</h3></div>
                  <div className="inline-field">
                    <label>Couleur</label>
                    <div className="color-swatches">
                      {COLOR_OPTIONS.map((color) => (
                        <button key={color} type="button"
                          className={`color-swatch ${categoryForm.color === color ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setCategoryForm({ ...categoryForm, color })}
                          aria-label={`Couleur ${color}`} />
                      ))}
                    </div>
                  </div>
                  <div className="inline-field" style={{ marginTop: '0.75rem' }}>
                    <label>Icône</label>
                    <div className="icon-picker">
                      {ICON_OPTIONS.map((iconName) => {
                        const Icon = ICON_MAP[iconName];
                        return (
                          <button key={iconName} type="button"
                            className={`icon-pick-btn ${categoryForm.icon === iconName ? 'active' : ''}`}
                            onClick={() => setCategoryForm({ ...categoryForm, icon: iconName })}
                            title={iconName}>
                            <Icon size={18} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="preview-row">
                    Aperçu :
                    {(() => {
                      const Icon = getCategoryIcon(categoryForm.icon);
                      return (
                        <span className="category-badge"
                          style={{ backgroundColor: `${categoryForm.color}22`, color: categoryForm.color }}>
                          <Icon size={12} /> {categoryForm.name || 'Nom'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" disabled={!!busy.submitCategory}
                onClick={() => setShowCategoryModal(false)}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={!!busy.submitCategory}>
                {busy.submitCategory ? (<><span className="btn-spinner" /> Traitement...</>) : (<><Save size={16} /> Enregistrer</>)}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ FORM VENTE ============ */}
      {saleModal && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><ShoppingCart size={28} /></div>
            <div className="inline-form-title">
              <h2>Nouvelle vente</h2>
              <p>Enregistrer une vente de produit</p>
            </div>
            <button type="button" className="inline-form-close"
              onClick={() => setSaleModal(false)} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={submitSale} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><ShoppingCart size={18} /><h3>Détails de la vente</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Produit *</label>
                      <select required className="inline-select" value={saleForm.product_id}
                        onChange={(e) => onSaleProductChange(e.target.value)}>
                        <option value="">— Sélectionner un produit —</option>
                        {products.filter((p) => p.is_active !== false).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({stockText(p)})</option>
                        ))}
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Date *</label>
                      <input type="date" required className="inline-input" value={saleForm.sale_date}
                        onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Quantité *</label>
                      <input type="number" min="1" required className="inline-input" value={saleForm.quantity}
                        onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Prix unitaire *</label>
                      <input type="number" min="0" step="0.01" required className="inline-input"
                        value={saleForm.unit_price}
                        onChange={(e) => setSaleForm({ ...saleForm, unit_price: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Paiement</label>
                      <select className="inline-select" value={saleForm.payment_status}
                        onChange={(e) => setSaleForm({ ...saleForm, payment_status: e.target.value })}>
                        <option value="paid">Payé</option>
                        <option value="partial">Partiel</option>
                        <option value="unpaid">Non payé</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Montant payé</label>
                      <input type="number" min="0" step="0.01" className="inline-input"
                        disabled={saleForm.payment_status !== 'partial'}
                        value={saleForm.amount_paid}
                        onChange={(e) => setSaleForm({ ...saleForm, amount_paid: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><User size={18} /><h3>Client</h3></div>
                  <div className="inline-field">
                    <label>Nom du client</label>
                    <input className="inline-input" placeholder="Saisir le nom du client"
                      value={saleForm.client_name}
                      onChange={(e) => setSaleForm({ ...saleForm, client_name: e.target.value })} />
                  </div>
                  <div className="inline-field" style={{ marginTop: '0.75rem' }}>
                    <label>Notes</label>
                    <textarea rows={3} className="inline-input"
                      style={{ resize: 'vertical', minHeight: 80 }}
                      value={saleForm.notes}
                      onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })} />
                  </div>
                </div>

                <div className="inline-info-msg">
                  <Info size={16} />
                  <span>
                    Total : <b>{(Number(saleForm.quantity) * Number(saleForm.unit_price)).toFixed(2)} DH</b>
                  </span>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" disabled={!!busy.submitSale}
                onClick={() => setSaleModal(false)}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={!!busy.submitSale}>
                {busy.submitSale ? (<><span className="btn-spinner" /> Traitement...</>) : (<><Save size={16} /> Valider la vente</>)}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ HISTORIQUE STOCK ============ */}
      {historyProduct && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon"><History size={28} /></div>
            <div className="inline-form-title">
              <h2>Historique du stock</h2>
              <p>{historyProduct.name} — stock actuel : {stockText(historyProduct)}</p>
            </div>
            <button type="button" className="inline-form-close"
              onClick={() => setHistoryProduct(null)} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <div className="inline-form">
            <div className="hist-summary">
              <div className="hist-chip hist-in"><span>Entrées</span><b>+{historyTotals.inQ}</b></div>
              <div className="hist-chip hist-out"><span>Sorties</span><b>-{historyTotals.outQ}</b></div>
              {(historyTotals.outL > 0 || historyTotals.inL > 0) && (
                <div className="hist-chip hist-out"><span>Litres utilisés</span><b>-{historyTotals.outL.toFixed(2)} L</b></div>
              )}
              <div className="hist-chip"><span>Mouvements</span><b>{movements.length}</b></div>
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><History size={18} /><h3>Où est partie la quantité</h3></div>
              {historyLoading ? (
                <div className="inline-empty-hint">Chargement…</div>
              ) : movements.length === 0 ? (
                <div className="inline-empty-hint">Aucun mouvement enregistré pour ce produit</div>
              ) : (
                <div className="mv-list">
                  {movements.map((m) => {
                    const info = movementInfo(m);
                    return (
                      <div key={m.id} className="mv-item">
                        <div className={`mv-icon mv-${info.tone}`}>
                          {info.tone === 'in' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                        </div>
                        <div className="mv-body">
                          <div className="mv-title">
                            <span className={`mv-tag mv-tag-${m.type}`}>{info.label}</span>
                            <span className="mv-source">{info.source}</span>
                          </div>
                          {info.reason && <div className="mv-reason">{info.reason}</div>}
                          <div className="mv-meta">
                            <Calendar size={11} />
                            {m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : '—'}
                            {m.created_by && <> · par {m.created_by}</>}
                          </div>
                        </div>
                        <div className="mv-qty">
                          <div className={`mv-qty-val mv-${info.tone}-tx`}>
                            {info.volume !== null
                              ? `${info.volume > 0 ? '+' : ''}${info.volume.toFixed(2)} L`
                              : `${info.signed > 0 ? '+' : ''}${info.signed}`}
                          </div>
                          <div className="mv-after">
                            Stock : {m.stock_after}
                            {info.volume !== null && info.signed !== 0 && ` · ${Math.abs(info.signed)} unité(s) ${info.signed < 0 ? 'ouverte(s)' : 'reconstituée(s)'}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn"
                onClick={() => setHistoryProduct(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ LISTE PRINCIPALE ============ */}
      {!anyModalOpen && (
        <div className="ac-wrap">
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><Package size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">Produits & Stock</h1>
                <p className="rv-sub">Huile, AdBlue, filtres, accessoires…</p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button type="button" className="ac-btn"
                onClick={async () => {
                  await dispatch(fetchProducts(true));
                  await dispatch(fetchProductCategories(true));
                  await dispatch(fetchProductSales());
                  toast.success('Liste actualisée');
                }}>
                <RefreshCw size={15} />
                <span className="ac-btn-text">Actualiser</span>
              </button>
              {tab === 'products' && (
                <button type="button" className="ac-btn ac-btn-primary" onClick={openCreate}>
                  <Plus size={15} /><span className="ac-btn-text">Nouveau produit</span>
                </button>
              )}
              {tab === 'categories' && (
                <button type="button" className="ac-btn ac-btn-primary" onClick={openCreateCategory}>
                  <Plus size={15} /><span className="ac-btn-text">Nouvelle catégorie</span>
                </button>
              )}
              {tab === 'sales' && (
                <button type="button" className="ac-btn ac-btn-primary"
                  onClick={() => {
                    if (products.length === 0) return toast.error("Ajoutez un produit d'abord");
                    openSale(products[0]);
                  }}>
                  <Plus size={15} /><span className="ac-btn-text">Nouvelle vente</span>
                </button>
              )}
            </div>
          </div>

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

          <div className="rv-tabs">
            <button type="button" className={`rv-tab-btn ${tab === 'products' ? 'active' : ''}`}
              onClick={() => { setTab('products'); setCurrentPage(1); }}>
              <Package size={14} /> Catalogue
            </button>
            <button type="button" className={`rv-tab-btn ${tab === 'categories' ? 'active' : ''}`}
              onClick={() => setTab('categories')}>
              <Tag size={14} /> Catégories ({categories.length})
            </button>
            <button type="button" className={`rv-tab-btn ${tab === 'sales' ? 'active' : ''}`}
              onClick={() => setTab('sales')}>
              <ShoppingCart size={14} /> Ventes
            </button>
          </div>

          {/* ============================================================ */}
          {/* ONGLET PRODUITS                                              */}
          {/* ============================================================ */}
          {tab === 'products' && (
            <>
              <div className="ac-filters">
                <div className="ac-search">
                  <Search size={16} />
                  <input type="text"
                    placeholder="Rechercher par nom, référence, catégorie..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                  {searchTerm && (
                    <button type="button" className="ac-search-clear"
                      onClick={() => { setSearchTerm(''); setCurrentPage(1); }} aria-label="Effacer">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="ac-seg" role="group" aria-label="Affichage">
                  <button type="button"
                    className={`ac-seg-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => { setViewMode('list'); setCurrentPage(1); }}>
                    <List size={15} /> <span>Liste</span>
                  </button>
                  <button type="button"
                    className={`ac-seg-btn ${viewMode === 'cards' ? 'active' : ''}`}
                    onClick={() => { setViewMode('cards'); setCurrentPage(1); }}>
                    <LayoutGrid size={15} /> <span>Cartes</span>
                  </button>
                </div>
              </div>

              <div className="ac-meta">
                <p><strong>{filteredProducts.length}</strong> produit(s) trouvé(s)</p>
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
                            <th onClick={() => handleSort('id')} className="sortable-header">ID {getSortIcon('id')}</th>
                            <th>Produit</th>
                            <th>Catégorie</th>
                            <th onClick={() => handleSort('purchase_price')} className="sortable-header">Prix achat {getSortIcon('purchase_price')}</th>
                            <th onClick={() => handleSort('selling_price')} className="sortable-header">Prix vente {getSortIcon('selling_price')}</th>
                            <th onClick={() => handleSort('stock_quantity')} className="sortable-header">Stock {getSortIcon('stock_quantity')}</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProducts.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="ac-empty-cell">
                                <Package size={40} /><p>Aucun produit trouvé</p>
                              </td>
                            </tr>
                          ) : (
                            paginatedProducts.map((p) => {
                              const cat = p.category || categories.find((c) => c.id === p.category_id);
                              const Icon = cat ? getCategoryIcon(cat.icon) : Package;
                              return (
                                <tr key={p.id}>
                                  <td><span className="ac-id">#{p.id}</span></td>
                                  <td>
                                    <div className="flex items-center gap-1">
                                      {p.image_url ? (
                                        <img src={p.image_url} alt="" className="car-thumbnail" />
                                      ) : (
                                        <div className="car-thumbnail-placeholder"><Package size={18} /></div>
                                      )}
                                      <div>
                                        <div className="ac-strong">{p.name}</div>
                                        {p.reference && (
                                          <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>{p.reference}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    {cat ? (
                                      <span className="category-badge"
                                        style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                                        <Icon size={12} /> {cat.name}
                                      </span>
                                    ) : <span style={{ color: 'var(--tx-3)' }}>—</span>}
                                  </td>
                                  <td>{Number(p.purchase_price).toFixed(2)} DH</td>
                                  <td><span className="ac-price-pill">{Number(p.selling_price).toFixed(2)} DH</span></td>
                                  <td>
                                    <span style={{ color: p.is_low_stock ? '#dc2626' : 'var(--tx)', fontWeight: p.is_low_stock ? 700 : 400 }}>
                                      {stockText(p)}
                                    </span>
                                    {p.is_low_stock && (
                                      <AlertTriangle size={14}
                                        style={{ marginLeft: 4, color: '#f59e0b', display: 'inline', verticalAlign: 'middle' }} />
                                    )}
                                  </td>
                                  <td className="text-right">
                                    <div className="ac-actions">
                                      <button type="button" className="ac-action-btn ac-action-sell"
                                        onClick={() => openSale(p)} title="Vendre">
                                        <ShoppingCart size={15} />
                                      </button>
                                      <button type="button" className="ac-action-btn ac-action-history"
                                        onClick={() => openHistory(p)} title="Historique du stock">
                                        <History size={15} />
                                      </button>
                                      <button type="button" className="ac-action-btn ac-action-edit"
                                        onClick={() => openEdit(p)} title="Modifier">
                                        <Pencil size={15} />
                                      </button>
                                      <button type="button" className="ac-action-btn ac-action-delete"
                                        onClick={() => askDelete('product', p)} title="Supprimer">
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
                      <label htmlFor="prod-sort">Trier</label>
                      <AcSelect id="prod-sort" ariaLabel="Trier par"
                        value={sortField} onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
                      <button type="button" className="ac-sortdir"
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        aria-label={sortDirection === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}>
                        {sortDirection === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                      </button>
                    </div>
                    {paginatedProducts.length === 0 ? (
                      <div className="ac-empty-card"><Package size={40} /><p>Aucun produit trouvé</p></div>
                    ) : (
                      <div className="ac-mcards">
                        {paginatedProducts.map((p) => {
                          const cat = p.category || categories.find((c) => c.id === p.category_id);
                          const Icon = cat ? getCategoryIcon(cat.icon) : Package;
                          return (
                            <div key={p.id} className="ac-mcard">
                              <div className="ac-mcard-head">
                                {p.image_url ? (
                                  <img src={p.image_url} alt="" className="ac-mcard-thumb" />
                                ) : (
                                  <div className="ac-mcard-thumb ac-mcard-thumb-empty"><Package size={22} /></div>
                                )}
                                <div className="ac-mcard-info">
                                  <div className="ac-mcard-name">{p.name}</div>
                                  <div className="ac-mcard-sub">
                                    <span className="ac-id">#{p.id}</span>
                                    {p.reference && (
                                      <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--tx-3)' }}>
                                        {p.reference}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="ac-mcard-price">
                                  {Number(p.selling_price).toFixed(2)}<small> DH</small>
                                </div>
                              </div>
                              <div className="ac-mcard-badges">
                                {cat && (
                                  <span className="category-badge"
                                    style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                                    <Icon size={12} /> {cat.name}
                                  </span>
                                )}
                                {p.is_low_stock ? (
                                  <span className="badge badge-amber"><AlertTriangle size={12} /> Stock bas</span>
                                ) : (
                                  <span className="badge badge-success"><CheckCircle size={12} /> En stock</span>
                                )}
                              </div>
                              <div className="ac-mcard-meta">
                                <span><DollarSign size={13} /> Achat : {Number(p.purchase_price).toFixed(2)} DH</span>
                                <span><Package size={13} /> {stockText(p)}</span>
                              </div>
                              <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                <button type="button" onClick={() => openSale(p)} className="ac-card-btn ac-action-sell">
                                  <ShoppingCart size={17} /><span>Vendre</span>
                                </button>
                                <button type="button" onClick={() => openHistory(p)} className="ac-card-btn ac-action-history">
                                  <History size={17} /><span>Historique</span>
                                </button>
                                <button type="button" onClick={() => openEdit(p)} className="ac-card-btn ac-action-edit">
                                  <Pencil size={17} /><span>Modifier</span>
                                </button>
                                <button type="button" onClick={() => askDelete('product', p)} className="ac-card-btn ac-action-delete">
                                  <Trash2 size={17} /><span>Suppr.</span>
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
                    <label htmlFor="prod-sort">Trier</label>
                    <AcSelect id="prod-sort" ariaLabel="Trier par"
                      value={sortField} onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
                    <button type="button" className="ac-sortdir"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>
                      {sortDirection === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                    </button>
                  </div>
                  {paginatedProducts.length === 0 ? (
                    <div className="ac-empty-card"><Package size={40} /><p>Aucun produit trouvé</p></div>
                  ) : (
                    <div className="cards-grid">
                      {paginatedProducts.map((p) => {
                        const cat = p.category || categories.find((c) => c.id === p.category_id);
                        const Icon = cat ? getCategoryIcon(cat.icon) : Package;
                        return (
                          <div key={p.id} className="car-card">
                            <div className="card-image">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} />
                              ) : (
                                <Package size={64} style={{ color: 'var(--tx-3)' }} />
                              )}
                              <div className="card-status">
                                {p.is_low_stock ? (
                                  <span className="badge badge-amber"><AlertTriangle size={12} /> Stock bas</span>
                                ) : (
                                  <span className="badge badge-success"><CheckCircle size={12} /> En stock</span>
                                )}
                              </div>
                            </div>
                            <div className="card-content">
                              <div className="card-title">
                                <span>{p.name}</span>
                                <span className="card-price">
                                  {Number(p.selling_price).toFixed(2)} DH<small>/u.</small>
                                </span>
                              </div>
                              <div className="card-details">
                                <div className="detail-item"><DollarSign size={14} /> Achat : {Number(p.purchase_price).toFixed(2)} DH</div>
                                <div className="detail-item"><Package size={14} /> {stockText(p)}</div>
                                {cat && (
                                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="category-badge"
                                      style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                                      <Icon size={12} /> {cat.name}
                                    </span>
                                  </div>
                                )}
                                {p.reference && (
                                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <Info size={14} /> Réf. {p.reference}
                                  </div>
                                )}
                              </div>
                              <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                <button type="button" onClick={() => openSale(p)} className="ac-card-btn ac-action-sell">
                                  <ShoppingCart size={17} /><span>Vendre</span>
                                </button>
                                <button type="button" onClick={() => openHistory(p)} className="ac-card-btn ac-action-history">
                                  <History size={17} /><span>Historique</span>
                                </button>
                                <button type="button" onClick={() => openEdit(p)} className="ac-card-btn ac-action-edit">
                                  <Pencil size={17} /><span>Modifier</span>
                                </button>
                                <button type="button" onClick={() => askDelete('product', p)} className="ac-card-btn ac-action-delete">
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
            </>
          )}

          {/* ============================================================ */}
          {/* ONGLET CATÉGORIES — Desktop table + Mobile cards             */}
          {/* ============================================================ */}
          {tab === 'categories' && (
            <div className="ac-listwrap">
              {/* Desktop table */}
              <div className="ac-tablecard ac-desktop-only">
                <div className="ac-scroll">
                  <table className="ac-table" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        <th>Slug</th>
                        <th>Produits</th>
                        <th>Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="ac-empty-cell">
                            <Tag size={40} /><p>Aucune catégorie</p>
                          </td>
                        </tr>
                      ) : (
                        categories.map((c) => {
                          const Icon = getCategoryIcon(c.icon);
                          return (
                            <tr key={c.id}>
                              <td>
                                <div className="flex items-center gap-1">
                                  <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: `${c.color}22`, color: c.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    <Icon size={16} />
                                  </div>
                                  <div>
                                    <div className="ac-strong">{c.name}</div>
                                    {c.description && (
                                      <div style={{
                                        fontSize: '0.7rem', color: 'var(--tx-3)',
                                        maxWidth: 250, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>{c.description}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td><code className="ac-id">{c.slug}</code></td>
                              <td><b>{c.products_count || 0}</b></td>
                              <td>
                                {c.is_active
                                  ? <span className="badge badge-success"><CheckCircle size={12} /> Actif</span>
                                  : <span className="badge badge-danger"><XCircle size={12} /> Inactif</span>}
                              </td>
                              <td className="text-right">
                                <div className="ac-actions">
                                  <button type="button" className="ac-action-btn ac-action-edit"
                                    onClick={() => openEditCategory(c)} title="Modifier">
                                    <Pencil size={15} />
                                  </button>
                                  <button type="button" className="ac-action-btn ac-action-delete"
                                    onClick={() => askDelete('category', c)} title="Supprimer">
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
                {categories.length === 0 ? (
                  <div className="ac-empty-card"><Tag size={40} /><p>Aucune catégorie</p></div>
                ) : (
                  <div className="ac-mcards">
                    {categories.map((c) => {
                      const Icon = getCategoryIcon(c.icon);
                      return (
                        <div key={c.id} className="ac-mcard">
                          <div className="ac-mcard-head">
                            <div className="ac-mcard-thumb ac-mcard-thumb-empty"
                              style={{ background: `${c.color}22`, color: c.color }}>
                              <Icon size={22} />
                            </div>
                            <div className="ac-mcard-info">
                              <div className="ac-mcard-name">{c.name}</div>
                              <div className="ac-mcard-sub">
                                <code className="ac-id">{c.slug}</code>
                              </div>
                            </div>
                            {c.is_active ? (
                              <span className="badge badge-success"><CheckCircle size={12} /> Actif</span>
                            ) : (
                              <span className="badge badge-danger"><XCircle size={12} /> Inactif</span>
                            )}
                          </div>

                          {c.description && (
                            <div style={{
                              fontSize: '0.75rem', color: 'var(--tx-2)',
                              marginBottom: 12, padding: '8px 12px',
                              background: 'var(--surface-2)', borderRadius: 10,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            }}>
                              {c.description}
                            </div>
                          )}

                          <div className="ac-mcard-meta">
                            <span><Package size={13} /> {c.products_count || 0} produit(s)</span>
                            <span><Layers size={13} /> Ordre : {c.sort_order || 0}</span>
                          </div>

                          <div className="ac-card-btns">
                            <button type="button" className="ac-card-btn ac-action-edit"
                              onClick={() => openEditCategory(c)}>
                              <Pencil size={17} /><span>Modifier</span>
                            </button>
                            <button type="button" className="ac-card-btn ac-action-delete"
                              onClick={() => askDelete('category', c)}>
                              <Trash2 size={17} /><span>Supprimer</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ONGLET VENTES — Desktop table + Mobile cards                 */}
          {/* ============================================================ */}
          {tab === 'sales' && (
            <div className="ac-listwrap">
              {/* Desktop table */}
              <div className="ac-tablecard ac-desktop-only">
                <div className="ac-scroll">
                  <table className="ac-table" style={{ minWidth: 800 }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Produit</th>
                        <th>Qté</th>
                        <th>Total</th>
                        <th>Payé</th>
                        <th>Client</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="ac-empty-cell">
                            <ShoppingCart size={40} /><p>Aucune vente</p>
                          </td>
                        </tr>
                      ) : (
                        sales.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(s.sale_date).toLocaleDateString('fr-FR')}
                              </div>
                            </td>
                            <td className="ac-strong">{s.product?.name || '—'}</td>
                            <td>{s.quantity}</td>
                            <td><span className="ac-price-pill">{Number(s.total_price).toFixed(2)} DH</span></td>
                            <td>
                              <span style={{
                                color: s.payment_status === 'paid' ? '#16a34a' : '#dc2626',
                                fontWeight: 700,
                              }}>
                                {Number(s.amount_paid).toFixed(2)} DH
                              </span>
                            </td>
                            <td>{saleClientName(s)}</td>
                            <td className="text-right">
                              <div className="ac-actions">
                                <button type="button" className="ac-action-btn ac-action-view"
                                  onClick={() => setViewSale(s)} title="Voir facture">
                                  <Eye size={15} />
                                </button>
                                <button type="button" className="ac-action-btn ac-action-invoice"
                                  onClick={() => setInvoiceSale(s)} title="Télécharger la facture (PDF)">
                                  <Receipt size={15} />
                                </button>
                                <button type="button" className="ac-action-btn ac-action-delete"
                                  onClick={() => askDelete('sale', s)} title="Annuler la vente">
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
                {sales.length === 0 ? (
                  <div className="ac-empty-card"><ShoppingCart size={40} /><p>Aucune vente</p></div>
                ) : (
                  <div className="ac-mcards">
                    {sales.map((s) => {
                      const paymentBadge =
                        s.payment_status === 'paid'
                          ? <span className="badge badge-success"><CheckCircle size={12} /> Payé</span>
                          : s.payment_status === 'partial'
                          ? <span className="badge badge-amber"><CreditCard size={12} /> Partiel</span>
                          : <span className="badge badge-danger"><XCircle size={12} /> Non payé</span>;

                      return (
                        <div key={s.id} className="ac-mcard">
                          <div className="ac-mcard-head">
                            <div className="ac-mcard-thumb ac-mcard-thumb-empty"
                              style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--acc-tx)' }}>
                              <ShoppingCart size={22} />
                            </div>
                            <div className="ac-mcard-info">
                              <div className="ac-mcard-name">{s.product?.name || '—'}</div>
                              <div className="ac-mcard-sub">
                                <span style={{ fontSize: '0.7rem', color: 'var(--tx-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={11} />
                                  {new Date(s.sale_date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                            <div className="ac-mcard-price">
                              {Number(s.total_price).toFixed(2)}<small> DH</small>
                            </div>
                          </div>

                          <div className="ac-mcard-badges">
                            {paymentBadge}
                            <span className="badge badge-blue">
                              <Package size={12} /> Qté : {s.quantity}
                            </span>
                          </div>

                          <div className="ac-mcard-meta">
                            <span>
                              <DollarSign size={13} /> Payé : {Number(s.amount_paid).toFixed(2)} DH
                            </span>
                            {saleClientName(s) !== '—' && (
                              <span>
                                <User size={13} /> {saleClientName(s)}
                              </span>
                            )}
                          </div>

                          <div className="ac-card-btns" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <button type="button" className="ac-card-btn ac-action-view"
                              onClick={() => setViewSale(s)}>
                              <Eye size={17} /><span>Voir facture</span>
                            </button>
                            <button type="button" className="ac-card-btn ac-action-invoice"
                              onClick={() => setInvoiceSale(s)}>
                              <Receipt size={17} /><span>Facture</span>
                            </button>
                            <button type="button" className="ac-card-btn ac-action-delete"
                              onClick={() => askDelete('sale', s)}>
                              <Trash2 size={17} /><span>Annuler la vente</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ MODAL SUPPRESSION ============ */}
          {deleteModalOpen && deleteTarget && (
            <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
              <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
                <div className="delete-icon"><Trash2 size={32} /></div>
                <h3 className="delete-title">
                  {deleteTarget.type === 'sale' ? 'Annuler la vente' : 'Confirmer la suppression'}
                </h3>
                <p className="delete-message">
                  {deleteTarget.type === 'product' && (
                    <>Êtes-vous sûr de vouloir supprimer le produit <br />
                      <span className="reservation-id">{deleteTarget.item.name}</span> ?</>
                  )}
                  {deleteTarget.type === 'category' && (
                    <>
                      Êtes-vous sûr de vouloir supprimer la catégorie <br />
                      <span className="reservation-id">{deleteTarget.item.name}</span> ?<br />
                      {(deleteTarget.item.products_count || 0) > 0 && (
                        <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                          ⚠️ {deleteTarget.item.products_count} produit(s) seront déplacés vers une autre catégorie.
                        </span>
                      )}
                    </>
                  )}
                  {deleteTarget.type === 'sale' && (
                    <>Voulez-vous annuler cette vente ?<br />Le stock sera restauré.</>
                  )}
                  <br />Cette action est irréversible.
                </p>
                <div className="delete-actions">
                  <button disabled={deleting} type="button" onClick={() => setDeleteModalOpen(false)}
                    className="modal-btn modal-btn-cancel">Annuler</button>
                  <button disabled={deleting} type="button" onClick={confirmDelete} className="modal-btn btn-delete">
                    {deleting ? (<><span className="btn-spinner" /> {deleteTarget.type === 'sale' ? 'Annulation...' : 'Suppression...'}</>) : (deleteTarget.type === 'sale' ? 'Annuler la vente' : 'Supprimer')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ VOIR FACTURE (inline, comme Voir contrat) ============ */}
      {viewSale && (
        <InvoiceViewPage
          invoice={buildSaleInvoice(viewSale)}
          onClose={() => setViewSale(null)}
          onDownload={() => setInvoiceSale(viewSale)}
        />
      )}

      {/* ============ MODAL FACTURE : AVEC / SANS CACHET ============ */}
      {invoiceSale && (
        <InvoiceCachetModal
          subtitle={`FAC-V-${String(invoiceSale.id).padStart(5, '0')}`}
          onClose={() => setInvoiceSale(null)}
          onChoose={(withCachet) => {
            const sale = invoiceSale;
            setInvoiceSale(null);
            downloadInvoice(buildSaleInvoice(sale), withCachet);
          }}
        />
      )}

      <Styles />
    </div>
  );
}

/* ============================================================ */
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

/* Formulaire inline */
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
.rv .inline-select {
  width: 100%; min-height: 44px; padding: 10px 14px;
  border: 1.5px solid var(--line); border-radius: 12px;
  background: var(--surface); color: var(--tx);
  font-size: 0.9rem; font-family: inherit; transition: border-color 0.15s;
}
.rv .inline-select {
  appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 38px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23a16207' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
}
.rv .inline-input:focus,
.rv .inline-select:focus { outline: none; border-color: var(--blue); }
.rv .inline-input::placeholder { color: var(--tx-3); }
.rv textarea.inline-input { padding-top: 12px; }

.rv .inline-info-msg {
  display: flex; align-items: center; gap: 10px;
  margin-top: 14px; padding: 11px 14px; border-radius: 12px;
  font-size: 0.78rem; font-weight: 700; border: 1.5px solid;
  background: rgba(29,161,232,0.12); border-color: var(--blue); color: var(--blue-d);
}
.rv .inline-info-msg svg { flex-shrink: 0; }

.rv .inline-secondary-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 42px; padding: 0 18px; border-radius: 999px;
  border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
  font-size: 0.8rem; font-weight: 800; cursor: pointer;
  transition: transform 0.1s, background 0.15s;
}
.rv .inline-secondary-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
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
.rv .image-upload-area {
  border: 2px dashed var(--line-strong); border-radius: 16px; padding: 24px; text-align: center;
  cursor: pointer; background: var(--surface); color: var(--tx-2); transition: all 0.2s;
}
.rv .image-upload-area p { margin: 6px 0 0; font-size: 0.82rem; font-weight: 700; }
.rv .image-upload-area svg { color: var(--acc-tx); }
.rv .image-upload-area:hover { border-color: var(--acc); background: rgba(234, 179, 8, 0.08); }
.rv .image-preview-container { margin-top: 16px; text-align: center; }
.rv .image-preview { width: 150px; height: 150px; object-fit: cover; border-radius: 16px; border: 1.5px solid var(--line-strong); }
.rv .remove-image-btn {
  display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; padding: 6px 14px;
  border-radius: 999px; border: 1.5px solid var(--danger); background: transparent; color: var(--danger);
  font-size: 0.72rem; font-weight: 800; cursor: pointer;
}
.rv .remove-image-btn:hover { background: var(--danger); color: #fff; }
.rv .color-swatches { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem; }
.rv .color-swatch {
  width: 32px; height: 32px; border-radius: 8px; border: 2px solid transparent;
  cursor: pointer; transition: all 0.15s;
}
.rv .color-swatch.active { border-color: var(--ink); transform: scale(1.1); }
.rv .icon-picker { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem; }
.rv .icon-pick-btn {
  width: 44px; height: 44px; border-radius: 10px;
  border: 1.5px solid var(--line); background: var(--surface); color: var(--tx-2);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.rv .icon-pick-btn:hover { border-color: var(--acc); color: var(--tx); }
.rv .icon-pick-btn.active { background: #fef3c7; border-color: var(--acc); color: #92400e; }
@media (prefers-color-scheme: dark) {
  .rv .icon-pick-btn.active { background: #422006; color: #fde68a; }
}
.rv .preview-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; font-size: 0.85rem; color: var(--tx-2); }

/* Page */
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
.rv .rv-stat-amber { background: #fef3c7; color: #d97706; }
.rv .rv-stat-red { background: #fee2e2; color: #dc2626; }
.rv .rv-stat-cyan { background: #cffafe; color: #0891b2; }
.rv .rv-stat-violet { background: #f3e8ff; color: #8b5cf6; }
.rv .rv-stat-label { margin: 0; font-size: 0.72rem; font-weight: 600; color: var(--tx-2); text-transform: uppercase; letter-spacing: 0.05em; }
.rv .rv-stat-value { margin: 2px 0 0; font-size: 1.4rem; font-weight: 800; line-height: 1.1; color: var(--tx); }
@media (prefers-color-scheme: dark) {
  .rv .rv-stat-blue { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
  .rv .rv-stat-green { background: rgba(22, 163, 74, 0.2); color: #4ade80; }
  .rv .rv-stat-amber { background: rgba(217, 119, 6, 0.2); color: #fbbf24; }
  .rv .rv-stat-red { background: rgba(220, 38, 38, 0.2); color: #f87171; }
  .rv .rv-stat-cyan { background: rgba(8, 145, 178, 0.2); color: #22d3ee; }
  .rv .rv-stat-violet { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
}

/* Tabs */
.rv .rv-tabs {
  display: flex; gap: 6px; padding: 4px; margin-bottom: 1.25rem;
  background: var(--surface-2); border: 1px solid var(--line); border-radius: 14px;
  overflow-x: auto;
}
.rv .rv-tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border: 0; border-radius: 10px;
  background: transparent; color: var(--tx-2);
  font-size: 0.85rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s; white-space: nowrap;
}
.rv .rv-tab-btn:hover:not(.active) { color: var(--tx); }
.rv .rv-tab-btn.active {
  background: var(--surface); color: var(--tx);
  box-shadow: 0 2px 8px -2px rgba(0,0,0,0.1);
  border: 1px solid var(--line);
}

/* Filters */
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
.rv .ac-table td .flex { font-size: 0.8rem; color: var(--tx-2); white-space: nowrap; }
.rv .ac-table td .flex svg { color: var(--tx-3); flex-shrink: 0; }
.rv .ac-table tbody tr td:first-child { box-shadow: inset 3px 0 0 transparent; transition: box-shadow 0.15s, background 0.15s; }
.rv .ac-table tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 #eab308; }
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
.rv .car-thumbnail { width: 56px; height: 40px; object-fit: cover; border-radius: 10px; border: 1px solid var(--line); display: block; }
.rv .car-thumbnail-placeholder {
  width: 56px; height: 40px; border-radius: 10px; background: var(--surface-2); color: var(--tx-3);
  display: flex; align-items: center; justify-content: center; border: 1px solid var(--line);
}
.rv .flex { display: flex; }
.rv .items-center { align-items: center; }
.rv .gap-1 { gap: 0.25rem; }

/* Badges */
.rv .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
.rv .badge-success { background: #dcfce7; color: #166534; }
.rv .badge-danger { background: #fee2e2; color: #991b1b; }
.rv .badge-amber { background: #fef3c7; color: #92400e; }
.rv .badge-blue { background: #dbeafe; color: #1e40af; }
.rv .category-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 700; line-height: 1.3;
}
@media (prefers-color-scheme: dark) {
  .rv .badge-success { background: #14532d; color: #4ade80; }
  .rv .badge-danger { background: #7f1d1d; color: #fca5a5; }
  .rv .badge-amber { background: #78350f; color: #fde68a; }
  .rv .badge-blue { background: #1e3a5f; color: #60a5fa; }
}

/* Actions */
.rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
.rv .ac-action-btn {
  width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
}
.rv .ac-action-sell { color: #f59e0b; }
.rv .ac-action-edit { color: #10b981; }
.rv .ac-action-delete { color: #ef4444; }
.rv .ac-action-btn.ac-action-sell:hover { background: #fef3c7; }
.rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
.rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
@media (prefers-color-scheme: dark) {
  .rv .ac-action-btn.ac-action-sell:hover { background: #78350f; }
  .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
  .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
}

.rv .ac-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); }
.rv .ac-card-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
  background: var(--surface-2); cursor: pointer; transition: all 0.2s;
}
.rv .ac-card-btn span { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.02em; color: var(--tx-2); line-height: 1; }
.rv .ac-card-btn:active { transform: scale(0.96); }
.rv .ac-card-btn.ac-action-sell:hover { background: #fef3c7; }
.rv .ac-card-btn.ac-action-edit:hover { background: #ecfdf5; }
.rv .ac-card-btn.ac-action-delete:hover { background: #fef2f2; }
@media (prefers-color-scheme: dark) {
  .rv .ac-card-btn.ac-action-sell:hover { background: #78350f; }
  .rv .ac-card-btn.ac-action-edit:hover { background: #064e3b; }
  .rv .ac-card-btn.ac-action-delete:hover { background: #7f1d1d; }
}

/* Mobile cards */
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

/* Cartes grid */
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

/* Dropdown */
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
}
.rv .ac-pager { margin-top: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }

/* Boutons facture / historique */
.rv .ac-action-history { color: #1da1e8; }
.rv .ac-action-invoice { color: #8b5cf6; }
.rv .ac-action-btn.ac-action-history:hover, .rv .ac-card-btn.ac-action-history:hover { background: #eff6ff; }
.rv .ac-action-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:hover { background: #f3e8ff; }
@media (prefers-color-scheme: dark) {
  .rv .ac-action-btn.ac-action-history:hover, .rv .ac-card-btn.ac-action-history:hover { background: #1e3a5f; }
  .rv .ac-action-btn.ac-action-invoice:hover, .rv .ac-card-btn.ac-action-invoice:hover { background: #4c1d95; }
}
.rv .inline-input:disabled { opacity: 0.55; cursor: not-allowed; }

/* Historique stock */
.rv .hist-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 22px; }
.rv .hist-chip {
  display: flex; flex-direction: column; gap: 4px; padding: 14px 16px;
  background: var(--surface-2); border: 1.5px solid var(--line); border-radius: 16px;
}
.rv .hist-chip span { font-size: 0.66rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tx-2); }
.rv .hist-chip b { font-size: 1.5rem; font-weight: 900; color: var(--tx); }
.rv .hist-in b { color: #16a34a; }
.rv .hist-out b { color: #dc2626; }
.rv .mv-list { display: flex; flex-direction: column; gap: 10px; }
.rv .mv-item {
  display: flex; align-items: center; gap: 14px; padding: 14px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
}
.rv .mv-icon { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.rv .mv-in { background: #dcfce7; color: #16a34a; }
.rv .mv-out { background: #fee2e2; color: #dc2626; }
.rv .mv-body { flex: 1; min-width: 0; }
.rv .mv-title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.rv .mv-tag { padding: 2px 9px; border-radius: 999px; font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
.rv .mv-tag-in { background: #dcfce7; color: #166534; }
.rv .mv-tag-out { background: #fee2e2; color: #991b1b; }
.rv .mv-tag-adjustment { background: #fef3c7; color: #92400e; }
.rv .mv-source { font-weight: 700; font-size: 0.88rem; overflow-wrap: anywhere; }
.rv .mv-reason { margin-top: 4px; font-size: 0.78rem; color: var(--tx-2); }
.rv .mv-meta { margin-top: 5px; display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font-size: 0.72rem; color: var(--tx-3); }
.rv .mv-qty { text-align: right; flex-shrink: 0; }
.rv .mv-qty-val { font-size: 1.15rem; font-weight: 900; }
.rv .mv-in-tx { color: #16a34a; }
.rv .mv-out-tx { color: #dc2626; }
.rv .mv-after { margin-top: 2px; font-size: 0.7rem; color: var(--tx-2); font-weight: 600; white-space: nowrap; }
@media (prefers-color-scheme: dark) {
  .rv .mv-in { background: rgba(22, 163, 74, 0.2); color: #4ade80; }
  .rv .mv-out { background: rgba(220, 38, 38, 0.2); color: #f87171; }
  .rv .mv-tag-in { background: #14532d; color: #4ade80; }
  .rv .mv-tag-out { background: #7f1d1d; color: #fca5a5; }
  .rv .mv-tag-adjustment { background: #78350f; color: #fde68a; }
  .rv .mv-in-tx { color: #4ade80; }
  .rv .mv-out-tx { color: #f87171; }
  .rv .hist-in b { color: #4ade80; }
  .rv .hist-out b { color: #f87171; }
}
@media (max-width: 640px) {
  .rv .hist-summary { grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }
  .rv .hist-chip { padding: 10px 12px; }
  .rv .hist-chip b { font-size: 1.15rem; }
  .rv .mv-item { align-items: flex-start; padding: 12px; gap: 10px; }
}

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
  .rv .inline-grid-2 { grid-template-columns: 1fr; }
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
  .rv .inline-input, .rv .inline-select { font-size: 16px; }
  .rv .inline-primary-btn, .rv .inline-secondary-btn { min-height: 48px; }
  .rv .delete-modal { padding: 24px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }
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