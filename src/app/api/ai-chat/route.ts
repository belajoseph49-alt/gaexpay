import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

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
        ...(messages || []).map((m: any) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process that. Please try again.";

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("AI chat error:", e);
    return NextResponse.json(
      { reply: "I'm having trouble connecting right now. Please try again in a moment, or contact our human support team." },
      { status: 200 },
    );
  }
}
