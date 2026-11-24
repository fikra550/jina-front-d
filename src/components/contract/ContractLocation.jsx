// src/components/contract/ContractLocation.jsx
// Jina Business rental contract – 2 pages (recto = contract, verso = conditions générales)
// Used by AdminReservations.jsx and AdminReservationsStatus.jsx
import { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import checklistImage from "../../assets/checklist.png";

const LOGO = "/JinaLogo.png";

/* ------------------------------------------------------------------ */
/*  Conditions générales (verso) – edit the text here if needed        */
/* ------------------------------------------------------------------ */
const CG_INTRO =
  "Le présent contrat a été établi et prend date comme indiqué au recto. Il engage l'agence qui sera appelée « le loueur » et la personne ou la société qui signe ce contrat, qui sera dénommée « le locataire ».";

const CG_ARTICLES = [
  {
    title: "Article 1 : Utilisation de la voiture",
    text:
      "Le locataire s'engage à ne pas laisser conduire la voiture par d'autres personnes que lui-même ou les conducteurs agréés par le loueur et dont il se porte garant. Il s'engage à ne pas utiliser le véhicule à des fins illicites ni pour le transport de marchandises, à ne pas le faire participer à une compétition quelle qu'elle soit, ni à solliciter directement des documents douaniers. Il est interdit de surcharger le véhicule loué ou de transporter un nombre de passagers supérieur à celui porté sur le contrat, sous peine d'être déchu de l'assurance.",
  },
  {
    title: "Art. 2 : Pas d'annulation",
    text:
      "Pas de remboursement en cas de problèmes personnels ni pour l'essence. Tout ce qui est pneumatique est à la charge du client. Les voitures doivent être garées dans des parkings payants avec gardiens ; le vol de la roue de secours est à la charge du CLIENT. Les procès-verbaux d'excès de vitesse sont à la charge du client.",
  },
  {
    title: "Art. 3 : Essence et huile",
    text:
      "L'essence est à la charge du client. Le locataire doit vérifier en permanence les niveaux d'huile et d'eau, et vérifier les niveaux de la boîte de vitesses et du pont arrière tous les 1000 km ; les dépenses correspondantes lui seront remboursées sur justificatifs, sous peine d'avoir à payer une indemnité pour usure anormale.",
  },
  {
    title: "Art. 4 : Entretien et réparation",
    text:
      "L'usure mécanique normale est à la charge du loueur. Toutes les réparations provenant soit d'une usure anormale, soit d'une négligence du locataire ou d'une cause accidentelle sont à sa charge et exécutées par nos soins. Si le véhicule est immobilisé en dehors de la région, les réparations, qu'elles soient dues à l'usure normale ou à une cause accidentelle, ne seront exécutées qu'après accord télégraphique du loueur ou de l'agent régional de la marque du véhicule, et devront faire l'objet d'une facture acquittée. En aucun cas et en aucune circonstance le locataire ne pourra réclamer de dommages et intérêts, que ce soit pour retard dans la remise de la voiture ou pour annulation de la location, ni pour immobilisation due à des réparations nécessaires par l'usure normale effectuées au cours de la location. La responsabilité du loueur ne pourra jamais être invoquée, même en cas d'accidents de personnes ou de choses résultant de vices ou de défauts de construction ou de réparations antérieures.",
  },
];

const CG_ASSURANCE_TITLE = "Art. 5 : Assurance";
const CG_ASSURANCE_INTRO = "Le locataire est garanti pour les risques suivants :";
const CG_ASSURANCE_ITEMS = [
  "pour une somme illimitée, les accidents qu'il peut causer aux tiers, y compris ceux transportés à titre gracieux ;",
  "contre le vol et l'incendie du véhicule loué, à l'exclusion des vêtements et de tous les objets transportés ;",
  "les frais de rapatriement et d'immobilisation restent toujours à la charge du locataire, quelle que soit la formule d'assurance contractée ;",
  "le locataire s'engage à déclarer au loueur, dans les 48 heures, et immédiatement aux autorités de police, tout accident, vol ou incendie même partiel, sous peine d'être déchu du bénéfice de l'assurance. Sa déclaration devra obligatoirement mentionner : les circonstances, la date, le lieu et l'heure, le numéro ou le nom de l'agent, le nom et l'adresse des témoins ainsi que le numéro de la voiture adverse. S'il y a lieu, il joindra à cette déclaration tout rapport de police, de gendarmerie ou constat d'huissier. Il ne devra en aucun cas discuter la responsabilité ni traiter ou transiger avec des tiers relativement à l'accident. Il paiera une indemnité de chômage de la voiture pendant toute la durée d'immobilisation provenant d'usure anormale ou d'accident.",
];
const CG_ASSURANCE_AFTER = [
  "La voiture n'est assurée que pour la durée de location. Le loueur décline toute responsabilité pour les accidents que le locataire aurait pu causer et dont il devra faire son affaire personnelle.",
  "Il n'y a pas d'assurance pour tout conducteur non muni d'un permis en état de validité ou d'un permis datant de moins de 1 an. Le loueur décline toute responsabilité pour les accidents routiers ou dégâts à la voiture que le locataire pourrait causer pendant la période de location s'il a délibérément fourni au loueur de fausses informations concernant son identité, son adresse ou la validité de son permis de conduire.",
];

const CG_ARTICLES_2 = [
  {
    title: "Art. 6 : Location, caution, prolongation",
    text:
      "Le prix de location, ainsi que la caution, sont déterminés par les tarifs en vigueur et payables d'avance. La caution ne pourra servir en aucun cas de paiement au locataire. Afin d'éviter toute contestation, le locataire doit faire parvenir le montant de la location en cours avant l'échéance indiquée. Si le locataire souhaite conserver la voiture pour un temps supérieur à celui indiqué sur le contrat, il devra obtenir l'accord du loueur, faute de quoi il s'expose à des poursuites pour détournement de voiture ou abus de confiance. La journée de location compte de 0 heure à 24 heures et toute journée commencée est due en entier.",
  },
  {
    title: "Art. 7 : Juridiction",
    text: "De convention expresse, en cas de litige, le tribunal compétent sera le tribunal de commerce de Casablanca.",
  },
];

const CG_ACCIDENT_TITLE = "Art. 8 : Pièces à fournir en cas d'accident";
const CG_ACCIDENT_ITEMS = [
  "Procès-verbal de la police ou de la gendarmerie royale ou du représentant de la justice ; s'il s'agit d'un constat amiable, le constat bien rempli ;",
  "photos de tous les papiers (carte grise, assurance et permis de conduire…) de la partie adverse ;",
  "photos de la carte verte si le véhicule est non dédouané ou étranger.",
];

const CG_ARTICLES_3 = [
  {
    title: "Art. 9 : Responsabilité",
    text:
      "Le locataire demeure seul responsable des vols des pièces automobiles, amendes, contraventions et procès-verbaux établis contre lui.",
  },
  {
    title: "Art. 10 : Compétence",
    text:
      "De convention expresse, en cas de contestation quelconque, le tribunal de Casablanca sera seul compétent ; les frais de timbres et d'enregistrement seront à la charge du locataire.",
  },
];

const CG_KM_TITLE = "Article 11 : Kilométrage";
const CG_KM_TEXT =
  "Le kilométrage est limité à 200 km par jour. Si le conducteur dépasse cette limite, il paiera un dirham (1 DH) par kilomètre supplémentaire.";
const CG_CANCEL_TITLE = "Conditions d'annulation :";
const CG_CANCEL_ITEMS = [
  "Jusqu'à 48 h avant l'arrivée : sans frais.",
  "Jusqu'à 24 h avant l'arrivée : 30 % du montant total.",
  "No show / départ anticipé : 50 % du montant.",
];

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
function FuelGauge({ label }) {
  const names = ["0", "1/4", "1/2", "3/4", "4/4"];
  return (
    <div className="cp-gauge">
      <div className="cp-gauge-title">CARBURANT</div>
      <svg viewBox="-8 0 136 78" width="124" height="71" aria-label={`${label} carburant`}>
        <path d="M 14 62 A 46 46 0 0 1 106 62" fill="none" stroke="#111" strokeWidth="3" />
        {[0, 0.25, 0.5, 0.75, 1].map((tk, i) => {
          const a = Math.PI * (1 - tk);
          return (
            <g key={i}>
              <line
                x1={60 + 40 * Math.cos(a)} y1={62 - 40 * Math.sin(a)}
                x2={60 + 48 * Math.cos(a)} y2={62 - 48 * Math.sin(a)}
                stroke="#111" strokeWidth="2.5"
              />
              <text
                x={60 + 58 * Math.cos(a)} y={66 - 56 * Math.sin(a)}
                fontSize="8" fontWeight="800" textAnchor="middle" fill="#111"
              >
                {names[i]}
              </text>
            </g>
          );
        })}
        <circle cx="60" cy="62" r="3.5" fill="#e5202e" />
      </svg>
    </div>
  );
}

const Line = ({ label, value = "", small = false }) => (
  <div className={`cp-line ${small ? "small" : ""}`}>
    <span className="cp-lab">{label}</span>
    <span className="cp-fill"><span className="cp-val">{value}</span></span>
  </div>
);

const Check = ({ on }) => <span className={`cp-box ${on ? "on" : ""}`}>{on ? "✓" : ""}</span>;

const SigBlock = ({ label, signature = "", option }) => {
  if (option === "hide") return null;
  const isImage = typeof signature === "string" && signature.startsWith("data:image/");
  return (
    <div className="signature-block cp-sig">
      <div className="signature-label cp-sig-label">{label}</div>
      <div className="signature-box cp-sig-box">
        {option === "dash" ? (
          <div className="signature-text">___________</div>
        ) : isImage ? (
          <img src={signature} alt="Signature" style={{ maxHeight: 56, maxWidth: "100%" }} />
        ) : (
          signature && <div className="signature-text">{signature}</div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ContractLocation({
  reservation,
  showSignatures = false,
  currentUser,
  displayOptions = {},
  clients = [],
  containerId = "contract-print-hidden",
}) {
  const storedSignatures = reservation?.signatures || { agent: "", locataire: "", secondConducteur: "" };
  const [signatures, setSignatures] = useState(storedSignatures);

  useEffect(() => {
    if (reservation?.signatures) setSignatures(reservation.signatures);
  }, [reservation]);

  const paperwork = reservation?.paperwork || {
    circulation: true, carteGrise: true, assurance: true, vignette: true, visiteTechnique: true, autorisation: true,
  };

  const getCurrentUserName = () => {
    let userName = "";
    if (currentUser) userName = currentUser.Fullname || currentUser.fullname || currentUser.name || currentUser.username || "";
    if (!userName) {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          userName = u.Fullname || u.fullname || u.name || "";
        }
      } catch (e) { /* ignore */ }
    }
    return userName || "";
  };

  const getReservationCreatorName = () => {
    if (reservation?.created_by) return reservation.created_by;
    if (reservation?.user?.Fullname) return reservation.user.Fullname;
    if (reservation?.user?.name) return reservation.user.name;
    return "";
  };

  const formatDate = (d) => {
    if (!d) return "";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("fr-FR");
    } catch (e) { return ""; }
  };

  const calculateRentalDays = () => {
    if (!reservation?.start_date || !reservation?.end_date) return null;
    const s = new Date(reservation.start_date);
    const e = new Date(reservation.end_date);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    if (e < s) return 1;
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24));
    return diff === 0 ? 1 : diff;
  };

  const opt = (k) => displayOptions[k] || "show";
  const clientOpt = opt("clientInfo");
  const secondOpt = opt("secondDriver");
  const vehicleOpt = opt("vehicleInfo");
  const datesOpt = opt("rentalDates");
  const daysOpt = opt("rentalDays");
  const kmOpt = opt("kilometrage");
  const pricesOpt = opt("prices");
  const deliveryOpt = opt("deliveryReception");
  const sigOpt = opt("signatures");
  const insuranceOpt = opt("insurance");
  const depositOpt = opt("depositGuarantee");

  // show / dash / hide handling (same behaviour as the previous contract)
  const dv = (option, actual, dash = "___________", hide = "") => {
    if (option === "hide") return hide;
    if (option === "dash") return dash;
    return actual;
  };

  const client = reservation?.client || {};
  const second = clients.find((c) => c.id === reservation?.second_driver_client_id);
  const hasSecond = reservation?.has_second_driver === true && second;

  let receptionNotes = {};
  if (reservation?.reception_notes) {
    try { receptionNotes = JSON.parse(reservation.reception_notes); } catch (e) { receptionNotes = {}; }
  }
  const livrePar = receptionNotes.livre_par || getCurrentUserName();
  const recuPar = receptionNotes.receptionne_par || getReservationCreatorName();

  const contractNo =
    reservation?.contract_number && reservation?.contract_year
      ? `${reservation.contract_year}/${String(reservation.contract_number).padStart(5, "0")}`
      : "—";

  const rentalDays = reservation?.rental_days > 0 ? reservation.rental_days : calculateRentalDays();
  const prolong = Number(reservation?.prolongation_days) || 0;
  const locataireSignature = signatures.locataire_image || signatures.locataire || "";

  const full = (o) => `${o?.nom || ""} ${o?.prenom || ""}`.trim();
  const carName = `${reservation?.car?.brand || ""} ${reservation?.car?.model || ""}`.trim();
  const franchise = reservation?.franchise ?? reservation?.franchise_amount ?? reservation?.insurance_franchise;
  const intermediaire = reservation?.intermediaire ?? reservation?.intermediary ?? "";

  const money = (v) => (v === undefined || v === null || v === "" ? "" : `${v} DH`);

  // second driver values (respect show / dash / hide)
  const sd = (getter) => {
    if (secondOpt === "hide") return "";
    if (secondOpt === "dash") return "___________";
    return hasSecond ? getter(second) || "" : "";
  };

  return (
    <div className="contract-container-print" id={containerId}>
      {/* ============================ PAGE 1 : RECTO ============================ */}
      <div className="cp-page cp-front">
        <img src={LOGO} alt="" className="cp-watermark" />

        {/* header */}
        <div className="cp-head">
          <div className="cp-head-logo">
            <img src={LOGO} alt="Jina Business" />
          </div>
          <div className="cp-head-mid">
            <div className="cp-road">RESPECTEZ LE CODE DE LA ROUTE</div>
            <div className="cp-road-sub">
              Tout procès pour infraction du Code de la Route<br />
              Date de la période de location du véhicule<br />
              sera supporté par le locataire dont les coordonnées<br />
              seront communiquées directement aux services de<br />
              Police ou de la Gendarmerie, avec copie du présent contrat de location
            </div>
          </div>
          <div className="cp-open">7j/7 Ouvert</div>
        </div>

        <div className="cp-title-row">
          <div>
            <div className="cp-title-small">Location de voiture</div>
            <div className="cp-title-big">CONTRAT DE LOCATION</div>
          </div>
          <div className="cp-late">
            Si le retour de la véhicule dépassé 19h<br />vous devez payer une pénalité de retard de 200 dhs
          </div>
          <div className="cp-no">
            <span>CONTRAT N°</span>
            <b>{contractNo}</b>
          </div>
        </div>

        {/* two columns */}
        <div className="cp-cols">
          <div className="cp-col">
            <div className="cp-pill red">LOCATAIRE</div>
            <Line label="Nom / Prénom :" value={dv(clientOpt, full(client))} />
            <Line label="Né(e) le / à :" value={dv(clientOpt, [formatDate(client.date_naissance), client.lieu_naissance].filter(Boolean).join(" – "))} />
            <Line label="CIN / Passeport :" value={dv(clientOpt, client.cin_number)} />
            <Line label="Délivré le :" value={dv(clientOpt, formatDate(client.cin_delivre_le))} />
            <Line label="Permis N° :" value={dv(clientOpt, client.driver_license_number)} />
            <Line label="Délivré le :" value={dv(clientOpt, formatDate(client.permis_delivre_le))} />
            <Line label="Tél :" value={dv(clientOpt, client.telephone)} />
            <Line label="Adresse :" value={dv(clientOpt, client.city)} />
            <Line label="Email :" value={dv(clientOpt, client.email)} small />

            <div className="cp-pill red second">2ème Conducteur</div>
            <Line label="Nom :" value={sd((c) => c.nom)} />
            <Line label="Prénom :" value={sd((c) => c.prenom)} />
            <Line label="CIN / Passeport :" value={sd((c) => c.cin_number)} />
            <Line label="Permis N° :" value={sd((c) => c.driver_license_number)} />
            <Line label="Adresse :" value={sd((c) => c.city)} />
          </div>

          <div className="cp-col">
            <div className="cp-pill ink">INFORMATION SUR VEHICULE</div>
            <Line label="Marque :" value={dv(vehicleOpt, carName)} />
            <Line label="Immatriculation :" value={dv(vehicleOpt, reservation?.matricule?.matricule_code || "")} />
            <div className="cp-line">
              <span className="cp-lab">Date départ :</span>
              <span className="cp-fill"><span className="cp-val">{dv(datesOpt, formatDate(reservation?.start_date))}</span></span>
              <span className="cp-lab sm">heure :</span>
              <span className="cp-fill short"><span className="cp-val">{dv(datesOpt, reservation?.start_time || "")}</span></span>
            </div>
            <div className="cp-line">
              <span className="cp-lab">Date retour :</span>
              <span className="cp-fill"><span className="cp-val">{dv(datesOpt, formatDate(reservation?.end_date))}</span></span>
              <span className="cp-lab sm">heure :</span>
              <span className="cp-fill short"><span className="cp-val">{dv(datesOpt, reservation?.end_time || "")}</span></span>
            </div>
            <Line label="Durée :" value={dv(daysOpt, rentalDays ? `${rentalDays} jour${rentalDays > 1 ? "s" : ""}` : "")} />
            <Line label="Prolongation (1) :" value={prolong > 0 ? `${prolong} jour${prolong > 1 ? "s" : ""}` : ""} />
            <Line label="Prolongation (2) :" value="" />
            <Line label="Km départ :" value={dv(kmOpt, reservation?.kilometrage_sortie ? `${reservation.kilometrage_sortie} km` : "")} small />
            <Line label="Km retour :" value={dv(kmOpt, reservation?.kilometrage_entree ? `${reservation.kilometrage_entree} km` : "")} small />

            <div className="cp-gap" />
            <Line label="Total :" value={dv(pricesOpt, money(reservation?.total_price))} />
            <Line label="Avance :" value={dv(pricesOpt, money(reservation?.amount_paid))} />
            <Line label="Reste :" value={dv(pricesOpt, money(reservation?.remaining_amount ?? reservation?.total_price))} />
            <Line
              label="Franchise Assurance :"
              value={dv(insuranceOpt, franchise ? money(franchise) : "")}
            />
            <Line label="Caution :" value={dv(depositOpt, "")} />
            <Line label="Livré par :" value={dv(deliveryOpt, livrePar)} />
            <Line label="Reçu par :" value={dv(deliveryOpt, recuPar)} small />
            <Line label="Intermédiaire :" value={intermediaire || ""} />
          </div>
        </div>

        {/* check list */}
        <div className="cp-checkbar">Check List Etat Du Véhicule</div>
        <div className="cp-check">
          <div className="cp-check-cell">
            <div className="cp-ba">AVANT</div>
            <div className="cp-check-body">
              <FuelGauge label="Avant" />
              <img src={checklistImage} alt="Etat du véhicule avant" className="checklist-image cp-car" />
            </div>
          </div>
          <div className="cp-check-cell">
            <div className="cp-ba">APRÈS</div>
            <div className="cp-check-body">
              <FuelGauge label="Après" />
              <img src={checklistImage} alt="Etat du véhicule après" className="checklist-image cp-car" />
            </div>
          </div>
        </div>

        <div className="cp-docs">
          <b>Documents remis :</b>
          <span><Check on={paperwork.carteGrise} /> Carte grise</span>
          <span><Check on={paperwork.assurance} /> Assurance</span>
          <span><Check on={paperwork.vignette} /> Vignette</span>
          <span><Check on={paperwork.visiteTechnique} /> Visite technique</span>
          <span><Check on={paperwork.autorisation} /> Autorisation</span>
        </div>

        <div className="cp-tires">Pneu petite voiture 600dhs / pneu moyenne voiture 1500dhs / pneu voiture 4x4 3000dhs</div>

        <div className="cp-agree">
          * Je reconnais avoir pris connaissance des conditions générales de location au verso du contrat et j'accepte de m'y conformer
          {kmOpt !== "hide" && <> — Kilométrage limité à 200 km/jour, 1 DH par km supplémentaire.</>}
        </div>

        <div className="cp-sigs">
          <SigBlock label="Signature et cachet d'agent" signature={showSignatures ? signatures.agent : ""} option={sigOpt} />
          <SigBlock label="Signature du locataire" signature={showSignatures ? locataireSignature : ""} option={sigOpt} />
          <SigBlock
            label="Signature 2ème Conducteur"
            signature={showSignatures ? signatures.secondConducteur_image || signatures.secondConducteur || "" : ""}
            option={sigOpt}
          />
        </div>

        <div className="cp-foot">
          <b>Siège Social :</b> LOT ERRACHAD N° 706 TR 02 MAG 01 MEDIOUNA, CASABLANCA - Maroc<br />
          <b>GSM :</b> 06 63 04 95 75 - 06 67 47 47 45 &nbsp; <b>Email :</b> jinabusiness0@gmail.com<br />
          <b>TP :</b> 37701443 - <b>RC :</b> 624023 - <b>IF :</b> 65912528 - <b>CNSS :</b> 5317601<br />
          <b>N° I.C.E :</b> 003478448000020
        </div>
      </div>

      {/* ============================ PAGE 2 : VERSO ============================ */}
      <div className="cp-page cp-back">
        <img src={LOGO} alt="" className="cp-watermark" />
        <div className="cp-back-frame">
          <div className="cp-back-title">Conditions générales de location</div>

          <p className="cp-cg-intro">{CG_INTRO}</p>

          {CG_ARTICLES.map((a) => (
            <p className="cp-cg" key={a.title}><b>{a.title} :</b> {a.text}</p>
          ))}

          <p className="cp-cg"><b>{CG_ASSURANCE_TITLE} :</b> {CG_ASSURANCE_INTRO}</p>
          <ol className="cp-cg-list">
            {CG_ASSURANCE_ITEMS.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
          {CG_ASSURANCE_AFTER.map((t, i) => <p className="cp-cg" key={i}>{t}</p>)}

          {CG_ARTICLES_2.map((a) => (
            <p className="cp-cg" key={a.title}><b>{a.title} :</b> {a.text}</p>
          ))}

          <p className="cp-cg cp-cg-strong"><b>{CG_ACCIDENT_TITLE}</b></p>
          <ul className="cp-cg-list dash">
            {CG_ACCIDENT_ITEMS.map((t, i) => <li key={i}>{t}</li>)}
          </ul>

          {CG_ARTICLES_3.map((a) => (
            <p className="cp-cg" key={a.title}><b>{a.title} :</b> {a.text}</p>
          ))}

          <div className="cp-km-row">
            <div className="cp-km">
              <div className="cp-km-title">{CG_KM_TITLE}</div>
              <p>{CG_KM_TEXT}</p>
            </div>
            <div className="cp-cancel">
              <div className="cp-km-title">{CG_CANCEL_TITLE}</div>
              <ul>
                {CG_CANCEL_ITEMS.map((t, i) => <li key={i}>✓ {t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{contractCss}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PDF helper: renders each .cp-page into its own A4 page             */
/* ------------------------------------------------------------------ */
export async function contractToPdf(doc, contractElement, { includeSignatures = false, agentSignatureImage = "" } = {}) {
  const clone = contractElement.cloneNode(true);

  if (includeSignatures && agentSignatureImage) {
    const box = clone.querySelector(".signature-block .signature-box");
    if (box) box.innerHTML = `<img src="${agentSignatureImage}" style="max-height:56px;max-width:100%;" />`;
  }

  clone.style.cssText =
    "position:absolute;top:-99999px;left:0;width:210mm;margin:0;padding:0;background:#fff;box-sizing:border-box;";
  document.body.appendChild(clone);

  try {
    const imgs = Array.from(clone.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; })
      )
    );
    await new Promise((r) => setTimeout(r, 150));

    const pages = clone.querySelectorAll(".cp-page");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      if (i > 0) doc.addPage();
      // JPEG (q=0.88) au lieu de PNG sans perte : PDF ~20x plus léger, texte toujours net
      doc.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
    }
  } finally {
    document.body.removeChild(clone);
  }
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const contractCss = `
.contract-container-print{--cr:#e5202e;--cb:#1da1e8;--ci:#0a0a0a;font-family:Archivo,'Segoe UI',Arial,sans-serif;color:#111;max-width:100%;overflow-x:auto;background:transparent}
.contract-container-print *{box-sizing:border-box}
.cp-page{position:relative;width:210mm;height:297mm;margin:0 auto 18px;background:#fff;overflow:hidden;padding:9mm 10mm 8mm;border:1px solid #cfcfd6;box-shadow:0 4px 18px rgba(0,0,0,.12)}
.cp-watermark{position:absolute;left:50%;top:47%;width:78%;transform:translate(-50%,-50%);opacity:.07;pointer-events:none;z-index:0}
.cp-page > *:not(.cp-watermark){position:relative;z-index:1}
.cp-front{display:flex;flex-direction:column}
.cp-front .cp-foot{margin-top:auto}

/* header */
.cp-head{display:flex;align-items:flex-start;gap:10px}
.cp-head-logo img{height:68px;width:auto;display:block}
.cp-head-mid{flex:1;text-align:center;padding-top:2px}
.cp-road{display:inline-block;font:900 17px Archivo,Arial,sans-serif;letter-spacing:.3px;transform:rotate(-4deg);margin-bottom:3px;color:#111}
.cp-road-sub{font-size:7px;line-height:1.35;color:#333}
.cp-open{font:italic 800 19px Archivo,Arial,sans-serif;color:var(--cr);transform:rotate(-5deg);padding-top:6px;white-space:nowrap}

.cp-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:8px 0 6px}
.cp-title-small{font:800 15px Archivo,Arial,sans-serif;line-height:1.1}
.cp-title-big{font:900 23px Archivo,Arial,sans-serif;color:#fff;-webkit-text-stroke:1.2px var(--cr);letter-spacing:.8px;line-height:1.1}
.cp-late{font-size:9.5px;font-weight:700;line-height:1.35;text-align:center;flex:1}
.cp-no{border:1.5px solid #111;border-radius:10px;padding:3px 10px;text-align:center;line-height:1.2;background:#fff}
.cp-no span{display:block;font-size:7.5px;font-weight:800;letter-spacing:.8px;color:var(--cr)}
.cp-no b{font-size:15px;font-weight:900}

/* columns */
.cp-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:6px}
.cp-pill{display:block;text-align:center;font:800 15px Archivo,Arial,sans-serif;letter-spacing:.3px;padding:3px 10px;border-radius:999px;color:#fff;margin-bottom:6px}
.cp-pill.red{background:var(--cr);border-radius:999px 0 0 999px}
.cp-pill.ink{background:var(--ci);border-radius:0 999px 999px 0}
.cp-pill.second{margin-top:12px;text-align:left;padding-left:14px;width:72%}
.cp-gap{height:10px}

.cp-line{display:flex;align-items:flex-end;gap:5px;margin-bottom:5px;min-height:18px}
.cp-line.small{margin-bottom:4px;min-height:16px}
.cp-lab{font:800 12.5px Archivo,Arial,sans-serif;white-space:nowrap;line-height:1.1;color:#111}
.cp-lab.sm{font-size:9px}
.cp-line.small .cp-lab{font-size:11px}
.cp-fill{flex:1;min-width:0;border-bottom:1.5px dotted #666;min-height:15px;display:flex;align-items:flex-end}
.cp-fill.short{flex:0 0 42px}
.cp-val{font:700 11.5px Archivo,Arial,sans-serif;line-height:1.15;padding:0 2px 1px;color:#0a0a0a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}

/* check list */
.cp-checkbar{margin:12px 0 8px;background:var(--ci);color:#fff;text-align:center;font:800 17px Archivo,Arial,sans-serif;padding:2px 10px;border-radius:999px}
.cp-check{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:0}
.cp-check-cell{padding:0 6px}
.cp-check-cell + .cp-check-cell{border-left:1.5px solid #111}
.cp-ba{font:900 19px Archivo,Arial,sans-serif;color:#fff;-webkit-text-stroke:1px var(--cr);letter-spacing:1px;text-align:center;line-height:1.1}
.cp-check-body{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cp-gauge{text-align:center;flex-shrink:0}
.cp-gauge-title{font:800 11px Archivo,Arial,sans-serif;letter-spacing:1px}
.cp-car{flex:1 1 0;width:0;min-width:0;height:auto;max-height:178px;object-fit:contain;display:block}

.cp-docs{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;font-size:10px;margin-top:4px}
.cp-docs span{display:inline-flex;align-items:center;gap:4px;font-weight:700}
.cp-box{display:inline-flex;align-items:center;justify-content:center;width:11px;height:11px;border:1.3px solid #111;border-radius:2px;font-size:9px;font-weight:900;line-height:1;color:var(--cr)}
.cp-tires{margin-top:10px;text-align:center;font:800 10.5px Archivo,Arial,sans-serif;color:var(--cr)}
.cp-agree{margin-top:8px;text-align:center;font-size:8.6px;font-weight:600;border:1.5px solid #111;border-bottom:0;border-radius:14px 14px 0 0;padding:4px 10px 3px;font-family:Georgia,'Times New Roman',serif}

/* signatures */
.cp-sigs{display:grid;grid-template-columns:repeat(3,1fr);border:1.5px solid #111;border-radius:0 0 14px 14px;overflow:hidden}
.cp-sig + .cp-sig{border-left:1.5px solid #111}
.cp-sig-label{margin:5px auto 0;width:92%;background:var(--cr);color:#fff;text-align:center;font:800 9.5px Archivo,Arial,sans-serif;padding:2px 6px;border-radius:999px}
.cp-sig-box{height:72px;display:flex;align-items:center;justify-content:center;font-size:11px;padding:2px}

.cp-foot{margin-top:8px;text-align:center;font-size:10px;line-height:1.5;color:#111}
.cp-foot b{font-weight:800}

/* back page */
.cp-back-frame{position:relative;height:100%;border:1.5px solid #111;padding:20px 20px 14px}
.cp-back-title{position:absolute;left:50%;top:-13px;transform:translateX(-50%);background:var(--ci);color:#fff;font:800 14px Archivo,Arial,sans-serif;padding:4px 40px;border-radius:999px;white-space:nowrap;z-index:2}
.cp-cg-intro,.cp-cg{margin:0 0 7px;font-size:10.3px;line-height:1.42;text-align:justify;color:#111}
.cp-cg b{font-weight:800}
.cp-cg-strong{font-size:11px;margin-top:8px}
.cp-cg-list{margin:0 0 7px 18px;padding:0;font-size:10.3px;line-height:1.42;text-align:justify}
.cp-cg-list.dash{list-style:none;margin-left:6px}
.cp-cg-list.dash li::before{content:"- "}
.cp-km-row{display:flex;justify-content:space-between;gap:20px;margin-top:10px;align-items:flex-start}
.cp-km{flex:1}
.cp-km-title{font:800 12px Archivo,Arial,sans-serif;margin-bottom:3px}
.cp-km p{margin:0;font-size:10.5px;line-height:1.45}
.cp-cancel{flex:1}
.cp-cancel ul{list-style:none;margin:0;padding:0;font-size:10.5px;line-height:1.55}

@media print{
  .cp-page{margin:0;border:0;box-shadow:none;page-break-after:always}
  .cp-page:last-child{page-break-after:auto}
}
`;