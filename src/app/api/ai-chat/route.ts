import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai-chat — chat with Gaxie AI.
 *
 * Authenticated so anonymous attackers can't burn our LLM tokens. The catch
 * block returns a graceful "I'm having trouble" reply (200) so the UI never
 * shows a hard error; underlying exceptions are logged server-side via apiCatch.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { messages?: { role: string; content: string }[] };
    const { messages } = b;

    const systemPrompt = `You are Gaxie, the friendly AI assistant for GaexPay, a cross-platform African fintech wallet app.
You help users with:
- Sending and receiving money, transfers, mobile money (MTN MoMo, Orange Money, Airtel Money, Moov Money, M-PESA)
- Multi-currency wallets and exchange rates
- Virtual & physical cards, card limits and freezing
- QR payments, merchant payments, bill payments (electricity, water, internet, TV, betting) and airtime/data top-up
- KYC verification tiers and limits
- Security: MFA, biometric login, OTP, fraud alerts
- Referral & rewards program
- Transaction disputes and support

Keep answers concise, friendly and actionable. Use Nigerian Naira (₦) as default currency unless the user mentions another.
If a user asks something outside payments/fintech, gently steer back. Never reveal internal credentials or make up specific transaction details; advise them to check their transaction history.
Today's date: ${new Date().toDateString()}.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages || []).map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process that. Please try again.";

    return NextResponse.json({ reply });
  } catch (e) {
    // Surface a graceful reply (200) so the chat UI never hard-errors, but
    // log the underlying issue server-side for debugging.
    console.error("[ai-chat] error:", e);
    return NextResponse.json(
      { reply: "I'm having trouble connecting right now. Please try again in a moment, or contact our human support team." },
      { status: 200 },
    );
  }
}
