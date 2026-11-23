// pages/NotFound.jsx
import React, { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import "../lib/JinaTheme";

const css = `
.nf{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;background:#0a0a0a;color:#fff;position:relative;overflow:hidden}
.nf-arc{position:absolute;top:-30%;right:-18%;width:60%;height:160%;border-left:7px solid var(--red);border-radius:100% 0 0 100%/50% 0 0 50%;box-shadow:-14px 0 0 var(--blue);pointer-events:none}
.nf-sheet{position:relative;max-width:30rem;width:100%;padding:2.25rem 2rem 2rem;text-align:center;color:var(--text)}
.nf-sheet img{height:70px;width:auto;margin:0 auto 1.25rem;display:block}
.nf-code{font-size:6.5rem;color:var(--red)}
.nf-stamp{position:absolute;top:2.4rem;inset-inline-end:1rem;background:var(--paper)}
.nf-actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:1.75rem}
.nf-bar{position:absolute;left:0;right:0;bottom:0;height:8px;background:linear-gradient(to bottom,var(--red) 0 3px,transparent 3px 5px,var(--blue) 5px 8px)}
`;

export default function NotFound() {
  const { pathname } = useLocation();
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <>
      <style>{css}</style>
      <div className="nf">
        <div className="nf-arc" />
        <div className="j-sheet nf-sheet">
          <span className="j-stamp nf-stamp">Annulé</span>
          <img src="/JinaLogo.png" alt="Jina Business" />
          <h1 className="j-disp nf-code">404</h1>
          <p className="j-disp" style={{ fontSize: "1.4rem", marginTop: ".6rem" }}>Page introuvable</p>
          <p className="j-muted" style={{ marginTop: ".5rem" }}>
            Cette page n'existe pas ou a été déplacée. / هذه الصفحة غير موجودة.
          </p>
          <div className="nf-actions">
            <Link to="/" className="j-btn red">Retour à l'accueil</Link>
            <Link to="/our-cars" className="j-btn line">Voir nos voitures</Link>
          </div>
        </div>
        <div className="nf-bar" />
      </div>
    </>
  );
}