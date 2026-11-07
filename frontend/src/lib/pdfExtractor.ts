/**
 * High-accuracy PDF text extractor.
 * 1. Primary: FastAPI Backend /api/v1/interviews/extract-text (Python pypdf - 100% accurate, handles compression, fonts & encodings).
 * 2. Secondary browser fallback: Dynamic CDN or local parser loaded with /* @vite-ignore *\/ so Vite's import analysis never errors.
 * 3. Tertiary fallback: Native PDF binary string parser.
 */

import { getToken, API_BASE_URL } from "./api";

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\(.)/g, "$1");
}

export async function extractPdfText(file: File): Promise<string> {
  // Method 1: FastAPI Backend /api/v1/interviews/extract-text (Python pypdf)
  try {
    const formData = new FormData();
    formData.append("file", file);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/interviews/extract-text`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.text === "string" && data.text.trim().length > 20) {
        return data.text.trim();
      }
    }
  } catch (err) {
    console.warn("[pdfExtractor] Backend extraction error, falling back to browser:", err);
  }

  // Method 2: Browser dynamic PDF.js loader with /* @vite-ignore */ to avoid static Vite analysis failures
  if (typeof window !== "undefined") {
    try {
      const cdnUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
      const pdfjs: any = await import(/* @vite-ignore */ cdnUrl);
      if (pdfjs && pdfjs.getDocument) {
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        const buffer = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        const pageTexts: string[] = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          let lastY: number | null = null;
          let pageStr = "";

          for (const item of content.items as any[]) {
            const str = item.str || "";
            if (!str) continue;

            const y = item.transform ? item.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
              pageStr += "\n" + str;
            } else {
              pageStr += (pageStr.endsWith(" ") || str.startsWith(" ") ? "" : " ") + str;
            }
            lastY = y;
          }

          if (pageStr.trim()) pageTexts.push(pageStr.trim());
        }

        const combined = pageTexts.join("\n\n").trim();
        if (combined.length > 20) {
          return combined;
        }
      }
    } catch (browserErr) {
      console.warn("[pdfExtractor] Browser CDN pdfjs error:", browserErr);
    }
  }

  // Method 3: Native binary stream parsing: Extract strings from PDF object streams
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const latin1Text = new TextDecoder("latin1").decode(bytes);

    const extractedChunks: string[] = [];
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(latin1Text)) !== null) {
      const decoded = decodePdfString(match[1]);
      if (decoded.trim()) extractedChunks.push(decoded.trim());
    }

    const arrayTjRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = arrayTjRegex.exec(latin1Text)) !== null) {
      const inner = match[1];
      const stringParts = inner.match(/\(([^)]+)\)/g);
      if (stringParts) {
        const line = stringParts
          .map((s) => decodePdfString(s.slice(1, -1)))
          .join("");
        if (line.trim()) extractedChunks.push(line.trim());
      }
    }

    if (extractedChunks.length > 5) {
      return extractedChunks.join(" ").replace(/\s{2,}/g, " ").trim();
    }
  } catch (err) {
    console.warn("[pdfExtractor] Stream parse error:", err);
  }

  // Method 4: Fallback plain text read
  try {
    const rawText = await file.text();
    const clean = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{2,}/g, " ").trim();
    if (clean.length > 20) return clean;
  } catch {}

  return "";
}
