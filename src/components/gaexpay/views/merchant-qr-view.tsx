"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, QrCode, Download, Share2, Copy, Store, Star, Check,
  Crown, RefreshCw, Settings,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney } from "@/lib/gaexpay";
import { useApp } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MerchantQRView() {
  const { setView } = useApp();
  const { data } = useFetch<any>("/api/merchant-qr");
  const [amount, setAmount] = useState("");

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setView("merchant")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </Button>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { merchant, qrMatrix, qrPayload } = data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setView("merchant")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">My QR Code</h1>
        <p className="text-sm text-muted-foreground">Customers scan this to pay you instantly</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* QR Code Card */}
        <Card className="lg:col-span-2 relative overflow-hidden p-8">
          <div className="absolute inset-0 mesh-bg opacity-30" />
          <div className="relative flex flex-col items-center">
            {/* Merchant header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-lg">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{merchant.name}</h2>
                  <Badge className="bg-amber-500/15 text-amber-600 border-0">
                    <Crown className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{merchant.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">· {merchant.category}</span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl bg-white p-6 shadow-2xl"
            >
              <QRMatrix matrix={qrMatrix} />
              {/* GaexPay logo in center */}
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600">
                  <QrCode className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-slate-800">
                  Gaex<span className="text-emerald-600">Pay</span>
                </span>
              </div>
            </motion.div>

            {/* Amount (optional) */}
            <div className="mt-6 w-full max-w-xs">
              <Label className="text-xs text-muted-foreground">Request specific amount (optional)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 text-center text-lg font-semibold"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(qrPayload); toast.success("QR data copied"); }}>
                <Copy className="h-4 w-4 mr-1.5" /> Copy
              </Button>
              <Button variant="outline" onClick={() => toast.success("QR shared")}>
                <Share2 className="h-4 w-4 mr-1.5" /> Share
              </Button>
              <Button onClick={() => toast.success("QR downloaded as PNG")}>
                <Download className="h-4 w-4 mr-1.5" /> Download
              </Button>
            </div>
          </div>
        </Card>

        {/* Side info */}
        <div className="space-y-4">
          {/* QR details */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">QR Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchant ID</span>
                <span className="font-mono text-xs">{merchant.account}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">QR Code</span>
                <span className="font-mono text-xs">{merchant.qrCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="capitalize">{merchant.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-emerald-600 text-[10px]">Active</Badge>
              </div>
            </div>
          </Card>

          {/* How it works */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">How Customers Pay</h3>
            <div className="space-y-3">
              {[
                { step: 1, text: "Customer opens GaexPay app" },
                { step: 2, text: "Taps 'Scan & Pay' on home screen" },
                { step: 3, text: "Points camera at your QR code" },
                { step: 4, text: "Enters amount & confirms payment" },
                { step: 5, text: "You receive money instantly" },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {s.step}
                  </div>
                  <p className="text-sm text-muted-foreground pt-0.5">{s.text}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Today's Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payments received</span>
                <span className="text-lg font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total volume</span>
                <span className="text-lg font-bold tabular-nums">{formatMoney(0, "NGN")}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setView("merchant")}>
                View Full Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QRMatrix({ matrix }: { matrix: number[][] }) {
  const size = matrix.length;
  const cellSize = 8; // px per cell
  return (
    <div
      className="relative"
      style={{ width: size * cellSize, height: size * cellSize }}
    >
      {matrix.map((row, y) =>
        row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className="absolute"
            style={{
              left: x * cellSize,
              top: y * cellSize,
              width: cellSize,
              height: cellSize,
              background: cell ? "#0f172a" : "transparent",
            }}
          />
        ))
      )}
      {/* Center logo overlay */}
      <div className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-white shadow-md ring-2 ring-slate-900">
        <div className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-emerald-500 to-teal-600">
          <QrCode className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    </div>
  );
}
