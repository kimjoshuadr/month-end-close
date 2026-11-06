import { NextResponse } from "next/server";
import { newRequestId } from "@/lib/ai/http";
import { parseLimiter } from "@/lib/ai/limits";
import { clientIp } from "@/lib/ai/rateLimit";
import { parseUpload } from "@/lib/parse/parse";
import { guardFiles, withTimeout } from "@/lib/parse/uploadGuard";

// Accept the packet files, classify each, and return the parsed packet.
export async function POST(req: Request) {
  const requestId = newRequestId();
  const limited = parseLimiter.check(clientIp(req));
  if (!limited.ok) {
    return NextResponse.json(
      { missing: [], errors: [`Too many requests. Try again in ${limited.retryAfterSec}s.`], requestId },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ missing: [], errors: ["Invalid upload request."], requestId }, { status: 400 });
    }
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const bufs = await Promise.all(files.map(async (f) => ({ name: f.name, buf: await f.arrayBuffer() })));
    const guard = guardFiles(bufs.map((f) => ({ name: f.name, size: f.buf.byteLength, head: new Uint8Array(f.buf.slice(0, 16)) })));
    if (!guard.ok) {
      return NextResponse.json({ missing: [], errors: [guard.message], requestId }, { status: guard.status });
    }
    const result = await withTimeout(parseUpload(bufs), 10_000);
    if (!result.packet && result.errors.length > 0 && result.missing.length === 3) {
      return NextResponse.json({ ...result, requestId }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const timedOut = e instanceof Error && /timed out/.test(e.message);
    console.error(requestId, "parse failed", timedOut ? "timeout" : e instanceof Error ? e.message : e);
    return NextResponse.json(
      { missing: [], errors: [timedOut ? "Parsing took too long. Try smaller files." : "Could not parse the upload."], requestId },
      { status: timedOut ? 504 : 500 }
    );
  }
}
