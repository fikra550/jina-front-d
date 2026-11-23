// pages/Cars.jsx  (booking logic unchanged, design rebuilt as "Le Contrat")
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useI18n } from "../lib/i18n";
import "../lib/JinaTheme";
import { FadeIn } from "../components/site/Motion3D";
import { fetchCars, selectCars, selectCarsLoading } from "../Redux/store";
import { toast } from "sonner";

const css = `
.cr-head{padding:3.5rem 0 2.5rem;max-width:46rem}
@media(min-width:768px){.cr-head{padding:5rem 0 3rem}}
.cr-title{font-size:clamp(2.4rem,6vw,4.5rem)}
.cr-lead{margin-top:1rem;color:var(--muted);font-size:1.1rem;line-height:1.6}
.cr-grid{display:grid;grid-template-columns:1fr;gap:1.75rem;padding-bottom:3rem}
@media(min-width:700px){.cr-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1000px){.cr-grid{grid-template-columns:repeat(3,1fr)}}
.cr-car{all:unset;box-sizing:border-box;display:block;width:100%;cursor:pointer;background:var(--paper);border:1.5px solid var(--text);border-radius:4px;box-shadow:6px 6px 0 var(--red);transition:transform .2s,box-shadow .2s;position:relative}
.cr-car:hover:not(:disabled){transform:translate(-3px,-3px);box-shadow:9px 9px 0 var(--blue)}
.cr-car:focus-visible{outline:3px solid var(--blue);outline-offset:4px}
.cr-car:disabled{cursor:not-allowed;filter:grayscale(.6);opacity:.8}
.cr-img{position:relative;height:200px;background:#0a0a0a;overflow:hidden;border-bottom:1.5px solid var(--text)}
.cr-img img{width:100%;height:100%;object-fit:cover;display:block}
.cr-ph{height:100%;display:flex;align-items:center;justify-content:center;font:900 5rem var(--f-disp);color:rgba(255,255,255,.14)}
.cr-body{padding:.85rem 1.1rem .5rem}
.cr-name{font:800 1.25rem var(--f-disp);font-stretch:112%;margin-bottom:.2rem}
.cr-foot{display:flex;align-items:center;justify-content:space-between;background:#0a0a0a;color:#fff;padding:.75rem 1.1rem}
.cr-price{font:800 1.4rem var(--f-disp);font-stretch:112%}
.cr-price small{font:600 .75rem var(--f-disp);color:#b9b9c2;margin-inline-start:.35rem}
.cr-go{display:inline-flex;align-items:center;gap:.35rem;background:var(--red);color:#fff;padding:.4rem .95rem;border-radius:999px;font:800 .85rem var(--f-disp)}
.cr-go svg{width:.95rem;height:.95rem}
`;

export default function Cars() {
  const dispatch = useDispatch();
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const [params] = useSearchParams();
  const cars = useSelector(selectCars);
  const carsLoading = useSelector(selectCarsLoading);
  const [imageErrors, setImageErrors] = useState({});
  const navigate = useNavigate();

  const getCarImageUrl = (car) => {
    if (!car) return null;
    for (const field of ["image_url", "image", "img_url", "photo", "picture", "car_image"]) {
      const v = car[field];
      if (v && typeof v === "string" && v.trim() !== "") {
        if (v.startsWith("http://") || v.startsWith("https://")) return v;
        if (v.startsWith("/storage/")) return `https://jina-back-d-production.up.railway.app${v}`;
        if (!v.startsWith("/")) return `https://jina-back-d-production.up.railway.app/storage/${v}`;
        return `https://jina-back-d-production.up.railway.app${v}`;
      }
    }
    return null;
  };

  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  useEffect(() => {
    dispatch(fetchCars());
  }, [dispatch]);

  // old links like /our-cars?id=3 now go to the full page
  useEffect(() => {
    const id = params.get("id");
    if (id) navigate(`/our-cars/${id}`, { replace: true });
  }, [params, navigate]);

  const openCar = (car) => {
    if (car.status !== "disponible") {
      toast.warning(fr ? "Ce véhicule n'est pas disponible pour le moment." : "هذه السيارة غير متاحة حالياً.");
      return;
    }
    navigate(`/our-cars/${car.id}`);
  };

  const isAuto = (c) => c.transmission === "automatic" || c.type === "automatic";

  if (carsLoading) {
    return (
      <>
        <style>{css}</style>
        <div className="j-wrap" style={{ padding: "6rem 1.25rem" }}>
          <p className="j-muted" style={{ textAlign: "center" }}>{fr ? "Chargement..." : "جاري التحميل..."}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="j-wrap">
        <FadeIn>
          <div className="cr-head">
            <span className="j-tag ink" style={{ marginBottom: "1.1rem" }}>{fr ? "Information sur véhicule" : "معلومات السيارة"}</span>
            <h1 className="j-disp cr-title">{t("cars.title")}</h1>
            <p className="cr-lead">{t("cars.subtitle")}</p>
            <div className="j-stripe" style={{ marginTop: "1.5rem" }} />
          </div>
        </FadeIn>

        <div className="cr-grid">
          {cars.map((car, i) => {
            const img = getCarImageUrl(car);
            const bad = imageErrors[car.id];
            const price = car.price_per_day || car.daily_price || 0;
            const ok = car.status === "disponible";
            return (
              <FadeIn key={car.id} delay={Math.min(i, 5) * 0.05}>
                <button className="cr-car" onClick={() => openCar(car)} disabled={!ok}>
                  <div className="cr-img">
                    {img && !bad ? (
                      <img src={img} alt={`${car.brand} ${car.model}`} onError={() => setImageErrors((p) => ({ ...p, [car.id]: true }))} />
                    ) : (
                      <div className="cr-ph">{car.brand?.[0] || car.model?.[0] || "C"}</div>
                    )}
                    <span className={`j-status${ok ? "" : " off"}`}>{ok ? "Disponible" : "Non disponible"}</span>
                  </div>
                  <div className="cr-body">
                    <div className="cr-name">{car.brand} {car.model}</div>
                    <div className="j-line"><b>{t("cars.year")}</b><span className="j-fill"><span className="j-hand">{car.year}</span></span></div>
                    <div className="j-line"><b>{t("cars.color")}</b><span className="j-fill"><span className="j-hand" style={{ textTransform: "capitalize" }}>{car.color}</span></span></div>
                    <div className="j-line"><b>{t("cars.type")}</b><span className="j-fill"><span className="j-hand">{isAuto(car) ? t("cars.automatic") : t("cars.manual")}</span></span></div>
                  </div>
                  <div className="cr-foot">
                    <div className="cr-price">{price} MAD<small>{t("cars.perDay")}</small></div>
                    <span className="cr-go">{ok ? t("cars.book") : (fr ? "Indisponible" : "غير متاحة")}{ok && <ArrowRight />}</span>
                  </div>
                </button>
              </FadeIn>
            );
          })}
        </div>
      </div>

    </>
  );
}