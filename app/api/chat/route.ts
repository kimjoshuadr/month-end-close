import { NextResponse } from "next/server";

const SYSTEM = `You are the assistant inside Greenline Landscape Co.'s month-end close tool. You receive the current draft entries, open items, tie-outs, and statement totals as JSON context.
Rules: explain and cite the provided numbers and sources; never invent numbers (all figures come from deterministic code shown in the context); say when you are unsure; you cannot change entries yourself — tell the accountant which button or amount field to use. Keep answers short and plain-spoken.`;

// Chat over the current close context. DeepSeek only; no key -> 503.
export async function GET() {
  return NextResponse.json({ enabled: !!process.env.DEEPSEEK_API_KEY });
}

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ message: "Ask AI is disabled: DEEPSEEK_API_KEY is not set. The tool works fully with the option buttons." }, { status: 503 });
  }
  const { messages, context } = (await req.json()) as { messages: { role: string; content: string }[]; context: unknown };
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: `Context:\n${JSON.stringify(context).slice(0, 10000)}` }, ...(messages ?? []).slice(-10)],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (e) {
    return NextResponse.json({ message: `Ask AI is unavailable (${(e as Error).message}). The tool works fully with the option buttons.` }, { status: 502 });
  }
}
