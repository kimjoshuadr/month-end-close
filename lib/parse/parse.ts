import { parseWorkbook } from "./workbook";
import { classifyFile, parseSupportingPdf } from "./pdfs";
import { deepseekExtract } from "./fallback";
import type { Packet } from "../types";

export type ParsedUpload = { packet?: Packet; missing: string[]; errors: string[]; usedFallback: boolean };

// Classify and parse one batch of uploaded files.
export async function parseUpload(files: { name: string; buf: ArrayBuffer; head?: string }[]): Promise<ParsedUpload> {
  const partial: Partial<Packet> = {};
  const missing: string[] = [];
  const errors: string[] = [];
  let usedFallback = false;

  for (const f of files) {
    let head = f.head ?? f.name;
    if (/\.pdf$/i.test(f.name) && !f.head) {
      try {
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(f.buf));
        const { text } = await extractText(pdf, { mergePages: true });
        head = `${f.name}\n${(text as string).slice(0, 2000)}`;
      } catch {
        // Fall through to name-based classification.
      }
    }
    const kind = classifyFile(f.name, head);
    try {
      if (kind === "workbook") Object.assign(partial, parseWorkbook(f.buf));
      else if (kind === "support") Object.assign(partial, await parseSupportingPdf(f.buf));
      else if (kind === "august") continue; // Prior-period source is hardcoded in lib/reference.
      else errors.push(`${f.name}: not a recognized packet file`);
    } catch (e) {
      try {
        await deepseekExtract(head, "packet");
        usedFallback = true;
        errors.push(`${f.name}: parsed with AI fallback`);
      } catch {
        errors.push(`${f.name}: ${(e as Error).message}. No DEEPSEEK_API_KEY fallback available.`);
      }
    }
  }

  if (!partial.tb) missing.push("workbook");
  if (!partial.bank) missing.push("supporting-documents");
  return { packet: missing.length ? undefined : (partial as Packet), missing, errors, usedFallback };
}
