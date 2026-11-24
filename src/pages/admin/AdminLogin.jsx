// pages/admin/AdminLogin.jsx  (login logic unchanged, design rebuilt in the Jina "contrat" style)
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUtilisateur, selectIsAuthenticated, selectAuthLoading, selectAuthError, clearAuthError, api } from "../../Redux/store";
import { Lock, X, Mail, Check, ArrowLeft, User, KeyRound, Phone } from "lucide-react";
import { toast } from "sonner";
import "../../lib/JinaTheme";

const css = `
.al,.al-ov{--al-red:var(--red,#e5202e);--al-blue:var(--blue,#1da1e8);--al-disp:var(--f-disp,'Archivo',system-ui,sans-serif)}
.al *,.al-ov *{box-sizing:border-box}
.al{min-height:100vh;position:relative;overflow:hidden;background:#0a0a0a;color:#fff;display:flex;flex-direction:column;font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif}

/* red + blue arc from the printed card */
.al-arc{position:absolute;top:-25%;right:-18%;width:60%;height:150%;border-left:7px solid var(--al-red);border-radius:100% 0 0 100%/50% 0 0 50%;box-shadow:-14px 0 0 var(--al-blue);pointer-events:none}
@media(max-width:899px){.al-arc{width:90%;right:-55%;opacity:.7}}

/* tricolor stripe top + bottom */
.al-stripe{height:8px;flex-shrink:0;background:linear-gradient(to bottom,var(--al-red) 0 3px,transparent 3px 5px,var(--al-blue) 5px 8px)}

.al-main{position:relative;flex:1;width:100%;max-width:72rem;margin:0 auto;padding:2.5rem 1.5rem;display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center}
@media(min-width:900px){.al-main{grid-template-columns:1.05fr 1fr;gap:4rem;padding:3.5rem 2rem}}

/* ---------- brand side ---------- */
.al-back{display:inline-flex;align-items:center;gap:.4rem;color:rgba(255,255,255,.7);text-decoration:none;font:700 .85rem var(--al-disp);margin-bottom:1.75rem;padding:.4rem .9rem;border-radius:999px;border:1px dotted rgba(255,255,255,.4);transition:border-color .2s,color .2s}
.al-back:hover{color:#fff;border-color:var(--al-red)}
.al-back svg{width:.95rem;height:.95rem}
.al-logo{display:inline-flex;background:#111;border-radius:18px;padding:.6rem 1.1rem;box-shadow:0 0 0 2px var(--al-red),0 5px 0 2px var(--al-blue);margin-bottom:1.75rem}
.al-logo img{height:64px;width:auto;display:block;border-radius:10px}
.al-brand{font:900 clamp(2.6rem,7vw,4.6rem)/1 var(--al-disp);font-stretch:112%;letter-spacing:-.01em}
.al-brand span:first-child{color:var(--al-red)}.al-brand span:last-child{color:var(--al-blue)}
.al-sub{margin-top:.8rem;font:800 clamp(1.2rem,2.6vw,1.7rem) var(--al-disp);font-stretch:105%}
.al-ar{display:block;margin-top:.2rem;font:800 clamp(1.5rem,3.4vw,2.2rem) 'Cairo',var(--al-disp)}
.al-checks{list-style:none;padding:0;margin:1.75rem 0 0;display:flex;flex-direction:column;gap:.6rem}
.al-checks li{display:flex;align-items:center;gap:.65rem;font-weight:700;color:#d9d9e0}
.al-checks svg{width:1.15rem;height:1.15rem;color:var(--al-red);flex-shrink:0}
@media(max-width:899px){.al-checks{display:none}}

/* ---------- form sheet ---------- */
.al-sheet{position:relative;background:#fff;color:#111;border:1.5px solid #111;border-radius:1.25rem;box-shadow:8px 8px 0 var(--al-red);padding:1.75rem 1.75rem 1.5rem;animation:alUp .5s ease-out}
@media(min-width:900px){.al-sheet{padding:2.25rem 2.25rem 1.75rem;max-width:30rem;justify-self:end;width:100%}}
@keyframes alUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.al-head{display:flex;align-items:center;gap:.9rem;margin-bottom:.4rem}
.al-lock{width:2.9rem;height:2.9rem;border-radius:999px;background:var(--al-red);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.al-lock svg{width:1.3rem;height:1.3rem;color:#fff}
.al-title{font:900 1.7rem var(--al-disp);font-stretch:112%;line-height:1.1}
.al-tag{display:inline-block;margin:.9rem 0 1.4rem;background:var(--al-red);color:#fff;font:800 .85rem var(--al-disp);font-stretch:112%;padding:.35rem 1.4rem .35rem 1rem;border-radius:999px;letter-spacing:.02em}
.al-form{display:flex;flex-direction:column;gap:1.1rem}
.al-field label{display:flex;align-items:center;gap:.4rem;font:800 .85rem var(--al-disp);margin-bottom:.15rem;color:#111}
.al-field label svg{width:.95rem;height:.95rem;color:var(--al-blue)}
.al-input{width:100%;height:2.9rem;border:0;border-bottom:2px dotted #8a8a94;background:transparent;padding:0 .25rem;font:600 1rem 'Inter',system-ui,sans-serif;color:#111;transition:border-color .2s,background .2s;border-radius:0}
.al-input::placeholder{color:#a5a5ad;font-weight:500}
.al-input:hover{border-bottom-color:#111}
.al-input:focus{outline:none;border-bottom:2px solid var(--al-red);background:rgba(229,32,46,.05)}
.al-error{padding:.7rem .9rem;border-radius:.75rem;background:#fff1f1;border:1.5px solid var(--al-red);color:#b3121e;font-size:.875rem;font-weight:700;text-align:center;animation:alShake .45s ease-in-out}
@keyframes alShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.al-btn{width:100%;height:3rem;margin-top:.4rem;border:0;border-radius:999px;background:#0a0a0a;color:#fff;font:800 .95rem var(--al-disp);font-stretch:108%;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;box-shadow:0 4px 0 var(--al-blue);transition:transform .15s,box-shadow .15s,background .2s}
.al-btn:hover:not(:disabled){background:var(--al-red);transform:translateY(-2px);box-shadow:0 6px 0 var(--al-blue)}
.al-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 var(--al-blue)}
.al-btn:disabled{opacity:.55;cursor:not-allowed}
.al-forgot{margin-top:1.1rem;text-align:center}
.al-forgot button{background:none;border:0;color:#55555e;font:700 .85rem var(--al-disp);cursor:pointer;text-decoration:underline;text-underline-offset:3px;transition:color .2s}
.al-forgot button:hover{color:var(--al-red)}

/* ---------- footer line ---------- */
.al-foot{position:relative;text-align:center;padding:1rem 1.5rem 1.4rem;font-size:.78rem;color:rgba(255,255,255,.6);line-height:1.8}
.al-foot a{color:rgba(255,255,255,.85);text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:.35rem}
.al-foot a:hover{color:#fff}
.al-foot svg{width:.85rem;height:.85rem;color:var(--al-red)}

/* ---------- reset modal ---------- */
.al-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem;z-index:1000;animation:alFade .25s ease}
@keyframes alFade{from{opacity:0}to{opacity:1}}
.al-modal{position:relative;width:100%;max-width:26.5rem;background:#fff;color:#111;border:1.5px solid #111;border-radius:1.25rem;box-shadow:8px 8px 0 var(--al-blue);padding:1.5rem;animation:alUp .3s ease;font-family:'Inter',system-ui,sans-serif}
.al-mhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
.al-mtitle{display:inline-flex;align-items:center;gap:.5rem;background:var(--al-red);color:#fff;font:800 .9rem var(--al-disp);font-stretch:112%;padding:.4rem 1.3rem .4rem .9rem;border-radius:999px}
.al-mtitle svg{width:1rem;height:1rem}
.al-close{width:2.2rem;height:2.2rem;border-radius:999px;border:1.5px solid #111;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s,color .2s}
.al-close:hover{background:#111;color:#fff}
.al-modal p{font-size:.9rem;color:#55555e;line-height:1.55;margin:0 0 .9rem}
.al-actions{display:flex;gap:.7rem;margin-top:1.3rem}
.al-mbtn{flex:1;height:2.75rem;border-radius:999px;font:800 .85rem var(--al-disp);cursor:pointer;transition:all .15s}
.al-modal .al-mbtn.cancel{background:#fff!important;color:#111!important;border:1.5px solid #111}
.al-modal .al-mbtn.cancel:hover{background:#111!important;color:#fff!important}
.al-modal .al-mbtn.send{background:#e5202e!important;background:var(--al-red)!important;color:#fff!important;border:1.5px solid #e5202e;border-color:var(--al-red);box-shadow:0 3px 0 #111}
.al-mbtn.send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 0 #111}
.al-mbtn.send:disabled{opacity:.6;cursor:not-allowed}

@media(max-width:640px){
  .al-main{padding:1.5rem 1rem}
  .al-sheet{padding:1.4rem 1.25rem 1.25rem}
  .al-logo img{height:52px}
}
`;

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetFullname, setResetFullname] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!fullname || !password) {
      setLocalError("Veuillez remplir tous les champs");
      return;
    }

    const result = await dispatch(loginUtilisateur({ Fullname: fullname, password }));
    if (result.error) {
      const errorMsg = result.payload || "Identifiants incorrects";
      setLocalError(errorMsg);
      toast.error(errorMsg);
    } else {
      toast.success("Connexion réussie !");
      navigate("/dashboard");
    }
  };

  const handleForgotPassword = async () => {
    if (!resetFullname.trim()) {
      toast.error("Veuillez saisir votre nom d'utilisateur.");
      return;
    }
    setResetLoading(true);
    try {
      await api.post("/forgot-password", { Fullname: resetFullname.trim() });
      toast.success("Demande envoyée. Un administrateur vous contactera.");
      setResetModalOpen(false);
      setResetFullname("");
    } catch (error) {
      const msg = error.response?.data?.message || "Erreur. Vérifiez votre nom d'utilisateur.";
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  return (
    <>
      <style>{css}</style>

      <div className="al">
        <div className="al-stripe" />
        <div className="al-arc" />

        <main className="al-main">
          {/* ---------- brand side ---------- */}
          <section>
            <Link to="/" className="al-back"><ArrowLeft /> Retour au site</Link>
            <div>
              <Link to="/" className="al-logo" aria-label="Jina Business">
                <img src="/JinaLogo1.png" alt="Jina Business" />
              </Link>
            </div>
            <h1 className="al-brand"><span>JINA</span> <span>BUSINESS</span></h1>
            <p className="al-sub">Location de voiture</p>
            <span className="al-ar">تأجير السيارات</span>
            <ul className="al-checks">
              <li><Check strokeWidth={3} /> Location de voiture</li>
              <li><Check strokeWidth={3} /> Vente et achat des voitures</li>
              <li><Check strokeWidth={3} /> Service automobiles</li>
            </ul>
          </section>

          {/* ---------- login sheet ---------- */}
          <section className="al-sheet">
            <div className="al-head">
              <span className="al-lock"><Lock /></span>
              <h2 className="al-title">Administration</h2>
            </div>
            <span className="al-tag">Connectez-vous à votre espace</span>

            <form onSubmit={handleSubmit} className="al-form">
              <div className="al-field">
                <label htmlFor="al-user"><User /> Nom d'utilisateur :</label>
                <input
                  id="al-user"
                  type="text"
                  required
                  autoComplete="username"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="al-input"
                  placeholder="admin"
                />
              </div>

              <div className="al-field">
                <label htmlFor="al-pass"><KeyRound /> Mot de passe :</label>
                <input
                  id="al-pass"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="al-input"
                  placeholder="••••••••"
                />
              </div>

              {(localError || authError) && (
                <div className="al-error">{localError || authError}</div>
              )}

              <button type="submit" disabled={loading} className="al-btn">
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="al-forgot">
              <button type="button" onClick={() => setResetModalOpen(true)}>
                Mot de passe oublié ?
              </button>
            </div>
          </section>
        </main>

        <div className="al-foot">
          <a href="tel:+212526030067"><Phone /> 05 26 03 00 67</a>
          {" · "}
          <a href="mailto:jinabusiness0@gmail.com"><Mail /> jinabusiness0@gmail.com</a>
          <br />© {new Date().getFullYear()} Jina Business
        </div>
        <div className="al-stripe" />
      </div>

      {/* ---------- Reset Password Modal ---------- */}
      {resetModalOpen && (
        <div className="al-ov" onClick={() => setResetModalOpen(false)}>
          <div className="al-modal" onClick={(e) => e.stopPropagation()}>
            <div className="al-mhead">
              <div className="al-mtitle"><Mail /> Réinitialisation</div>
              <button className="al-close" onClick={() => setResetModalOpen(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <p>
              Entrez votre nom d'utilisateur. Un administrateur recevra votre demande
              et pourra réinitialiser votre mot de passe.
            </p>
            <div className="al-field">
              <label htmlFor="al-reset"><User /> Nom d'utilisateur :</label>
              <input
                id="al-reset"
                type="text"
                className="al-input"
                placeholder="Nom d'utilisateur"
                value={resetFullname}
                onChange={(e) => setResetFullname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleForgotPassword();
                }}
                autoFocus
              />
            </div>
            <div className="al-actions">
              <button className="al-mbtn cancel" onClick={() => setResetModalOpen(false)}>
                Annuler
              </button>
              <button className="al-mbtn send" onClick={handleForgotPassword} disabled={resetLoading}>
                {resetLoading ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}