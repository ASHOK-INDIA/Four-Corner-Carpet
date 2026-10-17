import PptxGenJS from 'pptxgenjs';
import jsPDF from 'jspdf';
import { VoiceRugItem } from '../types';

export async function downloadRugCataloguePptx(items: VoiceRugItem[], title: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const company = (window as any).selectedCompany || 'Four Corners Carpets';

  async function getDominantColor(url: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx!.drawImage(img, 0, 0, 1, 1);
        const data = ctx!.getImageData(0, 0, 1, 1).data;
        const hex = ((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1).toUpperCase();
        resolve(hex);
      };
      img.src = url;
    });
  }

  for (const item of items) {
    const slide = pptx.addSlide();
    const bgColor = item.photoUrl ? await getDominantColor(item.photoUrl) : 'FFFFFF';
    slide.background = { color: bgColor };

    // Watermark Brand Name
    slide.addText(company, { x: 0, y: 0, w: '100%', h: '100%', fontSize: 60, bold: true, color: 'FFFFFF', opacity: 0.1, align: 'center', valign: 'middle' });

    // Full Screen Image (takes most of the left/center)
    if (item.photoUrl) {
      slide.addImage({ path: item.photoUrl, x: 0, y: 0, w: '70%', h: '70%' });
    }

    // Text on Right
    const details = [
      `Title: ${item.title || 'Rug Design'}`,
      `Size: ${item.size || 'N/A'}`,
      `Material: ${item.material || 'N/A'}`,
      `Construction: ${item.construction || 'N/A'}`,
      `Price: ${item.priceEstimate || 'N/A'}`
    ];
    slide.addText(details.join('\n\n'), { x: '72%', y: '20%', w: '28%', fontSize: 18, color: 'FFFFFF', bold: true });
  }

  await pptx.writeFile({ fileName: `${title}.pptx` });
}

export function openPrintablePdfCatalogue(items: VoiceRugItem[], title: string = 'Rug Catalogue'): void {
  const doc = new jsPDF();
  const company = (window as any).selectedCompany || 'Four Corners Carpets';

  items.forEach((item, index) => {
    if (index > 0) doc.addPage();
    
    // Background Color (simulated by drawing a rectangle)
    // Note: jsPDF doesn't natively detect dominant color easily without canvas, 
    // keeping white background for PDF stability.
    
    // Watermark Company Name
    doc.setFontSize(80);
    doc.setTextColor(240, 240, 240);
    doc.text(company, 105, 148, { align: 'center', angle: 45 });
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(company, 20, 20);
    
    if (item.photoUrl) {
      try {
        // Wider Image, centered, taller
        const width = 170;
        const height = 140; // Increased height
        doc.addImage(item.photoUrl, 'JPEG', 20, 30, width, height);
        
        // Text below image
        doc.setFontSize(16);
        doc.text(`Title: ${item.title || 'Rug'}`, 20, 180);
        doc.text(`Size: ${item.size || 'N/A'}`, 20, 190);
        doc.text(`Material: ${item.material || 'N/A'}`, 20, 200);
        doc.text(`Construction: ${item.construction || 'N/A'}`, 20, 210);
      } catch (e) {
        doc.text(`Image Load Error`, 20, 30);
      }
    }
  });

  doc.save('Catalogue.pdf');
}
