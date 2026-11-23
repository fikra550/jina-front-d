// src/utils/printInvoice.js
// Browser-print invoice (used by AdminLavages.jsx and AdminProducts.jsx).
// Same look as ContractLocation.jsx: red / blue / ink pills, dotted lines, number box, footer.
import { toast } from 'sonner';

export const COMPANY = {
  name: 'Jina Auto Service',
  logo: '/JinaLogo2.png',
  badge: '7j/7 Ouvert',
  tagline: "Solutions d'entretien automobile",
  address: 'LOT ERRACHAD N° 706 TR 02 MAG 01 MEDIOUNA, CASABLANCA - Maroc',
  gsm: '06 63 04 95 75 - 06 67 47 47 45',
  email: 'jinabusiness0@gmail.com',
  legal: 'TP : 37701443 - RC : 624023 - IF : 65912528 - CNSS : 5317601',
  ice: '003478448000020',
};

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => `${Number(n || 0).toFixed(2)} DH`;

const css = `
:root{--cr:#e5202e;--cb:#1da1e8;--ci:#0a0a0a}
*{box-sizing:border-box}
@page{size:A4;margin:0}
body{margin:0;background:#eee;font-family:Archivo,'Segoe UI',Arial,sans-serif;color:#111;font-size:12px}
.noprint{text-align:center;padding:12px}
.noprint button{padding:10px 22px;border:0;border-radius:999px;background:var(--cr);color:#fff;font-weight:800;cursor:pointer}
.page{position:relative;width:210mm;min-height:297mm;margin:0 auto 18px;background:#fff;padding:9mm 10mm 8mm;display:flex;flex-direction:column;overflow:hidden;border:1px solid #cfcfd6}
.wm{position:absolute;left:50%;top:47%;width:78%;transform:translate(-50%,-50%);opacity:.07;pointer-events:none;z-index:0}
.page>*:not(.wm){position:relative;z-index:1}

.head{display:flex;align-items:flex-start;gap:10px}
.head img.logo{height:68px;width:auto;display:block}
.mid{flex:1;text-align:center;padding-top:2px}
.mid b{display:block;font:900 18px Archivo,Arial,sans-serif;text-transform:uppercase;letter-spacing:.3px;color:var(--cr)}
.mid span{display:block;font-size:8px;line-height:1.4;color:#333}
.open{font:italic 800 19px Archivo,Arial,sans-serif;color:var(--cr);transform:rotate(-5deg);padding-top:6px;white-space:nowrap}

.title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:10px 0 8px}
.t-small{font:800 15px Archivo,Arial,sans-serif;line-height:1.1}
.t-big{font:900 26px Archivo,Arial,sans-serif;color:#fff;-webkit-text-stroke:1.2px var(--cr);letter-spacing:.8px;line-height:1.1}
.no{border:1.5px solid #111;border-radius:10px;padding:3px 12px;text-align:center;line-height:1.2;background:#fff}
.no span{display:block;font-size:7.5px;font-weight:800;letter-spacing:.8px;color:var(--cr)}
.no b{font-size:15px;font-weight:900}

.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:6px}
.pill{display:block;text-align:center;font:800 15px Archivo,Arial,sans-serif;padding:3px 10px;color:#fff;margin-bottom:8px}
.pill.red{background:var(--cr);border-radius:999px 0 0 999px}
.pill.ink{background:var(--ci);border-radius:0 999px 999px 0}
.line{display:flex;align-items:flex-end;gap:5px;margin-bottom:6px;min-height:18px}
.lab{font:800 12.5px Archivo,Arial,sans-serif;white-space:nowrap;line-height:1.1}
.fill{flex:1;min-width:0;border-bottom:1.5px dotted #666;min-height:15px;display:flex;align-items:flex-end}
.val{font:700 11.5px Archivo,Arial,sans-serif;padding:0 2px 1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.st{display:inline-block;color:#fff;border-radius:999px;padding:1px 10px;font:800 10px Archivo,Arial,sans-serif}
.st.ok{background:var(--cb)}.st.mid{background:var(--ci)}.st.ko{background:var(--cr)}

table.items{width:100%;border-collapse:separate;border-spacing:0;margin-top:18px}
table.items th{background:var(--ci);color:#fff;font:800 11px Archivo,Arial,sans-serif;text-transform:uppercase;padding:6px 10px;text-align:left}
table.items th:first-child{border-radius:999px 0 0 999px}
table.items th:last-child{border-radius:0 999px 999px 0}
table.items td{padding:8px 10px;border-bottom:1.5px dotted #666;font-size:12px}
.c{text-align:center}.r{text-align:right}

table.tot{width:300px;margin:14px 0 0 auto;border-collapse:collapse}
table.tot td{padding:4px 10px;font-size:12px}
table.tot tr.g td{background:var(--cr);color:#fff;font:900 14px Archivo,Arial,sans-serif;padding:6px 12px}
table.tot tr.g td:first-child{border-radius:999px 0 0 999px}
table.tot tr.g td:last-child{border-radius:0 999px 999px 0}
table.tot tr.rest td{font-weight:800;border-top:1.5px solid #111}

.notes{margin-top:14px;font-size:11px;color:#333}
.agree{margin-top:auto;padding-top:18px}
.agree p{margin:0;text-align:center;font:600 10px Georgia,'Times New Roman',serif;border:1.5px solid #111;border-radius:14px;padding:6px 10px}
.sigs{display:grid;grid-template-columns:1fr 1fr;margin-top:12px;border:1.5px solid #111;border-radius:14px;overflow:hidden}
.sig+.sig{border-left:1.5px solid #111}
.sig-label{margin:5px auto 0;width:92%;background:var(--cr);color:#fff;text-align:center;font:800 10px Archivo,Arial,sans-serif;padding:2px 6px;border-radius:999px}
.sig-box{height:70px}
.foot{margin-top:10px;text-align:center;font-size:10px;line-height:1.5}
.foot b{font-weight:800}
@media print{body{background:#fff}.noprint{display:none}.page{margin:0;border:0}}
`;

const line = (label, value) =>
  `<div class="line"><span class="lab">${esc(label)}</span><span class="fill"><span class="val">${value}</span></span></div>`;

export const printInvoice = ({
  number, date, clientName, lines, subtotal = 0, discount = 0, tva = 0, total, paid = 0, notes = '',
}) => {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) { toast.error('Autorisez les fenêtres popup pour générer la facture'); return; }

  const origin = window.location.origin;
  const logo = `${origin}${COMPANY.logo}`;
  const rest = Math.max(0, total - paid);
  const isPaid = total > 0 && rest <= 0;
  const statusLabel = isPaid ? 'PAYÉE' : paid > 0 ? 'PARTIELLEMENT PAYÉE' : 'NON PAYÉE';
  const statusClass = isPaid ? 'ok' : paid > 0 ? 'mid' : 'ko';
  const dateStr = date ? new Date(date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');

  const rows = lines.map((l) =>
    `<tr><td>${esc(l.label)}</td><td class="c">${esc(l.qty)}</td><td class="r">${money(l.unit)}</td><td class="r">${money(l.total)}</td></tr>`
  ).join('');

  const extraRows = [
    discount > 0 || tva > 0 ? `<tr><td>Sous-total</td><td class="r">${money(subtotal)}</td></tr>` : '',
    discount > 0 ? `<tr><td>Remise</td><td class="r">- ${money(discount)}</td></tr>` : '',
    tva > 0 ? `<tr><td>TVA</td><td class="r">${money(tva)}</td></tr>` : '',
  ].join('');

  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(number)}</title>
<style>${css}</style></head><body>
<div class="noprint"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
<div class="page">
  <img class="wm" src="${logo}" alt="">

  <div class="head">
    <img class="logo" src="${logo}" alt="${esc(COMPANY.name)}">
    <div class="mid"><b>${esc(COMPANY.name)}</b><span>${esc(COMPANY.tagline)}</span><span>${esc(COMPANY.address)}</span></div>
    <div class="open">${esc(COMPANY.badge)}</div>
  </div>

  <div class="title-row">
    <div><div class="t-small">Facture</div><div class="t-big">FACTURE</div></div>
    <div class="no"><span>FACTURE N°</span><b>${esc(number)}</b></div>
  </div>

  <div class="cols">
    <div>
      <div class="pill red">CLIENT</div>
      ${line('Facturé à :', esc(clientName || '—'))}
      ${line('Date :', esc(dateStr))}
      ${line('Statut :', `<span class="st ${statusClass}">${statusLabel}</span>`)}
    </div>
    <div>
      <div class="pill ink">RÈGLEMENT</div>
      ${line('Total :', money(total))}
      ${line('Payé :', money(paid))}
      ${line('Reste :', money(rest))}
    </div>
  </div>

  <table class="items">
    <thead><tr><th>Désignation</th><th class="c">Qté</th><th class="r">Prix unit.</th><th class="r">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="tot"><tbody>
    ${extraRows}
    <tr class="g"><td>TOTAL</td><td class="r">${money(total)}</td></tr>
    <tr><td>Payé</td><td class="r">${money(paid)}</td></tr>
    <tr class="rest"><td>Reste à payer</td><td class="r">${money(rest)}</td></tr>
  </tbody></table>

  ${notes ? `<div class="notes"><b>Notes :</b> ${esc(notes)}</div>` : ''}

  <div class="agree">
    <p>ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE : ${money(total)} DIRHAMS</p>
    <div class="sigs">
      <div class="sig"><div class="sig-label">Signature et cachet d'agent</div><div class="sig-box"></div></div>
      <div class="sig"><div class="sig-label">Signature du client</div><div class="sig-box"></div></div>
    </div>
    <div class="foot">
      <b>Siège Social :</b> ${esc(COMPANY.address)}<br>
      <b>GSM :</b> ${esc(COMPANY.gsm)} &nbsp; <b>Email :</b> ${esc(COMPANY.email)}<br>
      ${esc(COMPANY.legal)}<br>
      <b>N° I.C.E :</b> ${esc(COMPANY.ice)}
    </div>
  </div>
</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 700);
};