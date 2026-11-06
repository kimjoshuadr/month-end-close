import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { compute } from "../lib/engine";
import { fluxReview } from "../lib/engine/flux";
import { septFigures } from "../lib/engine/statements";
import { buildCloseWorkbook, CLOSE_SHEETS } from "../lib/export/statementsXlsx";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

describe("buildCloseWorkbook", () => {
  it("has one sheet per statement with numeric cells", async () => {
    const computed = compute(await packet(), {}, {});
    const flux = fluxReview(septFigures(computed.adjTb));
    const wb = buildCloseWorkbook(computed, flux, {}, null);
    expect(wb.SheetNames).toEqual(CLOSE_SHEETS);
    const is = wb.Sheets["IS Month"];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(is, { header: 1 });
    expect(rows[0][0]).toBe("Line");
    // Data rows carry numeric whole-dollar cells.
    const totalRow = rows.find((r) => r[0] === "Total Sales")!;
    expect(typeof totalRow[1]).toBe("number");
    expect(Number.isInteger(totalRow[1])).toBe(true);
    expect(totalRow[1]).toBe(91500);
    const fluxSheet = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Flux Review"], { header: 1 });
    expect(fluxSheet[0]).toContain("Explanation");
    expect(fluxSheet.length).toBe(17);
  });
  it("rounds like the screen and carries the sign-off", async () => {
    const computed = compute(await packet(), {}, {});
    const flux = fluxReview(septFigures(computed.adjTb));
    const wb = buildCloseWorkbook(computed, flux, { Wages: "Accrual." }, { preparedBy: "Dana", reviewedBy: "Kim", at: "2026-10-05T12:00:00.000Z" });
    const cover = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Cover"], { header: 1 });
    const prep = cover.find((r) => r[0] === "Prepared by")!;
    expect(prep[1]).toBe("Dana");
    expect(cover.find((r) => r[0] === "Reviewed by")![1]).toBe("Kim");
    const fluxSheet = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Flux Review"], { header: 1 });
    const wages = fluxSheet.find((r) => r[0] === "Wages")!;
    expect(wages[wages.length - 1]).toBe("Accrual.");
  });
});
