import ExcelJS from 'exceljs';
import { AiyaraInvoice, AiyaraLineItem } from '../types';
import { convertAmountToWords } from '../components/AiyaraInvoiceModal';

// Helper to auto-calculate CBM from dimensions, volume, or sq.meters matching modal exactly
export function calculateLineItemCbm(item: AiyaraLineItem): number {
  if (item.cbmVolume !== undefined && Number(item.cbmVolume) > 0) {
    return Number(item.cbmVolume);
  }
  // Check palletDimension e.g. "145x70x85" (L x W x H in cm)
  if (item.palletDimension && item.palletDimension.trim()) {
    const clean = item.palletDimension.toLowerCase().replace(/cm/gi, '').trim();
    const parts = clean.split(/[x*×]/).map(p => parseFloat(p.trim())).filter(p => !isNaN(p) && p > 0);
    if (parts.length === 3) {
      const palletCount = Number(item.qtyPallet) || 1;
      const singlePalletCbm = (parts[0] * parts[1] * parts[2]) / 1000000;
      return parseFloat((singlePalletCbm * palletCount).toFixed(3));
    }
  }
  // Fallback based on totalSqMeter
  if (item.totalSqMeter && Number(item.totalSqMeter) > 0) {
    return parseFloat((Number(item.totalSqMeter) * 0.015).toFixed(3));
  }
  return 0;
}

// Currency Config Helper for Microsoft Excel cell formatting
export function getCurrencyConfig(currencyStr?: string) {
  const curr = (currencyStr || 'USD ($)').toUpperCase();
  if (curr.includes('EUR') || curr.includes('€')) {
    return { symbol: '€', code: 'EUR', numFmt: '[$€-2] #,##0.00' };
  }
  if (curr.includes('INR') || curr.includes('₹')) {
    return { symbol: '₹', code: 'INR', numFmt: '[$₹-4009] #,##0.00' };
  }
  if (curr.includes('GBP') || curr.includes('£')) {
    return { symbol: '£', code: 'GBP', numFmt: '[$£-809] #,##0.00' };
  }
  return { symbol: '$', code: 'USD', numFmt: '$#,##0.00' };
}

// Styling Constants matching the PDF Colors
const COLORS = {
  headerBg: '0F172A',       // Dark Navy/Slate 900
  headerText: 'FFFFFF',
  subHeaderBg: '1E293B',    // Slate 800
  accentGold: 'FCD34D',     // Amber 300
  accentGoldText: '0F172A',
  bannerBg: 'FEF3C7',       // Amber 100
  zebraLight: 'F8FAFC',     // Slate 50
  zebraWhite: 'FFFFFF',
  borderDark: '0F172A',
  borderLight: 'CBD5E1',    // Slate 300
  borderMedium: '94A3B8',   // Slate 400
  emeraldText: '065F46',
  brandRed: 'E4002B'
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.borderLight } },
  left: { style: 'thin', color: { argb: COLORS.borderLight } },
  bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
  right: { style: 'thin', color: { argb: COLORS.borderLight } }
};

const BORDER_BOX_DARK: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: COLORS.borderDark } },
  left: { style: 'medium', color: { argb: COLORS.borderDark } },
  bottom: { style: 'medium', color: { argb: COLORS.borderDark } },
  right: { style: 'medium', color: { argb: COLORS.borderDark } }
};

/**
 * Generates an Excel workbook with styling that identically mirrors
 * the official Poptop & Export Commercial Invoice PDF using EXACT admin data.
 */
export async function generatePoptopInvoiceExcel(
  invoice: AiyaraInvoice,
  options: { includePackingList?: boolean } = {}
): Promise<Blob> {
  const WorkbookClass = (ExcelJS as any).Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any);
  const workbook = new WorkbookClass();

  const isPoptop = invoice.invoiceType !== 'AIYARA' && !(invoice.buyerName || '').toLowerCase().includes('aiyara') && (invoice.invoiceType === 'POPTOP' || (invoice.buyerName || '').toLowerCase().includes('poptop'));
  const currConfig = getCurrencyConfig(invoice.currency);

  workbook.creator = invoice.supplierName || 'Four Corners Carpets';
  workbook.lastModifiedBy = 'Export Invoice Studio';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ==========================================
  // SHEET 1: COMMERCIAL INVOICE (PDF MATCHED)
  // ==========================================
  const ws = workbook.addWorksheet('Commercial Invoice', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
    },
    views: [{ showGridLines: true }]
  });

  const totalCols = isPoptop ? 14 : 13;
  const lastColLetter = isPoptop ? 'N' : 'M';
  const midCol1End = isPoptop ? 'G' : 'F';
  const midCol2Start = isPoptop ? 'H' : 'G';

  // Set explicit column widths
  if (isPoptop) {
    ws.columns = [
      { key: 'itemNo', width: 10 },        // A: ITEM #
      { key: 'hsn', width: 13 },           // B: HSN CODE
      { key: 'desc', width: 34 },          // C: DESCRIPTION OF ITEM
      { key: 'spec', width: 18 },          // D: SPECIFICATION
      { key: 'code', width: 16 },          // E: PRODUCT CODE
      { key: 'size', width: 15 },          // F: SIZES In cm
      { key: 'palletDim', width: 20 },     // G: PALLET DIMENSION
      { key: 'weight', width: 13 },        // H: WEIGHT (KG)
      { key: 'cbm', width: 12 },           // I: CBM (m³)
      { key: 'qtyPallet', width: 15 },     // J: QTY OF PALLET
      { key: 'qtyPcs', width: 12 },        // K: RUG PCS
      { key: 'totalMtr', width: 15 },      // L: TOTAL IN METER
      { key: 'pricePcs', width: 16 },      // M: PRICE / PCS
      { key: 'totalAmount', width: 18 }    // N: TOTAL AMOUNT
    ];
  } else {
    ws.columns = [
      { key: 'itemNo', width: 10 },        // A: ITEM #
      { key: 'hsn', width: 13 },           // B: HSN CODE
      { key: 'desc', width: 34 },          // C: DESCRIPTION OF ITEM
      { key: 'spec', width: 18 },          // D: SPECIFICATION
      { key: 'code', width: 16 },          // E: PRODUCT CODE
      { key: 'size', width: 15 },          // F: SIZES In cm
      { key: 'palletDim', width: 20 },     // G: PALLET DIMENSION
      { key: 'weight', width: 13 },        // H: WEIGHT (KG)
      { key: 'cbm', width: 12 },           // I: CBM (m³)
      { key: 'qtyPcs', width: 13 },        // J: QTY PCS
      { key: 'totalMtr', width: 15 },      // K: TOTAL IN METER
      { key: 'sqMtrPrice', width: 16 },    // L: SQ MTR PRICE
      { key: 'totalAmount', width: 18 }    // M: TOTAL AMOUNT
    ];
  }

  let r = 1;

  // 1. TOP TITLE HEADER (Matches PDF Header)
  ws.mergeCells(`A${r}:${lastColLetter}${r}`);
  const titleCell = ws.getCell(`A${r}`);
  titleCell.value = isPoptop ? (invoice.documentTitle || 'PERFORMA / COMMERCIAL INVOICE').toUpperCase() : `${(invoice.supplierName || 'FOUR CORNERS CARPETS').toUpperCase()} — INVOICE`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(r).height = 28;
  r++;

  ws.mergeCells(`A${r}:${lastColLetter}${r}`);
  const subTitleCell = ws.getCell(`A${r}`);
  subTitleCell.value = `${(invoice.supplierName || 'FOUR CORNERS CARPETS').toUpperCase()} — INTERNATIONAL EXPORT INVOICE`;
  subTitleCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandRed } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(r).height = 18;
  r++;

  // Metadata Bar (Invoice No, Date, Currency)
  const metaMid1 = isPoptop ? 'E' : 'E';
  const metaMid2Start = isPoptop ? 'F' : 'F';
  const metaMid2End = isPoptop ? 'H' : 'G';
  const metaMid3Start = isPoptop ? 'I' : 'H';
  const metaMid3End = isPoptop ? 'K' : 'J';
  const metaRightStart = isPoptop ? 'L' : 'K';

  ws.mergeCells(`A${r}:${metaMid1}${r}`);
  ws.getCell(`A${r}`).value = `MANUFACTURER & EXPORTER: ${invoice.supplierName || 'FOUR CORNERS CARPETS'}`;
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9.5, bold: true, italic: true, color: { argb: '475569' } };
  ws.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(`${metaMid2Start}${r}:${metaMid2End}${r}`);
  ws.getCell(`${metaMid2Start}${r}`).value = `INVOICE NO: ${invoice.invoiceNo || ''}`;
  ws.getCell(`${metaMid2Start}${r}`).font = { name: 'Calibri', size: 10, bold: true };
  ws.getCell(`${metaMid2Start}${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${metaMid3Start}${r}:${metaMid3End}${r}`);
  ws.getCell(`${metaMid3Start}${r}`).value = `DATE: ${invoice.date || ''}`;
  ws.getCell(`${metaMid3Start}${r}`).font = { name: 'Calibri', size: 10, bold: true };
  ws.getCell(`${metaMid3Start}${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${metaRightStart}${r}:${lastColLetter}${r}`);
  ws.getCell(`${metaRightStart}${r}`).value = `CURRENCY: ${invoice.currency || 'USD ($)'}`;
  ws.getCell(`${metaRightStart}${r}`).font = { name: 'Calibri', size: 10, bold: true };
  ws.getCell(`${metaRightStart}${r}`).alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(r).height = 20;

  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(r, c);
    cell.border = { bottom: { style: 'medium', color: { argb: COLORS.borderDark } } };
  }
  r++;

  // Empty separator
  r++;

  // 2. SUPPLIER & CONSIGNEE DETAILS (2-Column Box, Exactly like PDF)
  ws.mergeCells(`A${r}:${midCol1End}${r}`);
  const supHdr = ws.getCell(`A${r}`);
  supHdr.value = 'EXPORTER / SUPPLIER DETAILS';
  supHdr.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.headerText } };
  supHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  supHdr.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  ws.mergeCells(`${midCol2Start}${r}:${lastColLetter}${r}`);
  const buyHdr = ws.getCell(`${midCol2Start}${r}`);
  buyHdr.value = 'CONSIGNEE / BUYER DETAILS';
  buyHdr.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.headerText } };
  buyHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  buyHdr.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(r).height = 22;
  r++;

  const supStartRow = r;
  
  // Row: Company Names
  ws.mergeCells(`A${r}:${midCol1End}${r}`);
  ws.getCell(`A${r}`).value = invoice.supplierName || 'FOUR CORNERS CARPETS';
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F172A' } };

  ws.mergeCells(`${midCol2Start}${r}:${lastColLetter}${r}`);
  ws.getCell(`${midCol2Start}${r}`).value = invoice.buyerName || (isPoptop ? 'POPTOP GMBH' : 'CONSIGNEE');
  ws.getCell(`${midCol2Start}${r}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F172A' } };
  ws.getRow(r).height = 19;
  r++;

  // Row: Addresses
  ws.mergeCells(`A${r}:${midCol1End}${r}`);
  ws.getCell(`A${r}`).value = invoice.supplierAddress || '';
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9.5 };
  ws.getCell(`A${r}`).alignment = { wrapText: true };

  ws.mergeCells(`${midCol2Start}${r}:${lastColLetter}${r}`);
  ws.getCell(`${midCol2Start}${r}`).value = invoice.buyerAddress || '';
  ws.getCell(`${midCol2Start}${r}`).font = { name: 'Calibri', size: 9.5 };
  ws.getCell(`${midCol2Start}${r}`).alignment = { wrapText: true };
  ws.getRow(r).height = 32;
  r++;

  // Row: Tax & Registry IDs
  const supTaxList: string[] = [];
  if (invoice.supplierGstin) supTaxList.push(`GSTIN: ${invoice.supplierGstin}`);
  if (isPoptop && invoice.supplierIecNo) supTaxList.push(`IEC: ${invoice.supplierIecNo}`);
  if (isPoptop && invoice.supplierRexNo) supTaxList.push(`REX: ${invoice.supplierRexNo}`);
  if (supTaxList.length === 0) supTaxList.push(`GSTIN: ${invoice.supplierGstin || '09AJTPD8099G1ZP'}`);

  ws.mergeCells(`A${r}:${midCol1End}${r}`);
  ws.getCell(`A${r}`).value = supTaxList.join('   |   ');
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9.5, bold: true };

  const buyTaxList: string[] = [];
  if (invoice.buyerEoriVat) buyTaxList.push(`VAT / EORI: ${invoice.buyerEoriVat}`);
  if (invoice.buyerGstin) buyTaxList.push(`GSTIN: ${invoice.buyerGstin}`);
  if (invoice.buyerAttention) buyTaxList.push(`ATTN: ${invoice.buyerAttention}`);
  if (buyTaxList.length === 0 && invoice.countryOfDestination) buyTaxList.push(`Destination: ${invoice.countryOfDestination}`);

  ws.mergeCells(`${midCol2Start}${r}:${lastColLetter}${r}`);
  ws.getCell(`${midCol2Start}${r}`).value = buyTaxList.join('   |   ');
  ws.getCell(`${midCol2Start}${r}`).font = { name: 'Calibri', size: 9.5 };
  ws.getRow(r).height = 18;
  r++;

  // Row: Bank / Swift & Contact
  const supBankList: string[] = [];
  if (invoice.supplierBankDetails) supBankList.push(invoice.supplierBankDetails);
  if (invoice.supplierIfsc) supBankList.push(`IFSC: ${invoice.supplierIfsc}`);
  if (isPoptop && invoice.supplierSwiftCode) supBankList.push(`SWIFT: ${invoice.supplierSwiftCode}`);
  if (isPoptop && invoice.supplierAdCode) supBankList.push(`AD CODE: ${invoice.supplierAdCode}`);
  if (supBankList.length === 0) supBankList.push('BANK: ICICI BANK LTD');

  ws.mergeCells(`A${r}:${midCol1End}${r}`);
  ws.getCell(`A${r}`).value = supBankList.join('   |   ');
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9, bold: true };

  const buyContactList: string[] = [];
  if (invoice.buyerPhone) buyContactList.push(`Tel: ${invoice.buyerPhone}`);
  if (invoice.buyerEmail) buyContactList.push(`Email: ${invoice.buyerEmail}`);
  if (buyContactList.length === 0) buyContactList.push('Delivery Terms: Palletized export freight');

  ws.mergeCells(`${midCol2Start}${r}:${lastColLetter}${r}`);
  ws.getCell(`${midCol2Start}${r}`).value = buyContactList.join('   |   ');
  ws.getCell(`${midCol2Start}${r}`).font = { name: 'Calibri', size: 9 };
  ws.getRow(r).height = 18;
  r++;

  // Apply borders to supplier/buyer box
  const midColIdx = isPoptop ? 7 : 6;
  for (let rowIdx = supStartRow - 1; rowIdx < r; rowIdx++) {
    for (let c = 1; c <= midColIdx; c++) {
      const cell = ws.getCell(rowIdx, c);
      cell.border = {
        top: rowIdx === supStartRow - 1 ? { style: 'medium' } : undefined,
        left: c === 1 ? { style: 'medium' } : undefined,
        right: c === midColIdx ? { style: 'medium' } : undefined,
        bottom: rowIdx === r - 1 ? { style: 'medium' } : undefined
      };
    }
    for (let c = midColIdx + 1; c <= totalCols; c++) {
      const cell = ws.getCell(rowIdx, c);
      cell.border = {
        top: rowIdx === supStartRow - 1 ? { style: 'medium' } : undefined,
        left: c === midColIdx + 1 ? { style: 'medium' } : undefined,
        right: c === totalCols ? { style: 'medium' } : undefined,
        bottom: rowIdx === r - 1 ? { style: 'medium' } : undefined
      };
    }
  }

  r++; // empty row

  if (isPoptop) {
    // 3. SHIPPING & LOGISTICS GRID (Bordered 2-column grid exactly like PDF)
    ws.mergeCells(`A${r}:${lastColLetter}${r}`);
    const shipHdr = ws.getCell(`A${r}`);
    shipHdr.value = 'SHIPPING & TRANSPORT DETAILS (LOGISTICS & CUSTOMS CLEARANCE)';
    shipHdr.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.headerText } };
    shipHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } };
    shipHdr.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 20;
    r++;

    const shipGridStart = r;
    const shipGridRows = [
      [
        'Pre-Carried by:', invoice.preCarriedBy || 'BY TRUCK',
        'Place of Receipt Pre-Carrier:', invoice.placeOfReceiptByPreCarrier || 'BHADOHI'
      ],
      [
        'Vessel / Flight No.:', invoice.vesselFlightNo || 'BY SEA',
        'Shipment From:', invoice.shipmentFrom || invoice.portOfLoading || 'MUMBAI'
      ],
      [
        'Port of Discharge:', invoice.portOfDischarge || 'Austria',
        'Final Destination:', invoice.finalDestination || invoice.countryOfDestination || 'Austria'
      ],
      [
        'Country of Goods:', invoice.countryOfOrigin || 'INDIA',
        'Country of Final Destination:', invoice.countryOfDestination || 'Austria'
      ],
      [
        'Marks & Numbers:', (invoice.marksAndNos || 'Marks : F4C / Austria').replace(/\r?\n/g, ' / '),
        'No. and Kind of Packing:', invoice.noAndKindOfPackages || (invoice.totalPallets ? `${invoice.totalPallets} Pallet` : '10 Pallet')
      ]
    ];

    const colA3 = isPoptop ? 'C' : 'C';
    const colD7Start = isPoptop ? 'D' : 'D';
    const colD7End = isPoptop ? 'G' : 'F';
    const colH10Start = isPoptop ? 'H' : 'G';
    const colH10End = isPoptop ? 'J' : 'I';
    const colK14Start = isPoptop ? 'K' : 'J';

    shipGridRows.forEach(([lbl1, val1, lbl2, val2]) => {
      // Left pair
      ws.mergeCells(`A${r}:${colA3}${r}`);
      const l1 = ws.getCell(`A${r}`);
      l1.value = lbl1;
      l1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '475569' } };
      l1.alignment = { horizontal: 'left', vertical: 'middle' };

      ws.mergeCells(`${colD7Start}${r}:${colD7End}${r}`);
      const v1 = ws.getCell(`${colD7Start}${r}`);
      v1.value = val1;
      v1.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
      v1.alignment = { horizontal: 'left', vertical: 'middle' };

      // Right pair
      ws.mergeCells(`${colH10Start}${r}:${colH10End}${r}`);
      const l2 = ws.getCell(`${colH10Start}${r}`);
      l2.value = lbl2;
      l2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: '475569' } };
      l2.alignment = { horizontal: 'left', vertical: 'middle' };

      ws.mergeCells(`${colK14Start}${r}:${lastColLetter}${r}`);
      const v2 = ws.getCell(`${colK14Start}${r}`);
      v2.value = val2;
      v2.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
      v2.alignment = { horizontal: 'left', vertical: 'middle' };

      ws.getRow(r).height = 20;

      for (let c = 1; c <= totalCols; c++) {
        ws.getCell(r, c).border = BORDER_THIN;
      }
      r++;
    });

    // Apply outer medium border to shipping grid
    for (let rowIdx = shipGridStart - 1; rowIdx < r; rowIdx++) {
      for (let colIdx = 1; colIdx <= totalCols; colIdx++) {
        const cell = ws.getCell(rowIdx, colIdx);
        const curBorder = cell.border || {};
        cell.border = {
          ...curBorder,
          top: rowIdx === shipGridStart - 1 ? { style: 'medium', color: { argb: COLORS.borderDark } } : curBorder.top,
          left: colIdx === 1 ? { style: 'medium', color: { argb: COLORS.borderDark } } : curBorder.left,
          right: colIdx === totalCols ? { style: 'medium', color: { argb: COLORS.borderDark } } : curBorder.right,
          bottom: rowIdx === r - 1 ? { style: 'medium', color: { argb: COLORS.borderDark } } : curBorder.bottom
        };
      }
    }
  }

  r++; // empty row

  // 4. PO DETAILS AMBER BANNER (Matching PDF amber bar)
  ws.mergeCells(`A${r}:${lastColLetter}${r}`);
  const poBanner = ws.getCell(`A${r}`);
  poBanner.value = `★ ${invoice.poTitle || 'PO DETAILS'}   |   INVOICE / PO REF: ${invoice.invoiceNo || ''}`;
  poBanner.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.accentGoldText } };
  poBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accentGold } };
  poBanner.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(r).height = 24;

  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(r, c).border = BORDER_BOX_DARK;
  }
  r++;

  // 5. LINE ITEMS TABLE (Columns identically matched to PDF & UI)
  const tableHeaders = isPoptop ? [
    'ITEM #',
    'HSN CODE',
    'DESCRIPTION OF ITEM',
    'SPECIFICATION',
    'PRODUCT CODE',
    'SIZES In cm',
    'PALLET DIMENSION',
    'WEIGHT (KG)',
    'CBM (m³)',
    'QTY OF PALLET',
    'RUG PCS',
    'TOTAL IN METER',
    'PRICE / PCS',
    'TOTAL AMOUNT'
  ] : [
    'ITEM #',
    'HSN CODE',
    'DESCRIPTION OF ITEM',
    'SPECIFICATION',
    'PRODUCT CODE',
    'SIZES In cm',
    'PALLET DIMENSION',
    'WEIGHT (KG)',
    'CBM (m³)',
    'QTY PCS',
    'TOTAL IN METER',
    'SQ MTR PRICE',
    'TOTAL AMOUNT'
  ];

  ws.getRow(r).height = 26;
  tableHeaders.forEach((hdr, idx) => {
    const colIdx = idx + 1;
    const cell = ws.getCell(r, colIdx);
    cell.value = hdr;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = {
      horizontal: colIdx === 3 ? 'left' : (colIdx >= (totalCols - 1) ? 'right' : 'center'),
      vertical: 'middle',
      wrapText: true
    };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.borderDark } },
      bottom: { style: 'medium', color: { argb: COLORS.borderDark } },
      left: { style: 'thin', color: { argb: COLORS.borderDark } },
      right: { style: 'thin', color: { argb: COLORS.borderDark } }
    };
  });
  r++;

  let totalCbmSum = 0;
  let totalPalletsSum = 0;
  let totalPcsSum = 0;
  let totalMtrSum = 0;

  invoice.items.forEach((item, idx) => {
    const cbmVal = (item.cbmVolume !== undefined && Number(item.cbmVolume) > 0)
      ? Number(item.cbmVolume)
      : calculateLineItemCbm(item);
    totalCbmSum += cbmVal;

    const palletQty = item.qtyPallet !== undefined ? Number(item.qtyPallet) : 1;
    totalPalletsSum += palletQty;

    const rugPcs = Number(item.qtyPcs) || 0;
    totalPcsSum += rugPcs;

    const mtrVal = Number(item.totalSqMeter) || 0;
    totalMtrSum += mtrVal;

    // Preserve admin's exact item total amount and price without arbitrary recalculations
    const totalAmt = (item.totalAmount !== undefined && Number(item.totalAmount) > 0)
      ? Number(item.totalAmount)
      : 0;

    const priceVal = isPoptop
      ? (item.pcsPrice !== undefined && Number(item.pcsPrice) > 0
          ? Number(item.pcsPrice)
          : (item.sqMtrPrice !== undefined && Number(item.sqMtrPrice) > 0
              ? Number(item.sqMtrPrice)
              : (totalAmt > 0 && rugPcs > 0 ? parseFloat((totalAmt / rugPcs).toFixed(2)) : 0)))
      : (Number(item.sqMtrPrice) || (totalAmt > 0 && mtrVal > 0 ? parseFloat((totalAmt / mtrVal).toFixed(2)) : 0));

    const finalRowTotal = totalAmt > 0 
      ? totalAmt 
      : parseFloat(((isPoptop && item.pcsPrice ? rugPcs : mtrVal) * priceVal).toFixed(2));

    const weightVal = typeof item.weightKg === 'number' && !isNaN(item.weightKg) 
      ? item.weightKg 
      : (item.grossWeightKg || item.netWeightKg || '');

    const isEven = idx % 2 === 0;
    const bgRowColor = isEven ? COLORS.zebraWhite : COLORS.zebraLight;

    ws.getRow(r).height = 22;

    const rowValues = isPoptop ? [
      item.itemNo || '',                               // Col 1: ITEM #
      item.hsnCode || '',                              // Col 2: HSN CODE
      item.description || '',                          // Col 3: DESCRIPTION
      item.specification || '',                        // Col 4: SPECIFICATION
      item.productCode || '',                          // Col 5: PRODUCT CODE
      item.sizesCm || '',                              // Col 6: SIZES In cm
      item.palletDimension || '',                      // Col 7: PALLET DIMENSION
      weightVal,                                       // Col 8: WEIGHT
      cbmVal > 0 ? Number(cbmVal.toFixed(3)) : '',     // Col 9: CBM
      palletQty,                                       // Col 10: QTY OF PALLET
      rugPcs,                                          // Col 11: RUG PCS
      mtrVal > 0 ? Number(mtrVal.toFixed(2)) : 0,      // Col 12: TOTAL IN METER
      priceVal,                                        // Col 13: PRICE / PCS
      finalRowTotal                                    // Col 14: TOTAL AMOUNT
    ] : [
      item.itemNo || '',                               // Col 1: ITEM #
      item.hsnCode || '',                              // Col 2: HSN CODE
      item.description || '',                          // Col 3: DESCRIPTION
      item.specification || '',                        // Col 4: SPECIFICATION
      item.productCode || '',                          // Col 5: PRODUCT CODE
      item.sizesCm || '',                              // Col 6: SIZES In cm
      item.palletDimension || '',                      // Col 7: PALLET DIMENSION
      weightVal,                                       // Col 8: WEIGHT
      cbmVal > 0 ? Number(cbmVal.toFixed(3)) : '',     // Col 9: CBM
      rugPcs,                                          // Col 10: QTY PCS
      mtrVal > 0 ? Number(mtrVal.toFixed(2)) : 0,      // Col 11: TOTAL IN METER
      priceVal,                                        // Col 12: SQ MTR PRICE
      finalRowTotal                                    // Col 13: TOTAL AMOUNT
    ];

    rowValues.forEach((val, colZero) => {
      const colIdx = colZero + 1;
      const cell = ws.getCell(r, colIdx);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };
      cell.font = { name: 'Calibri', size: 10, bold: [1, 6, isPoptop ? 10 : 10, isPoptop ? 11 : 10, isPoptop ? 13 : 12, totalCols].includes(colIdx) };

      // Number formatting
      if (colIdx === 8 && typeof val === 'number') {
        cell.numFmt = '#,##0.0';
      } else if (colIdx === 9 && typeof val === 'number') {
        cell.numFmt = '0.000';
      } else if (isPoptop && (colIdx === 10 || colIdx === 11)) {
        cell.numFmt = '#,##0';
      } else if (!isPoptop && colIdx === 10) {
        cell.numFmt = '#,##0';
      } else if ((isPoptop && colIdx === 12) || (!isPoptop && colIdx === 11)) {
        cell.numFmt = '#,##0.00';
      } else if (colIdx === (totalCols - 1) || colIdx === totalCols) {
        cell.numFmt = currConfig.numFmt;
      }

      cell.alignment = {
        horizontal: colIdx === 3 ? 'left' : (colIdx >= (totalCols - 1) ? 'right' : 'center'),
        vertical: 'middle'
      };

      cell.border = BORDER_THIN;
    });

    r++;
  });

  // 6. TOTALS & SUMMARY SECTION (Identical to PDF layout and modal values)
  ws.getRow(r).height = 24;

  const finalPallets = invoice.totalPallets !== undefined ? Number(invoice.totalPallets) : (totalPalletsSum || 1);
  const finalPcs = invoice.totalPcs !== undefined ? Number(invoice.totalPcs) : totalPcsSum;
  const finalCbm = invoice.totalCbm !== undefined && Number(invoice.totalCbm) > 0 ? Number(invoice.totalCbm) : totalCbmSum;
  const finalArea = invoice.totalSqMeter !== undefined ? Number(invoice.totalSqMeter) : totalMtrSum;
  const finalSubTotal = Number(invoice.subTotal) || 0;

  // Left summary labels matching PDF exactly
  const sumColsEnd = isPoptop ? 'E' : 'E';
  ws.mergeCells(`A${r}:${sumColsEnd}${r}`);
  const sumLabelCell = ws.getCell(`A${r}`);
  sumLabelCell.value = 'TOTAL PRODUCTION METRICS:';
  sumLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1E293B' } };
  sumLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  if (isPoptop) {
    ws.getCell(`F${r}`).value = `Pallets: ${finalPallets}`;
    ws.getCell(`F${r}`).font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`G${r}:H${r}`);
    ws.getCell(`G${r}`).value = `Total Pcs: ${finalPcs} pcs`;
    ws.getCell(`G${r}`).font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell(`G${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(`I${r}`).value = `CBM: ${finalCbm.toFixed(3)} m³`;
    ws.getCell(`I${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.emeraldText } };
    ws.getCell(`I${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`J${r}:L${r}`);
    ws.getCell(`J${r}`).value = `Total Area: ${finalArea.toFixed(2)} m²`;
    ws.getCell(`J${r}`).font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell(`J${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(`M${r}`).value = 'SUB TOTAL:';
    ws.getCell(`M${r}`).font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell(`M${r}`).alignment = { horizontal: 'right', vertical: 'middle' };

    ws.getCell(`N${r}`).value = finalSubTotal;
    ws.getCell(`N${r}`).numFmt = currConfig.numFmt;
    ws.getCell(`N${r}`).font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell(`N${r}`).alignment = { horizontal: 'right', vertical: 'middle' };
  } else {
    ws.mergeCells(`F${r}:G${r}`);
    ws.getCell(`F${r}`).value = `Total Pcs: ${finalPcs} pcs`;
    ws.getCell(`F${r}`).font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(`H${r}`).value = `CBM: ${finalCbm.toFixed(3)} m³`;
    ws.getCell(`H${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.emeraldText } };
    ws.getCell(`H${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`I${r}:K${r}`);
    ws.getCell(`I${r}`).value = `Total Area: ${finalArea.toFixed(2)} m²`;
    ws.getCell(`I${r}`).font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell(`I${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(`L${r}`).value = 'SUB TOTAL:';
    ws.getCell(`L${r}`).font = { name: 'Calibri', size: 10, bold: true };
    ws.getCell(`L${r}`).alignment = { horizontal: 'right', vertical: 'middle' };

    ws.getCell(`M${r}`).value = finalSubTotal;
    ws.getCell(`M${r}`).numFmt = currConfig.numFmt;
    ws.getCell(`M${r}`).font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell(`M${r}`).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(r, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.borderDark } },
      bottom: { style: 'thin', color: { argb: COLORS.borderDark } },
      left: { style: 'thin', color: { argb: COLORS.borderLight } },
      right: { style: 'thin', color: { argb: COLORS.borderLight } }
    };
  }
  r++;

  // Sub Total in Words
  ws.mergeCells(`A${r}:${lastColLetter}${r}`);
  const subWordsCell = ws.getCell(`A${r}`);
  subWordsCell.value = `Sub Total in Words: ${convertAmountToWords(finalSubTotal, invoice.currency)}`;
  subWordsCell.font = { name: 'Calibri', size: 9.5, italic: true, bold: true, color: { argb: '334155' } };
  subWordsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  subWordsCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(r).height = 20;
  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(r, c).border = BORDER_THIN;
  }
  r++;

  const leftSummaryEndCol = isPoptop ? 'L' : 'K';
  const labelColIdx = isPoptop ? 13 : 12;
  const valueColIdx = totalCols;

  // Charge / Tax Row (Per Pallet Charge if POPTOP, or IGST if Standard)
  if (isPoptop) {
    const chargePerPallet = (invoice.perPalletCharge !== undefined && invoice.perPalletCharge !== null) 
      ? Number(invoice.perPalletCharge) 
      : 0;
    const totalPalletCharge = parseFloat((finalPallets * chargePerPallet).toFixed(2));

    if (chargePerPallet > 0 && totalPalletCharge > 0) {
      ws.mergeCells(`A${r}:${leftSummaryEndCol}${r}`);
      const bankDetailsText = invoice.supplierBankDetails 
        ? `BANK: ${invoice.supplierBankDetails}${invoice.supplierIfsc ? ` | IFSC: ${invoice.supplierIfsc}` : ''}${invoice.supplierSwiftCode ? ` | SWIFT: ${invoice.supplierSwiftCode}` : ''}`
        : 'BANK: ICICI BANK LTD | A/C: 039005001234 | IFSC: ICIC0000390 | SWIFT: ICICINBBCTS';
      ws.getCell(`A${r}`).value = bankDetailsText;
      ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9, bold: true, color: { argb: '475569' } };
      ws.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      ws.getCell(r, labelColIdx).value = `Per Pallet Charge (${finalPallets} Pallets @ ${currConfig.symbol}${chargePerPallet}):`;
      ws.getCell(r, labelColIdx).font = { name: 'Calibri', size: 9.5, bold: true };
      ws.getCell(r, labelColIdx).alignment = { horizontal: 'right', vertical: 'middle' };

      ws.getCell(r, valueColIdx).value = totalPalletCharge;
      ws.getCell(r, valueColIdx).numFmt = currConfig.numFmt;
      ws.getCell(r, valueColIdx).font = { name: 'Calibri', size: 10, bold: true };
      ws.getCell(r, valueColIdx).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getRow(r).height = 20;
      for (let c = 1; c <= totalCols; c++) {
        ws.getCell(r, c).border = BORDER_THIN;
      }
      r++;
    }
  } else {
    // Standard invoice: IGST row
    const igstPercent = invoice.igstPercent || 0;
    const igstAmount = invoice.igstAmount !== undefined ? Number(invoice.igstAmount) : parseFloat(((finalSubTotal * igstPercent) / 100).toFixed(2));

    if (igstPercent > 0 || igstAmount > 0) {
      ws.mergeCells(`A${r}:${leftSummaryEndCol}${r}`);
      const bankDetailsText = invoice.supplierBankDetails 
        ? `BANK: ${invoice.supplierBankDetails}${invoice.supplierIfsc ? ` | IFSC: ${invoice.supplierIfsc}` : ''}`
        : 'BANK: ICICI BANK LTD | A/C: 039005001234 | IFSC: ICIC0000390';
      ws.getCell(`A${r}`).value = bankDetailsText;
      ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9, bold: true, color: { argb: '475569' } };
      ws.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      ws.getCell(r, labelColIdx).value = `IGST (${igstPercent}%):`;
      ws.getCell(r, labelColIdx).font = { name: 'Calibri', size: 9.5, bold: true };
      ws.getCell(r, labelColIdx).alignment = { horizontal: 'right', vertical: 'middle' };

      ws.getCell(r, valueColIdx).value = igstAmount;
      ws.getCell(r, valueColIdx).numFmt = currConfig.numFmt;
      ws.getCell(r, valueColIdx).font = { name: 'Calibri', size: 10, bold: true };
      ws.getCell(r, valueColIdx).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getRow(r).height = 20;
      for (let c = 1; c <= totalCols; c++) {
        ws.getCell(r, c).border = BORDER_THIN;
      }
      r++;
    }
  }

  // Advance Payment row (if applicable)
  if (invoice.advancePercent && Number(invoice.advancePercent) > 0) {
    const advPercent = Number(invoice.advancePercent);
    const advAmount = invoice.advanceAmount !== undefined ? Number(invoice.advanceAmount) : parseFloat(((finalSubTotal * advPercent) / 100).toFixed(2));

    ws.mergeCells(`A${r}:${leftSummaryEndCol}${r}`);
    ws.getCell(`A${r}`).value = `TERMS: ${invoice.notes || 'Palletized delivery. Advance payment & balance against shipping documents.'}`;
    ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9 };
    ws.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    ws.getCell(r, labelColIdx).value = `${advPercent}% Advance Payment:`;
    ws.getCell(r, labelColIdx).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '92400E' } };
    ws.getCell(r, labelColIdx).alignment = { horizontal: 'right', vertical: 'middle' };

    ws.getCell(r, valueColIdx).value = advAmount;
    ws.getCell(r, valueColIdx).numFmt = currConfig.numFmt;
    ws.getCell(r, valueColIdx).font = { name: 'Calibri', size: 10, bold: true, color: { argb: '92400E' } };
    ws.getCell(r, valueColIdx).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(r).height = 20;
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(r, c).border = BORDER_THIN;
    }
    r++;
  }

  // TOTAL AMOUNT ROW (Highlight Navy/White matching PDF and EXACT admin total)
  const finalTotalAmount = invoice.totalAmount !== undefined ? Number(invoice.totalAmount) : finalSubTotal;

  ws.mergeCells(`A${r}:${leftSummaryEndCol}${r}`);
  ws.getCell(`A${r}`).value = `TERMS OF DELIVERY: ${invoice.notes || 'Palletized packaging. Balance payment within 90 days of BL date.'}`;
  ws.getCell(`A${r}`).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
  ws.getCell(`A${r}`).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  ws.getCell(r, labelColIdx).value = 'TOTAL AMOUNT:';
  ws.getCell(r, labelColIdx).font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.headerText } };
  ws.getCell(r, labelColIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  ws.getCell(r, labelColIdx).alignment = { horizontal: 'right', vertical: 'middle' };

  ws.getCell(r, valueColIdx).value = finalTotalAmount;
  ws.getCell(r, valueColIdx).numFmt = currConfig.numFmt;
  ws.getCell(r, valueColIdx).font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.headerText } };
  ws.getCell(r, valueColIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  ws.getCell(r, valueColIdx).alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(r).height = 26;

  for (let c = 1; c <= (totalCols - 2); c++) {
    const cell = ws.getCell(r, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.borderDark } },
      bottom: { style: 'medium', color: { argb: COLORS.borderDark } },
      left: c === 1 ? { style: 'medium', color: { argb: COLORS.borderDark } } : undefined,
      right: { style: 'thin', color: { argb: COLORS.borderDark } }
    };
  }
  ws.getCell(r, labelColIdx).border = { top: { style: 'medium' }, bottom: { style: 'medium' } };
  ws.getCell(r, valueColIdx).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
  r++;

  // TOTAL AMOUNT IN WORDS BANNER (Amber Highlight exactly like PDF)
  ws.mergeCells(`A${r}:${lastColLetter}${r}`);
  const totalWordsCell = ws.getCell(`A${r}`);
  totalWordsCell.value = `★ Total Amount in Words: ${convertAmountToWords(finalTotalAmount, invoice.currency)}`;
  totalWordsCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F172A' } };
  totalWordsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bannerBg } };
  totalWordsCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(r).height = 24;
  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(r, c).border = {
      top: { style: 'thin', color: { argb: COLORS.borderDark } },
      bottom: { style: 'medium', color: { argb: COLORS.borderDark } },
      left: c === 1 ? { style: 'medium', color: { argb: COLORS.borderDark } } : undefined,
      right: c === totalCols ? { style: 'medium', color: { argb: COLORS.borderDark } } : undefined
    };
  }
  r++;

  // 7. SIGNATORY / STAMP FOOTER (Right-aligned, matching PDF)
  r++;
  const signColStart = isPoptop ? 'K' : 'J';
  ws.mergeCells(`${signColStart}${r}:${lastColLetter}${r}`);
  const signHdr = ws.getCell(`${signColStart}${r}`);
  signHdr.value = `FOR ${(invoice.supplierName || 'FOUR CORNERS CARPETS').toUpperCase()}`;
  signHdr.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '0F172A' } };
  signHdr.alignment = { horizontal: 'center', vertical: 'middle' };
  signHdr.border = { bottom: { style: 'thin', color: { argb: COLORS.borderDark } } };
  ws.getRow(r).height = 20;
  r++;

  ws.mergeCells(`${signColStart}${r}:${lastColLetter}${r}`);
  const stampCell = ws.getCell(`${signColStart}${r}`);
  stampCell.value = 'Authorized Signature & Official Stamp';
  stampCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '64748B' } };
  stampCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(r).height = 28;
  r++;

  ws.mergeCells(`${signColStart}${r}:${lastColLetter}${r}`);
  const authCell = ws.getCell(`${signColStart}${r}`);
  authCell.value = 'AUTHORIZED SIGNATORY';
  authCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
  authCell.alignment = { horizontal: 'center', vertical: 'middle' };
  authCell.border = { top: { style: 'thin', color: { argb: COLORS.borderDark } } };
  ws.getRow(r).height = 20;


  // ==========================================
  // SHEET 2: DETAILED PACKING LIST
  // ==========================================
  const wsPack = workbook.addWorksheet('Detailed Packing List', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    },
    views: [{ showGridLines: true }]
  });

  wsPack.columns = [
    { key: 'palNo', width: 14 },
    { key: 'hsn', width: 14 },
    { key: 'desc', width: 34 },
    { key: 'code', width: 18 },
    { key: 'size', width: 16 },
    { key: 'dim', width: 22 },
    { key: 'pcs', width: 12 },
    { key: 'mtr', width: 14 },
    { key: 'weight', width: 14 },
    { key: 'cbm', width: 14 }
  ];

  let pr = 1;
  wsPack.mergeCells(`A${pr}:J${pr}`);
  const packTitle = wsPack.getCell(`A${pr}`);
  packTitle.value = 'DETAILED EXPORT PACKING LIST';
  packTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.headerBg } };
  packTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPack.getRow(pr).height = 26;
  pr++;

  wsPack.mergeCells(`A${pr}:J${pr}`);
  const packSub = wsPack.getCell(`A${pr}`);
  packSub.value = `${(invoice.supplierName || 'FOUR CORNERS CARPETS').toUpperCase()} — EXPORT LOGISTICS DEPT.   |   INVOICE REF: ${invoice.invoiceNo || ''}   |   DATE: ${invoice.date || ''}`;
  packSub.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandRed } };
  packSub.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPack.getRow(pr).height = 18;
  pr++;

  // Consignee & Buyer Summary
  wsPack.mergeCells(`A${pr}:E${pr}`);
  wsPack.getCell(`A${pr}`).value = `EXPORTER: ${invoice.supplierName || 'Four Corners Carpets'}\n${invoice.supplierAddress || 'Bhadohi, India'}`;
  wsPack.getCell(`A${pr}`).font = { name: 'Calibri', size: 9.5 };
  wsPack.getCell(`A${pr}`).alignment = { wrapText: true };

  wsPack.mergeCells(`F${pr}:J${pr}`);
  wsPack.getCell(`F${pr}`).value = `CONSIGNEE: ${invoice.buyerName || 'Poptop GmbH'}\n${invoice.buyerAddress || 'Vienna, Austria'}`;
  wsPack.getCell(`F${pr}`).font = { name: 'Calibri', size: 9.5 };
  wsPack.getCell(`F${pr}`).alignment = { wrapText: true };
  wsPack.getRow(pr).height = 36;
  pr++;

  pr++; // spacing

  // Packing List Table Header
  const packHeaders = [
    'PALLET #',
    'HSN CODE',
    'DESCRIPTION OF GOODS',
    'PRODUCT CODE',
    'SIZES (CM)',
    'PALLET DIMENSION',
    'PCS / PALLET',
    'TOTAL M²',
    'WEIGHT (KG)',
    'CBM (m³)'
  ];

  wsPack.getRow(pr).height = 24;
  packHeaders.forEach((hdr, idx) => {
    const colIdx = idx + 1;
    const cell = wsPack.getCell(pr, colIdx);
    cell.value = hdr;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_BOX_DARK;
  });
  pr++;

  let palletCounter = 1;
  let packTotalPcs = 0;
  let packTotalMtr = 0;
  let packTotalWeight = 0;
  let packTotalCbm = 0;

  invoice.items.forEach((it, idx) => {
    const numPallets = it.qtyPallet !== undefined ? Number(it.qtyPallet) : 1;
    const pcsTotal = Number(it.qtyPcs) || 0;
    const mtrTotal = Number(it.totalSqMeter) || 0;
    const weightTotal = typeof it.weightKg === 'number' && !isNaN(it.weightKg) 
      ? it.weightKg 
      : (it.grossWeightKg || it.netWeightKg || 0);
    const cbmVal = (it.cbmVolume !== undefined && Number(it.cbmVolume) > 0)
      ? Number(it.cbmVolume)
      : calculateLineItemCbm(it);

    packTotalPcs += pcsTotal;
    packTotalMtr += mtrTotal;
    packTotalWeight += weightTotal;
    packTotalCbm += cbmVal;

    const palletLabel = numPallets > 1 ? `Pallet ${palletCounter}-${palletCounter + numPallets - 1}` : `Pallet ${palletCounter}`;
    palletCounter += (numPallets > 0 ? numPallets : 1);

    wsPack.getRow(pr).height = 22;
    const rowVals = [
      palletLabel,
      it.hsnCode || '',
      it.description || '',
      it.productCode || '',
      it.sizesCm || '',
      it.palletDimension || '',
      pcsTotal,
      mtrTotal > 0 ? Number(mtrTotal.toFixed(2)) : 0,
      weightTotal > 0 ? weightTotal : '',
      cbmVal > 0 ? Number(cbmVal.toFixed(3)) : ''
    ];

    rowVals.forEach((val, cZero) => {
      const colIdx = cZero + 1;
      const cell = wsPack.getCell(pr, colIdx);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? COLORS.zebraWhite : COLORS.zebraLight } };
      cell.font = { name: 'Calibri', size: 10, bold: [1, 7, 8, 9, 10].includes(colIdx) };
      cell.alignment = { horizontal: colIdx === 3 ? 'left' : 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;

      if (colIdx === 7) cell.numFmt = '#,##0';
      if (colIdx === 8) cell.numFmt = '#,##0.00';
      if (colIdx === 9 && typeof val === 'number') cell.numFmt = '#,##0.0';
      if (colIdx === 10 && typeof val === 'number') cell.numFmt = '0.000';
    });
    pr++;
  });

  // Packing List Totals
  wsPack.getRow(pr).height = 24;
  wsPack.mergeCells(`A${pr}:F${pr}`);
  const packSumLbl = wsPack.getCell(`A${pr}`);
  packSumLbl.value = `GRAND TOTAL (${finalPallets} Pallets):`;
  packSumLbl.font = { name: 'Calibri', size: 10.5, bold: true };
  packSumLbl.alignment = { horizontal: 'right', vertical: 'middle' };

  wsPack.getCell(`G${pr}`).value = packTotalPcs;
  wsPack.getCell(`G${pr}`).numFmt = '#,##0';
  wsPack.getCell(`G${pr}`).font = { name: 'Calibri', size: 10.5, bold: true };
  wsPack.getCell(`G${pr}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsPack.getCell(`H${pr}`).value = Number(packTotalMtr.toFixed(2));
  wsPack.getCell(`H${pr}`).numFmt = '#,##0.00';
  wsPack.getCell(`H${pr}`).font = { name: 'Calibri', size: 10.5, bold: true };
  wsPack.getCell(`H${pr}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsPack.getCell(`I${pr}`).value = packTotalWeight > 0 ? Number(packTotalWeight.toFixed(1)) : 0;
  wsPack.getCell(`I${pr}`).numFmt = '#,##0.0';
  wsPack.getCell(`I${pr}`).font = { name: 'Calibri', size: 10.5, bold: true };
  wsPack.getCell(`I${pr}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsPack.getCell(`J${pr}`).value = Number(packTotalCbm.toFixed(3));
  wsPack.getCell(`J${pr}`).numFmt = '0.000';
  wsPack.getCell(`J${pr}`).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.emeraldText } };
  wsPack.getCell(`J${pr}`).alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= 10; c++) {
    const cell = wsPack.getCell(pr, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.borderDark } },
      bottom: { style: 'medium', color: { argb: COLORS.borderDark } },
      left: { style: 'thin', color: { argb: COLORS.borderDark } },
      right: { style: 'thin', color: { argb: COLORS.borderDark } }
    };
  }

  // Generate buffer and return as Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Triggers instant browser download of the PDF-matched Excel file
 */
export async function downloadPoptopInvoiceExcelFile(
  invoice: AiyaraInvoice,
  fileNamePrefix: string = 'POPTOP_Commercial_Invoice'
): Promise<void> {
  const blob = await generatePoptopInvoiceExcel(invoice);
  const safePo = (invoice.invoiceNo || 'PO_Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${fileNamePrefix}_${safePo}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
