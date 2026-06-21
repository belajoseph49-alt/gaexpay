"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote, Users, Plus, Download, Send, Calendar,
  CheckCircle2, Clock, Loader2, AlertCircle,
  TrendingUp, Receipt, Building2, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDate } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

interface BusinessUser {
  businessProfile: { companyName: string } | null;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  salary: number;
  currency: string;
  bank: string;
  account: string;
  status: "active" | "pending" | "paid";
}

interface PayrollRun {
  id: string;
  period: string;
  date: string;
  amount: number;
  employeeCount: number;
  status: "draft" | "processing" | "completed" | "failed";
}

function seedEmployees(): Employee[] {
  return [
    { id: "1", name: "Adaeze Okonkwo", email: "adaeze@business.com", role: "Operations Manager", salary: 450000, currency: "NGN", bank: "Access Bank", account: "0123456789", status: "active" },
    { id: "2", name: "Tunde Bello", email: "tunde@business.com", role: "Senior Accountant", salary: 380000, currency: "NGN", bank: "GTBank", account: "0123456790", status: "active" },
    { id: "3", name: "Mariam Yusuf", email: "mariam@business.com", role: "Sales Lead", salary: 320000, currency: "NGN", bank: "Zenith Bank", account: "0123456791", status: "active" },
    { id: "4", name: "Chinedu Okafor", email: "chinedu@business.com", role: "Software Engineer", salary: 600000, currency: "NGN", bank: "UBA", account: "0123456792", status: "active" },
    { id: "5", name: "Fatima Bello", email: "fatima@business.com", role: "HR Manager", salary: 350000, currency: "NGN", bank: "First Bank", account: "0123456793", status: "active" },
  ];
}

function seedPayrollRuns(): PayrollRun[] {
  return [
    { id: "1", period: "October 2024", date: "2024-10-31", amount: 2100000, employeeCount: 5, status: "completed" },
    { id: "2", period: "September 2024", date: "2024-09-30", amount: 2050000, employeeCount: 5, status: "completed" },
    { id: "3", period: "August 2024", date: "2024-08-31", amount: 1980000, employeeCount: 5, status: "completed" },
  ];
}

export function PayrollView() {
  const { data: meData } = useFetch<{ user: BusinessUser }>("/api/auth/me");
  const { fmt } = useFormatMoney();
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees());
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(seedPayrollRuns());
  const [addOpen, setAddOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: "", email: "", role: "", salary: 0, bank: "", account: "",
  });

  const companyName = meData?.user?.businessProfile?.companyName || "Your Business";
  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0);
  const activeCount = employees.filter((e) => e.status === "active").length;

  const addEmployee = () => {
    if (!newEmp.name.trim() || !newEmp.email.trim() || !newEmp.role.trim() || newEmp.salary <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    const emp: Employee = {
      id: String(Date.now()),
      ...newEmp,
      currency: "NGN",
      status: "active",
    };
    setEmployees((arr) => [...arr, emp]);
    setAddOpen(false);
    setNewEmp({ name: "", email: "", role: "", salary: 0, bank: "", account: "" });
    toast.success(`${emp.name} added`);
  };

  const removeEmployee = (id: string) => {
    setEmployees((arr) => arr.filter((e) => e.id !== id));
    toast.success("Employee removed");
  };

  const runPayroll = async () => {
    setRunning(true);
    // Simulate a payroll run with a short delay
    await new Promise((r) => setTimeout(r, 1200));
    const period = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const run: PayrollRun = {
      id: String(Date.now()),
      period,
      date: new Date().toISOString().slice(0, 10),
      amount: totalPayroll,
      employeeCount: employees.length,
      status: "completed",
    };
    setPayrollRuns((arr) => [run, ...arr]);
    setEmployees((arr) => arr.map((e) => ({ ...e, status: "paid" as const })));
    setRunning(false);
    setRunOpen(false);
    toast.success(`Payroll of ${fmt(totalPayroll)} disbursed to ${employees.length} employees`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Manage employee salaries & run payroll for {companyName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Employee
          </Button>
          <Button onClick={() => setRunOpen(true)}>
            <Banknote className="mr-1.5 h-4 w-4" /> Run Payroll
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total Monthly Payroll</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums">{fmt(totalPayroll)}</p>
          <p className="mt-1 text-xs text-muted-foreground">per month</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Active Employees</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">on payroll</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Avg. Salary</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/15 text-sky-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {fmt(employees.length > 0 ? totalPayroll / employees.length : 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">per employee</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Last Run</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums">{payrollRuns[0]?.period?.split(" ")[0] ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {payrollRuns[0] ? fmt(payrollRuns[0].amount) : "No runs yet"}
          </p>
        </Card>
      </div>

      {/* Employees table */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Employees</h3>
          <Badge variant="outline" className="text-[10px]">{employees.length} total</Badge>
        </div>
        <div className="space-y-2">
          {employees.map((emp) => (
            <motion.div
              key={emp.id}
              layout
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-[11px] font-bold text-primary-foreground">
                  {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{emp.name}</p>
                <p className="truncate text-xs text-muted-foreground">{emp.role} · {emp.email}</p>
              </div>
              <div className="hidden sm:block text-right text-xs">
                <p className="text-muted-foreground">Bank</p>
                <p className="font-medium">{emp.bank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums">{fmt(emp.salary)}</p>
                <p className="text-[10px] text-muted-foreground">monthly</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  emp.status === "paid" && "border-emerald-500/40 text-emerald-600",
                  emp.status === "active" && "border-sky-500/40 text-sky-600",
                  emp.status === "pending" && "border-amber-500/40 text-amber-600",
                )}
              >
                {emp.status === "paid" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                {emp.status === "active" && <Clock className="mr-1 h-3 w-3" />}
                {emp.status}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removeEmployee(emp.id)}
              >
                <Receipt className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Payroll history */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Payroll History</h3>
          <Button variant="ghost" size="sm" onClick={() => toast.info("Export coming soon")}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
        <div className="space-y-2">
          {payrollRuns.map((run) => (
            <div
              key={run.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{run.period}</p>
                <p className="text-xs text-muted-foreground">
                  {run.employeeCount} employees · Run on {formatDate(run.date)}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums">{fmt(run.amount)}</p>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  run.status === "completed" && "border-emerald-500/40 text-emerald-600",
                  run.status === "processing" && "border-amber-500/40 text-amber-600",
                  run.status === "failed" && "border-rose-500/40 text-rose-600",
                )}
              >
                {run.status === "completed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                {run.status}
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Payslips coming soon")}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Add employee dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Add a new employee to your payroll. They&apos;ll be included in the next payroll run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Full name</Label>
                <Input
                  value={newEmp.name}
                  onChange={(e) => setNewEmp((n) => ({ ...n, name: e.target.value }))}
                  placeholder="Jane Doe"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp((n) => ({ ...n, email: e.target.value }))}
                  placeholder="jane@business.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Role / Position</Label>
                <Input
                  value={newEmp.role}
                  onChange={(e) => setNewEmp((n) => ({ ...n, role: e.target.value }))}
                  placeholder="Software Engineer"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Monthly salary (NGN)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newEmp.salary || ""}
                  onChange={(e) => setNewEmp((n) => ({ ...n, salary: Number(e.target.value) }))}
                  placeholder="500000"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Bank</Label>
                <Input
                  value={newEmp.bank}
                  onChange={(e) => setNewEmp((n) => ({ ...n, bank: e.target.value }))}
                  placeholder="Access Bank"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Account number</Label>
                <Input
                  value={newEmp.account}
                  onChange={(e) => setNewEmp((n) => ({ ...n, account: e.target.value }))}
                  placeholder="0123456789"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addEmployee}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run payroll confirmation */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
            <DialogDescription>
              Confirm the payroll run. This will disburse salaries to all {employees.length} active employees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Period</span>
                <span className="text-sm font-medium">
                  {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Employees</span>
                <span className="text-sm font-medium">{employees.length}</span>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total amount</span>
                <span className="text-sm font-bold tabular-nums">{fmt(totalPayroll)}</span>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Disbursement</span>
                  <span className="font-medium">Bank transfer</span>
                </div>
                <Progress value={100} className="h-1.5" />
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="mr-1 inline h-3 w-3" />
              This action cannot be undone. Ensure all employee bank details are correct.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOpen(false)} disabled={running}>
              Cancel
            </Button>
            <Button onClick={runPayroll} disabled={running}>
              {running ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              {running ? "Processing…" : "Confirm & Disburse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
