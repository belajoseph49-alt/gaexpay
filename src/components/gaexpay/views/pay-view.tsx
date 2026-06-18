"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  QrCode, ScanLine, Receipt, Smartphone, Zap, Tv, Wifi, Droplet, GraduationCap,
  Trophy, Landmark, Store, ChevronRight, Check, Loader2, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, MOBILE_MONEY_PROVIDERS } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BILLER_ICONS: Record<string, any> = {
  electricity: Zap, water: Droplet, internet: Wifi, tv: Tv,
  education: GraduationCap, betting: Trophy, government: Landmark,
};

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "#FFCC00" },
  { id: "airtel", name: "Airtel", color: "#E40000" },
  { id: "glo", name: "Glo", color: "#43B02A" },
  { id: "9mobile", name: "9mobile", color: "#0066B3" },
];

export function PayView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pay & Bills</h1>
        <p className="text-sm text-muted-foreground">Scan QR, pay merchants, settle bills & buy airtime</p>
      </div>
      <Tabs defaultValue="qr">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="qr"><QrCode className="h-4 w-4 mr-1.5" /> Scan & Pay</TabsTrigger>
          <TabsTrigger value="merchants"><Store className="h-4 w-4 mr-1.5" /> Merchants</TabsTrigger>
          <TabsTrigger value="bills"><Receipt className="h-4 w-4 mr-1.5" /> Bills</TabsTrigger>
          <TabsTrigger value="airtime"><Smartphone className="h-4 w-4 mr-1.5" /> Airtime</TabsTrigger>
        </TabsList>
        <TabsContent value="qr" className="mt-4"><QrPay /></TabsContent>
        <TabsContent value="merchants" className="mt-4"><MerchantsPay /></TabsContent>
        <TabsContent value="bills" className="mt-4"><BillsPay /></TabsContent>
        <TabsContent value="airtime" className="mt-4"><AirtimePay /></TabsContent>
      </Tabs>
    </div>
  );
}

function QrPay() {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const scan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setFound({ name: "Spencer Supermarket", account: "100001", category: "retail", rating: 4.7 });
    }, 2200);
  };

  const pay = async () => {
    setPaying(true);
    await fetch("/api/pay-merchant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount), currency: "NGN", type: "payment", category: "shopping",
        counterpartyName: found.name, method: "qr", description: `QR payment to ${found.name}`,
      }),
    });
    setPaying(false);
    setDone(true);
    toast.success(`Paid ₦${Number(amount).toLocaleString()} to ${found.name}`);
  };

  return (
    <Card className="mx-auto max-w-md p-6">
      {!found && !done && (
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-56 w-56 overflow-hidden rounded-2xl border-2 border-dashed">
            {scanning ? (
              <>
                <div className="absolute inset-0 grid place-items-center bg-muted/30">
                  <QrCode className="h-24 w-24 text-muted-foreground/40" />
                </div>
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_2px] shadow-primary"
                  initial={{ top: "10%" }}
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-muted/20">
                <div className="text-center">
                  <ScanLine className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">Point your camera at a QR code</p>
                </div>
              </div>
            )}
          </div>
          <Button onClick={scan} disabled={scanning} className="w-full">
            {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...</> : <><ScanLine className="h-4 w-4 mr-2" /> Start Scanning</>}
          </Button>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setFound({ name: "Spencer Supermarket", account: "100001", category: "retail", rating: 4.7 })}>
              Demo: Spencer
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFound({ name: "Chicken Republic", account: "100002", category: "food", rating: 4.5 })}>
              Demo: Chicken Republic
            </Button>
          </div>
        </div>
      )}

      {found && !done && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Confirm Payment</h3>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFound(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <p className="font-semibold">{found.name}</p>
            <p className="text-xs text-muted-foreground">Merchant · {found.category}</p>
            <div className="mt-1 flex items-center justify-center gap-1 text-xs">
              <span className="text-amber-500">★ {found.rating}</span>
              <span className="text-muted-foreground">· Verified Merchant</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Amount to pay (₦)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="text-xl font-bold" />
          </div>
          <Button onClick={pay} disabled={!amount || paying} className="mt-4 w-full">
            {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Paying...</> : `Pay ${amount ? formatMoney(Number(amount), "NGN") : ""}`}
          </Button>
        </motion.div>
      )}

      {done && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.div>
          <h3 className="text-xl font-bold">Payment Successful</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatMoney(Number(amount), "NGN")} paid to {found.name}</p>
          <Button className="mt-4 w-full" onClick={() => { setFound(null); setDone(false); setAmount(""); }}>Done</Button>
        </motion.div>
      )}
    </Card>
  );
}

function MerchantsPay() {
  const { data } = useFetch<{ merchants: any[] }>("/api/merchants");
  const merchants = data?.merchants ?? [];
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Browse and pay verified merchants</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {merchants.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        {merchants.map((m) => (
          <Card key={m.id} className="card-lift cursor-pointer p-4" >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.category}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">★ {m.rating.toFixed(1)}</Badge>
                  <Badge variant="outline" className="text-[10px] text-emerald-600">Verified</Badge>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BillsPay() {
  const { data } = useFetch<{ billers: any[] }>("/api/billers");
  const billers = data?.billers ?? [];
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const cats = ["all", ...Array.from(new Set(billers.map((b) => b.category)))];
  const filtered = cat === "all" ? billers : billers.filter((b) => b.category === cat);

  const pay = async () => {
    setPaying(true);
    await fetch("/api/pay-merchant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount), currency: "NGN", type: "bill", category: "general",
        counterpartyName: selected.name, method: "wallet", description: `${selected.name} bill payment`,
      }),
    });
    setPaying(false);
    toast.success(`₦${Number(amount).toLocaleString()} paid to ${selected.name}`);
    setSelected(null); setAccount(""); setAmount("");
  };

  return (
    <div>
      {!selected ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                  cat === c ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => {
              const Icon = BILLER_ICONS[b.category] || Receipt;
              return (
                <Card key={b.id} className="card-lift cursor-pointer p-4" onClick={() => setSelected(b)}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{b.category}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="mx-auto max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                {(() => { const I = BILLER_ICONS[selected.category] || Receipt; return <I className="h-5 w-5" />; })()}
              </div>
              <div>
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selected.category}</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Account / Meter Number</Label>
              <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="e.g. 0123456789" />
            </div>
            <div className="space-y-2">
              <Label>Amount (₦)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex gap-2">
              {[1000, 5000, 10000, 20000].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-lg border py-1.5 text-xs font-medium hover:bg-muted">₦{v.toLocaleString()}</button>
              ))}
            </div>
          </div>
          <Button onClick={pay} disabled={!account || !amount || paying} className="mt-4 w-full">
            {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : "Pay Bill"}
          </Button>
        </Card>
      )}
    </div>
  );
}

function AirtimePay() {
  const [network, setNetwork] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    setPaying(true);
    await fetch("/api/pay-merchant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount), currency: "NGN", type: "airtime", category: "general",
        counterpartyName: `${network.toUpperCase()} - ${phone}`, method: "wallet", description: `Airtime topup ${phone}`,
      }),
    });
    setPaying(false);
    toast.success(`₦${Number(amount).toLocaleString()} airtime sent to ${phone}`);
    setPhone(""); setAmount("");
  };

  return (
    <Card className="mx-auto max-w-md p-6">
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Select Network</Label>
          <div className="grid grid-cols-4 gap-2">
            {NETWORKS.map((n) => (
              <button
                key={n.id}
                onClick={() => setNetwork(n.id)}
                className={cn(
                  "rounded-lg border p-2 text-center transition",
                  network === n.id ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted",
                )}
              >
                <div className="mx-auto h-2 w-8 rounded-full mb-1" style={{ background: n.color }} />
                <span className="text-[10px] font-medium">{n.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0801 234 5678" />
        </div>
        <div className="space-y-2">
          <Label>Amount (₦)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          <div className="flex gap-2">
            {[100, 200, 500, 1000, 2000, 5000].map((v) => (
              <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-lg border py-1.5 text-xs font-medium hover:bg-muted">₦{v}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <Zap className="h-4 w-4 shrink-0" /> Get 2% bonus airtime on every top-up with GaexPay.
        </div>
        <Button onClick={pay} disabled={!phone || !amount || paying} className="w-full">
          {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : "Buy Airtime"}
        </Button>
      </div>
    </Card>
  );
}
