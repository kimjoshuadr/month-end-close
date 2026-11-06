import { NextResponse } from "next/server";
import { parseUpload } from "@/lib/parse/parse";

// Accept the packet files, classify each, and return the parsed packet.
export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const result = await parseUpload(
    await Promise.all(files.map(async (f) => ({ name: f.name, buf: await f.arrayBuffer() })))
  );
  return NextResponse.json(result);
}
