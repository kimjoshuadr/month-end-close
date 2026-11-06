import { NextResponse } from "next/server";
import { mapReply } from "@/lib/reply/mapReply";
import type { FlagOption } from "@/lib/types";

// Map a typed reply to an option/amount; DeepSeek only when keywords fail.
export async function POST(req: Request) {
  const { flagId, text, options } = (await req.json()) as { flagId: string; text: string; options: FlagOption[] };
  if (typeof text !== "string" || !text.trim()) return NextResponse.json({ explanation: "Type a reply first." });
  const mapped = mapReply(flagId, text, options ?? []);
  if (mapped.option !== undefined || mapped.amount !== undefined || !process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(mapped.option !== undefined || mapped.amount !== undefined ? mapped : { explanation: "Pick an option above." });
  }
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `Map the accountant's reply to one of these option ids: ${(options ?? []).map((o) => o.id).join(", ")}. Return JSON {"option": id|null, "amount": number|null}.` },
          { role: "user", content: text.slice(0, 2000) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(data.choices[0].message.content) as { option?: string; amount?: number };
    const valid = (options ?? []).some((o) => o.id === parsed.option);
    return NextResponse.json({ option: valid ? parsed.option : undefined, amount: parsed.amount, explanation: "Interpreted with DeepSeek." });
  } catch (e) {
    return NextResponse.json({ explanation: `AI mapping unavailable (${(e as Error).message}). Pick an option above.` });
  }
}
