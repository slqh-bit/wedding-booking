import PDFDocument from 'pdfkit';
import type { Writable } from 'node:stream';

export interface InvoicePdfData {
  invoice: { number: string; issuedAt: Date; subtotal: number; tva: number; timbreFiscal: number; total: number };
  deposit: number;
  booking: { reference: string; eventDate: string; eventType: string };
  customer: { fullName: string; email: string; phone: string };
  items: { name: string; unitPrice: number }[];
  platform: { name: string; address: string; phone: string; email: string };
}

// Tunisian invoices are issued in French ("Facture"). Brand name is romanized
// to avoid Arabic glyph shaping in the base PDF font.
const GOLD = '#C9A227';
const INK = '#3D2F0B';
const MUTED = '#7A6B4A';

const fmt = (n: number) => `${n.toFixed(3)} TND`;

const EVENT_FR: Record<string, string> = {
  WEDDING: 'Mariage',
  ENGAGEMENT: 'Fiançailles',
  BIRTHDAY: 'Anniversaire',
  GRADUATION: 'Remise de diplôme',
  OTHER: 'Événement',
};

/** Stream a French fiscal invoice PDF (TVA 19% + Timbre Fiscal) to `out`. */
export function streamInvoicePdf(out: Writable, d: InvoicePdfData): void {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(out);

  const left = 50;
  const right = 545;

  // Header
  doc.fillColor(GOLD).fontSize(24).font('Helvetica-Bold').text('Hafalati', left, 50);
  doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('Organisation de fêtes & événements', left, 78);
  doc.fillColor(MUTED).fontSize(8).text(d.platform.address, left, 92);
  doc.text(`${d.platform.phone}  ·  ${d.platform.email}`, left, 104);

  doc.fillColor(INK).fontSize(20).font('Helvetica-Bold').text('FACTURE', right - 150, 50, { width: 150, align: 'right' });
  doc.fillColor(MUTED).fontSize(9).font('Helvetica')
    .text(`N° ${d.invoice.number}`, right - 200, 80, { width: 200, align: 'right' })
    .text(`Date : ${d.invoice.issuedAt.toISOString().slice(0, 10)}`, right - 200, 94, { width: 200, align: 'right' })
    .text(`Réf. réservation : ${d.booking.reference}`, right - 200, 108, { width: 200, align: 'right' });

  // Divider
  doc.moveTo(left, 130).lineTo(right, 130).strokeColor(GOLD).lineWidth(1).stroke();

  // Bill to + event
  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold').text('Client', left, 145);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
    .text(d.customer.fullName, left, 160)
    .text(d.customer.email, left, 173)
    .text(d.customer.phone, left, 186);

  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold').text('Événement', right - 200, 145, { width: 200, align: 'right' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
    .text(`${EVENT_FR[d.booking.eventType] ?? d.booking.eventType} — ${d.booking.eventDate}`, right - 200, 160, { width: 200, align: 'right' });

  // Items table
  let y = 220;
  doc.fillColor(INK).fontSize(9).font('Helvetica-Bold');
  doc.text('Désignation', left, y);
  doc.text('Montant (HT)', right - 150, y, { width: 150, align: 'right' });
  y += 6;
  doc.moveTo(left, y + 8).lineTo(right, y + 8).strokeColor('#E5D9B8').lineWidth(0.5).stroke();
  y += 16;

  doc.font('Helvetica').fillColor(INK).fontSize(9);
  for (const it of d.items) {
    doc.text(it.name, left, y, { width: 340 });
    doc.text(fmt(it.unitPrice), right - 150, y, { width: 150, align: 'right' });
    y += 20;
  }

  // Totals
  y += 10;
  doc.moveTo(right - 240, y).lineTo(right, y).strokeColor('#E5D9B8').lineWidth(0.5).stroke();
  y += 10;
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? INK : MUTED).fontSize(bold ? 11 : 9);
    doc.text(label, right - 240, y, { width: 140, align: 'right' });
    doc.text(value, right - 100, y, { width: 100, align: 'right' });
    y += bold ? 20 : 16;
  };
  row('Sous-total (HT)', fmt(d.invoice.subtotal));
  row('TVA (19%)', fmt(d.invoice.tva));
  row('Timbre fiscal', fmt(d.invoice.timbreFiscal));
  row('Total TTC', fmt(d.invoice.total), true);

  y += 6;
  doc.font('Helvetica').fillColor(MUTED).fontSize(9);
  doc.text(`Acompte réglé : ${fmt(d.deposit)}`, right - 240, y, { width: 240, align: 'right' });
  y += 14;
  doc.text(`Solde restant : ${fmt(d.invoice.total - d.deposit)}`, right - 240, y, { width: 240, align: 'right' });

  // Footer
  doc.fillColor(MUTED).fontSize(8).font('Helvetica')
    .text(
      'TVA au taux de 19% — Timbre fiscal conforme à la réglementation tunisienne. Merci de votre confiance.',
      left,
      760,
      { width: right - left, align: 'center' },
    );

  doc.end();
}
