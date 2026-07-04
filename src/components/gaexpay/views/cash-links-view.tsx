"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, Check, Share2, QrCode, Send, Mail, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { CURRENCIES } from "@/lib/gaexpay";
import { useFormatMoney } from "@/hooks/use-format-money";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CashLinksView() {
  const { data, reload } = useFetch<{ links: any[] }>("/api/cash-links");
  const { fmt } = useFormatMoney();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const links = data?.links ?? [];

  async function createLink() {
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/cash-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), currency, note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast.success("Cash link created!");
      setAmount(""); setNote("");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to create link");
    } finally {
      setCreating(false);
    }
  }

  function copyLink(token: string) {
    const url = `https://gaexpay.com/claim/${token}`;
    navigator.clipboard?.writeText(url);
    setCopied(token);
    toast.success("Link copied");
    setTimeout(() => setCopied(null), 2000);
  }

  function shareLink(token: string, platform: string) {
    const url = `https://gaexpay.com/claim/${token}`;
    const text = encodeURIComponent(`You've received money on GaexPay! Claim it here: ${url}`);
    const map: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      email: `mailto:?subject=${encodeURIComponent("You've received money on GaexPay")}&body=${text}`,
    };
    window.open(map[platform], "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cash Links</h1>
        <p className="text-sm text-muted-foreground">Send money to anyone with a shareable link — no account needed to claim</p>
      </div>

      {/* Create */}
      <Card className="max-w-xl p-6">
        <h3 className="font-semibold mb-4">Create a Cash Link</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="flex-1 text-lg font-bold" />
          </div>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional) — e.g. Dinner split, gift" />
          <Button className="w-full" onClick={createLink} disabled={creating}>
            {creating ? "Creating..." : <><Plus className="h-4 w-4 mr-2" /> Create Cash Link</>}
          </Button>
        </div>
      </Card>

      {/* Active links */}
      <div>
        <h3 className="font-semibold mb-3">Your Cash Links ({links.length})</h3>
        {links.length === 0 ? (
          <Card className="p-8 text-center">
            <Link2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No cash links yet. Create one above to send money to anyone.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {links.map((link, i) => (
              <motion.div key={link.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Link2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{link.currency} {link.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{link.note || "No note"}</p>
                      </div>
                    </div>
                    <Badge variant={link.status === "active" ? "default" : link.status === "claimed" ? "secondary" : "outline"}>
                      {link.status === "active" && <><Clock className="h-3 w-3 mr-1" /> Active</>}
                      {link.status === "claimed" && <><CheckCircle2 className="h-3 w-3 mr-1" /> Claimed</>}
                      {link.status === "expired" && <><XCircle className="h-3 w-3 mr-1" /> Expired</>}
                    </Badge>
                  </div>
                  {link.status === "active" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyLink(link.token)}>
                        {copied === link.token ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copied === link.token ? "Copied" : "Copy"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => shareLink(link.token, "whatsapp")}><Send className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
                      <Button size="sm" variant="outline" onClick={() => shareLink(link.token, "telegram")}><Send className="h-3.5 w-3.5 mr-1" /> Telegram</Button>
                      <Button size="sm" variant="outline" onClick={() => shareLink(link.token, "twitter")}><Share2 className="h-3.5 w-3.5 mr-1" /> Twitter</Button>
                      <Button size="sm" variant="outline" onClick={() => shareLink(link.token, "email")}><Mail className="h-3.5 w-3.5 mr-1" /> Email</Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
