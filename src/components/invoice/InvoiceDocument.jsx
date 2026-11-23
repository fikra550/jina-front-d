// src/components/invoice/InvoiceDocument.jsx
// Facture A4 (même logique que ContractLocation) :
//  - <InvoiceDocument />   : la feuille A4 (styles inline => PDF fidèle)
//  - <InvoiceViewPage />   : page "Voir facture" (comme "Voir contrat")
//  - downloadInvoice()     : génère le PDF et le télécharge directement
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Receipt, X, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import logoImage from '../../assets/logo.png';
import cachetImage from '../../assets/cache2.png';

/* ---- Infos de l'agence (reprises de l'ancienne facture) ---- */
const COMPANY = {
  name: 'JINA AUTO SERVICE',
  tagline: "Solutions d'entretien automobile",
  address: 'LOT ERRACHAD N° 706 TR 02 MAG 01 MEDIOUNA, CASABLANCA - Maroc',
  hours: '7j/7 Ouvert',
  gsm: '06 63 04 95 75 - 06 67 47 47 45',
  email: 'jinabusiness0@gmail.com',
  tp: '37701443', rc: '624023', if: '65912528', cnss: '5317601',
  ice: '003478448000020',
};

const INK = '#0a0a0a';
const RED = '#dc2626';
const GRAY = '#9ca3af';
const A4_WIDTH_PX = 794;

const money = (n) => `${(Number(n) || 0).toFixed(2)} DH`;
const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('fr-FR');
};

/* ---- Montant en lettres (français) ---- */
const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
  'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
const below100 = (n) => {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10); const u = n % 10;
  if (t <= 6) return u === 0 ? TENS[t] : u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${UNITS[10 + u]}`;
  if (t === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[u]}`;
  return `quatre-vingt-${UNITS[10 + u]}`;
};
const below1000 = (n) => {
  const h = Math.floor(n / 100); const r = n % 100;
  let s = '';
  if (h > 0) { s = h === 1 ? 'cent' : `${UNITS[h]} cent`; if (r === 0 && h > 1) s += 's'; }
  if (r > 0) s += (s ? ' ' : '') + below100(r);
  return s;
};
const numberToWords = (n) => {
  if (n === 0) return 'zéro';
  const m = Math.floor(n / 1e6); const k = Math.floor((n % 1e6) / 1000); const r = n % 1000;
  let s = '';
  if (m) s += m === 1 ? 'un million' : `${below1000(m)} millions`;
  if (k) {
    const kw = k === 1 ? 'mille' : `${below1000(k).replace(/(cents|vingts)$/, (x) => x.slice(0, -1))} mille`;
    s += (s ? ' ' : '') + kw;
  }
  if (r) s += (s ? ' ' : '') + below1000(r);
  return s;
};
const amountInWords = (total) => {
  const v = Math.max(0, Number(total) || 0);
  let dh = Math.floor(v);
  let cts = Math.round((v - dh) * 100);
  if (cts === 100) { dh += 1; cts = 0; }
  let s = `${numberToWords(dh)} ${dh > 1 ? 'dirhams' : 'dirham'}`;
  if (cts > 0) s += ` et ${numberToWords(cts)} ${cts > 1 ? 'centimes' : 'centime'}`;
  return s.toUpperCase();
};

/* ============================================================
   Feuille A4 (même mise en page que l'ancienne facture PDF)
   ============================================================ */
export function InvoiceDocument({ invoice, withCachet = false, containerId }) {
  const inv = invoice || {};
  const lines = inv.lines || [];
  const subtotal = inv.subtotal ?? lines.reduce((s, x) => s + (Number(x.total) || 0), 0);
  const discount = Number(inv.discount) || 0;
  const tva = Number(inv.tva) || 0;
  const total = Number(inv.total) || 0;
  const paid = Number(inv.paid) || 0;
  const rest = Math.max(0, total - paid);

  let status = 'NON PAYÉE'; let statusColor = GRAY;
  if (total > 0 && paid >= total) { status = 'PAYÉE'; statusColor = '#15803d'; }
  else if (paid > 0) { status = 'PARTIELLEMENT PAYÉE'; statusColor = '#b45309'; }

  const row = { display: 'flex', alignItems: 'baseline', gap: 6, borderBottom: '1.5px dashed #222', padding: '5px 2px', fontSize: 14 };
  const lab = { fontWeight: 800, color: INK, whiteSpace: 'nowrap' };
  const val = { fontWeight: 800, fontSize: 12.5, color: INK };
  const colTitle = { textAlign: 'center', fontSize: 16, fontWeight: 800, color: '#c7cbd1', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 10 };
  const th = { padding: '8px 6px', fontSize: 12, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: GRAY };
  const td = { padding: '10px 6px', fontSize: 13, color: '#222', borderBottom: '1.5px dashed #222' };
  const totRow = { display: 'flex', justifyContent: 'space-between', padding: '6px 6px', fontSize: 13.5, color: '#222' };

  return (
    <div
      id={containerId}
      style={{
        position: 'relative', width: A4_WIDTH_PX, minHeight: 1123, boxSizing: 'border-box', background: '#fff', color: INK,
        fontFamily: 'Archivo, "Segoe UI", Arial, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* Filigrane */}
      <img
        src={logoImage}
        alt=""
        style={{ position: 'absolute', left: '50%', top: 470, width: 560, transform: 'translateX(-50%)', opacity: 0.07, pointerEvents: 'none' }}
      />

      <div style={{ position: 'relative', padding: '40px 44px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <img src={logoImage} alt="" style={{ width: 118, height: 'auto', objectFit: 'contain' }} />
          <div style={{ flex: 1, textAlign: 'center', paddingTop: 6 }}>
            <div style={{ color: RED, fontSize: 25, fontWeight: 800, letterSpacing: '0.01em' }}>{COMPANY.name}</div>
            <div style={{ fontSize: 10.5, color: '#333', marginTop: 4 }}>{COMPANY.tagline}</div>
            <div style={{ fontSize: 10.5, color: '#333' }}>{COMPANY.address}</div>
          </div>
          <div style={{ color: RED, fontSize: 21, fontWeight: 800, fontStyle: 'italic', paddingTop: 6, whiteSpace: 'nowrap' }}>{COMPANY.hours}</div>
        </div>

        {/* Titre + numéro */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Facture</div>
            <div
              style={{
                fontSize: 34, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1.05, color: '#fdecec',
                textShadow: `1.5px 0 0 ${RED}, -1.5px 0 0 ${RED}, 0 1.5px 0 ${RED}, 0 -1.5px 0 ${RED}, 1px 1px 0 ${RED}, -1px -1px 0 ${RED}, 1px -1px 0 ${RED}, -1px 1px 0 ${RED}`,
              }}
            >
              FACTURE
            </div>
          </div>
          <div style={{ border: `1.5px solid ${INK}`, borderRadius: 16, padding: '6px 18px 8px', textAlign: 'center', minWidth: 150 }}>
            <div style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.12em', color: RED }}>FACTURE N°</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{inv.number}</div>
          </div>
        </div>

        {/* Client / Règlement */}
        <div style={{ display: 'flex', gap: 28, marginTop: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={colTitle}>Client</div>
            <div style={row}><span style={lab}>Facturé à :</span><span style={val}>{inv.clientName || '—'}</span></div>
            <div style={row}><span style={lab}>Date :</span><span style={val}>{fmtDate(inv.date)}</span></div>
            <div style={row}><span style={lab}>Statut :</span><span style={{ ...val, fontSize: 11, color: statusColor, letterSpacing: '0.04em' }}>{status}</span></div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={colTitle}>Règlement</div>
            <div style={row}><span style={lab}>Total :</span><span style={val}>{money(total)}</span></div>
            <div style={row}><span style={lab}>Payé :</span><span style={val}>{money(paid)}</span></div>
            <div style={row}><span style={lab}>Reste :</span><span style={val}>{money(rest)}</span></div>
          </div>
        </div>

        {/* Lignes */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 30 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left', width: '46%' }}>Désignation</th>
              <th style={{ ...th, textAlign: 'center' }}>Qté</th>
              <th style={{ ...th, textAlign: 'right' }}>Prix unit.</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={td}>{l.label}</td>
                <td style={{ ...td, textAlign: 'center' }}>{l.qty}</td>
                <td style={{ ...td, textAlign: 'right' }}>{money(l.unit)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{money(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <div style={{ width: 330 }}>
            {(discount > 0 || tva > 0) && <div style={totRow}><span>Sous-total</span><span>{money(subtotal)}</span></div>}
            {discount > 0 && <div style={totRow}><span>Remise</span><span>- {money(discount)}</span></div>}
            {tva > 0 && <div style={totRow}><span>TVA</span><span>{money(tva)}</span></div>}
            <div style={{ ...totRow, fontSize: 17, fontWeight: 800, color: '#a1a6ae' }}><span>TOTAL</span><span>{money(total)}</span></div>
            <div style={totRow}><span>Payé</span><span>{money(paid)}</span></div>
            <div style={{ ...totRow, fontWeight: 900, color: INK, borderTop: `2px solid ${INK}`, marginTop: 2 }}>
              <span>Reste à payer</span><span>{money(rest)}</span>
            </div>
          </div>
        </div>

        {inv.notes ? (
          <div style={{ marginTop: 18, fontSize: 12, color: '#444', whiteSpace: 'pre-wrap' }}>
            <b>Notes : </b>{inv.notes}
          </div>
        ) : null}

        {/* Bas de page */}
        <div style={{ marginTop: 'auto', paddingTop: 30 }}>
          <div
            style={{
              border: `1.5px solid ${INK}`, borderRadius: 22, padding: '7px 14px', textAlign: 'center',
              fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.01em',
            }}
          >
            ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE : {amountInWords(total)}
          </div>

          <div style={{ display: 'flex', border: `1.5px solid ${INK}`, borderRadius: 26, marginTop: 8, height: 118, overflow: 'hidden' }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRight: `2px solid ${INK}`, position: 'relative' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: GRAY }}>Signature et cachet d'agent</div>
              {withCachet && (
                <img
                  src={cachetImage}
                  alt=""
                  style={{ position: 'absolute', left: '50%', top: 30, transform: 'translateX(-50%)', maxHeight: 80, maxWidth: 200, objectFit: 'contain' }}
                />
              )}
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: GRAY }}>Signature du client</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#222', marginTop: 16, lineHeight: 1.65 }}>
            <div><b>Siège Social :</b> {COMPANY.address}</div>
            <div><b>GSM :</b> {COMPANY.gsm} &nbsp; <b>Email :</b> {COMPANY.email}</div>
            <div>TP : {COMPANY.tp} - RC : {COMPANY.rc} - IF : {COMPANY.if} - CNSS : {COMPANY.cnss}</div>
            <div><b>N° I.C.E :</b> {COMPANY.ice}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Téléchargement direct du PDF
   ============================================================ */
const waitImages = (root) =>
  Promise.all(
    Array.from(root.querySelectorAll('img')).map((img) =>
      img.complete ? null : new Promise((res) => { img.onload = res; img.onerror = res; })
    )
  );

export async function generateInvoicePdf(invoice, { withCachet = false } = {}) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;background:#fff;z-index:-1;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<InvoiceDocument invoice={invoice} withCachet={withCachet} />));
    await waitImages(host);
    if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* ignore */ } }
    await new Promise((r) => setTimeout(r, 60));

    const el = host.firstElementChild;
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      width: A4_WIDTH_PX, windowWidth: A4_WIDTH_PX,
    });

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = 210;
    const pageH = 297;
    const imgH = (canvas.height * pageW) / canvas.width;
    const img = canvas.toDataURL('image/jpeg', 0.95);
    let y = 0;
    doc.addImage(img, 'JPEG', 0, y, pageW, imgH);
    while (imgH - (-y) > pageH + 0.5) {
      y -= pageH;
      doc.addPage();
      doc.addImage(img, 'JPEG', 0, y, pageW, imgH);
    }

    const filename = `facture-${String(invoice.number || 'FAC').replace(/[^\w-]+/g, '_')}.pdf`;
    const url = URL.createObjectURL(doc.output('blob'));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function downloadInvoice(invoice, withCachet = false) {
  toast.loading('Génération de la facture en cours...', { id: 'invoice-pdf' });
  try {
    await generateInvoicePdf(invoice, { withCachet });
    toast.success('Facture générée avec succès!', { id: 'invoice-pdf' });
  } catch (e) {
    console.error('Invoice PDF error:', e);
    toast.error('Erreur lors de la génération de la facture', { id: 'invoice-pdf' });
  }
}

/* ============================================================
   Zoom / adaptation mobile (comme ContractViewport)
   ============================================================ */
function InvoiceViewport({ children }) {
  const stageRef = useRef(null);
  const sheetRef = useRef(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(1123);

  useEffect(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return undefined;
    const measure = () => {
      setFit(Math.min(1, (stage.clientWidth || A4_WIDTH_PX) / A4_WIDTH_PX));
      setSheetHeight(sheet.scrollHeight || 1123);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  const scale = fit * zoom;
  const showZoom = fit < 1;
  const zbtn = {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 999,
    border: 0, background: '#eab308', color: '#0a0a0a', fontWeight: 800, fontSize: 13, cursor: 'pointer',
  };

  return (
    <div style={{ marginTop: 4 }}>
      {showZoom && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, padding: 8, borderRadius: 999, background: '#0a0a0a' }}>
          <button type="button" style={zbtn} onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(2)))} disabled={zoom <= 1} aria-label="Dézoomer"><ZoomOut size={16} /></button>
          <output style={{ minWidth: 48, textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: 800 }}>{Math.round(scale * 100)}%</output>
          <button type="button" style={zbtn} onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(2)))} disabled={zoom >= 3} aria-label="Zoomer"><ZoomIn size={16} /></button>
          <button type="button" style={zbtn} onClick={() => setZoom(1)} disabled={zoom === 1}><Maximize2 size={14} /> Ajuster</button>
        </div>
      )}
      <div ref={stageRef} style={{ overflow: 'auto', borderRadius: 16, background: '#e5e7eb', padding: 8, border: '1.5px solid #d1d5db' }}>
        <div style={{ margin: '0 auto', position: 'relative', width: A4_WIDTH_PX * scale, height: sheetHeight * scale + 8 }}>
          <div ref={sheetRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', width: A4_WIDTH_PX, transform: `scale(${scale})`, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.35)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Page "Voir facture" (même esprit que "Voir contrat")
   ============================================================ */
export default function InvoiceViewPage({ invoice, onClose, onDownload }) {
  const [withCachet, setWithCachet] = useState(false);
  const seg = (active) => ({
    height: 38, padding: '0 16px', borderRadius: 999, border: '1.5px solid #0a0a0a',
    background: active ? '#eab308' : 'transparent', color: 'inherit',
    fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div className="inline-form-container">
      <div className="inline-form-header">
        <div className="inline-form-icon"><Receipt size={28} /></div>
        <div className="inline-form-title">
          <h2>Facture {invoice.number}</h2>
          <p>Visualisez et téléchargez la facture</p>
        </div>
        <button type="button" onClick={onClose} className="inline-form-close" aria-label="Fermer"><X size={22} /></button>
      </div>
      <div className="inline-form">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'inline-flex', gap: 6 }} role="group" aria-label="Aperçu du cachet">
            <button type="button" style={seg(!withCachet)} onClick={() => setWithCachet(false)}>Sans cachet</button>
            <button type="button" style={seg(withCachet)} onClick={() => setWithCachet(true)}>Avec cachet</button>
          </div>
          <button type="button" className="inline-primary-btn" onClick={onDownload}>
            <Download size={16} /> Imprimer / PDF
          </button>
        </div>
        <InvoiceViewport>
          <InvoiceDocument invoice={invoice} withCachet={withCachet} containerId="invoice-print-view" />
        </InvoiceViewport>
      </div>
    </div>
  );
}