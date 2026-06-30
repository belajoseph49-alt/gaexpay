"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Download, Send, Eye, Copy, Trash2,
  Clock, CheckCircle2, X, Loader2, Search, Filter, Pencil,
  DollarSign, Calendar, Building2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDate } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

interface BusinessUser {
  businessProfile: { companyName: string } | null;
  email: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  number: string;
  client: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  currency: string;
}

const STATUS_STYLES: Record<Invoice["status"], string> = {
  draft: "border-muted text-muted-foreground bg-muted/30",
  sent: "border-sky-500/40 text-sky-600 bg-sky-500/10",
  paid: "border-violet-500/40 text-violet-600 bg-violet-500/10",
  overdue: "border-rose-500/40 text-rose-600 bg-rose-500/10",
  cancelled: "border-muted text-muted-foreground line-through",
};

function computeTotal(inv: Invoice): number {
  return inv.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

function generateInvoiceNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${y}${m}-${rnd}`;
}

function seedInvoices(): Invoice[] {
  return [
    {
      id: "1",
      number: "INV-20241101-4501",
      client: "Acme Holdings Ltd.",
      clientEmail: "billing@acme.com",
      issueDate: "2024-11-01",
      dueDate: "2024-11-15",
      status: "paid",
      currency: "NGN",
      items: [
        { id: "a", description: "Monthly retainer", quantity: 1, unitPrice: 450000 },
        { id: "b", description: "Cloud hosting (10 servers)", quantity: 10, unitPrice: 15000 },
      ],
    },
    {
      id: "2",
      number: "INV-20241105-4502",
      client: "Globex Inc.",
      clientEmail: "ap@globex.com",
      issueDate: "2024-11-05",
      dueDate: "2024-11-19",
      status: "sent",
      currency: "NGN",
      items: [
        { id: "a", description: "API integration", quantity: 1, unitPrice: 850000 },
      ],
    },
    {
      id: "3",
      number: "INV-20241020-4498",
      client: "Initech LLC",
      clientEmail: "accounts@initech.com",
      issueDate: "2024-10-20",
      dueDate: "2024-11-03",
      status: "overdue",
      currency: "NGN",
      items: [
        { id: "a", description: "Consulting services", quantity: 8, unitPrice: 75000 },
      ],
    },
    {
      id: "4",
      number: "INV-20241110-4503",
      client: "Wayne Enterprises",
      clientEmail: "finance@wayne.com",
      issueDate: "2024-11-10",
      dueDate: "2024-11-24",
      status: "draft",
      currency: "NGN",
      items: [
        { id: "a", description: "Software license", quantity: 5, unitPrice: 120000 },
      ],
    },
  ];
}

export function InvoicesView() {
  const { data: meData } = useFetch<{ user: BusinessUser }>("/api/auth/me");
  const { fmt } = useFormatMoney();
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newInv, setNewInv] = useState({
    client: "",
    clientEmail: "",
    dueDate: "",
    items: [{ id: "1", description: "", quantity: 1, unitPrice: 0 }] as InvoiceItem[],
  });

  const companyName = meData?.user?.businessProfile?.companyName || "Your Business";

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + computeTotal(i), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + computeTotal(i), 0);
  const totalOverdue = invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + computeTotal(i), 0);

  const createInvoice = () => {
    if (!newInv.client.trim() || !newInv.clientEmail.trim()) {
      toast.error("Client name and email are required");
      return;
    }
    if (!newInv.dueDate) {
      toast.error("Due date is required");
      return;
    }
    if (newInv.items.length === 0 || !newInv.items[0].description) {
      toast.error("At least one line item is required");
      return;
    }
    const created: Invoice = {
      id: String(Date.now()),
      number: generateInvoiceNumber(),
      client: newInv.client,
      clientEmail: newInv.clientEmail,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: newInv.dueDate,
      status: "draft",
      currency: "NGN",
      items: newInv.items.filter((i) => i.description),
    };
    setInvoices((arr) => [created, ...arr]);
    setCreateOpen(false);
    setNewInv({
      client: "",
      clientEmail: "",
      dueDate: "",
      items: [{ id: "1", description: "", quantity: 1, unitPrice: 0 }],
    });
    toast.success(`Invoice ${created.number} created`);
  };

  const markAsSent = (id: string) => {
    setInvoices((arr) =>
      arr.map((i) => (i.id === id ? { ...i, status: "sent" } : i)),
    );
    toast.success("Invoice marked as sent");
  };

  const markAsPaid = (id: string) => {
    setInvoices((arr) =>
      arr.map((i) => (i.id === id ? { ...i, status: "paid" } : i)),
    );
    toast.success("Invoice marked as paid");
  };

  const deleteInvoice = (id: string) => {
    setInvoices((arr) => arr.filter((i) => i.id !== id));
    toast.success("Invoice deleted");
  };

  const duplicateInvoice = (inv: Invoice) => {
    const copy: Invoice = {
      ...inv,
      id: String(Date.now()),
      number: generateInvoiceNumber(),
      status: "draft",
      issueDate: new Date().toISOString().slice(0, 10),
    };
    setInvoices((arr) => [copy, ...arr]);
    toast.success("Invoice duplicated");
  };

  const addItem = () =>
    setNewInv((n) => ({
      ...n,
      items: [
        ...n.items,
        { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0 },
      ],
    }));
  const removeItem = (id: string) =>
    setNewInv((n) => ({ ...n, items: n.items.filter((i) => i.id !== id) }));
  const updateItem = (id: string, patch: Partial<InvoiceItem>) =>
    setNewInv((n) => ({
      ...n,
      items: n.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const newInvTotal = newInv.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create, send & track invoices from {companyName}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Total Paid</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-violet-600">
            {fmt(totalPaid)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {invoices.filter((i) => i.status === "paid").length} invoices
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
            {fmt(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {invoices.filter((i) => i.status === "sent").length} sent
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">
            {fmt(totalOverdue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {invoices.filter((i) => i.status === "overdue").length} overdue
          </p>
        </Card>
      </div>

      {/* Filters + list */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No invoices found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence>
              {filtered.map((inv) => (
                <motion.div
                  key={inv.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-wrap items-center gap-3 rounded-xl border p-3 transition hover:border-primary/30 hover:bg-muted/30"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {inv.number}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.client} · {inv.clientEmail}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right text-xs">
                    <p className="text-muted-foreground">Issued</p>
                    <p className="font-medium">{formatDate(inv.issueDate)}</p>
                  </div>
                  <div className="hidden sm:block text-right text-xs">
                    <p className="text-muted-foreground">Due</p>
                    <p className={cn(
                      "font-medium",
                      inv.status === "overdue" && "text-rose-600",
                    )}>
                      {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{fmt(computeTotal(inv))}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[inv.status])}>
                    {inv.status}
                  </Badge>
                  <div className="flex gap-1">
                    {inv.status === "draft" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markAsSent(inv.id)}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(inv.status === "sent" || inv.status === "overdue") && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-violet-600" onClick={() => markAsPaid(inv.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateInvoice(inv)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => () => {
      const csv = "Invoice,Client,Amount,Currency,Status,Date\n" + (invoices || []).map(i => `${i.id},${i.client},${i.amount},${i.currency},${i.status},${i.date}`).join("\n");
      const blob = new Blob([csv], {type:"text/csv"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="invoices.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Invoices exported");
    }}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteInvoice(inv.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Create invoice dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Fill in the client details and line items. The invoice will be saved as a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Client name</Label>
                <Input
                  value={newInv.client}
                  onChange={(e) => setNewInv((n) => ({ ...n, client: e.target.value }))}
                  placeholder="Acme Holdings Ltd."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Client email</Label>
                <Input
                  type="email"
                  value={newInv.clientEmail}
                  onChange={(e) => setNewInv((n) => ({ ...n, clientEmail: e.target.value }))}
                  placeholder="billing@client.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input
                type="date"
                value={newInv.dueDate}
                onChange={(e) => setNewInv((n) => ({ ...n, dueDate: e.target.value }))}
                className="mt-1 w-full sm:w-[200px]"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs">Line items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add item
                </Button>
              </div>
              <div className="space-y-2">
                {newInv.items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-12 sm:col-span-6"
                      placeholder="Description"
                      value={it.description}
                      onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    />
                    <Input
                      type="number"
                      min="1"
                      className="col-span-4 sm:col-span-2"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => updateItem(it.id, { quantity: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min="0"
                      className="col-span-6 sm:col-span-3"
                      placeholder="Unit price"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value) })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 sm:col-span-1 h-9 w-9 text-destructive"
                      onClick={() => removeItem(it.id)}
                      disabled={newInv.items.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold tabular-nums">{fmt(newInvTotal)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createInvoice}>
              <FileText className="mr-1.5 h-4 w-4" /> Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
