// src/components/pdf/pdfTheme.jsx
// Shared look for every @react-pdf document (facture, devis, rapport).
// Mirrors ContractLocation.jsx: red / blue / ink palette, pills, dotted fill-in lines,
// number box, signature boxes and the company footer.
import React from 'react';
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

/* ------------------------------------------------------------------ */
/*  Colors + company identity (edit here only)                         */
/* ------------------------------------------------------------------ */
export const COLORS = {
  red: '#e5202e',
  blue: '#1da1e8',
  ink: '#0a0a0a',
  dot: '#666666',
};

export const COMPANY = {
  name: 'Jina Business',
  logo: '/JinaLogo.png', // file in /public
  badge: '7j/7 Ouvert',
  tagline: 'Location de voiture',
  address: 'LOT ERRACHAD N° 706 TR 02 MAG 01 MEDIOUNA, CASABLANCA - Maroc',
  gsm: '06 63 04 95 75 - 06 67 47 47 45',
  email: 'jinabusiness0@gmail.com',
  legal: 'TP : 37701443 - RC : 624023 - IF : 65912528 - CNSS : 5317601',
  ice: '003478448000020',
};

// react-pdf needs an absolute URL to load an image from /public
const logoSrc = () =>
  typeof window !== 'undefined' ? `${window.location.origin}${COMPANY.logo}` : COMPANY.logo;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
export const toNumber = (val) => Number(val) || 0;
export const formatCurrency = (val) => `${toNumber(val).toFixed(2)} DH`;
export const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 95,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  watermark: { position: 'absolute', left: 67, top: 210, width: 460, opacity: 0.07 },

  /* header */
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  headLogo: { width: 90, height: 52, objectFit: 'contain' },
  headMid: { flex: 1, textAlign: 'center', paddingTop: 2, paddingHorizontal: 8 },
  headName: { fontFamily: 'Helvetica-Bold', fontSize: 15, letterSpacing: 0.3, textTransform: 'uppercase' },
  headSub: { fontSize: 7.5, color: '#333333', marginTop: 1.5 },
  open: {
    fontFamily: 'Helvetica-BoldOblique',
    fontSize: 14,
    color: COLORS.red,
    paddingTop: 6,
    transform: 'rotate(-5deg)',
  },

  /* title row */
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 8,
  },
  titleSmall: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  titleBig: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: COLORS.red, letterSpacing: 0.8 },
  noBox: {
    borderWidth: 1.2,
    borderColor: '#111111',
    borderStyle: 'solid',
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  noLabel: { fontFamily: 'Helvetica-Bold', fontSize: 7, letterSpacing: 0.8, color: COLORS.red },
  noValue: { fontFamily: 'Helvetica-Bold', fontSize: 13 },

  /* columns + pills + lines */
  cols: { flexDirection: 'row', marginTop: 6 },
  col: { flex: 1 },
  colGap: { width: 16 },
  pill: { paddingVertical: 3, paddingHorizontal: 10, marginBottom: 7 },
  pillRed: {
    backgroundColor: COLORS.red,
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  pillInk: {
    backgroundColor: COLORS.ink,
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
  },
  pillText: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#ffffff', textAlign: 'center' },

  line: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5, minHeight: 16 },
  lab: { fontFamily: 'Helvetica-Bold', fontSize: 10, marginRight: 4 },
  fill: {
    flex: 1,
    minHeight: 13,
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    paddingBottom: 1,
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted',
    borderBottomColor: COLORS.dot,
  },
  val: { fontFamily: 'Helvetica-Bold', fontSize: 9.5 },

  /* items table */
  tHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.ink,
    borderRadius: 11,
    paddingVertical: 5,
    marginTop: 16,
    marginBottom: 4,
  },
  th: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9.5, textTransform: 'uppercase' },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted',
    borderBottomColor: COLORS.dot,
  },
  td: { fontSize: 10, color: '#111111' },
  cDes: { flex: 8, paddingLeft: 10 },
  cQty: { flex: 2, textAlign: 'center' },
  cPrice: { flex: 3, textAlign: 'right' },
  cTotal: { flex: 3.5, textAlign: 'right', paddingRight: 10 },
  tTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'flex-end',
    width: 230,
    marginTop: 12,
    backgroundColor: COLORS.red,
    borderRadius: 11,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  tTotalText: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#ffffff' },

  /* amount sentence + signatures */
  agree: {
    marginTop: 18,
    textAlign: 'center',
    borderWidth: 1.2,
    borderColor: '#111111',
    borderStyle: 'solid',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  agreeText: { fontFamily: 'Times-Roman', fontSize: 9.5, textAlign: 'center' },
  sigs: {
    flexDirection: 'row',
    marginTop: 14,
    borderWidth: 1.2,
    borderColor: '#111111',
    borderStyle: 'solid',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sig: { flex: 1 },
  sigDivider: { borderLeftWidth: 1.2, borderLeftColor: '#111111', borderLeftStyle: 'solid' },
  sigLabel: {
    alignSelf: 'center',
    width: '92%',
    marginTop: 5,
    backgroundColor: COLORS.red,
    borderRadius: 9,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  sigLabelText: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#ffffff', textAlign: 'center' },
  sigBox: { height: 72 },

  /* footer */
  foot: { position: 'absolute', left: 28, right: 28, bottom: 20, textAlign: 'center' },
  footText: { fontSize: 8.5, lineHeight: 1.5, textAlign: 'center', color: '#111111' },
  footBold: { fontFamily: 'Helvetica-Bold' },
});

const s = pdfStyles;

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */
export const PdfFooter = () => (
  <View fixed style={s.foot}>
    <Text style={s.footText}>
      <Text style={s.footBold}>Siège Social : </Text>
      {COMPANY.address}
    </Text>
    <Text style={s.footText}>
      <Text style={s.footBold}>GSM : </Text>
      {COMPANY.gsm}   <Text style={s.footBold}>Email : </Text>
      {COMPANY.email}
    </Text>
    <Text style={s.footText}>{COMPANY.legal}</Text>
    <Text style={s.footText}>
      <Text style={s.footBold}>N° I.C.E : </Text>
      {COMPANY.ice}
    </Text>
  </View>
);

/** A4 page with the faded logo watermark and the company footer. */
export const PdfPage = ({ children }) => (
  <Page size="A4" style={s.page}>
    <Image fixed src={logoSrc()} style={s.watermark} />
    {children}
    <PdfFooter />
  </Page>
);

export const PdfHeader = () => (
  <View style={s.head}>
    <Image src={logoSrc()} style={s.headLogo} />
    <View style={s.headMid}>
      <Text style={s.headName}>{COMPANY.name}</Text>
      <Text style={s.headSub}>{COMPANY.tagline}</Text>
      <Text style={s.headSub}>{COMPANY.address}</Text>
    </View>
    <Text style={s.open}>{COMPANY.badge}</Text>
  </View>
);

export const TitleRow = ({ small, big, numberLabel, number }) => (
  <View style={s.titleRow}>
    <View>
      <Text style={s.titleSmall}>{small}</Text>
      <Text style={s.titleBig}>{big}</Text>
    </View>
    <View style={s.noBox}>
      <Text style={s.noLabel}>{numberLabel}</Text>
      <Text style={s.noValue}>{String(number ?? '—')}</Text>
    </View>
  </View>
);

/** tone="red" (rounded left) or tone="ink" (rounded right) */
export const Pill = ({ children, tone = 'red', style }) => (
  <View style={[s.pill, tone === 'red' ? s.pillRed : s.pillInk, style]}>
    <Text style={s.pillText}>{children}</Text>
  </View>
);

export const Line = ({ label, value = '' }) => (
  <View style={s.line}>
    <Text style={s.lab}>{label}</Text>
    <View style={s.fill}>
      <Text style={s.val}>{value === null || value === undefined ? '' : String(value)}</Text>
    </View>
  </View>
);

/** Two columns: left = red pill block, right = ink pill block */
export const TwoCols = ({ left, right }) => (
  <View style={s.cols}>
    <View style={s.col}>{left}</View>
    <View style={s.colGap} />
    <View style={s.col}>{right}</View>
  </View>
);

/** rows: [{ name, qty, price, total }] */
export const ItemsTable = ({ rows, total }) => (
  <View>
    <View style={s.tHead}>
      <Text style={[s.th, s.cDes]}>Désignation</Text>
      <Text style={[s.th, s.cQty]}>Qté</Text>
      <Text style={[s.th, s.cPrice]}>Prix unit.</Text>
      <Text style={[s.th, s.cTotal]}>Montant HT</Text>
    </View>
    {rows.map((r, i) => (
      <View style={s.tRow} key={i} wrap={false}>
        <Text style={[s.td, s.cDes]}>{r.name || '—'}</Text>
        <Text style={[s.td, s.cQty]}>{r.qty}</Text>
        <Text style={[s.td, s.cPrice]}>{formatCurrency(r.price)}</Text>
        <Text style={[s.td, s.cTotal]}>{formatCurrency(r.total)}</Text>
      </View>
    ))}
    <View style={s.tTotal} wrap={false}>
      <Text style={s.tTotalText}>TOTAL</Text>
      <Text style={s.tTotalText}>{formatCurrency(total)}</Text>
    </View>
  </View>
);

export const AmountBox = ({ children }) => (
  <View style={s.agree} wrap={false}>
    <Text style={s.agreeText}>{children}</Text>
  </View>
);

/** labels: ['Signature et cachet', 'Signature du client'] */
export const SignatureRow = ({ labels = ["Signature et cachet d'agent", 'Signature du client'] }) => (
  <View style={s.sigs} wrap={false}>
    {labels.map((label, i) => (
      <View key={label} style={[s.sig, i > 0 ? s.sigDivider : null]}>
        <View style={s.sigLabel}>
          <Text style={s.sigLabelText}>{label}</Text>
        </View>
        <View style={s.sigBox} />
      </View>
    ))}
  </View>
);