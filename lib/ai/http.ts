// Reading a JSON body never throws: malformed JSON becomes a 400, never a 500.

export async function readJsonBody(req: { json(): Promise<unknown> }): Promise<
  | { ok: true; data: unknown }
  | { ok: false; status: 400; message: string }
> {
  try {
    return { ok: true, data: await req.json() };
  } catch {
    return { ok: false, status: 400, message: "Request body must be valid JSON." };
  }
}

// Opaque id attached to every API error response and server log line so a
// failure can be traced without leaking stacks or upstream bodies.
export function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
