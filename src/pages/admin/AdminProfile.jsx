// src/pages/admin/AdminProfile.jsx
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, updateProfile } from '../../Redux/store';
import { toast } from 'sonner';
import {
  User, Lock, Key, Save, UserCircle, Shield, Calendar, CheckCircle,
  AlertCircle, Eye, EyeOff, Sparkles, RefreshCw, ShieldCheck,
  UserCheck, Fingerprint, Clock
} from 'lucide-react';

export default function AdminProfile() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [fullname, setFullname] = useState(user?.Fullname || '');
  const [role] = useState(user?.role || '');
  const [createdAt] = useState(user?.created_at || '');

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password && password !== passwordConfirmation) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (password && password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    const data = { Fullname: fullname };
    if (password) {
      data.password = password;
      data.password_confirmation = passwordConfirmation;
    }
    setLoading(true);
    try {
      await dispatch(updateProfile(data)).unwrap();
      toast.success('Profil mis à jour avec succès');
      setPassword('');
      setPasswordConfirmation('');
    } catch (err) {
      toast.error(err || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFullname(user?.Fullname || '');
    setPassword('');
    setPasswordConfirmation('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrateur';
      case 'employee': return 'Employé';
      default: return r || 'Utilisateur';
    }
  };

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case 'superadmin': return 'badge badge-amber';
      case 'admin': return 'badge badge-purple';
      case 'employee': return 'badge badge-blue';
      default: return 'badge';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const passwordsMatch = !password || !passwordConfirmation || password === passwordConfirmation;
  const passwordLongEnough = !password || password.length >= 6;
  const canSubmit = fullname.trim() && passwordsMatch && passwordLongEnough && !loading;

  const statCards = [
    {
      label: 'Rôle',
      value: getRoleLabel(role),
      icon: <Shield size={20} />,
      color: 'violet',
    },
    {
      label: 'Membre depuis',
      value: formatDate(createdAt),
      icon: <Calendar size={20} />,
      color: 'blue',
    },
    {
      label: 'Statut du compte',
      value: 'Actif',
      icon: <ShieldCheck size={20} />,
      color: 'green',
    },
  ];

  return (
    <div className="rv">
      <div className="ac-wrap">
        {/* Header */}
        <div className="rv-head">
          <div className="rv-head-left">
            <div className="rv-head-icon"><UserCircle size={24} /></div>
            <div className="rv-head-text">
              <h1 className="rv-title">Mon Profil</h1>
              <p className="rv-sub">Gérez vos informations personnelles et votre mot de passe</p>
            </div>
          </div>
          <div className="rv-head-actions">
            <button type="button" onClick={handleReset} className="ac-btn">
              <RefreshCw size={15} /><span className="ac-btn-text">Réinitialiser</span>
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

        {/* Form Container */}
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              <Sparkles size={28} />
            </div>
            <div className="inline-form-title">
              <h2>Modifier mon profil</h2>
              <p>Mettez à jour vos informations personnelles et votre sécurité</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="inline-form">
            <div className="inline-form-grid">
              {/* Left Column — Personal Info */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <User size={18} />
                    <h3>Informations personnelles</h3>
                  </div>

                  <div className="inline-grid-2">
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Nom complet *</label>
                      <input
                        type="text"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        className="inline-input"
                        required
                        placeholder="Votre nom complet"
                      />
                    </div>

                    <div className="inline-field">
                      <label>Rôle</label>
                      <div className="profile-role-row">
                        <span className={getRoleBadgeClass(role)}>
                          <Shield size={12} /> {getRoleLabel(role)}
                        </span>
                      </div>
                    </div>

                    <div className="inline-field">
                      <label>Identifiant</label>
                      <div className="profile-readonly-value">
                        <Fingerprint size={14} />
                        <span>#{user?.id ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="inline-info-msg">
                    <AlertCircle size={16} />
                    <span>Le rôle et la date de création ne peuvent pas être modifiés.</span>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Clock size={18} />
                    <h3>Métadonnées</h3>
                  </div>
                  <div className="profile-meta-list">
                    <div className="profile-meta-row">
                      <span className="inline-info-label">Date de création</span>
                      <span className="inline-info-value">{formatDateTime(createdAt)}</span>
                    </div>
                    <div className="profile-meta-row">
                      <span className="inline-info-label">Statut</span>
                      <span className="badge badge-success">
                        <CheckCircle size={12} /> Actif
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column — Security */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Lock size={18} />
                    <h3>Sécurité du compte</h3>
                  </div>

                  <div className="inline-info-msg" style={{ marginBottom: 14, marginTop: 0 }}>
                    <Key size={16} />
                    <span>Laissez les champs vides pour conserver votre mot de passe actuel.</span>
                  </div>

                  <div className="inline-grid-2">
                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Nouveau mot de passe</label>
                      <div className="profile-password-wrap">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="inline-input"
                          placeholder="Nouveau mot de passe"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="profile-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Masquer' : 'Afficher'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {password && !passwordLongEnough && (
                        <div className="profile-field-error">
                          <AlertCircle size={13} />
                          <span>Le mot de passe doit contenir au moins 6 caractères</span>
                        </div>
                      )}
                    </div>

                    <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Confirmer le mot de passe</label>
                      <div className="profile-password-wrap">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordConfirmation}
                          onChange={(e) => setPasswordConfirmation(e.target.value)}
                          className="inline-input"
                          placeholder="Confirmez le mot de passe"
                          disabled={!password}
                        />
                        <button
                          type="button"
                          className="profile-password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                          disabled={!password}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {password && passwordConfirmation && !passwordsMatch && (
                        <div className="profile-field-error">
                          <AlertCircle size={13} />
                          <span>Les mots de passe ne correspondent pas</span>
                        </div>
                      )}
                      {password && passwordConfirmation && passwordsMatch && (
                        <div className="profile-field-success">
                          <CheckCircle size={13} />
                          <span>Les mots de passe correspondent</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <UserCheck size={18} />
                    <h3>Conseils de sécurité</h3>
                  </div>
                  <ul className="profile-tips">
                    <li><CheckCircle size={13} /> Utilisez au moins 6 caractères</li>
                    <li><CheckCircle size={13} /> Mélangez lettres, chiffres et symboles</li>
                    <li><CheckCircle size={13} /> Ne partagez jamais votre mot de passe</li>
                    <li><CheckCircle size={13} /> Changez régulièrement votre mot de passe</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={handleReset} disabled={loading}>
                Réinitialiser
              </button>
              <button type="submit" className="inline-primary-btn" disabled={!canSubmit}>
                <Save size={16} />
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Styles />
    </div>
  );
}

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

/* Page shell */
.rv .ac-wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding: 1.5rem; }

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

/* Stats */
.rv .rv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
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
.rv .rv-stat-value { margin: 2px 0 0; font-size: 1.2rem; font-weight: 800; line-height: 1.15; color: var(--tx); }
@media (prefers-color-scheme: dark) {
    .rv .rv-stat-blue { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
    .rv .rv-stat-green { background: rgba(22, 163, 74, 0.2); color: #4ade80; }
    .rv .rv-stat-red { background: rgba(220, 38, 38, 0.2); color: #f87171; }
    .rv .rv-stat-cyan { background: rgba(8, 145, 178, 0.2); color: #22d3ee; }
    .rv .rv-stat-violet { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
}

/* Form */
.rv .inline-form-container {
    position: relative; max-width: 100%; margin: 0 auto;
    background: var(--surface); border: 1.5px solid var(--line-strong);
    border-radius: 28px; overflow: hidden; overflow: clip;
}
.rv .inline-form-header {
    position: relative; display: flex; align-items: center; gap: 18px;
    padding: 24px 28px; background: var(--ink);
}
.rv .inline-form-icon {
    width: 58px; height: 58px; border-radius: 16px;
    background: var(--acc); color: #0a0a0a;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transform: rotate(-5deg);
}
.rv .inline-form-title h2 { margin: 0; color: #fff; font-size: 1.6rem; font-weight: 900; letter-spacing: -0.01em; line-height: 1.1; }
.rv .inline-form-title p { margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; }

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
.rv .inline-input {
    width: 100%; min-height: 44px; padding: 10px 14px;
    border: 1.5px solid var(--line); border-radius: 12px;
    background: var(--surface); color: var(--tx);
    font-size: 0.9rem; font-family: inherit; transition: border-color 0.15s;
}
.rv .inline-input:focus { outline: none; border-color: var(--blue); }
.rv .inline-input:disabled { opacity: 0.6; cursor: not-allowed; }
.rv .inline-input::placeholder { color: var(--tx-3); }

.rv .inline-info-msg {
    display: flex; align-items: center; gap: 10px;
    margin-top: 14px; padding: 11px 14px; border-radius: 12px;
    font-size: 0.78rem; font-weight: 700; border: 1.5px solid;
    background: rgba(29,161,232,0.12); border-color: var(--blue); color: var(--blue-d);
}
.rv .inline-info-msg svg { flex-shrink: 0; }

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

.rv .inline-form-footer {
    display: flex; justify-content: flex-end; gap: 14px;
    margin-top: 24px; padding-top: 22px; border-top: 2px dotted var(--line);
}

/* Badges */
.rv .badge {
    display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
    border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.3; white-space: nowrap;
}
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

/* Profile-specific bits */
.rv .profile-role-row { display: flex; align-items: center; min-height: 44px; }
.rv .profile-readonly-value {
    display: inline-flex; align-items: center; gap: 8px;
    min-height: 44px; padding: 10px 14px;
    border: 1.5px dashed var(--line); border-radius: 12px;
    background: var(--surface); color: var(--tx-2);
    font-size: 0.85rem; font-weight: 700;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.rv .profile-readonly-value svg { color: var(--tx-3); flex-shrink: 0; }

.rv .profile-meta-list { display: flex; flex-direction: column; gap: 10px; }
.rv .profile-meta-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 10px 12px;
    background: var(--surface); border: 1.5px solid var(--line); border-radius: 12px;
}

/* Password input */
.rv .profile-password-wrap { position: relative; }
.rv .profile-password-wrap .inline-input { padding-right: 46px; }
.rv .profile-password-toggle {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    width: 32px; height: 32px; border-radius: 8px;
    border: 0; background: transparent; color: var(--tx-3);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s;
}
.rv .profile-password-toggle:hover:not(:disabled) { color: var(--tx); background: var(--surface-2); }
.rv .profile-password-toggle:disabled { opacity: 0.4; cursor: not-allowed; }

/* Validation feedback */
.rv .profile-field-error {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.72rem; font-weight: 700; color: var(--danger);
    margin-top: 2px;
}
.rv .profile-field-error svg { flex-shrink: 0; }
.rv .profile-field-success {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.72rem; font-weight: 700; color: #16a34a;
    margin-top: 2px;
}
.rv .profile-field-success svg { flex-shrink: 0; }
@media (prefers-color-scheme: dark) {
    .rv .profile-field-error { color: #fca5a5; }
    .rv .profile-field-success { color: #4ade80; }
}

/* Tips list */
.rv .profile-tips {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 8px;
}
.rv .profile-tips li {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.8rem; color: var(--tx-2); font-weight: 600;
}
.rv .profile-tips li svg { color: #16a34a; flex-shrink: 0; }
@media (prefers-color-scheme: dark) {
    .rv .profile-tips li svg { color: #4ade80; }
}

/* Responsive */
@media (max-width: 1024px) {
    .rv .inline-form-grid { grid-template-columns: 1fr; gap: 22px; }
}
@media (max-width: 768px) {
    .rv .ac-wrap { padding: 1rem; }
    .rv .rv-head { flex-direction: column; }
    .rv .rv-head-actions { width: 100%; }
    .rv .rv-head-actions .ac-btn { flex: 1; height: 40px; padding: 0 10px; }
    .rv .ac-btn-text { display: none; }
    .rv .rv-stats { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
    .rv .inline-form-container { margin: 0.6rem 0; border-radius: 22px; }
    .rv .inline-form-header { padding: 18px; gap: 14px; }
    .rv .inline-form-icon { width: 48px; height: 48px; border-radius: 14px; }
    .rv .inline-form-title h2 { font-size: 1.2rem; }
    .rv .inline-form { padding: 16px; }
    .rv .inline-section { padding: 16px; border-radius: 18px; }
    .rv .inline-grid-2 { grid-template-columns: 1fr; }
    .rv .inline-form-footer { flex-direction: column-reverse; }
    .rv .inline-form-footer > * { width: 100%; }
    .rv .inline-input { font-size: 16px; }
    .rv .inline-form-title h2 { overflow-wrap: anywhere; }
    .rv .inline-primary-btn,
    .rv .inline-secondary-btn { min-height: 48px; }
    .rv .profile-meta-row { flex-direction: column; align-items: flex-start; gap: 6px; }
}
@media (max-width: 380px) {
    .rv .inline-form-container { border-radius: 18px; }
    .rv .inline-form-header { padding: 14px; }
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