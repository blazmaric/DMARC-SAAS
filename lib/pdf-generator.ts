import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  domain: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEmails: number;
    alignedEmails: number;
    failedEmails: number;
    alignmentRate: number;
  };
  topSources: Array<{
    ip: string;
    count: number;
    aligned: number;
    failed: number;
  }>;
  reportsReceived: number;
}

interface Translations {
  title: string;
  subtitle: string;
  period: string;
  to: string;
  summary: string;
  totalEmails: string;
  alignedEmails: string;
  failedEmails: string;
  alignmentRate: string;
  reportsReceived: string;
  topSources: string;
  ipAddress: string;
  totalCount: string;
  aligned: string;
  failed: string;
  footer: string;
  generatedOn: string;
}

const translations: Record<'sl' | 'en', Translations> = {
  sl: {
    title: 'DMARC Poročilo',
    subtitle: 'Poročilo o avtentikaciji e-pošte',
    period: 'Obdobje',
    to: 'do',
    summary: 'Povzetek',
    totalEmails: 'Skupno število sporočil',
    alignedEmails: 'Usklajena sporočila',
    failedEmails: 'Neusklajena sporočila',
    alignmentRate: 'Stopnja usklajenosti',
    reportsReceived: 'Prejeta poročila',
    topSources: 'Najpogostejši viri pošiljanja',
    ipAddress: 'IP naslov',
    totalCount: 'Skupaj',
    aligned: 'Usklajeno',
    failed: 'Neusklajeno',
    footer: '© 2026 M-Host. Vse pravice pridržane. | Narejeno v Sloveniji za EU',
    generatedOn: 'Ustvarjeno',
  },
  en: {
    title: 'DMARC Report',
    subtitle: 'Email Authentication Report',
    period: 'Period',
    to: 'to',
    summary: 'Summary',
    totalEmails: 'Total Emails',
    alignedEmails: 'Aligned Emails',
    failedEmails: 'Failed Emails',
    alignmentRate: 'Alignment Rate',
    reportsReceived: 'Reports Received',
    topSources: 'Top Sending Sources',
    ipAddress: 'IP Address',
    totalCount: 'Total',
    aligned: 'Aligned',
    failed: 'Failed',
    footer: '© 2026 M-Host. All rights reserved. | Made in Slovenia for EU',
    generatedOn: 'Generated on',
  },
};

function formatDate(date: Date, locale: 'sl' | 'en'): string {
  return date.toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatNumber(num: number, locale: 'sl' | 'en'): string {
  return num.toLocaleString(locale === 'sl' ? 'sl-SI' : 'en-US');
}

export function generateDMARCReport(
  data: ReportData,
  locale: 'sl' | 'en' = 'sl'
): jsPDF {
  const doc = new jsPDF();
  const t = translations[locale];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(t.title, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(t.subtitle, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.period}: ${data.domain}`, 14, yPosition);

  yPosition += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(
    `${formatDate(data.period.start, locale)} ${t.to} ${formatDate(data.period.end, locale)}`,
    14,
    yPosition
  );

  yPosition += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(t.summary, 14, yPosition);

  yPosition += 10;

  const summaryData = [
    [t.totalEmails, formatNumber(data.summary.totalEmails, locale)],
    [t.alignedEmails, formatNumber(data.summary.alignedEmails, locale)],
    [t.failedEmails, formatNumber(data.summary.failedEmails, locale)],
    [t.alignmentRate, `${data.summary.alignmentRate.toFixed(1)}%`],
    [t.reportsReceived, formatNumber(data.reportsReceived, locale)],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: {
      fontSize: 11,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto' },
    },
    margin: { left: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t.topSources, 14, yPosition);

  yPosition += 10;

  const tableData = data.topSources.map((source) => [
    source.ip,
    formatNumber(source.count, locale),
    formatNumber(source.aligned, locale),
    formatNumber(source.failed, locale),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [[t.ipAddress, t.totalCount, t.aligned, t.failed]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'right', cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 'auto' },
      3: { halign: 'right', cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  const footerY = pageHeight - 15;
  doc.text(t.footer, pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.text(
    `${t.generatedOn}: ${formatDate(new Date(), locale)}`,
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.5);
  doc.line(14, 10, pageWidth - 14, 10);

  return doc;
}

export function generateAndDownloadReport(
  data: ReportData,
  locale: 'sl' | 'en' = 'sl'
): void {
  const doc = generateDMARCReport(data, locale);
  const fileName = `dmarc-report-${data.domain}-${data.period.start.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function generateReportBuffer(
  data: ReportData,
  locale: 'sl' | 'en' = 'sl'
): Buffer {
  const doc = generateDMARCReport(data, locale);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
