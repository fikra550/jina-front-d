// pages/About.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Check, Phone } from "lucide-react";
import { useI18n } from "../lib/i18n";
import "../lib/JinaTheme";
import { FadeIn } from "../components/site/Motion3D";

const css = `
.ab-hero{display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center;padding:3.5rem 0 3rem}
@media(min-width:900px){.ab-hero{grid-template-columns:1.25fr 1fr;gap:4rem;padding:5rem 0 4rem}}
.ab-title{font-size:clamp(2.2rem,5.5vw,4rem)}
.ab-lead{margin-top:1.25rem;max-width:34rem;color:var(--muted);font-size:1.1rem;line-height:1.65}
.ab-logo{background:#0a0a0a;border-radius:1.25rem;padding:1rem 1rem 1.6rem;display:flex;justify-content:center;position:relative;overflow:hidden;width:fit-content;max-width:100%;justify-self:center}
.ab-logo img{height:110px;width:auto;max-width:100%;display:block;border-radius:14px}
.ab-logo .j-stripe.full{position:absolute;left:0;right:0;bottom:0;width:auto}
.ab-two{display:grid;grid-template-columns:1fr;gap:2.5rem;padding:2rem 0 4rem}
@media(min-width:800px){.ab-two{grid-template-columns:1fr 1fr;gap:4rem}}
.ab-h3{font-size:1.9rem;margin-bottom:.9rem}
.ab-list{list-style:none;padding:0;margin-top:1.25rem;display:flex;flex-direction:column;gap:.8rem}
.ab-list li{display:flex;align-items:center;gap:.7rem;font:800 1.1rem var(--f-disp)}
.ab-list svg{width:1.3rem;height:1.3rem;color:var(--red)}
.ab-stats{display:grid;grid-template-columns:1fr;padding:.5rem 1.5rem}
@media(min-width:800px){.ab-stats{grid-template-columns:1fr 1fr;column-gap:3rem;padding:1rem 2.5rem}}
.ab-art{display:grid;grid-template-columns:auto 1fr;gap:1rem;padding:1.4rem 0;border-top:2px dotted var(--rule)}
.ab-art:first-child{border-top:0}
.ab-n{font:900 1.1rem var(--f-disp);color:var(--red);min-width:3.2rem}
.ab-art h4{font:800 1.1rem var(--f-disp);margin-bottom:.35rem}
.ab-art p{color:var(--muted);line-height:1.6}
.ab-rules{padding:.5rem 1.5rem}
@media(min-width:800px){.ab-rules{display:grid;grid-template-columns:1fr 1fr;column-gap:3.5rem;padding:1rem 2.5rem}.ab-rules .ab-art:nth-child(2){border-top:0}}
.ab-call{margin-top:3.5rem;padding:2rem 1.5rem 2.5rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.25rem}
.ab-call h4{font-size:1.5rem}
`;

export default function About() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const stats = [
    { k: fr ? "Service automobiles" : "خدمة السيارات", v: "24/7" },
    { k: fr ? "Services en une agence" : "خدمات في وكالة واحدة", v: "3" },
    { k: fr ? "Inclus par jour" : "مشمولة في اليوم", v: "200 km" },
    { k: "Mediouna", v: "Casablanca" },
  ];
  const services = [
    fr ? "Location de voiture" : "تأجير السيارات",
    fr ? "Vente et achat des voitures" : "بيع وشراء السيارات",
    fr ? "Service automobiles" : "خدمات السيارات",
  ];
  const rules = [
    { title: fr ? "Documents et conducteurs" : "الوثائق والسائقون", text: fr ? "CIN ou passeport et permis de conduire en cours de validité, de plus d'un an. Un deuxième conducteur peut être ajouté au contrat." : "بطاقة التعريف أو جواز السفر ورخصة سياقة سارية المفعول وتتجاوز مدتها سنة. يمكن إضافة سائق ثانٍ إلى العقد." },
    { title: fr ? "Kilométrage" : "المسافة", text: fr ? "200 km par jour. Au-delà, chaque kilomètre supplémentaire coûte un dirham." : "200 كلم في اليوم. وما زاد عن ذلك يُحتسب بدرهم واحد لكل كيلومتر." },
    { title: fr ? "Retour et retard" : "الإرجاع والتأخير", text: fr ? "Un retour après 19h entraîne une pénalité de retard de 200 dhs. Toute journée commencée est due en entier." : "الإرجاع بعد الساعة 19:00 يترتب عنه غرامة تأخير قدرها 200 درهم. وكل يوم بدأ يُحتسب كاملاً." },
    { title: fr ? "Annulation" : "الإلغاء", text: fr ? "Sans frais jusqu'à 48h avant l'arrivée, 30% du montant jusqu'à 24h, 50% en cas de no show." : "مجاناً حتى 48 ساعة قبل الوصول، و30% من المبلغ حتى 24 ساعة، و50% في حال عدم الحضور." },
    { title: fr ? "Infractions et code de la route" : "المخالفات وقانون السير", text: fr ? "Toute infraction est communiquée directement aux services de police ou de gendarmerie avec les coordonnées du locataire." : "تُحال كل مخالفة مباشرة إلى مصالح الشرطة أو الدرك مع بيانات المستأجر." },
    { title: fr ? "Litiges" : "النزاعات", text: fr ? "En cas de litige, le tribunal de commerce de Casablanca est compétent." : "في حالة النزاع، تختص المحكمة التجارية بالدار البيضاء." },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="j-wrap">
        <FadeIn>
          <div className="ab-hero">
            <div>
              <h1 className="j-disp ab-title">
                {fr ? "Jina Business, la location de voiture à Casablanca" : "جينا بيزنس، تأجير السيارات في الدار البيضاء"}
              </h1>
              <p className="ab-lead">
                {fr
                  ? "Location, vente et achat de voitures, service automobiles. Notre agence de Mediouna est ouverte 7j/7 et répond 24h/24."
                  : "تأجير وبيع وشراء السيارات وخدمات السيارات. وكالتنا في المديونة مفتوحة 7/7 ونرد على مدار الساعة."}
              </p>
              <div className="j-stripe" style={{ marginTop: "1.75rem" }} />
            </div>
            <div className="ab-logo">
              <img src="/JinaLogo1.png" alt="Jina Business" />
              <div className="j-stripe full" />
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="j-sheet ab-stats">
            {stats.map((s) => (
              <div className="j-line" key={s.k}>
                <b>{s.k}</b>
                <span className="j-fill"><span className="j-hand">{s.v}</span></span>
              </div>
            ))}
          </div>
        </FadeIn>

        <div className="ab-two" style={{ paddingTop: "4rem" }}>
          <FadeIn>
            <div>
              <h3 className="j-disp ab-h3">{fr ? "Ce que nous faisons" : "ماذا نقدم"}</h3>
              <p className="j-muted" style={{ lineHeight: 1.7 }}>
                {fr ? "Une seule adresse pour louer, acheter ou vendre une voiture, et pour l'entretenir." : "عنوان واحد لتأجير السيارة أو شرائها أو بيعها وصيانتها."}
              </p>
              <ul className="ab-list">
                {services.map((s) => (<li key={s}><Check strokeWidth={3} /> {s}</li>))}
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div>
              <h3 className="j-disp ab-h3">{fr ? "Notre façon de travailler" : "طريقة عملنا"}</h3>
              <p className="j-muted" style={{ lineHeight: 1.7 }}>
                {fr
                  ? "Chaque location est encadrée par un contrat écrit, avec un état des lieux du véhicule au départ et au retour (carburant et carrosserie). Les conditions sont expliquées avant la remise des clés, pour qu'il n'y ait aucune mauvaise surprise."
                  : "كل عملية تأجير يؤطرها عقد مكتوب مع معاينة للسيارة عند الاستلام وعند الإرجاع (الوقود والهيكل). نشرح الشروط قبل تسليم المفاتيح حتى لا تكون هناك أي مفاجآت."}
              </p>
            </div>
          </FadeIn>
        </div>

        <FadeIn>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", background: "#0a0a0a", color: "#fff", borderRadius: "999px", padding: ".6rem 1.75rem", marginBottom: "1.5rem" }}>
            <h2 style={{ font: "800 1.4rem var(--f-disp)", fontStretch: "118%" }}>{fr ? "Conditions générales de location" : "شروط التأجير"}</h2>
            <span style={{ color: "#b9b9c2", fontSize: ".9rem" }}>{fr ? "Le contrat signé fait foi." : "العقد الموقّع هو المرجع."}</span>
          </div>
        </FadeIn>
        <div className="j-sheet ab-rules">
          {rules.map((r, i) => (
            <div className="ab-art" key={r.title}>
              <span className="ab-n">Art. {i + 1}</span>
              <div><h4>{r.title}</h4><p>{r.text}</p></div>
            </div>
          ))}
        </div>

        <FadeIn>
          <div className="j-card ab-call">
            <h4 className="j-disp">{fr ? "Une question avant de réserver ?" : "هل لديك سؤال قبل الحجز؟"}</h4>
            <a href="tel:+212526030067" className="j-btn red"><Phone /> 05 26 03 00 67</a>
            <div className="j-stripe full" />
          </div>
        </FadeIn>
        <div style={{ height: "1rem" }} />
      </div>
    </>
  );
}