import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, MAX_FILES, guardFiles, withTimeout } from "../lib/parse/uploadGuard";

const head = (s: string): Uint8Array => new TextEncoder().encode(s);
const pdf = (extra = "1 0 obj"): Uint8Array => head(`%PDF-1.4\n${extra}`);
const zip = (): Uint8Array => Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const exe = (): Uint8Array => Uint8Array.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0]);

describe("guardFiles", () => {
  it("accepts well-formed pdf, xlsx, txt, and csv", () => {
    expect(guardFiles([
      { name: "a.pdf", size: 10, head: pdf() },
      { name: "b.xlsx", size: 10, head: zip() },
      { name: "c.txt", size: 10, head: head("hello") },
    ]).ok).toBe(true);
    expect(guardFiles([{ name: "d.csv", size: 10, head: head("a,b") }]).ok).toBe(true);
  });
  it("rejects oversized files and batches over the file cap", () => {
    const big = guardFiles([{ name: "a.pdf", size: MAX_FILE_BYTES + 1, head: pdf() }]);
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.status).toBe(413);
    const many = guardFiles(Array.from({ length: MAX_FILES + 1 }, (_, i) => ({ name: `${i}.pdf`, size: 10, head: pdf() })));
    expect(many.ok).toBe(false);
    if (!many.ok) expect(many.status).toBe(413);
  });
  it("rejects unknown extensions and magic-byte mismatches", () => {
    const ext = guardFiles([{ name: "a.exe", size: 10, head: exe() }]);
    expect(ext.ok).toBe(false);
    if (!ext.ok) expect(ext.status).toBe(415);
    const renamed = guardFiles([{ name: "evil.pdf", size: 10, head: exe() }]);
    expect(renamed.ok).toBe(false);
    if (!renamed.ok) expect(renamed.status).toBe(415);
    const badZip = guardFiles([{ name: "fake.xlsx", size: 10, head: head("not a zip at all") }]);
    expect(badZip.ok).toBe(false);
    const nul = guardFiles([{ name: "a.txt", size: 10, head: Uint8Array.from([0x41, 0x00, 0x42]) }]);
    expect(nul.ok).toBe(false);
  });
});

describe("withTimeout", () => {
  it("resolves fast work and rejects slow work", async () => {
    await expect(withTimeout(Promise.resolve(1), 1000)).resolves.toBe(1);
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toThrow(/timed out/);
  });
});
