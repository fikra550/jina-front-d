// src/components/pdf/AccidentEstimatePDF.jsx
import React from 'react';
import { Document } from '@react-pdf/renderer';
import {
  PdfPage, PdfHeader, TitleRow, Pill, Line, TwoCols, ItemsTable, AmountBox, SignatureRow,
  toNumber, formatCurrency, formatDate,
} from './pdfTheme';

export const AccidentEstimatePDF = ({ accident }) => {
  const items = accident.estimate_items || [];
  let totalHT = 0;
  const rows = items.map((item) => {
    const qty = toNumber(item.quantity) || 1;
    const price = toNumber(item.unit_price);
    const total = qty * price;
    totalHT += total;
    return { ...item, qty, price, total };
  });

  const number = accident.estimate_number || accident.accident_number || accident.id || '560';

  return (
    <Document>
      <PdfPage>
        <PdfHeader />

        <TitleRow small="Garage - Réparation" big="DEVIS" numberLabel="DEVIS N°" number={number} />

        <TwoCols
          left={
            <>
              <Pill tone="red">CLIENT</Pill>
              <Line label="Client :" value="JINA BUSINESS" />
              <Line label="Casablanca, le :" value={new Date().toLocaleDateString('fr-FR')} />
              <Line label="Objet :" value={`Réparation voiture ${accident.car?.brand || 'FORD'}`} />
            </>
          }
          right={
            <>
              <Pill tone="ink">INFORMATION SUR VEHICULE</Pill>
              <Line label="Marque :" value={accident.car?.brand || 'FORD'} />
              <Line label="Immatriculation :" value={accident.matricule?.matricule_code || '56159-A-11'} />
              <Line label="Date de sinistre :" value={formatDate(accident.date_accident)} />
            </>
          }
        />

        <ItemsTable rows={rows} total={totalHT} />

        <AmountBox>
          ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE : {formatCurrency(totalHT)} DIRHAMS
        </AmountBox>

        <SignatureRow labels={["Signature et cachet d'agent", 'Bon pour accord (client)']} />
      </PdfPage>
    </Document>
  );
};