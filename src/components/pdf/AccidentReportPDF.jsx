// src/components/pdf/AccidentReportPDF.jsx
import React from 'react';
import { Document } from '@react-pdf/renderer';
import {
  PdfPage, PdfHeader, TitleRow, Pill, Line, TwoCols, AmountBox, SignatureRow,
  formatCurrency, formatDate,
} from './pdfTheme';

const STATUS_MAP = {
  open: 'Ouvert',
  under_review: "En cours d'examen",
  waiting_estimate: 'En attente de devis',
  estimate_approved: 'Devis approuvé',
  under_repair: 'En réparation',
  invoice_received: 'Facture reçue',
  waiting_payment: 'En attente de paiement',
  closed: 'Clos',
  pending: 'Signalé',
  evaluation_owner: 'Évaluation propriétaire',
  'contact expert': 'Contact expert',
  evaluation_expert: 'Évaluation expert',
  fixed: 'Réparé',
  waiting: 'En attente paiement',
  completed: 'Terminé',
};

export const AccidentReportPDF = ({ accident }) => {
  const statusLabel = STATUS_MAP[accident.status] || accident.status || '';
  const clientName = `${accident.client?.prenom || ''} ${accident.client?.nom || ''}`.trim();
  const carBrandModel = `${accident.car?.brand || ''} ${accident.car?.model || ''}`.trim();
  const matricule = accident.matricule?.matricule_code || '';
  const number = accident.accident_number || accident.id || '560';

  return (
    <Document>
      <PdfPage>
        <PdfHeader />

        <TitleRow small="Garage - Sinistre" big="RAPPORT D'ACCIDENT" numberLabel="RAPPORT N°" number={number} />

        <TwoCols
          left={
            <>
              <Pill tone="red">INFORMATIONS GENERALES</Pill>
              <Line label="Casablanca, le :" value={new Date().toLocaleDateString('fr-FR')} />
              <Line label="Date de sinistre :" value={formatDate(accident.date_accident)} />
              <Line label="Statut :" value={statusLabel} />
              <Line label="Type :" value={accident.accident_type === 'grave' ? 'Grave' : 'Non-grave'} />
              <Line label="Lieu :" value={accident.location} />
              <Line label="Rapport police :" value={accident.police_report_number} />
              <Line label="Description :" value={accident.description} />
            </>
          }
          right={
            <>
              <Pill tone="ink">INFORMATION SUR VEHICULE</Pill>
              <Line label="Immatriculation :" value={matricule} />
              <Line label="Marque / Modèle :" value={carBrandModel} />
              <Line label="Année :" value={accident.car?.year} />

              <Pill tone="red" style={{ marginTop: 10 }}>CLIENT</Pill>
              <Line label="Nom :" value={clientName} />
              <Line label="Téléphone :" value={accident.client?.telephone} />
              <Line label="Email :" value={accident.client?.email} />
            </>
          }
        />

        {accident.garage && (
          <TwoCols
            left={
              <>
                <Pill tone="red" style={{ marginTop: 10 }}>GARAGE</Pill>
                <Line label="Nom :" value={accident.garage.name} />
                <Line label="Adresse :" value={accident.garage.address} />
              </>
            }
            right={<></>}
          />
        )}

        <TwoCols
          left={
            <>
              <Pill tone="red" style={{ marginTop: 10 }}>MONTANTS</Pill>
              <Line label="Pertes :" value={formatCurrency(accident.amount_of_losses)} />
              <Line label="Montant assurance :" value={formatCurrency(accident.amount_assurance)} />
              <Line label="Coût total réparation :" value={formatCurrency(accident.total_repair_cost)} />
            </>
          }
          right={
            <>
              <Pill tone="ink" style={{ marginTop: 10 }}>RÈGLEMENT</Pill>
              <Line label="Total payé :" value={formatCurrency(accident.total_paid)} />
              <Line label="Reste à payer :" value={formatCurrency(accident.remaining_amount)} />
            </>
          }
        />

        {accident.notes ? (
          <TwoCols
            left={
              <>
                <Pill tone="red" style={{ marginTop: 10 }}>NOTES</Pill>
                <Line label="Notes :" value={accident.notes} />
              </>
            }
            right={<></>}
          />
        ) : null}

        <AmountBox>
          ARRÊTÉ LE PRÉSENT RAPPORT À LA SOMME DE : {formatCurrency(accident.total_repair_cost)} DIRHAMS
        </AmountBox>

        <SignatureRow labels={["Signature et cachet d'agent", 'Signature du client']} />
      </PdfPage>
    </Document>
  );
};