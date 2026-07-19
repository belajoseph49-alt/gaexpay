import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/gaexpay";
import { ShieldCheck, CreditCard, Wallet } from "lucide-react";
import Link from "next/link";

export default function PaymentRequestPage({ params }: { params: { link: string } }) {
  const link = params.link;
  
  // Parse the link, e.g. NGN1500-xyz
  const currencyMatch = link.match(/^[A-Z]{3}/);
  const currency = currencyMatch ? currencyMatch[0] : "NGN";
  
  const amountMatch = link.match(/[A-Z]{3}(\d+(\.\d+)?)-/);
  const amountStr = amountMatch ? amountMatch[1] : "0";
  const amount = Number(amountStr);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md p-6 sm:p-8 border-border/60 shadow-premium-sm text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-primary/10">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        
        <h2 className="text-xl font-bold mb-1">Payment Request</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You have been requested to pay securely via GaexPay.
        </p>
        
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Amount Due</p>
          <p className="text-4xl font-black tabular-nums tracking-tight">
            {formatMoney(amount, currency)}
          </p>
        </div>
        
        <div className="space-y-3">
          <Button className="w-full h-14 rounded-xl text-base shadow-premium-sm" asChild>
            <Link href={`/login?redirect=/pay/req/${link}`}>
              <Wallet className="mr-2 h-5 w-5" /> Pay with GaexPay Wallet
            </Link>
          </Button>
          <Button variant="outline" className="w-full h-14 rounded-xl text-base" onClick={() => alert('Paystack integration coming soon!')}>
            <CreditCard className="mr-2 h-5 w-5" /> Pay with Card
          </Button>
        </div>
        
        <p className="mt-6 text-xs text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Encrypted & Secure
        </p>
      </Card>
    </div>
  );
}
