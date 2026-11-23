// pages/Home.jsx  (all booking logic kept, design rebuilt as "Le Contrat")
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, Shield, Mail, Phone, Check, Gauge, Clock, Ban } from "lucide-react";
import { useI18n } from "../lib/i18n";
import "../lib/JinaTheme";
import { FadeIn } from "../components/site/Motion3D";
import { fetchCars, fetchReservations, selectCars, selectReservations, selectCarsLoading } from "../Redux/store";
import { toast } from "sonner";
import heroCar from "../assets/hero-car.jpg";

/* ---------- small SVG pieces taken from the printed card / contract ---------- */
function Dial() {
  return (
    <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Service 24/7">
      <defs><path id="jDialArc" d="M 16 74 A 54 54 0 0 1 124 74" /></defs>
      <circle cx="70" cy="76" r="38" fill="none" stroke="#e5202e" strokeWidth="5" strokeDasharray="190 50" strokeLinecap="round" />
      <polygon points="104,92 118,98 106,108" fill="#e5202e" />
      <text fill="#e5202e" fontFamily="Archivo, sans-serif" fontWeight="900" fontSize="15" letterSpacing="2">
        <textPath href="#jDialArc" startOffset="50%" textAnchor="middle">SERVICE</textPath>
      </text>
      <text x="62" y="82" textAnchor="middle" fill="#fff" fontFamily="Archivo, sans-serif" fontWeight="800" fontSize="30">24</text>
      <line x1="56" y1="96" x2="84" y2="82" stroke="#e5202e" strokeWidth="3" />
      <text x="86" y="106" textAnchor="middle" fill="#fff" fontFamily="Archivo, sans-serif" fontWeight="800" fontSize="26">7</text>
    </svg>
  );
}

function FuelGauge({ level, label }) {
  const a = Math.PI * (1 - level);
  const nx = 60 + 38 * Math.cos(a), ny = 62 - 38 * Math.sin(a);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const names = ["0", "1/4", "1/2", "3/4", "4/4"];
  return (
    <figure style={{ textAlign: "center" }}>
      <svg viewBox="0 0 120 80" width="170" aria-label={`${label} ${names[ticks.indexOf(level)]}`}>
        <path d="M 14 62 A 46 46 0 0 1 106 62" fill="none" stroke="currentColor" strokeWidth="3" />
        {ticks.map((tk, i) => {
          const ang = Math.PI * (1 - tk);
          return (
            <g key={i}>
              <line x1={60 + 40 * Math.cos(ang)} y1={62 - 40 * Math.sin(ang)} x2={60 + 48 * Math.cos(ang)} y2={62 - 48 * Math.sin(ang)} stroke="currentColor" strokeWidth="2.5" />
              <text x={60 + 58 * Math.cos(ang)} y={66 - 56 * Math.sin(ang)} fontSize="7" fontWeight="800" textAnchor="middle" fill="currentColor">{names[i]}</text>
            </g>
          );
        })}
        <line x1="60" y1="62" x2={nx} y2={ny} stroke="#e5202e" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="62" r="4" fill="#e5202e" />
      </svg>
      <figcaption className="j-disp" style={{ fontSize: "1.25rem", color: "#e5202e", marginTop: ".1rem" }}>{label}</figcaption>
    </figure>
  );
}

const css = `
.hm-hero{position:relative;overflow:hidden;background:#0a0a0a;color:#fff;padding:3.5rem 0 5rem}
.hm-hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:8px;background:linear-gradient(to bottom,var(--red) 0 3px,transparent 3px 5px,var(--blue) 5px 8px)}
.hm-arc{position:absolute;top:-30%;right:-14%;width:55%;height:170%;border-left:7px solid var(--red);border-radius:100% 0 0 100%/50% 0 0 50%;box-shadow:-14px 0 0 var(--blue);pointer-events:none}
.hm-grid{position:relative;display:grid;grid-template-columns:1fr;gap:3rem;align-items:center}
@media(min-width:960px){.hm-grid{grid-template-columns:1fr 1.05fr;gap:4rem}}
.hm-brand{font-size:clamp(3rem,9vw,6.2rem)}
.hm-brand span:first-child{color:var(--red)} .hm-brand span:last-child{color:var(--blue)}
.hm-sub{margin-top:.9rem;font:800 clamp(1.4rem,3.2vw,2rem) var(--f-disp);font-stretch:105%}
.hm-ar{display:block;margin-top:.25rem;font:800 clamp(1.8rem,4vw,2.6rem) 'Cairo',var(--f-disp)}
.hm-lead{margin-top:1.25rem;max-width:30rem;color:#c9c9d1;line-height:1.6}
.hm-actions{margin-top:2rem;display:flex;flex-wrap:wrap;gap:.75rem}
.hm-phones{margin-top:1.75rem;display:flex;flex-wrap:wrap;gap:.6rem}
.hm-phone{display:inline-flex;align-items:center;gap:.5rem;padding:.45rem .9rem;border-radius:999px;border:1px dotted rgba(255,255,255,.4);color:#fff;text-decoration:none;font-weight:700;font-size:.9rem}
.hm-phone:hover{border-color:var(--red)} .hm-phone svg{width:1rem;height:1rem;color:var(--red)}

.hm-sheet{color:var(--text);padding:1.5rem 1.5rem 1.25rem}
.hm-sheet-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem}
.hm-sheet-title{font:800 1.05rem var(--f-disp);font-stretch:118%;color:var(--red);letter-spacing:.01em}
.hm-photo{position:relative;aspect-ratio:16/10;background:#0a0a0a;border-radius:3px;overflow:hidden;margin:.9rem 0 .6rem}
.hm-photo img{width:100%;height:100%;object-fit:cover;display:block}
.hm-dots{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem}
.hm-dot{width:.6rem;height:.6rem;border-radius:999px;border:0;background:var(--rule);cursor:pointer;padding:0}
.hm-dot.on{width:1.8rem;background:var(--red)}
.hm-stamp{position:absolute;top:-1rem;inset-inline-end:-.5rem;z-index:3;background:var(--paper)}

/* services = business card */
.hm-card{padding:2.25rem 1.5rem 3rem;display:grid;grid-template-columns:1fr;gap:2rem;align-items:center}
@media(min-width:800px){.hm-card{grid-template-columns:1fr auto;padding:3.5rem 3.5rem 4rem}}
.hm-svc{list-style:none;padding:0;display:flex;flex-direction:column;gap:1.5rem}
.hm-svc li{display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:start}
.hm-tick{width:2rem;height:2rem;color:var(--red);margin-top:.1rem}
.hm-svc h3{font:800 clamp(1.35rem,3vw,1.9rem) var(--f-disp);font-stretch:112%}
.hm-svc p{margin-top:.25rem;color:#b9b9c2;max-width:34rem;line-height:1.55}

.hm-h2{font-size:clamp(2rem,5vw,3.4rem)}
.hm-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;background:#0a0a0a;color:#fff;border-radius:999px;padding:.55rem .6rem .55rem 1.75rem;margin-bottom:2rem}
.hm-bar h2{font:800 clamp(1.1rem,2.6vw,1.6rem) var(--f-disp);font-stretch:118%}

.hm-cars{display:grid;grid-template-columns:1fr;gap:1.75rem}
@media(min-width:700px){.hm-cars{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1000px){.hm-cars{grid-template-columns:repeat(3,1fr)}}
.hm-car{all:unset;box-sizing:border-box;display:block;width:100%;cursor:pointer;background:var(--paper);border:1.5px solid var(--text);border-radius:4px;box-shadow:6px 6px 0 var(--red);transition:transform .2s,box-shadow .2s;position:relative}
.hm-car:hover:not(:disabled){transform:translate(-3px,-3px);box-shadow:9px 9px 0 var(--blue)}
.hm-car:focus-visible{outline:3px solid var(--blue);outline-offset:4px}
.hm-car:disabled{cursor:not-allowed;filter:grayscale(.6);opacity:.8}
.hm-car-img{position:relative;height:200px;background:#0a0a0a;overflow:hidden;border-bottom:1.5px solid var(--text)}
.hm-car-img img{width:100%;height:100%;object-fit:cover;display:block}
.hm-car-ph{height:100%;display:flex;align-items:center;justify-content:center;font:900 5rem var(--f-disp);color:rgba(255,255,255,.14)}
.hm-car-body{padding:.85rem 1.1rem .5rem}
.hm-car-name{font:800 1.25rem var(--f-disp);font-stretch:112%;margin-bottom:.2rem}
.hm-car-foot{display:flex;align-items:center;justify-content:space-between;background:#0a0a0a;color:#fff;padding:.75rem 1.1rem}
.hm-price{font:800 1.4rem var(--f-disp);font-stretch:112%}
.hm-price small{font:600 .75rem var(--f-disp);color:#b9b9c2;margin-inline-start:.35rem}
.hm-go{display:inline-flex;align-items:center;gap:.35rem;background:var(--red);color:#fff;padding:.4rem .95rem;border-radius:999px;font:800 .85rem var(--f-disp)}
.hm-go svg{width:.95rem;height:.95rem}

/* signature boxes = steps */
.hm-sign{border:1.5px solid var(--text);border-radius:1.25rem;overflow:hidden;background:var(--paper);display:grid;grid-template-columns:1fr}
@media(min-width:800px){.hm-sign{grid-template-columns:repeat(3,1fr)}}
.hm-cell{padding:1.25rem 1.5rem 2.25rem;border-top:1.5px solid var(--text)}
.hm-cell:first-child{border-top:0}
@media(min-width:800px){.hm-cell{border-top:0;border-inline-start:1.5px solid var(--text)}.hm-cell:first-child{border-inline-start:0}}
.hm-cell .j-tag{width:100%;justify-content:center;margin-bottom:1rem}
.hm-cell svg.ic{width:2rem;height:2rem;color:var(--blue);margin-bottom:.6rem}
.hm-cell p{color:var(--muted);line-height:1.55}

/* conditions */
.hm-cond{display:grid;grid-template-columns:1fr;gap:0;padding:0}
@media(min-width:800px){.hm-cond{grid-template-columns:repeat(3,1fr)}}
.hm-cond>div{padding:1.75rem 1.75rem 2rem;border-top:2px dotted var(--rule)}
.hm-cond>div:first-child{border-top:0}
@media(min-width:800px){.hm-cond>div{border-top:0;border-inline-start:2px dotted var(--rule)}.hm-cond>div:first-child{border-inline-start:0}}
.hm-big{font:900 clamp(2.6rem,6vw,4rem) var(--f-disp);font-stretch:120%;color:var(--red);line-height:1}
.hm-cond h3{font:800 1.15rem var(--f-disp);margin:.6rem 0 .4rem}
.hm-cond p{color:var(--muted);line-height:1.55}
.hm-gauges{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2rem;padding:1.5rem;border-top:1.5px solid var(--text)}
.hm-gauges p{max-width:18rem;color:var(--muted)}

/* closing card */
.hm-end{padding:2.5rem 1.5rem 3.25rem;display:grid;grid-template-columns:1fr;gap:1.5rem}
@media(min-width:800px){.hm-end{padding:3.5rem 3.5rem 4rem;grid-template-columns:1.2fr 1fr;align-items:center}}
.hm-end ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:.7rem}
.hm-end li{display:flex;gap:.7rem;align-items:flex-start;font-weight:600}
.hm-end li svg{width:1.15rem;height:1.15rem;color:var(--red);margin-top:.15rem;flex-shrink:0}
.hm-end a{text-decoration:none}.hm-end a:hover{color:var(--blue)}

`;

export default function Home() {
  const dispatch = useDispatch();
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const cars = useSelector(selectCars);
  const reservations = useSelector(selectReservations);
  const loading = useSelector(selectCarsLoading);

  const [idx, setIdx] = useState(0);
  const [carouselCars, setCarouselCars] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const navigate = useNavigate();

  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  useEffect(() => {
    dispatch(fetchCars());
    dispatch(fetchReservations());
  }, [dispatch]);

  const getCarImageUrl = (car) => {
    if (!car) return null;
    for (const field of ["image_url", "image", "img_url", "photo", "picture", "car_image"]) {
      const v = car[field];
      if (v && typeof v === "string" && v.trim() !== "") {
        if (v.startsWith("http://") || v.startsWith("https://")) return v;
        if (v.startsWith("/storage/")) return `http://localhost:8000${v}`;
        if (!v.startsWith("/")) return `http://localhost:8000/storage/${v}`;
        return `http://localhost:8000${v}`;
      }
    }
    return null;
  };

  // Most reserved cars first
  useEffect(() => {
    if (!cars.length) return;
    const count = {};
    reservations.forEach((r) => { if (r.car_id) count[r.car_id] = (count[r.car_id] || 0) + 1; });
    const sorted = [...cars].map((c) => ({ ...c, n: count[c.id] || 0 })).sort((a, b) => b.n - a.n);
    setCarouselCars(sorted.slice(0, 12));
  }, [cars, reservations]);

  useEffect(() => {
    if (carouselCars.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % carouselCars.length), 4500);
    return () => clearInterval(id);
  }, [carouselCars.length]);

  const displayedCars = cars.slice(0, 3);
  const current = carouselCars[idx];

  const openCar = (car) => {
    if (car.status !== "disponible") {
      toast.warning(fr ? "Ce véhicule n'est pas disponible pour le moment." : "هذه السيارة غير متاحة حالياً.");
      return;
    }
    navigate(`/our-cars/${car.id}`);
  };

  const services = [
    { title: fr ? "Location de voiture" : "تأجير السيارات", desc: fr ? "Citadines, berlines et SUV prêts à partir. 200 km inclus par jour." : "سيارات صغيرة وسيدان ودفع رباعي جاهزة للانطلاق. 200 كلم مشمولة في اليوم." },
    { title: fr ? "Vente et achat des voitures" : "بيع وشراء السيارات", desc: fr ? "Nous vendons et rachetons des voitures. Parlez-nous de votre projet." : "نبيع ونشتري السيارات. حدثنا عن مشروعك." },
    { title: fr ? "Service automobiles" : "خدمات السيارات", desc: fr ? "Entretien et assistance, 24h/24 et 7j/7." : "صيانة ومساعدة على مدار الساعة وطوال أيام الأسبوع." },
  ];
  const steps = [
    { icon: MapPin, title: fr ? "Choisissez" : "اختر", desc: fr ? "Parcourez nos véhicules et sélectionnez le vôtre." : "تصفّح سياراتنا واختر سيارتك." },
    { icon: Calendar, title: fr ? "Réservez" : "احجز", desc: fr ? "Remplissez le formulaire en moins d'une minute." : "املأ النموذج في أقل من دقيقة." },
    { icon: Shield, title: fr ? "Conduisez" : "قُد", desc: fr ? "Signez le contrat, récupérez les clés et partez." : "وقّع العقد، استلم المفاتيح وانطلق." },
  ];
  const rules = [
    { icon: Gauge, big: "200 km", title: fr ? "Kilométrage par jour" : "المسافة في اليوم", text: fr ? "Au-delà, chaque kilomètre supplémentaire coûte un dirham." : "وما زاد عن ذلك يُحتسب بدرهم واحد لكل كيلومتر." },
    { icon: Clock, big: "19h", title: fr ? "Heure limite de retour" : "آخر موعد للإرجاع", text: fr ? "Un retour après 19h entraîne une pénalité de retard de 200 dhs." : "الإرجاع بعد الساعة 19:00 يترتب عنه غرامة تأخير قدرها 200 درهم." },
    { icon: Ban, big: "48h", title: fr ? "Annulation sans frais" : "إلغاء مجاني", text: fr ? "30% du montant jusqu'à 24h avant, 50% en cas de no show." : "30% من المبلغ حتى 24 ساعة، و50% في حال عدم الحضور." },
  ];

  const heroImg = getCarImageUrl(current) || heroCar;

  return (
    <>
      <style>{css}</style>

      {/* ============ HERO: a contract being filled in ============ */}
      <section className="hm-hero">
        <div className="hm-arc" />
        <div className="j-wrap">
          <div className="hm-grid">
            <div>
              <h1 className="j-disp hm-brand"><span>JINA</span> <span>BUSINESS</span></h1>
              <p className="hm-sub">{fr ? "Location de voiture" : "Location de voiture"}</p>
              <span className="hm-ar">تأجير السيارات</span>
              <p className="hm-lead">
                {fr
                  ? "Location, vente et achat de voitures, service automobiles. Une agence à Mediouna, Casablanca."
                  : "تأجير وبيع وشراء السيارات وخدمات السيارات. وكالة في المديونة، الدار البيضاء."}
              </p>
              <div className="hm-actions">
                <Link to="/our-cars" className="j-btn red">{t("hero.cta.book")} <ArrowRight /></Link>
                <Link to="/our-cars" className="j-btn line" style={{ color: "#fff" }}>{t("hero.cta.fleet")}</Link>
              </div>
              <div className="hm-phones">
                <a href="tel:+212526030067" className="hm-phone"><Phone /> 05 26 03 00 67</a>
                <a href="tel:+212667474745" className="hm-phone"><Phone /> Najib : 06 67 47 47 45</a>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <div className="hm-stamp j-stamp">{fr ? "7j/7 Ouvert" : "مفتوح 7/7"}</div>
              <div className="j-sheet hm-sheet">
                <div className="hm-sheet-head">
                  <div className="hm-sheet-title">{fr ? "CONTRAT DE LOCATION" : "عقد كراء"}</div>
                </div>
                <span className="j-tag ink">{fr ? "Information sur véhicule" : "معلومات السيارة"}</span>

                <div className="hm-photo">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={heroImg}
                      src={heroImg}
                      alt={current ? `${current.brand} ${current.model}` : "Jina Business"}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      onError={(e) => { e.currentTarget.src = heroCar; }}
                    />
                  </AnimatePresence>
                </div>

                <div className="j-line">
                  <b>{fr ? "Marque" : "الماركة"} :</b>
                  <span className="j-fill"><span key={current?.id} className="j-hand j-write">{current ? `${current.brand} ${current.model}` : "…"}</span></span>
                </div>
                <div className="j-line">
                  <b>{fr ? "Prix / jour" : "الثمن / اليوم"} :</b>
                  <span className="j-fill"><span key={current?.id} className="j-hand j-write">{current ? `${current.price_per_day || current.daily_price || 0} MAD` : "…"}</span></span>
                </div>
                <div className="j-line">
                  <b>{fr ? "Km inclus" : "الكيلومترات"} :</b>
                  <span className="j-fill"><span className="j-hand">200 km / {fr ? "jour" : "يوم"}</span></span>
                </div>

                {carouselCars.length > 1 && (
                  <div className="hm-dots">
                    {carouselCars.map((c, i) => (
                      <button key={c.id} className={`hm-dot${i === idx ? " on" : ""}`} onClick={() => setIdx(i)} aria-label={`${c.brand} ${c.model}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SERVICES: the business card ============ */}
      <section className="j-section">
        <div className="j-wrap">
          <FadeIn>
            <div className="j-card hm-card">
              <ul className="hm-svc">
                {services.map((s) => (
                  <li key={s.title}>
                    <Check className="hm-tick" strokeWidth={3} />
                    <div><h3>{s.title}</h3><p>{s.desc}</p></div>
                  </li>
                ))}
              </ul>
              <Dial />
              <div className="j-stripe full" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============ FLEET: check-list ============ */}
      <section className="j-section" style={{ paddingTop: 0 }}>
        <div className="j-wrap">
          <div className="hm-bar">
            <h2>{t("cars.title")}</h2>
            <Link to="/our-cars" className="j-btn red" style={{ height: "2.6rem" }}>
              {fr ? "Voir tout" : "عرض الكل"} <ArrowRight />
            </Link>
          </div>

          {loading ? (
            <p className="j-muted">{fr ? "Chargement..." : "جاري التحميل..."}</p>
          ) : (
            <div className="hm-cars">
              {displayedCars.map((car, i) => {
                const img = getCarImageUrl(car);
                const bad = imageErrors[car.id];
                const ok = car.status === "disponible";
                return (
                  <FadeIn key={car.id} delay={i * 0.08}>
                    <button className="hm-car" onClick={() => openCar(car)} disabled={!ok}>
                      <div className="hm-car-img">
                        {img && !bad ? (
                          <img src={img} alt={`${car.brand} ${car.model}`} onError={() => setImageErrors((p) => ({ ...p, [car.id]: true }))} />
                        ) : (
                          <div className="hm-car-ph">{car.brand?.[0] || "C"}</div>
                        )}
                        <span className={`j-status${ok ? "" : " off"}`}>{ok ? "Disponible" : "Non disponible"}</span>
                      </div>
                      <div className="hm-car-body">
                        <div className="hm-car-name">{car.brand} {car.model}</div>
                        <div className="j-line"><b>{t("cars.year")}</b><span className="j-fill"><span className="j-hand">{car.year}</span></span></div>
                        <div className="j-line"><b>{t("cars.color")}</b><span className="j-fill"><span className="j-hand" style={{ textTransform: "capitalize" }}>{car.color}</span></span></div>
                        <div className="j-line"><b>{t("cars.type")}</b><span className="j-fill"><span className="j-hand">{car.type === "automatic" ? t("cars.automatic") : t("cars.manual")}</span></span></div>
                      </div>
                      <div className="hm-car-foot">
                        <div className="hm-price">{car.price_per_day} MAD<small>{t("cars.perDay")}</small></div>
                        <span className="hm-go">{ok ? t("cars.book") : (fr ? "Indisponible" : "غير متاحة")}{ok && <ArrowRight />}</span>
                      </div>
                    </button>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ STEPS: the three signature boxes ============ */}
      <section className="j-section" style={{ paddingTop: 0 }}>
        <div className="j-wrap">
          <FadeIn>
            <h2 className="j-disp hm-h2" style={{ marginBottom: "2rem", maxWidth: "36rem" }}>
              {fr ? "Trois étapes vers la route" : "ثلاث خطوات نحو الطريق"}
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="hm-sign">
              {steps.map((s) => (
                <div className="hm-cell" key={s.title}>
                  <span className="j-tag">{s.title}</span>
                  <s.icon className="ic" />
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============ CONDITIONS ============ */}
      <section className="j-section" style={{ paddingTop: 0 }}>
        <div className="j-wrap">
          <div className="hm-bar">
            <h2>{fr ? "Conditions générales de location" : "الشروط العامة للتأجير"}</h2>
          </div>
          <FadeIn>
            <div className="j-sheet" style={{ overflow: "hidden" }}>
              <div className="hm-cond">
                {rules.map((r) => (
                  <div key={r.big}>
                    <div className="hm-big">{r.big}</div>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                  </div>
                ))}
              </div>
              <div className="hm-gauges">
                <FuelGauge level={1} label={fr ? "AVANT" : "قبل"} />
                <FuelGauge level={0.75} label={fr ? "APRÈS" : "بعد"} />
                <p>{fr ? "Le niveau de carburant et la carrosserie sont notés au départ et au retour." : "يُسجَّل مستوى الوقود وحالة الهيكل عند الاستلام وعند الإرجاع."}</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============ CLOSING CARD ============ */}
      <section className="j-section" style={{ paddingTop: 0 }}>
        <div className="j-wrap">
          <FadeIn>
            <div className="j-card hm-end">
              <div>
                <h2 className="j-disp hm-h2">{fr ? "Prêt à prendre la route ?" : "هل أنت جاهز للانطلاق؟"}</h2>
                <div className="hm-actions">
                  <Link to="/our-cars" className="j-btn red">{t("hero.cta.book")} <ArrowRight /></Link>
                  <a href="tel:+212526030067" className="j-btn line" style={{ color: "#fff" }}><Phone /> 05 26 03 00 67</a>
                </div>
              </div>
              <ul>
                <li><Mail /><a href="mailto:jinabusiness0@gmail.com">jinabusiness0@gmail.com</a></li>
                <li><Phone /><a href="tel:+212667474745">Najib : 06 67 47 47 45</a></li>
                <li><MapPin /><span>LOT ERRACHAD N° 706 TR 02 MAG 01, MEDIOUNA, CASABLANCA</span></li>
              </ul>
              <div className="j-stripe full" />
            </div>
          </FadeIn>
        </div>
      </section>

    </>
  );
}