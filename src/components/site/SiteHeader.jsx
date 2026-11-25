// components/site/SiteHeader.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Globe, Phone, ArrowRight } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import "../../lib/JinaTheme";

const css = `
:root{--hdr:5rem}
@media(min-width:900px){:root{--hdr:5.75rem}}

.jh{position:fixed;top:0;left:0;right:0;z-index:60;background:var(--paper);border-bottom:1px solid var(--edge);transition:background .25s ease,box-shadow .25s ease}
.jh.scrolled{background:color-mix(in srgb,var(--paper) 62%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.5);backdrop-filter:blur(16px) saturate(1.5);box-shadow:0 10px 30px -18px rgba(0,0,0,.45)}
.jh.open{background:var(--paper);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}
.jh::after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:7px;}
.jh-bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;height:var(--hdr)}

.jh-logo{display:flex;align-items:center;background:#0a0a0a;border-radius:14px;padding:.35rem .8rem;box-shadow:0 0 0 2px var(--red),0 4px 0 2px var(--blue);margin-bottom:4px}
.jh-logo img{height:48px;width:auto;display:block;border-radius:8px}
@media(min-width:900px){.jh-logo{border-radius:16px;padding:.4rem 1rem}.jh-logo img{height:66px}}

.jh-nav{display:none;gap:.35rem}
.jh-link{padding:.55rem 1.2rem;border-radius:999px;font:800 .92rem var(--f-disp);font-stretch:108%;text-decoration:none;color:var(--text);transition:background .2s,color .2s}
.jh-link:hover{background:var(--desk)}
.jh-link.active{background:var(--red);color:#fff}
.jh-right{display:flex;align-items:center;gap:.5rem}
.jh-lang{display:inline-flex;align-items:center;gap:.4rem;height:2.5rem;padding:0 .85rem;border-radius:999px;border:1.5px solid var(--text);background:transparent;color:var(--text);font:800 .8rem var(--f-disp);cursor:pointer}
.jh-lang .long{display:none}
.jh-call{display:none}
.jh-burger{display:inline-flex;align-items:center;justify-content:center;width:2.75rem;height:2.75rem;border-radius:14px;border:0;background:var(--red);color:#fff;cursor:pointer}
@media(min-width:900px){.jh-nav{display:flex}.jh-call{display:inline-flex;height:2.6rem;padding:0 1.2rem}.jh-burger{display:none}.jh-lang .long{display:inline}.jh-lang .short{display:none}}

.jm-back{position:fixed;inset:0;z-index:54;background:rgba(0,0,0,.45)}
.jm{position:fixed;z-index:55;top:calc(var(--hdr) + 14px);left:.75rem;right:.75rem;max-height:calc(100vh - var(--hdr) - 2rem);overflow-y:auto;background:var(--paper);border:1px solid var(--edge);border-radius:1.25rem;padding:.6rem;box-shadow:0 24px 50px -20px rgba(0,0,0,.6)}
.jm-list{display:flex;flex-direction:column;gap:.15rem}
.jm-link{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border-radius:.9rem;text-decoration:none;color:var(--text);font:800 1rem var(--f-disp);font-stretch:108%}
.jm-link svg{width:1rem;height:1rem;opacity:.45}
.jm-link.active{background:var(--red);color:#fff}
.jm-link.active svg{opacity:1}
.jm-row{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.5rem;padding-top:.6rem;border-top:2px dotted var(--rule)}
.jm-row .j-btn{height:2.6rem;padding:0 .8rem;font-size:.82rem}
.jm-lang{display:flex;align-items:center;justify-content:center;gap:.4rem;height:2.6rem;border-radius:999px;border:1.5px solid var(--text);background:transparent;color:var(--text);font:800 .82rem var(--f-disp);cursor:pointer}
@media(min-width:900px){.jm,.jm-back{display:none}}
`;

export default function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const fr = lang === "fr";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---- Hidden shortcut: type "jina" to open /admin ---- */
  useEffect(() => {
    let buffer = "";
    const SECRET = "jina"; // only "jina" 

    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if (e.key.length !== 1) return;

      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer === SECRET) {
        buffer = "";
        navigate("/admin");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/our-cars", label: t("nav.cars") },
    { to: "/about", label: t("nav.about") },
    { to: "/contact", label: t("nav.contact") },
  ];
  const cls = ({ isActive }) => `jh-link${isActive ? " active" : ""}`;
  const toggleLang = () => setLang(fr ? "ar" : "fr");

  return (
    <>
      <style>{css}</style>
      <header className={`jh${open ? " open" : scrolled ? " scrolled" : ""}`}>
        <div className="j-wrap">
          <div className="jh-bar">
            <Link to="/" className="jh-logo" aria-label="Jina Business">
              <img src="/JinaLogo1.png" alt="Jina Business" />
            </Link>

            <nav className="jh-nav" aria-label="Navigation">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === "/"} className={cls}>{l.label}</NavLink>
              ))}
            </nav>

            <div className="jh-right">
              <button className="jh-lang" onClick={toggleLang} aria-label="Language">
                <Globe size={16} />
                <span className="long">{fr ? "العربية" : "Français"}</span>
                <span className="short">{fr ? "AR" : "FR"}</span>
              </button>
              <a href="tel:+212526030067" className="j-btn red jh-call"><Phone /> 05 26 03 00 67</a>
              <button className="jh-burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="jm-back" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div
              className="jm"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <nav className="jm-list" aria-label="Navigation">
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => `jm-link${isActive ? " active" : ""}`}>
                    {l.label} <ArrowRight />
                  </NavLink>
                ))}
              </nav>
              <div className="jm-row">
                <button className="jm-lang" onClick={toggleLang}><Globe size={16} /> {fr ? "العربية" : "Français"}</button>
                <a href="tel:+212526030067" className="j-btn red"><Phone /> {fr ? "Appeler" : "اتصل"}</a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}