// src/pages/admin/AdminCars.jsx
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PaginationControls from '../../components/PaginationControls';
import { useResetScrollOnOpen } from "../../hooks/useResetScrollOnOpen";
import { fetchCars, createCar, updateCar, deleteCar, selectCars, selectCarsLoading, fetchMatricules, selectMatricules } from "../../Redux/store";
import { toast } from "sonner";
import { 
  Plus, Edit2, Trash2, X, Search, RefreshCw, Car, Palette, DollarSign, 
  ChevronLeft, ChevronRight, Calendar, Gauge, Fuel, Settings, Users, 
  DoorOpen, AlertTriangle, CheckCircle, XCircle, Image as ImageIcon,
  Upload, Save, Ban, TrashIcon, CarFront, Grid3x3, List, LayoutGrid,
  CheckCircle2, AlertCircle, Shield, Wrench, CalendarCheck, Sparkles,
  Star, Gem, Award, Heart, Zap, ArrowUpDown, ArrowUp, ArrowDown,
  Info, Crown, Briefcase, Activity, Clock, Key, Lock, Unlock, Check, ChevronDown
} from "lucide-react";

// Menu déroulant personnalisé (remplace le <select> natif, non stylable sur mobile)
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
  { value: "brand", label: "Marque" },
  { value: "model", label: "Modèle" },
  { value: "year", label: "Année" },
  { value: "price", label: "Prix / jour" },
  { value: "fuel_type", label: "Carburant" },
  { value: "status", label: "Statut" },
];

export default function AdminCars() {
  const dispatch = useDispatch();
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);
  const loading = useSelector(selectCarsLoading);
  
  const [showCarForm, setShowCarForm] = useState(false);
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
  const [carToDelete, setCarToDelete] = useState(null);
  const [editingCar, setEditingCar] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [imagePreview, setImagePreview] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
  
  // Sorting state
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);
  
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    fuel_type: "petrol",
    transmission: "manual",
    seats: 5,
    doors: 4,
    price_per_day: 100,
    image: "",
    status: "disponible"
  });

  useEffect(() => { 
    dispatch(fetchCars()); 
    dispatch(fetchMatricules());
  }, [dispatch]);
  useResetScrollOnOpen([
  showCarForm,
  deleteModalOpen,
]);

  // Calculate real disponibility based on matricules
  const getCarRealStatus = (carId) => {
    const carMatricules = matricules.filter(m => m.car_id === carId);
    
    if (carMatricules.length === 0) {
      return { status: 'non_disponible', reason: 'Aucune immatriculation associée', availableCount: 0, totalCount: 0 };
    }
    
    const activeMatricules = carMatricules.filter(m => m.status === 'active');
    const availableMatricules = activeMatricules.filter(m => m.status === 'active');
    const hasAvailable = availableMatricules.length > 0;
    
    return {
      status: hasAvailable ? 'disponible' : 'non_disponible',
      reason: hasAvailable ? `${availableMatricules.length} matricule(s) disponible(s)` : 'Aucun matricule disponible',
      availableCount: availableMatricules.length,
      totalCount: carMatricules.length,
      activeCount: activeMatricules.length
    };
  };

  // Sort handler
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

  // Filter and sort cars
  const filteredCars = cars.filter(car => 
    searchTerm === '' || 
    car.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.color?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case "id":
        aVal = a.id;
        bVal = b.id;
        break;
      case "brand":
        aVal = a.brand?.toLowerCase() || "";
        bVal = b.brand?.toLowerCase() || "";
        break;
      case "model":
        aVal = a.model?.toLowerCase() || "";
        bVal = b.model?.toLowerCase() || "";
        break;
      case "year":
        aVal = a.year || 0;
        bVal = b.year || 0;
        break;
      case "price":
        aVal = a.price_per_day || 0;
        bVal = b.price_per_day || 0;
        break;
      case "fuel_type":
        aVal = a.fuel_type || "";
        bVal = b.fuel_type || "";
        break;
      case "status":
        aVal = a.status || "";
        bVal = b.status || "";
        break;
      default:
        aVal = a.id;
        bVal = b.id;
    }
    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

const itemsPerView = viewMode === 'list' ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredCars.length / itemsPerView);
  const paginatedCars = filteredCars.slice((currentPage - 1) * itemsPerView, currentPage * itemsPerView);

  const handleCreateCar = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(createCar(data)).unwrap();
      toast.success("Voiture ajoutée avec succès!");
      setShowCarForm(false);
      setEditingCar(null);
      setImagePreview('');
      await dispatch(fetchCars(true));
      await dispatch(fetchMatricules(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCar = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(updateCar({ id: editingCar.id, data })).unwrap();
      toast.success("Voiture modifiée avec succès!");
      setShowCarForm(false);
      setEditingCar(null);
      setImagePreview('');
      await dispatch(fetchCars(true));
      await dispatch(fetchMatricules(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (car) => {
    setEditingCar(car);
    setFormData({
      brand: car.brand,
      model: car.model,
      year: car.year,
      color: car.color,
      fuel_type: car.fuel_type || "petrol",
      transmission: car.transmission || "manual",
      seats: car.seats || 5,
      doors: car.doors || 4,
      price_per_day: car.price_per_day,
      image: car.image || "",
      status: car.status || "disponible"
    });
    setImagePreview(car.image_url || car.image || '');
    setShowCarForm(true);
  };

  const handleAddNew = () => {
    setEditingCar(null);
    resetForm();
    setImagePreview('');
    setShowCarForm(true);
  };

  const resetForm = () => {
    setFormData({
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      fuel_type: "petrol",
      transmission: "manual",
      seats: 5,
      doors: 4,
      price_per_day: 100,
      image: "",
      status: "disponible"
    });
  };

  const handleDeleteClick = (car) => {
    setCarToDelete(car);
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
    if (!carToDelete) return;
    const result = await dispatch(deleteCar(carToDelete.id));
    if (result.error) toast.error(result.payload);
    else { 
      toast.success("Voiture supprimée avec succès"); 
      await dispatch(fetchCars(true));
      await dispatch(fetchMatricules(true));
    }
    setDeleteModalOpen(false);
    setCarToDelete(null);
  };

  const refreshData = async () => { 
    await dispatch(fetchCars(true)); 
    await dispatch(fetchMatricules(true));
    toast.success("Liste actualisée"); 
  };

  const handleExport = () => {
    const headers = ['ID', 'Marque', 'Modèle', 'Année', 'Couleur', 'Carburant', 'Transmission', 'Places', 'Portes', 'Prix/Jour', 'Statut', 'Disponibilité Réelle'];
    const csvData = filteredCars.map(car => {
      const realStatus = getCarRealStatus(car.id);
      return [car.id, `"${car.brand}"`, `"${car.model}"`, car.year, `"${car.color}"`, car.fuel_type, car.transmission, car.seats, car.doors, car.price_per_day, car.status, realStatus.status].join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `voitures_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  const getStatusBadge = (status) => {
    if (status === 'disponible') return <span className="badge badge-success"><CheckCircle size={12} /> Disponible</span>;
    return <span className="badge badge-danger"><XCircle size={12} /> Non disponible</span>;
  };

  const getRealStatusBadge = (car) => {
    const realStatus = getCarRealStatus(car.id);
    if (realStatus.status === 'disponible') {
      return (
        <div className="real-status available">
          <CheckCircle2 size={12} />
          <span>Disponible ({realStatus.availableCount}/{realStatus.totalCount})</span>
        </div>
      );
    }
    return (
      <div className="real-status unavailable">
        <AlertCircle size={12} />
        <span>Indisponible - {realStatus.reason}</span>
      </div>
    );
  };

  const getFuelBadge = (fuel) => {
    const config = { petrol: 'badge-amber', diesel: 'badge-blue', electric: 'badge-emerald', hybrid: 'badge-purple' };
    const labels = { petrol: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride' };
    const icons = { petrol: <Fuel size={12} />, diesel: <Fuel size={12} />, electric: <Gauge size={12} />, hybrid: <Settings size={12} /> };
    return <span className={`badge ${config[fuel] || config.petrol}`}>{icons[fuel]} {labels[fuel] || fuel}</span>;
  };

  const getTransmissionLabel = (transmission) => {
    return transmission === 'automatic' ? 'Automatique' : 'Manuelle';
  };

  const getStats = () => {
    const total = cars.length;
    const disponible = cars.filter(car => getCarRealStatus(car.id).status === 'disponible').length;
    const nonDisponible = total - disponible;
    const totalPrice = cars.reduce((sum, car) => sum + (Number(car.price_per_day) || 0), 0);
    const avgPrice = total > 0 ? Math.round(totalPrice / total) : 0;
    const totalMatricules = matricules.length;
    const activeMatricules = matricules.filter(m => m.status === 'active').length;
    return { total, disponible, nonDisponible, avgPrice, totalMatricules, activeMatricules };
  };
  const stats = getStats();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5MB");
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image valide");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result;
        setFormData({ ...formData, image: imageUrl });
        setImagePreview(imageUrl);
      };
      reader.onerror = () => {
        toast.error("Erreur lors de la lecture de l'image");
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return (
    <div className="rv">
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des véhicules...</p>
      </div>
      <Styles />
    </div>
  );

  const closeForm = () => { setShowCarForm(false); setEditingCar(null); resetForm(); setImagePreview(''); };

  const statCards = [
    { label: "Total voitures", value: stats.total, icon: <CarFront size={20} />, color: "blue" },
    { label: "Disponibles", value: stats.disponible, icon: <CheckCircle2 size={20} />, color: "green" },
    { label: "Indisponibles", value: stats.nonDisponible, icon: <AlertCircle size={20} />, color: "red" },
    { label: "Prix moyen / jour", value: `${stats.avgPrice.toLocaleString()} DH`, icon: <DollarSign size={20} />, color: "cyan" },
    { label: "Matricules actifs", value: `${stats.activeMatricules}/${stats.totalMatricules}`, icon: <Shield size={20} />, color: "violet" },
  ];

  const pagination = totalPages > 1 && (
    <div className="ac-pager">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerView}
        onItemsPerPageChange={viewMode === 'list' ? setListItemsPerPage : setCardsItemsPerPage}
        totalItems={filteredCars.length}
      />
    </div>
  );

  return (
    <div className="rv">
      {showCarForm ? (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editingCar ? <Sparkles size={28} /> : <Star size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editingCar ? "Modifier le véhicule" : "Nouveau véhicule"}</h2>
              <p>{editingCar ? "Modifiez les informations du véhicule" : "Ajoutez un nouveau véhicule à votre flotte"}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={closeForm} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingCar) {
              handleUpdateCar(formData);
            } else {
              handleCreateCar(formData);
            }
          }} className="inline-form">
            <div className="inline-form-grid">
              {/* Left Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Car size={18} />
                    <h3>Informations du véhicule</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Marque *</label>
                      <input 
                        type="text" 
                        className="inline-input" 
                        value={formData.brand} 
                        onChange={(e) => setFormData({...formData, brand: e.target.value})} 
                        required 
                        placeholder="Ex: Renault, Peugeot..."
                      />
                    </div>
                    <div className="inline-field">
                      <label>Modèle *</label>
                      <input 
                        type="text" 
                        className="inline-input" 
                        value={formData.model} 
                        onChange={(e) => setFormData({...formData, model: e.target.value})} 
                        required 
                        placeholder="Ex: Clio, 208..."
                      />
                    </div>
                    <div className="inline-field">
                      <label>Année *</label>
                      <input 
                        type="number" 
                        className="inline-input" 
                        value={formData.year} 
                        onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})} 
                        required 
                      />
                    </div>
                    <div className="inline-field">
                      <label>Couleur *</label>
                      <input 
                        type="text" 
                        className="inline-input" 
                        value={formData.color} 
                        onChange={(e) => setFormData({...formData, color: e.target.value})} 
                        required 
                        placeholder="Ex: Rouge, Bleu..."
                      />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Settings size={18} />
                    <h3>Caractéristiques techniques</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Carburant</label>
                      <select 
                        className="inline-select" 
                        value={formData.fuel_type} 
                        onChange={(e) => setFormData({...formData, fuel_type: e.target.value})}
                      >
                        <option value="petrol">⛽ Essence</option>
                        <option value="diesel">⛽ Diesel</option>
                        <option value="electric">🔋 Électrique</option>
                        <option value="hybrid">⚡ Hybride</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Transmission</label>
                      <select 
                        className="inline-select" 
                        value={formData.transmission} 
                        onChange={(e) => setFormData({...formData, transmission: e.target.value})}
                      >
                        <option value="manual">⚙️ Manuelle</option>
                        <option value="automatic">⚙️ Automatique</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Places</label>
                      <input 
                        type="number" 
                        className="inline-input" 
                        value={formData.seats} 
                        onChange={(e) => setFormData({...formData, seats: parseInt(e.target.value)})} 
                      />
                    </div>
                    <div className="inline-field">
                      <label>Portes</label>
                      <input 
                        type="number" 
                        className="inline-input" 
                        value={formData.doors} 
                        onChange={(e) => setFormData({...formData, doors: parseInt(e.target.value)})} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <DollarSign size={18} />
                    <h3>Tarification et statut</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Prix par jour (DH) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="inline-input" 
                        value={formData.price_per_day} 
                        onChange={(e) => setFormData({...formData, price_per_day: parseFloat(e.target.value)})} 
                        required 
                      />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <select 
                        className="inline-select" 
                        value={formData.status} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="disponible">✅ Disponible</option>
                        <option value="non disponible">❌ Non disponible</option>
                      </select>
                    </div>
                  </div>
                  <div className="inline-info-msg">
                    <Info size={16} />
                    <span>La disponibilité réelle dépend des immatriculations actives et des réservations en cours</span>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <ImageIcon size={18} />
                    <h3>Image du véhicule</h3>
                  </div>
                  <div className="image-upload-area" onClick={() => document.getElementById('carImageInput').click()}>
                    <Upload size={32} />
                    <p>Cliquez pour télécharger une image</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>PNG, JPG jusqu'à 5MB</p>
                    <input type="file" id="carImageInput" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </div>
                  {imagePreview && (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={() => { setImagePreview(''); setFormData({...formData, image: ''}); }}
                      >
                        <X size={14} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {editingCar && (
                  <div className="inline-section">
                    <div className="inline-section-header">
                      <Activity size={18} />
                      <h3>Informations système</h3>
                    </div>
                    <div className="inline-history">
                      <div className="inline-history-item">
                        <span className="inline-info-label">Date de création</span>
                        <span className="inline-info-value">
                          {editingCar.created_at ? new Date(editingCar.created_at).toLocaleDateString("fr-FR") : "—"}
                        </span>
                      </div>
                      <div className="inline-history-item">
                        <span className="inline-info-label">Dernière modification</span>
                        <span className="inline-info-value">
                          {editingCar.updated_at ? new Date(editingCar.updated_at).toLocaleDateString("fr-FR") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={closeForm}>
                Annuler
              </button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {editingCar ? <Save size={16} /> : <Plus size={16} />}
                {submitting ? "Traitement..." : (editingCar ? "Mettre à jour" : "Créer le véhicule")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="ac-wrap">
          {/* Header */}
          <div className="rv-head">
            <div className="rv-head-left">
              <div className="rv-head-icon"><CarFront size={24} /></div>
              <div className="rv-head-text">
                <h1 className="rv-title">Gestion des Voitures</h1>
                <p className="rv-sub">Gérez votre flotte — disponibilité basée sur les immatriculations actives</p>
              </div>
            </div>
            <div className="rv-head-actions">
              <button type="button" onClick={() => runBusy("refresh", refreshData)} className="ac-btn" disabled={!!busy.refresh}>
                <RefreshCw size={15} className={busy.refresh ? "rv-spin" : ""} /><span className="ac-btn-text">Actualiser</span>
              </button>
              <button type="button" onClick={handleExport} className="ac-btn">
                <Save size={15} /><span className="ac-btn-text">Exporter</span>
              </button>
              <button type="button" onClick={handleAddNew} className="ac-btn ac-btn-primary">
                <Plus size={15} /><span className="ac-btn-text">Nouveau véhicule</span>
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
                placeholder="Rechercher par marque, modèle, couleur..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button type="button" className="ac-search-clear" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="ac-seg" role="group" aria-label="Affichage">
              <button
                type="button"
                className={`ac-seg-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => { setViewMode('list'); setCurrentPage(1); }}
              >
                <List size={15} /> <span>Liste</span>
              </button>
              <button
                type="button"
                className={`ac-seg-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => { setViewMode('cards'); setCurrentPage(1); }}
              >
                <LayoutGrid size={15} /> <span>Cartes</span>
              </button>
            </div>
          </div>

          <div className="ac-meta">
            <p><strong>{filteredCars.length}</strong> voiture(s) trouvée(s)</p>
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
                        <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                        <th>Image</th>
                        <th onClick={() => handleSort("brand")} className="sortable-header">Marque {getSortIcon("brand")}</th>
                        <th onClick={() => handleSort("model")} className="sortable-header">Modèle {getSortIcon("model")}</th>
                        <th onClick={() => handleSort("year")} className="sortable-header">Année {getSortIcon("year")}</th>
                        <th>Couleur</th>
                        <th onClick={() => handleSort("fuel_type")} className="sortable-header">Carburant {getSortIcon("fuel_type")}</th>
                        <th>Transmission</th>
                        <th onClick={() => handleSort("price")} className="sortable-header">Prix/Jour {getSortIcon("price")}</th>
                        <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                        <th>Disponibilité (réelle)</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCars.length === 0 ? (
                        <tr>
                          <td colSpan="12" className="ac-empty-cell">
                            <Car size={40} />
                            <p>Aucune voiture trouvée</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedCars.map(car => (
                          <tr key={car.id}>
                            <td><span className="ac-id">#{car.id}</span></td>
                            <td>
                              {(car.image_url || car.image) ? (
                                <img
                                  src={car.image_url || car.image}
                                  alt={`${car.brand} ${car.model}`}
                                  className="car-thumbnail"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              ) : (
                                <div className="car-thumbnail-placeholder"><Car size={22} /></div>
                              )}
                            </td>
                            <td className="ac-strong">{car.brand}</td>
                            <td className="ac-model">{car.model}</td>
                            <td><div className="flex items-center gap-1"><Calendar size={14} /> {car.year}</div></td>
                            <td><div className="flex items-center gap-1"><Palette size={14} /> {car.color}</div></td>
                            <td>{getFuelBadge(car.fuel_type)}</td>
                            <td><div className="flex items-center gap-1"><Settings size={14} /> {getTransmissionLabel(car.transmission)}</div></td>
                            <td><span className="ac-price-pill">{car.price_per_day} DH</span></td>
                            <td>{getStatusBadge(car.status)}</td>
                            <td>{getRealStatusBadge(car)}</td>
                            <td className="text-right">
                              <div className="ac-actions">
                                <button type="button" onClick={() => handleEdit(car)} className="ac-action-btn ac-action-edit" title="Modifier">
                                  <Edit2 size={15} />
                                </button>
                                <button type="button" onClick={() => handleDeleteClick(car)} className="ac-action-btn ac-action-delete" title="Supprimer">
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

              {/* Mobile cards (même style que la liste Utilisateurs) */}
              <div className="ac-mobile-only">
              <div className="ac-sortbar">
                <label htmlFor="ac-sort">Trier</label>
                <AcSelect id="ac-sort" ariaLabel="Trier par" value={sortField} onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
                <button
                  type="button"
                  className="ac-sortdir"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  aria-label={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
                >
                  {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
              </div>
                {paginatedCars.length === 0 ? (
                  <div className="ac-empty-card">
                    <Car size={40} />
                    <p>Aucune voiture trouvée</p>
                  </div>
                ) : (
                  <div className="ac-mcards">
                    {paginatedCars.map(car => {
                      const real = getCarRealStatus(car.id);
                      return (
                        <div key={car.id} className="ac-mcard">
                          <div className="ac-mcard-head">
                            {(car.image_url || car.image) ? (
                              <img
                                src={car.image_url || car.image}
                                alt={`${car.brand} ${car.model}`}
                                className="ac-mcard-thumb"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            ) : (
                              <div className="ac-mcard-thumb ac-mcard-thumb-empty"><Car size={22} /></div>
                            )}
                            <div className="ac-mcard-info">
                              <div className="ac-mcard-name">{car.brand} {car.model}</div>
                              <div className="ac-mcard-sub"><span className="ac-id">#{car.id}</span></div>
                            </div>
                            <div className="ac-mcard-price">{car.price_per_day}<small> DH/j</small></div>
                          </div>

                          <div className="ac-mcard-badges">
                            {getFuelBadge(car.fuel_type)}
                            {getStatusBadge(car.status)}
                          </div>
                          <div className="ac-mcard-badges">{getRealStatusBadge(car)}</div>

                          <div className="ac-mcard-meta">
                            <span><Calendar size={13} /> {car.year}</span>
                            <span><Palette size={13} /> {car.color}</span>
                            <span><Settings size={13} /> {getTransmissionLabel(car.transmission)}</span>
                            <span><Wrench size={13} /> {real.availableCount}/{real.totalCount} matricules</span>
                          </div>

                          <div className="ac-card-btns">
                            <button type="button" onClick={() => handleEdit(car)} className="ac-card-btn ac-action-edit">
                              <Edit2 size={17} /><span>Modifier</span>
                            </button>
                            <button type="button" onClick={() => handleDeleteClick(car)} className="ac-card-btn ac-action-delete">
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
                <label htmlFor="ac-sort">Trier</label>
                <AcSelect id="ac-sort" ariaLabel="Trier par" value={sortField} onChange={(v) => setSortField(v)} options={SORT_OPTIONS} />
                <button
                  type="button"
                  className="ac-sortdir"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  aria-label={sortDirection === "asc" ? "Ordre croissant" : "Ordre décroissant"}
                >
                  {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </button>
              </div>
              {paginatedCars.length === 0 ? (
                <div className="ac-empty-card">
                  <Car size={40} />
                  <p>Aucune voiture trouvée</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {paginatedCars.map(car => {
                    const realStatus = getCarRealStatus(car.id);
                    return (
                      <div key={car.id} className="car-card">
                        <div className="card-image">
                          {(car.image_url || car.image) ? (
                            <img
                              src={car.image_url || car.image}
                              alt={`${car.brand} ${car.model}`}
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          ) : (
                            <Car size={64} style={{ color: 'var(--tx-3)' }} />
                          )}
                          <div className="card-status">{getRealStatusBadge(car)}</div>
                        </div>
                        <div className="card-content">
                          <div className="card-title">
                            <span>{car.brand} {car.model}</span>
                            <span className="card-price">{car.price_per_day} DH<small>/jour</small></span>
                          </div>
                          <div className="card-details">
                            <div className="detail-item"><Calendar size={14} /> {car.year}</div>
                            <div className="detail-item"><Palette size={14} /> {car.color}</div>
                            <div className="detail-item">{getFuelBadge(car.fuel_type)}</div>
                            <div className="detail-item"><Settings size={14} /> {getTransmissionLabel(car.transmission)}</div>
                            <div className="detail-item"><Users size={14} /> {car.seats} places</div>
                            <div className="detail-item"><DoorOpen size={14} /> {car.doors} portes</div>
                          </div>
                          <div className="card-real-status">
                            <Wrench size={12} />
                            <span>Matricules : {realStatus.availableCount}/{realStatus.totalCount} disponibles</span>
                          </div>
                          <div className="ac-card-btns">
                            <button type="button" onClick={() => handleEdit(car)} className="ac-card-btn ac-action-edit">
                              <Edit2 size={17} /><span>Modifier</span>
                            </button>
                            <button type="button" onClick={() => handleDeleteClick(car)} className="ac-card-btn ac-action-delete">
                              <Trash2 size={17} /><span>Supprimer</span>
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

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && carToDelete && (
            <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
              <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
                <div className="delete-icon"><Trash2 size={32} /></div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">
                  Êtes-vous sûr de vouloir supprimer la voiture <br />
                  <span className="reservation-id">{carToDelete.brand} {carToDelete.model}</span> ?<br />
                  Cette action est irréversible.
                </p>
                {(carToDelete.status === "disponible") && (
                  <p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                    ⚠️ Cette voiture est marquée comme disponible. La suppression affectera les réservations associées.
                  </p>
                )}
                <div className="delete-actions">
                  <button disabled={deleting} type="button" onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
                  <button disabled={deleting} type="button" onClick={confirmDelete} className="modal-btn btn-delete">{deleting ? (<><span className="btn-spinner" /> Suppression...</>) : "Supprimer"}</button>
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

function Styles() {
  return (
    <style>{`
@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap");

            /* ============================================================
               FORMS & MODALS — design "Jina Road" (copie d'AdminReservations)
               Tout est limité à .rv
               ============================================================ */
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

            /* ---------- Form ---------- */
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
            .rv .inline-input:disabled,
            .rv .inline-select:disabled { opacity: 0.55; cursor: not-allowed; }
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

            .rv .inline-outline-btn,
            .rv .inline-secondary-btn {
                display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                min-height: 42px; padding: 0 18px; border-radius: 999px;
                border: 1.5px solid var(--line-strong); background: var(--surface); color: var(--tx);
                font-size: 0.8rem; font-weight: 800; cursor: pointer;
                transition: transform 0.1s, background 0.15s;
            }
            .rv .inline-outline-btn:hover,
            .rv .inline-secondary-btn:hover { background: var(--surface-2); transform: translateY(-1px); }
            .rv .inline-outline-btn:active,
            .rv .inline-secondary-btn:active { transform: translateY(2px); }

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

            /* countdown dans les modals rv */
            .rv .countdown-time { background: rgba(234,179,8,0.16); color: var(--acc-tx); }
            .rv .progress-bar-container { background: var(--line); }
            .rv .permanent-badge { background: rgba(15,138,67,0.14); color: #0f8a43; }

            /* Responsive */
            @media (max-width: 1024px) {
                .rv .inline-form-grid { grid-template-columns: 1fr; gap: 22px; }
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
                .rv .delete-actions { flex-direction: column-reverse; gap: 10px; }
                .rv .delete-actions .modal-btn { flex: 0 0 auto; width: 100%; height: 52px; min-height: 52px; font-size: 0.95rem; }

                /* 16px évite le zoom automatique d'iOS dans les champs */
                .rv .inline-input,
                .rv .inline-select { font-size: 16px; }
                .rv .inline-form-title { min-width: 0; }
                .rv .inline-form-title h2 { overflow-wrap: anywhere; }
                .rv .inline-form-title p { font-size: 0.78rem; }
                .rv .inline-section-header h3 { white-space: normal; font-size: 0.76rem; }
                .rv .inline-primary-btn,
                .rv .inline-secondary-btn { min-height: 48px; }
                .rv .inline-form-footer { padding-bottom: calc(0px + env(safe-area-inset-bottom, 0px)); }
                .rv .modal-header { padding: 14px 16px; }
                .rv .modal-title { min-width: 0; font-size: 0.95rem; overflow-wrap: anywhere; }
                .rv .modal-body { padding: 1rem !important; }
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

            /* ============================================================
               PAGE VOITURES — même style que la liste Utilisateurs
               ============================================================ */
            .rv .ac-wrap { width: 100%; max-width: none; margin: 0; padding: 1.5rem; }

            /* en-tête */
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

            /* filtres */
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

            /* tableau */
            .rv .ac-tablecard { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
            .rv .ac-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            .rv .ac-table { width: 100%; min-width: 1000px; border-collapse: collapse; font-size: 0.82rem; }
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
            .rv .ac-table td { transition: background 0.15s; }
            .rv .ac-table tbody tr td:first-child { box-shadow: inset 3px 0 0 transparent; transition: box-shadow 0.15s, background 0.15s; }
            .rv .ac-table tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 #eab308; }
            .rv .car-thumbnail, .rv .car-thumbnail-placeholder { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
            .rv .car-thumbnail { width: 56px; height: 40px; object-fit: cover; border-radius: 10px; border: 1px solid var(--line); display: block; }
            .rv .car-thumbnail-placeholder {
                width: 56px; height: 40px; border-radius: 10px; background: var(--surface-2); color: var(--tx-3);
                display: flex; align-items: center; justify-content: center; border: 1px solid var(--line);
            }
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

            /* badges */
            .rv .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
            .rv .badge-success { background: #dcfce7; color: #166534; }
            .rv .badge-danger { background: #fee2e2; color: #991b1b; }
            .rv .badge-amber { background: #fef3c7; color: #92400e; }
            .rv .badge-blue { background: #dbeafe; color: #1e40af; }
            .rv .badge-emerald { background: #d1fae5; color: #065f46; }
            .rv .badge-purple { background: #f3e8ff; color: #6b21a5; }
            .rv .real-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 10px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; }
            .rv .real-status.available { background: #dcfce7; color: #166534; }
            .rv .real-status.unavailable { background: #fee2e2; color: #991b1b; }
            @media (prefers-color-scheme: dark) {
                .rv .badge-success, .rv .real-status.available { background: #14532d; color: #4ade80; }
                .rv .badge-danger, .rv .real-status.unavailable { background: #7f1d1d; color: #fca5a5; }
                .rv .badge-amber { background: #78350f; color: #fde68a; }
                .rv .badge-blue { background: #1e3a5f; color: #60a5fa; }
                .rv .badge-emerald { background: #064e3b; color: #34d399; }
                .rv .badge-purple { background: #4c1d95; color: #c084fc; }
            }

            /* boutons d'action (tableau) */
            .rv .ac-actions { display: flex; gap: 4px; justify-content: flex-end; }
            .rv .ac-action-btn {
                width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
                border: 0; background: transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;
            }
            .rv .ac-action-edit { color: #10b981; }
            .rv .ac-action-delete { color: #ef4444; }
            .rv .ac-action-btn.ac-action-edit:hover { background: #ecfdf5; }
            .rv .ac-action-btn.ac-action-delete:hover { background: #fef2f2; }
            @media (prefers-color-scheme: dark) {
                .rv .ac-action-btn.ac-action-edit:hover { background: #064e3b; }
                .rv .ac-action-btn.ac-action-delete:hover { background: #7f1d1d; }
            }

            /* boutons libellés (cartes) */
            .rv .ac-card-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); }
            .rv .ac-card-btn {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                gap: 4px; min-height: 52px; padding: 6px 2px; border: 0; border-radius: 10px;
                background: var(--surface-2); cursor: pointer; transition: all 0.2s;
            }
            .rv .ac-card-btn span { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.02em; color: var(--tx-2); line-height: 1; }
            .rv .ac-card-btn:active { transform: scale(0.96); }
            .rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #ecfdf5; }
            .rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #fef2f2; }
            @media (prefers-color-scheme: dark) {
                .rv .ac-card-btn.ac-action-edit:hover, .rv .ac-card-btn.ac-action-edit:active { background: #064e3b; }
                .rv .ac-card-btn.ac-action-delete:hover, .rv .ac-card-btn.ac-action-delete:active { background: #7f1d1d; }
            }

            /* cartes mobile (mode Liste) */
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

            /* vue "Cartes" */
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
            .rv .card-real-status {
                display: flex; align-items: center; gap: 6px; margin-bottom: 12px; padding: 8px 12px;
                border-radius: 10px; background: var(--surface-2); font-size: 0.72rem; color: var(--tx-2);
            }

            /* barre "Trier" (comme Réservations) */
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

            /* menu déroulant "Trier" */
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
                .rv .ac-dd-menu { box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.6); }
            }

            /* pagination */
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

            /* chargement */
            .rv .loading { text-align: center; padding: 4rem 1rem; color: var(--tx-2); font-weight: 700; }
            .rv .spinner {
                display: inline-block; width: 40px; height: 40px; margin-bottom: 12px; border-radius: 50%;
                border: 4px solid var(--line); border-top-color: #eab308; animation: acSpin 0.7s linear infinite;
            }
            @keyframes acSpin { to { transform: rotate(360deg); } }

            /* formulaire : zone image + messages */
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
            .rv .inline-grid-2 + .inline-info-msg { margin-top: 14px; }

            /* responsive */
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

    `}</style>
  );
}