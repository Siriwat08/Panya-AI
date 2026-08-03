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
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist');
  }
  const pdfjs = await pdfjsPromise;
  // Configure worker — use CDN worker that matches the installed version
  // This avoids bundling issues with Next.js
  if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
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
  // Validate file type
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error(`ไฟล์ต้องเป็น PDF เท่านั้น (ได้รับ: ${file.type || 'unknown'})`);
  }

  // Validate file size (10MB client-side limit — browser memory, not server)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error(`ไฟล์ใหญ่เกินไป (สูงสุด 10MB ได้รับ: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  if (file.size === 0) {
    throw new Error('ไฟล์ว่างเปล่า — อาจเสียหาย');
  }

  try {
    const pdfjs = await loadPdfJs();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf: AnyPdfDocument = await loadingTask.promise;

    // Extract text from each page
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      if (onProgress) onProgress(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Build text from items — pdfjs returns text items with positions
      // We reconstruct lines based on hasEOL markers + vertical position changes
      let pageText = '';
      let lastY: number | null = null;
      for (const item of textContent.items) {
        const str = item.str || '';
        if (!str) {
          if (item.hasEOL) pageText += '\n';
          continue;
        }

        // Check if this item is on a new line (different Y position)
        if (item.transform && item.transform.length >= 6) {
          const y = item.transform[5];
          if (lastY !== null && Math.abs(y - lastY) > 2) {
            pageText += '\n';
          }
          lastY = y;
        }

        pageText += str;
        if (item.hasEOL) {
          pageText += '\n';
          lastY = null;
        }
      }

      fullText += pageText + (i < pdf.numPages ? '\n\n--- หน้า ' + (i + 1) + ' ---\n\n' : '');
    }

    if (!fullText.trim()) {
      throw new Error('ไม่พบข้อความใน PDF — อาจเป็น PDF ที่เป็นภาพสแกน (scanned PDF). กรุณาใช้ PDF ที่มีข้อความจริง ไม่ใช่ภาพ');
    }

    return {
      text: fullText.trim(),
      pageCount: pdf.numPages,
      fileName: file.name,
      fileSize: file.size,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Re-throw our custom errors
    if (message.includes('ไฟล์')) {
      throw err instanceof Error ? err : new Error(message);
    }
    // Handle pdfjs errors
    const errName = (err as { name?: string }).name;
    if (errName === 'PasswordException') {
      throw new Error('PDF นี้มีรหัสผ่าน — กรุณาถอดรหัสก่อนอัปโหลด');
    }
    if (errName === 'InvalidPDFException') {
      throw new Error('ไฟล์ PDF เสียหายหรือไม่ใช่ PDF ที่ถูกต้อง');
    }
    // Generic error
    throw new Error(`ไม่สามารถอ่าน PDF ได้: ${message}`);
  }
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
