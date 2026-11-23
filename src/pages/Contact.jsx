// pages/Contact.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useI18n } from "../lib/i18n";
import "../lib/JinaTheme";
import { FadeIn } from "../components/site/Motion3D";
import { MapPin, Phone, Mail, Clock, Send, User } from "lucide-react";
import { createContact } from "../Redux/store";
import { toast } from "sonner";

const css = `
.ct-head{padding:3.5rem 0 2.5rem;max-width:44rem}
@media(min-width:768px){.ct-head{padding:5rem 0 3rem}}
.ct-title{font-size:clamp(2.2rem,5.5vw,4rem)}
.ct-lead{margin-top:1.1rem;color:var(--muted);font-size:1.1rem;line-height:1.6}
.ct-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;padding-bottom:2rem}
@media(min-width:1000px){.ct-grid{grid-template-columns:1fr 1.1fr;gap:3.5rem}}
.ct-info{display:flex;flex-direction:column;gap:1.25rem}
.ct-row{display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:start;padding-bottom:1.1rem;border-bottom:2px dotted var(--rule)}
.ct-ico{width:2.75rem;height:2.75rem;border-radius:999px;background:var(--red);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ct-row:nth-child(even) .ct-ico{background:#0a0a0a}
.ct-ico svg{width:1.15rem;height:1.15rem;color:#fff}
.ct-k{font:800 .85rem var(--f-disp);font-stretch:108%;color:var(--muted);margin-bottom:.15rem}
.ct-v{display:block;font:700 1.1rem var(--f-disp);text-decoration:none;overflow-wrap:anywhere;line-height:1.45}
a.ct-v:hover{color:var(--red)}
.ct-form{padding:1.5rem 1.5rem 1.75rem;display:flex;flex-direction:column;gap:1.25rem}
@media(min-width:768px){.ct-form{padding:2rem 2.25rem 2.25rem}}
`;

export default function Contact() {
  const dispatch = useDispatch();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const empty = { fullname: "", email: "", phone: "", message: "" };
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await dispatch(createContact({ ...form }));
    setSubmitting(false);
    if (result.error) {
      toast.error(fr ? "Erreur lors de l'envoi" : "خطأ في الإرسال");
    } else {
      toast.success(fr ? "Message envoyé. Nous revenons vers vous !" : "تم إرسال الرسالة. سنعود إليك!");
      setForm(empty);
    }
  };

  const items = [
    { icon: Phone, title: fr ? "Téléphone" : "الهاتف", lines: [{ text: "05 26 03 00 67", href: "tel:+212526030067" }, { text: "06 63 04 95 75", href: "tel:+212663049575" }] },
    { icon: User, title: "Najib", lines: [{ text: "06 67 47 47 45", href: "tel:+212667474745" }] },
    { icon: Mail, title: "Email", lines: [{ text: "jinabusiness0@gmail.com", href: "mailto:jinabusiness0@gmail.com" }] },
    { icon: MapPin, title: fr ? "Adresse" : "العنوان", lines: [{ text: "LOT ERRACHAD N° 706 TR 02 MAG 01, MEDIOUNA, CASABLANCA", href: "https://www.google.com/maps/search/?api=1&query=LOT+ERRACHAD+706+Mediouna+Casablanca" }] },
    { icon: Clock, title: fr ? "Horaires" : "أوقات العمل", lines: [{ text: fr ? "Ouvert 7j/7, service 24h/24" : "مفتوح 7/7، خدمة على مدار الساعة" }] },
  ];

  const field = (id, label, key, props = {}) => (
    <label className="j-field" htmlFor={id}>
      <span className="j-label">{label} *</span>
      <input id={id} className="j-input" required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <>
      <style>{css}</style>
      <div className="j-wrap">
        <FadeIn>
          <div className="ct-head">
            <h1 className="j-disp ct-title">{fr ? "Parlons de votre prochaine location" : "لنتحدث عن سيارتك القادمة"}</h1>
            <p className="ct-lead">
              {fr
                ? "Appelez-nous, écrivez-nous ou passez à l'agence de Mediouna. Nous répondons 24h/24, 7j/7."
                : "اتصل بنا أو راسلنا أو زر وكالتنا في المديونة. نرد على مدار الساعة طوال أيام الأسبوع."}
            </p>
            <div className="j-stripe" style={{ marginTop: "1.5rem" }} />
          </div>
        </FadeIn>

        <div className="ct-grid">
          <FadeIn>
            <div className="ct-info">
              {items.map((item) => (
                <div className="ct-row" key={item.title}>
                  <div className="ct-ico"><item.icon /></div>
                  <div>
                    <div className="ct-k">{item.title}</div>
                    {item.lines.map((l) =>
                      l.href ? (
                        <a key={l.text} className="ct-v" href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{l.text}</a>
                      ) : (
                        <span key={l.text} className="ct-v">{l.text}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <form onSubmit={submit} className="j-sheet ct-form">
              <span className="j-tag" style={{ alignSelf: "flex-start" }}>{fr ? "Envoyez-nous un message" : "أرسل لنا رسالة"}</span>
              {field("c-fullname", fr ? "Nom complet" : "الاسم الكامل", "fullname", { type: "text" })}
              {field("c-email", fr ? "Email" : "البريد الإلكتروني", "email", { type: "email", placeholder: "nom@exemple.com" })}
              {field("c-phone", fr ? "Téléphone" : "رقم الهاتف", "phone", { type: "tel", placeholder: "+212 6 12 34 56 78" })}
              <label className="j-field" htmlFor="c-message">
                <span className="j-label">{fr ? "Message" : "الرسالة"} *</span>
                <textarea id="c-message" className="j-input" required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </label>
              <button type="submit" disabled={submitting} className="j-btn red" style={{ width: "100%" }}>
                <Send /> {submitting ? (fr ? "Envoi..." : "جاري الإرسال...") : (fr ? "Envoyer" : "إرسال")}
              </button>
            </form>
          </FadeIn>
        </div>
      </div>
    </>
  );
}