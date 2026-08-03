/**
 * PDF text extractor — client-side only (runs in browser, never sends file to server)
 *
 * Uses pdfjs-dist (Mozilla PDF.js) to extract text from PDF files directly
 * in the browser. No file upload, no server processing — the PDF stays on
 * the user's device.
 *
 * Thai text support: pdfjs-dist handles Thai encoding correctly, unlike
 * server-side libraries like pdf-parse which often produce garbled output
 * for Thai fonts.
 *
 * Usage:
 *   import { extractTextFromPDF } from '@/lib/pdf-extract';
 *   const text = await extractTextFromPDF(file);
 *   console.log(text);
 */

// Dynamic import — pdfjs-dist only works in browser (uses Web Workers)
// We import it inside the function so Next.js doesn't try to bundle it server-side
// Use 'unknown' + cast to avoid TS mismatch between our local type and pdfjs-dist's exported type
type AnyPdfDocument = {
  numPages: number;
  getPage: (pageNum: number) => Promise<{
    getTextContent: () => Promise<{
      items: Array<{ str: string; hasEOL?: boolean; transform?: number[] }>;
    }>;
  }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfJs(): Promise<any> {
  pdfjsPromise ??= import('pdfjs-dist');
  const pdfjs = await pdfjsPromise;
  configurePdfWorker(pdfjs);
  return pdfjs;
}

/** Configure the PDF.js Web Worker to use a CDN that matches the installed version. */
function configurePdfWorker(pdfjs: { version: string; GlobalWorkerOptions?: { workerSrc: string } }): void {
  if (typeof window === 'undefined' || !pdfjs.GlobalWorkerOptions) return;
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export interface PDFExtractResult {
  text: string;
  pageCount: number;
  fileName: string;
  fileSize: number;
}

export interface PDFExtractError {
  error: string;
  fileName: string;
}

/**
 * Extract text from a PDF File object in the browser.
 *
 * @param file — PDF File from <input type="file"> or drag-drop
 * @param onProgress — optional callback(page, total) for progress UI
 * @returns PDFExtractResult with concatenated text from all pages
 *
 * Throws Error if:
 *   - file is not a PDF
 *   - file is too large (>10MB client-side limit, well within browser memory)
 *   - pdfjs fails to load or parse
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (currentPage: number, totalPages: number) => void,
): Promise<PDFExtractResult> {
  validatePdfFile(file);

  try {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf: AnyPdfDocument = await loadingTask.promise;
    const fullText = await extractAllPages(pdf, onProgress);
    validateExtractedText(fullText);

    return {
      text: fullText.trim(),
      pageCount: pdf.numPages,
      fileName: file.name,
      fileSize: file.size,
    };
  } catch (err: unknown) {
    throw wrapPdfError(err);
  }
}

/** Validate file type, size, and non-emptiness. */
function validatePdfFile(file: File): void {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error(`ไฟล์ต้องเป็น PDF เท่านั้น (ได้รับ: ${file.type || 'unknown'})`);
  }
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error(`ไฟล์ใหญ่เกินไป (สูงสุด 10MB ได้รับ: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }
  if (file.size === 0) {
    throw new Error('ไฟล์ว่างเปล่า — อาจเสียหาย');
  }
}

/** Extract text from all pages, calling onProgress for each page. */
async function extractAllPages(
  pdf: AnyPdfDocument,
  onProgress?: (currentPage: number, totalPages: number) => void,
): Promise<string> {
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = buildPageText(textContent.items);
    const separator = i < pdf.numPages ? `\n\n--- หน้า ${i + 1} ---\n\n` : '';
    fullText += pageText + separator;
  }
  return fullText;
}

/** Reconstruct text from pdfjs text items, handling line breaks. */
function buildPageText(items: Array<{ str: string; hasEOL?: boolean; transform?: number[] }>): string {
  let text = '';
  let lastY: number | null = null;
  for (const item of items) {
    const str = item.str || '';
    if (!str) {
      if (item.hasEOL) text += '\n';
      continue;
    }
    if (item.transform && item.transform.length >= 6) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += '\n';
      }
      lastY = y;
    }
    text += str;
    if (item.hasEOL) {
      text += '\n';
      lastY = null;
    }
  }
  return text;
}

/** Validate that extracted text is not empty (could be scanned PDF). */
function validateExtractedText(text: string): void {
  if (!text.trim()) {
    throw new Error('ไม่พบข้อความใน PDF — อาจเป็น PDF ที่เป็นภาพสแกน (scanned PDF). กรุณาใช้ PDF ที่มีข้อความจริง ไม่ใช่ภาพ');
  }
}

/** Wrap pdfjs errors with user-friendly Thai messages. */
function wrapPdfError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('ไฟล์')) {
    return err instanceof Error ? err : new Error(message);
  }
  const errName = (err as { name?: string }).name;
  if (errName === 'PasswordException') {
    return new Error('PDF นี้มีรหัสผ่าน — กรุณาถอดรหัสก่อนอัปโหลด');
  }
  if (errName === 'InvalidPDFException') {
    return new Error('ไฟล์ PDF เสียหายหรือไม่ใช่ PDF ที่ถูกต้อง');
  }
  return new Error(`ไม่สามารถอ่าน PDF ได้: ${message}`);
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
