import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker in Vite
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
} catch (e) {
  console.warn('PDF worker setup:', e);
}

export interface ExtractedQuestionItem {
  id: number;
  type: string;
  hi: string;
  en: string;
  options: string[];
  ans: string;
  explanation: string;
  exam: string;
}

/**
 * Smart Question Parser: Parses any OCR or raw text stream into structured UPSC questions
 */
export function parseTextIntoUPSCQuestions(rawText: string, defaultExam = 'UPSC 2026'): ExtractedQuestionItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Split into question blocks using common exam question delimiters
  // e.g. Q.1, Q 1, Question 1, प्रश्न 1, 1., (1), etc.
  const regexDelimiter = /(?:^|\n+)(?=(?:Q\.?\s*\d+|Question\s*\d+|प्रश्न\s*[:\.]?\s*\d+|\b\d{1,3}[\.\)]\s+))/i;
  let blocks = rawText.split(regexDelimiter).map(b => b.trim()).filter(b => b.length > 5);

  if (blocks.length === 0) {
    // Fallback: split by double newline
    blocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 5);
  }

  if (blocks.length === 0) {
    blocks = [rawText.trim()];
  }

  const results: ExtractedQuestionItem[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let hiText = '';
    let enText = '';
    let options: string[] = [];
    let ans = 'a';
    let explanation = '';
    let exam = defaultExam;

    // First, look for options across the entire block
    // Options pattern: (a) ... (b) ... (c) ... (d) ...
    // or A) ... B) ... C) ... D) ...
    // or (A) ... (B) ... (C) ... (D) ...
    const fullBlock = block.replace(/\r/g, '');
    
    // Check if block has inline options: (a) ... (b) ... (c) ... (d) ...
    const optionMatches = fullBlock.match(/\([a-dA-D]\)[^()]*(?=\([a-dA-D]\)|$|Ans|उत्तर|व्याख्या|Explanation)/g);
    if (optionMatches && optionMatches.length >= 2) {
      options = optionMatches.map(o => o.trim()).slice(0, 4);
    } else {
      // Try letter dot options: A. ... B. ... C. ... D. ...
      const letterMatches = fullBlock.match(/(?:^|\s)[a-dA-D][\.\)][^a-dA-D\.\)]*(?=(?:^|\s)[a-dA-D][\.\)]|$|Ans|उत्तर|व्याख्या)/g);
      if (letterMatches && letterMatches.length >= 2) {
        options = letterMatches.map(o => `(${o.trim().substring(0, 1).toLowerCase()}) ${o.trim().substring(2).trim()}`).slice(0, 4);
      }
    }

    // Process lines for question text, answer, exam and explanation
    lines.forEach(line => {
      // Answer pattern
      const ansMatch = line.match(/(?:Ans(?:wer)?|उत्तर|सही उत्तर)[\s:]*\(?([a-dA-D])\)?/i);
      if (ansMatch) {
        ans = ansMatch[1].toLowerCase();
        return;
      }

      // Explanation pattern
      const explMatch = line.match(/(?:Explanation|व्याख्या|हल|समाधान)[\s:]*(.+)/i);
      if (explMatch) {
        explanation = explMatch[1].trim();
        return;
      }

      // Exam tag in brackets e.g. [UPSC CSAT 2025] or (UPSC Prelims)
      const examMatch = line.match(/\[([^\]]+)\]/);
      if (examMatch) {
        exam = examMatch[1].trim();
      }

      // Check if this line is an option line
      if (line.match(/\([a-dA-D]\)/i) || line.match(/^[a-dA-D][\.\)]\s+/i)) {
        return;
      }

      // Clean line from question prefix like "Q.1", "प्रश्न 1:"
      const cleanLine = line.replace(/^(?:Q\.?\s*\d+|Question\s*\d+|प्रश्न\s*[:\.]?\s*\d+|\b\d{1,3}[\.\)]\s*[:\.]?)\s*/i, '').trim();
      if (!cleanLine) return;

      // Distinguish Hindi vs English text
      const hasDevanagari = /[\u0900-\u097F]/.test(cleanLine);
      if (hasDevanagari) {
        hiText += (hiText ? ' ' : '') + cleanLine;
      } else {
        enText += (enText ? ' ' : '') + cleanLine;
      }
    });

    // If options are incomplete, fill standard 4 options
    if (options.length < 4) {
      const letters = ['a', 'b', 'c', 'd'];
      while (options.length < 4) {
        const l = letters[options.length];
        options.push(`(${l}) विकल्प ${l.toUpperCase()}`);
      }
    }

    // Default question text fallback
    if (!hiText && !enText) {
      hiText = block.substring(0, 200).trim();
    }
    if (!hiText && enText) {
      hiText = enText;
    }

    // Determine type
    let type = 'UPSC GS-1';
    const combinedText = (hiText + ' ' + enText).toLowerCase();
    if (combinedText.includes('प्रतिशत') || combinedText.includes('औसत') || combinedText.includes('ब्याज') || combinedText.includes('चाल') || combinedText.includes('संख्या') || combinedText.includes('अनुपात') || combinedText.includes('speed') || combinedText.includes('ratio')) {
      type = 'MATH-CSAT';
    } else if (combinedText.includes('संविधान') || combinedText.includes('अनुच्छेद') || combinedText.includes('संसद') || combinedText.includes('राष्ट्रपति') || combinedText.includes('article') || combinedText.includes('constitution')) {
      type = 'POLITY';
    } else if (combinedText.includes('इतिहास') || combinedText.includes('मौर्य') || combinedText.includes('मुगल') || combinedText.includes('आंदोलन') || combinedText.includes('history')) {
      type = 'HISTORY';
    } else if (combinedText.includes('भूगोल') || combinedText.includes('नदी') || combinedText.includes('पर्वत') || combinedText.includes('मानसून') || combinedText.includes('geography')) {
      type = 'GEOGRAPHY';
    } else if (combinedText.includes('अर्थव्यवस्था') || combinedText.includes('जीडीपी') || combinedText.includes('मुद्रास्फीति') || combinedText.includes('rbi') || combinedText.includes('economy')) {
      type = 'ECONOMY';
    } else if (combinedText.includes('पर्यावरण') || combinedText.includes('जैव विविधता') || combinedText.includes('राष्ट्रीय उद्यान') || combinedText.includes('climate')) {
      type = 'ENVIRONMENT';
    }

    results.push({
      id: Date.now() + idx,
      type,
      hi: hiText.trim(),
      en: enText.trim(),
      options: options.slice(0, 4),
      ans: ans.toLowerCase(),
      explanation: explanation || `${exam} के प्रमाणिक उत्तर के अनुसार सटीक विकल्प (${ans.toUpperCase()}) है।`,
      exam
    });
  });

  return results;
}

/**
 * Extract text from digital PDF using pdfjs-dist
 */
export async function extractTextFromPDFFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let fullText = '';
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items.map((item: any) => ('str' in item ? item.str : '')).filter(Boolean);
    const pageText = pageStrings.join(' ');
    fullText += `\n--- [Page ${i}] ---\n` + pageText;
  }

  return fullText.trim();
}

/**
 * Safely recognize text with Tesseract using 'hin+eng' with fallback to 'eng'
 */
async function recognizeSafe(
  imageSource: any, 
  onProgress?: (pct: number) => void
): Promise<string> {
  try {
    const res = await Tesseract.recognize(imageSource, 'hin+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      }
    });
    return res.data.text || '';
  } catch (err) {
    console.warn('hin+eng OCR language download or recognition failed, falling back to eng:', err);
    try {
      const resEng = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round((m.progress || 0) * 100));
          }
        }
      });
      return resEng.data.text || '';
    } catch (err2) {
      console.error('Safe OCR fallback error:', err2);
      return '';
    }
  }
}

/**
 * Render PDF pages to images and run Tesseract OCR on scanned/image-based PDFs
 */
export async function runOcrOnScannedPDF(
  file: File, 
  onProgress?: (msg: string, pct: number) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, 10); // Process up to 10 pages per upload for responsiveness

  let completeOcrText = '';

  for (let pIdx = 1; pIdx <= numPages; pIdx++) {
    onProgress?.(`स्कैन पृष्ठ ${pIdx}/${numPages} तैयार हो रहा है...`, Math.round(((pIdx - 1) / numPages) * 100));

    const page = await pdfDoc.getPage(pIdx);
    const viewport = page.getViewport({ scale: 1.6 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    await (page.render as any)({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to image data
    const pageImageDataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Run Tesseract OCR on the page image
    const pageText = await recognizeSafe(pageImageDataUrl, (pct) => {
      onProgress?.(`स्कैन पृष्ठ ${pIdx}/${numPages} OCR: ${pct}%`, Math.round(((pIdx - 1 + (pct / 100)) / numPages) * 100));
    });

    completeOcrText += `\n--- [Page ${pIdx}] ---\n` + pageText;
  }

  return completeOcrText.trim();
}

/**
 * Run OCR directly on image files (JPG, PNG, WEBP)
 */
export async function runOcrOnImageFile(
  file: File, 
  onProgress?: (msg: string, pct: number) => void
): Promise<string> {
  onProgress?.(`इमेज का OCR विश्लेषण हो रहा है: ${file.name}...`, 10);

  const text = await recognizeSafe(file, (pct) => {
    onProgress?.(`OCR विश्लेषण प्रगति: ${pct}%`, pct);
  });

  return text.trim();
}
