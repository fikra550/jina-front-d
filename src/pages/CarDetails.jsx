// pages/CarDetails.jsx  — full-page car details + booking (route: /our-cars/:id)
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, Mail, Phone, User, Car, Gauge, Clock, Ban } from "lucide-react";
import { useI18n } from "../lib/i18n";
import "../lib/JinaTheme";
import {
  fetchCars, selectCars, selectCarsLoading, createReservation,
  selectReservationsLoading, createClient, fetchClients, selectClients,
} from "../Redux/store";
import { toast } from "sonner";
import { differenceInCalendarDays, format } from "date-fns";

const css = `
.cd{padding:2.25rem 1.6rem 5rem;margin-top:.75rem}
@media(min-width:900px){.cd{padding:3rem 2rem 6rem;margin-top:1rem}}
.cd-photo,.cd-form{max-width:100%}
.cd-back{display:inline-flex;align-items:center;gap:.5rem;font:800 .9rem var(--f-disp);text-decoration:none;padding:.5rem 1rem;border-radius:999px;border:1.5px solid var(--text);margin-bottom:2rem}
.cd-back:hover{background:var(--text);color:var(--paper)}
.cd-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:start}
@media(min-width:1000px){.cd-grid{grid-template-columns:1.1fr 1fr;gap:3.5rem}.cd-left{position:sticky;top:calc(var(--hdr,5rem) + 2rem)}}
.cd-photo{position:relative;aspect-ratio:4/3;background:#0a0a0a;border-radius:4px;overflow:hidden;border:1.5px solid var(--text);box-shadow:8px 8px 0 var(--red)}
.cd-photo img{width:100%;height:100%;object-fit:cover;display:block}
.cd-ph{height:100%;display:flex;align-items:center;justify-content:center}
.cd-title{font-size:clamp(2.2rem,5vw,3.6rem);margin:1.6rem 0 .3rem}
.cd-price{display:flex;align-items:baseline;gap:.6rem;margin:.4rem 0 1rem}
.cd-price strong{font:900 2.4rem var(--f-disp);font-stretch:118%;color:var(--red)}
.cd-spec{padding:.75rem 1.5rem;margin-top:1.5rem}
.cd-rules{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-top:1.5rem}
.cd-rule{background:#0a0a0a;color:#fff;border-radius:.9rem;padding:.9rem .8rem;text-align:center}
.cd-rule svg{width:1.2rem;height:1.2rem;color:var(--red);margin-bottom:.3rem}
.cd-rule b{display:block;font:900 1.3rem var(--f-disp);font-stretch:115%}
.cd-rule span{font-size:.72rem;color:#b9b9c2;line-height:1.3;display:block}
.cd-form{padding:1.5rem 1.5rem 1.75rem;display:flex;flex-direction:column;gap:1.15rem}
@media(min-width:768px){.cd-form{padding:2rem 2.25rem}}
.cd-act{display:flex;flex-direction:column;gap:.6rem}
@media(min-width:600px){.cd-act{flex-direction:row}.cd-act>*{flex:1}}
.cd-spin{width:1rem;height:1rem;border:2px solid currentColor;border-top-color:transparent;border-radius:999px;animation:cd-s .8s linear infinite}
@keyframes cd-s{to{transform:rotate(360deg)}}
.cd-center{text-align:center;padding:6rem 1rem;display:flex;flex-direction:column;align-items:center;gap:1rem}
`;

const emptyFor = (today, time) => ({
  nom: "", prenom: "", email: "", telephone: "",
  start_date: today, end_date: today, start_time: time, end_time: time, notes: "",
});

export default function CarDetails() {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const cars = useSelector(selectCars);
  const carsLoading = useSelector(selectCarsLoading);
  const reservationsLoading = useSelector(selectReservationsLoading);
  const clients = useSelector(selectClients);

  const today = format(new Date(), "yyyy-MM-dd");
  const currentTime = format(new Date(), "HH:00");
  const [form, setForm] = useState(emptyFor(today, currentTime));
  const [submitted, setSubmitted] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  useEffect(() => {
    dispatch(fetchCars());
    dispatch(fetchClients());
  }, [dispatch]);

  const car = cars.find((c) => String(c.id) === String(id));
  const ok = car?.status === "disponible";
  const price = car ? Number(car.price_per_day || car.daily_price || 0) : 0;

  const getCarImageUrl = (c) => {
    if (!c) return null;
    for (const field of ["image_url", "image", "img_url", "photo", "picture", "car_image"]) {
      const v = c[field];
      if (v && typeof v === "string" && v.trim() !== "") {
        if (v.startsWith("http://") || v.startsWith("https://")) return v;
        if (v.startsWith("/storage/")) return `http://localhost:8000${v}`;
        if (!v.startsWith("/")) return `http://localhost:8000/storage/${v}`;
        return `http://localhost:8000${v}`;
      }
    }
    return null;
  };

  const days = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    return Math.max(1, differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1);
  }, [form.start_date, form.end_date]);
  const total = days * price;

  const submit = async (e) => {
    e.preventDefault();
    if (!car || !ok) return;
    setSearchingClient(true);
    try {
      let clientId = null;
      const existing = clients.find((c) => c.email === form.email);
      if (existing) {
        clientId = existing.id;
      } else {
        const res = await dispatch(
          createClient({ nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone })
        ).unwrap();
        clientId = res.client?.id || res.data?.id || res.id;
        if (!clientId) throw new Error("Failed to create or find client");
        await dispatch(fetchClients());
      }
      const result = await dispatch(
        createReservation({
          car_id: car.id, client_id: clientId,
          start_date: form.start_date, end_date: form.end_date,
          start_time: form.start_time, end_time: form.end_time,
          rental_days: days, total_price: total, amount_paid: 0, remaining_amount: total,
          status: "contacted", notes: form.notes, has_second_driver: false, payment_history: [],
        })
      ).unwrap();
      if (result.error) throw new Error(result.error);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success(fr ? "Réservation confirmée !" : "تم تأكيد الحجز!");
      setTimeout(() => dispatch(fetchCars(true)), 500);
    } catch (error) {
      console.error("Reservation error:", error);
      let msg = fr ? "Erreur lors de la réservation" : "خطأ في الحجز";
      if (error.message) msg = error.message;
      else if (error.response?.data?.message) msg = error.response.data.message;
      else if (typeof error === "string") msg = error;
      toast.error(msg);
    } finally {
      setSearchingClient(false);
    }
  };

  if (!car) {
    return (
      <>
        <style>{css}</style>
        <div className="j-wrap cd-center">
          {carsLoading ? (
            <p className="j-muted">{fr ? "Chargement..." : "جاري التحميل..."}</p>
          ) : (
            <>
              <h1 className="j-disp" style={{ fontSize: "2.2rem" }}>{fr ? "Véhicule introuvable" : "السيارة غير موجودة"}</h1>
              <Link to="/our-cars" className="j-btn red"><ArrowLeft /> {fr ? "Voir nos voitures" : "عرض السيارات"}</Link>
            </>
          )}
        </div>
      </>
    );
  }

  const img = getCarImageUrl(car);
  const isAuto = car.transmission === "automatic" || car.type === "automatic";

  return (
    <>
      <style>{css}</style>
      <div className="j-wrap cd">
        <Link to="/our-cars" className="cd-back"><ArrowLeft size={16} /> {fr ? "Retour aux voitures" : "العودة إلى السيارات"}</Link>

        <div className="cd-grid">
          <div className="cd-left">
            <div className="cd-photo">
              {img && !imgError ? (
                <img src={img} alt={`${car.brand} ${car.model}`} onError={() => setImgError(true)} />
              ) : (
                <div className="cd-ph"><Car size={72} color="rgba(255,255,255,.2)" /></div>
              )}
              <span className={`j-status${ok ? "" : " off"}`}>{ok ? "Disponible" : "Non disponible"}</span>
            </div>

            <h1 className="j-disp cd-title">{car.brand} {car.model}</h1>
            <div className="cd-price">
              <strong>{price} MAD</strong><span className="j-muted">{t("cars.perDay")}</span>
            </div>
            <div className="j-stripe" />

            <div className="j-sheet cd-spec">
              <div className="j-line"><b>{t("cars.year")}</b><span className="j-fill"><span className="j-hand">{car.year}</span></span></div>
              <div className="j-line"><b>{t("cars.color")}</b><span className="j-fill"><span className="j-hand" style={{ textTransform: "capitalize" }}>{car.color}</span></span></div>
              <div className="j-line"><b>{t("cars.type")}</b><span className="j-fill"><span className="j-hand">{isAuto ? t("cars.automatic") : t("cars.manual")}</span></span></div>
              <div className="j-line"><b>{fr ? "Km inclus" : "الكيلومترات"}</b><span className="j-fill"><span className="j-hand">200 km / {fr ? "jour" : "يوم"}</span></span></div>
            </div>

            <div className="cd-rules">
              <div className="cd-rule"><Gauge /><b>200 km</b><span>{fr ? "par jour, puis 1 dh/km" : "في اليوم ثم 1 درهم/كلم"}</span></div>
              <div className="cd-rule"><Clock /><b>19h</b><span>{fr ? "retour, sinon 200 dhs" : "الإرجاع، وإلا 200 درهم"}</span></div>
              <div className="cd-rule"><Ban /><b>48h</b><span>{fr ? "annulation sans frais" : "إلغاء مجاني"}</span></div>
            </div>
          </div>

          <div>
            {submitted ? (
              <div className="j-sheet cd-form" style={{ textAlign: "center", alignItems: "center", padding: "3rem 1.5rem" }}>
                <div className="j-stamp">{fr ? "Réservé" : "تم الحجز"}</div>
                <h2 className="j-disp" style={{ fontSize: "1.9rem" }}>{fr ? "Réservation confirmée !" : "تم تأكيد الحجز!"}</h2>
                <p className="j-muted">
                  {fr ? `Votre réservation pour ${car.brand} ${car.model} a bien été enregistrée.` : `تم تسجيل حجزك لسيارة ${car.brand} ${car.model} بنجاح.`}
                </p>
                <p className="j-muted" style={{ fontSize: ".9rem" }}>
                  {fr ? "Vous recevrez un email de confirmation dans quelques instants." : "ستتلقى بريدًا إلكترونيًا للتأكيد في غضون لحظات."}
                </p>
                <Link to="/our-cars" className="j-btn red">{fr ? "Voir d'autres voitures" : "عرض سيارات أخرى"}</Link>
              </div>
            ) : (
              <form className="j-sheet cd-form" onSubmit={submit}>
                <span className="j-tag" style={{ alignSelf: "flex-start" }}>{fr ? "Locataire" : "المستأجر"}</span>

                {!ok && (
                  <p style={{ color: "var(--red)", fontWeight: 700 }}>
                    {fr ? "Ce véhicule n'est pas disponible pour le moment." : "هذه السيارة غير متاحة حالياً."}
                  </p>
                )}

                <input type="hidden" name="start_time" value={form.start_time} />
                <input type="hidden" name="end_time" value={form.end_time} />

                <div className="j-grid-2">
                  <label className="j-field"><span className="j-label"><User size={13} /> {fr ? "Prénom" : "الاسم الأول"} *</span>
                    <input className="j-input" required disabled={!ok} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></label>
                  <label className="j-field"><span className="j-label"><User size={13} /> {fr ? "Nom" : "الاسم العائلي"} *</span>
                    <input className="j-input" required disabled={!ok} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></label>
                </div>
                <div className="j-grid-2">
                  <label className="j-field"><span className="j-label"><Mail size={13} /> {t("book.email")} *</span>
                    <input className="j-input" type="email" required disabled={!ok} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                  <label className="j-field"><span className="j-label"><Phone size={13} /> {t("book.phone")} *</span>
                    <input className="j-input" required disabled={!ok} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+212 6 12 34 56 78" /></label>
                </div>
                <div className="j-grid-2">
                  <label className="j-field"><span className="j-label"><Calendar size={13} /> {t("book.start")} *</span>
                    <input className="j-input" type="date" required disabled={!ok} min={today} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
                  <label className="j-field"><span className="j-label"><Calendar size={13} /> {t("book.end")} *</span>
                    <input className="j-input" type="date" required disabled={!ok} min={form.start_date} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
                </div>
                <label className="j-field"><span className="j-label">{t("book.notes")}</span>
                  <textarea className="j-input" rows={3} disabled={!ok} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

                <div style={{ borderTop: "1.5px solid var(--text)", paddingTop: ".5rem" }}>
                  <div className="j-line"><b>{fr ? "Durée" : "المدة"}</b><span className="j-fill"><span className="j-hand">{days} {days === 1 ? (fr ? "jour" : "يوم") : (fr ? "jours" : "أيام")}</span></span></div>
                  <div className="j-line"><b>{price} MAD × {days}</b><span className="j-fill" /></div>
                  <div className="j-line"><b>{t("book.total")}</b><span className="j-fill"><span className="j-hand" style={{ color: "var(--red)" }}>{total} MAD</span></span></div>
                </div>

                <div className="cd-act">
                  <button type="submit" className="j-btn red" disabled={!ok || reservationsLoading || searchingClient}>
                    {reservationsLoading || searchingClient ? (<><span className="cd-spin" /> {fr ? "Traitement..." : "جاري المعالجة..."}</>) : (<>{t("book.submit")} <ArrowRight /></>)}
                  </button>
                  <a href="tel:+212526030067" className="j-btn line"><Phone /> 05 26 03 00 67</a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}