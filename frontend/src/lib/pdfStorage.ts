import { getCurrentUserId } from "./api";

const DB_NAME = "InterviewIQ_ResumeStore";
const STORE_NAME = "resumes";

export function getPdfKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `active_resume_pdf_${uid}` : null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStoredPdf(file: File, userId?: string): Promise<void> {
  const key = getPdfKey(userId);
  if (!key) return;
  try {
    const db = await openDb();
    const arrayBuffer = await file.arrayBuffer();
    const record = {
      buffer: arrayBuffer,
      filename: file.name,
      type: file.type || "application/pdf",
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[pdfStorage] Failed to save PDF to IndexedDB:", err);
  }
}

export async function getStoredPdf(userId?: string): Promise<{ blob: Blob; filename: string } | null> {
  const key = getPdfKey(userId);
  if (!key) return null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (val && val.buffer) {
          const blob = new Blob([val.buffer], { type: val.type || "application/pdf" });
          resolve({ blob, filename: val.filename || "resume.pdf" });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[pdfStorage] Failed to retrieve PDF from IndexedDB:", err);
    return null;
  }
}

export async function clearStoredPdf(userId?: string): Promise<void> {
  const key = getPdfKey(userId);
  if (!key) return;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}
