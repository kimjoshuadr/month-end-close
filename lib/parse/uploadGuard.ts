// Trust boundary for uploads: size, count, extension, and magic bytes are
// checked before any parser touches the bytes. Corrupt-but-plausible files
// still fail inside parseUpload, which reports per-file errors.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 3;

export type GuardReject = { ok: false; status: 413 | 415; message: string };

const OFFICE_EXT = new Set([".xlsx", ".xls"]);
const TEXT_EXT = new Set([".txt", ".csv"]);

function extOf(name: string): string {
  const i = name.toLowerCase().lastIndexOf(".");
  return i >= 0 ? name.toLowerCase().slice(i) : "";
}

function startsWith(head: Uint8Array, bytes: number[]): boolean {
  return bytes.every((b, i) => head[i] === b);
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // legacy .xls

export function guardFiles(files: { name: string; size: number; head: Uint8Array }[]): { ok: true } | GuardReject {
  if (files.length > MAX_FILES) {
    return { ok: false, status: 413, message: `Too many files: at most ${MAX_FILES} per upload.` };
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return { ok: false, status: 413, message: `"${f.name}" exceeds the 5 MB per-file limit.` };
    }
    const ext = extOf(f.name);
    if (ext === ".pdf") {
      if (!startsWith(f.head, PDF_MAGIC)) return { ok: false, status: 415, message: `"${f.name}" is not a recognized packet file (content does not match .pdf).` };
    } else if (OFFICE_EXT.has(ext)) {
      if (!startsWith(f.head, ZIP_MAGIC) && !startsWith(f.head, OLE_MAGIC)) {
        return { ok: false, status: 415, message: `"${f.name}" is not a recognized packet file (content does not match a workbook).` };
      }
    } else if (TEXT_EXT.has(ext)) {
      if (f.head.slice(0, 1024).some((b) => b === 0)) {
        return { ok: false, status: 415, message: `"${f.name}" is not a recognized packet file (not plain text).` };
      }
    } else {
      return { ok: false, status: 415, message: `"${f.name}" is not a recognized packet file (accepted: .xlsx, .pdf, .txt, .csv).` };
    }
  }
  return { ok: true };
}

// Rejects if the parse does not settle in time. Note: synchronous parsing
// still occupies the event loop; the size cap above is what bounds that work.
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Parse timed out after ${ms / 1000}s.`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
