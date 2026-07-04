"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Copy, Check, Globe, Briefcase, DollarSign, Euro, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function VirtualAccountsView() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generateAccount(currency: "USD" | "EUR") {
    setGenerating(true);
    try {
      const res = await fetch("/api/virtual-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setAccounts([...accounts, d.account]);
      toast.success(`${currency} virtual account created!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create account");
    } finally {
      setGenerating(false);
    }
  }

  function copyField(field: string, value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(field);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 2000);
  }

  const useCases = [
    { icon: Briefcase, title: "Upwork Payouts", desc: "Get paid directly from Upwork to your virtual account" },
    { icon: Globe, title: "Fiverr Earnings", desc: "Receive Fiverr payouts in USD or EUR" },
    { icon: DollarSign, title: "Client Invoices", desc: "Add account details to your invoices" },
    { icon: Euro, title: "YouTube Revenue", desc: "Receive AdSense payments" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Virtual Accounts</h1>
        <p className="text-sm text-muted-foreground">Get your own USD & EUR account details for freelancer payouts</p>
      </div>

      {/* Generate buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => generateAccount("USD")} disabled={generating}>
          <DollarSign className="h-4 w-4 mr-2" /> Generate USD Account
        </Button>
        <Button variant="outline" onClick={() => generateAccount("EUR")} disabled={generating}>
          <Euro className="h-4 w-4 mr-2" /> Generate EUR Account
        </Button>
      </div>

      {/* Account cards */}
      {accounts.map((acc, i) => (
        <motion.div key={acc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{acc.currency} Virtual Account</h3>
                  <p className="text-xs text-muted-foreground">GaexPay Banking Partner</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-0">Active</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {acc.currency === "USD" ? (
                <>
                  <Field label="Account Number" value={acc.accountNumber} field="an" copied={copied} onCopy={copyField} />
                  <Field label="Routing Number" value={acc.routingNumber} field="rn" copied={copied} onCopy={copyField} />
                  <Field label="Bank Name" value="GaexPay Federal Bank" field="bn" copied={copied} onCopy={copyField} />
                  <Field label="SWIFT Code" value="GXPYUS33" field="sw" copied={copied} onCopy={copyField} />
                </>
              ) : (
                <>
                  <Field label="IBAN" value={acc.iban} field="ib" copied={copied} onCopy={copyField} />
                  <Field label="BIC/SWIFT" value="GXPYDEFF" field="bic" copied={copied} onCopy={copyField} />
                  <Field label="Bank Name" value="GaexPay Bank Europe" field="bne" copied={copied} onCopy={copyField} />
                  <Field label="Account Holder" value={acc.holderName} field="hn" copied={copied} onCopy={copyField} />
                </>
              )}
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Use cases */}
      <div>
        <h3 className="font-semibold mb-3">Use Cases</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <motion.div key={uc.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="p-4 hover:shadow-md transition">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">{uc.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{uc.desc}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, field, copied, onCopy }: any) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm font-mono truncate">{value}</code>
        <button onClick={() => onCopy(field, value)} className="text-muted-foreground hover:text-primary transition">
          {copied === field ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
