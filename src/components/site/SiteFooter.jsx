// components/site/SiteFooter.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Check, ArrowUp } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import "../../lib/JinaTheme";

const css = `
.jf{background:#0a0a0a;color:#fff;margin-top:5rem;position:relative}
.jf::before{content:"";display:block;height:8px;background:linear-gradient(to bottom,var(--red) 0 3px,transparent 3px 5px,var(--blue) 5px 8px)}

/* logo column */
.jf-logo{display:inline-flex;background:#111;border-radius:18px;padding:.6rem 1.1rem;box-shadow:0 0 0 2px var(--red),0 5px 0 2px var(--blue);margin-bottom:5px}
.jf-logo img{height:60px;width:auto;display:block;border-radius:10px}
@media(min-width:800px){.jf-logo img{height:76px}}

.jf-grid{display:grid;grid-template-columns:1fr;gap:2.25rem;padding:2.5rem 0;border-bottom:1px dotted rgba(255,255,255,.28)}
@media(min-width:800px){.jf-grid{grid-template-columns:auto 1fr 1fr 1.3fr;gap:3rem;padding:3rem 0;align-items:start}}
.jf h4{display:inline-block;font:800 .95rem var(--f-disp);font-stretch:112%;margin-bottom:1.1rem;background:var(--red);padding:.3rem 1.2rem .3rem .9rem;border-radius:999px}

.jf-checks{list-style:none;padding:0;display:flex;flex-direction:column;gap:.7rem}
.jf-checks li{display:flex;align-items:center;gap:.65rem;font-weight:700}
.jf-checks svg{width:1.15rem;height:1.15rem;color:var(--red);flex-shrink:0}

.jf-links{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
.jf-links a{display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;border-radius:999px;border:1px dotted rgba(255,255,255,.4);text-decoration:none;color:#fff;font:700 .92rem var(--f-disp);transition:background .2s,border-color .2s}
.jf-links a:hover{background:var(--red);border-color:var(--red)}
.jf-links a.admin{opacity:.5;font-size:.8rem}
@media(min-width:800px){.jf-links{flex-direction:column;flex-wrap:nowrap;gap:.2rem}.jf-links a{border:0;padding:.35rem 0;border-radius:0;background:none!important;color:rgba(255,255,255,.78)}.jf-links a:hover{color:#fff}.jf-links a.admin{padding-top:.8rem}}

.jf-contact{list-style:none;padding:0;display:flex;flex-direction:column;gap:.7rem}
.jf-contact a,.jf-contact .row{display:grid;grid-template-columns:auto 1fr;gap:.9rem;align-items:center;padding:.8rem 1rem;border-radius:1rem;background:#161618;text-decoration:none;color:#fff;font-weight:700;font-size:.95rem;line-height:1.4;overflow-wrap:anywhere}
.jf-contact a:hover{background:#1f1f22}
.jf-ico{width:2.4rem;height:2.4rem;border-radius:999px;background:var(--red);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.jf-contact li:nth-child(even) .jf-ico{background:var(--blue)}
.jf-ico svg{width:1.05rem;height:1.05rem;color:#fff}
.jf-contact small{display:block;font:600 .72rem var(--f-disp);color:#9a9aa3;margin-bottom:.1rem}

.jf-legal{border-top:1px dotted rgba(255,255,255,.28);padding:1.25rem 0 1.75rem;display:flex;flex-direction:column;gap:1rem;align-items:flex-start;font-size:.78rem;line-height:1.8;color:rgba(255,255,255,.6)}
@media(min-width:800px){.jf-legal{flex-direction:row;align-items:center;justify-content:space-between}}
.jf-up{display:inline-flex;align-items:center;gap:.4rem;height:2.4rem;padding:0 1rem;border-radius:999px;border:1.5px solid #fff;background:transparent;color:#fff;font:800 .8rem var(--f-disp);cursor:pointer}
.jf-up:hover{background:#fff;color:#0a0a0a}
`;

export default function SiteFooter() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const services = [
    fr ? "Location de voiture" : "تأجير السيارات",
    fr ? "Vente et achat des voitures" : "بيع وشراء السيارات",
    fr ? "Service automobiles" : "خدمات السيارات",
  ];

  return (
    <>
      <style>{css}</style>
      <footer className="jf">
        <div className="j-wrap">
          <div className="jf-grid">
            <div>
              <Link to="/" className="jf-logo" aria-label="Jina Business">
                <img src="/JinaLogo1.png" alt="Jina Business" />
              </Link>
            </div>

            <div>
              <h4>{fr ? "Nos services" : "خدماتنا"}</h4>
              <ul className="jf-checks">
                {services.map((s) => (<li key={s}><Check strokeWidth={3} /> {s}</li>))}
              </ul>
            </div>

            <div>
              <h4>Navigation</h4>
              <ul className="jf-links">
                <li><Link to="/">{t("nav.home")}</Link></li>
                <li><Link to="/our-cars">{t("nav.cars")}</Link></li>
                <li><Link to="/about">{t("nav.about")}</Link></li>
                <li><Link to="/contact">{t("nav.contact")}</Link></li>
              </ul>
            </div>

            <div>
              <h4>Contact</h4>
              <ul className="jf-contact">
                <li><a href="tel:+212526030067"><span className="jf-ico"><Phone /></span><span><small>{fr ? "Agence" : "الوكالة"}</small>05 26 03 00 67</span></a></li>
                <li><a href="tel:+212667474745"><span className="jf-ico"><Phone /></span><span><small>Najib</small>06 67 47 47 45</span></a></li>
                <li><a href="mailto:jinabusiness0@gmail.com"><span className="jf-ico"><Mail /></span><span><small>Email</small>jinabusiness0@gmail.com</span></a></li>
                <li>
                  <a href="https://www.google.com/maps/search/?api=1&query=LOT+ERRACHAD+706+Mediouna+Casablanca" target="_blank" rel="noreferrer">
                    <span className="jf-ico"><MapPin /></span>
                    <span><small>{fr ? "Adresse" : "العنوان"}</small>LOT ERRACHAD N° 706 TR 02 MAG 01, MEDIOUNA, CASABLANCA</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="jf-legal">
            <div>
              TP : 37701443 · RC : 624023 · IF : 65912528 · CNSS : 5317601
              <br />© {new Date().getFullYear()} Jina Business. {t("footer.rights")}
            </div>
            <button className="jf-up" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <ArrowUp size={15} /> {fr ? "Haut de page" : "أعلى الصفحة"}
            </button>
          </div>
        </div>
        <div className="j-stripe full" style={{ height: 8 }} />
      </footer>
    </>
  );
}