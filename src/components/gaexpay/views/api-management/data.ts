/**
 * api-management/data.ts
 *
 * Shared types + service metadata for the API Management view.
 */

import {
  CreditCard, Bitcoin, Shield, Building, MessageSquare, Mail,
  Bell, MapPin, Brain, TrendingUp, Cloud, Lock, HelpCircle,
  type LucideIcon,
} from "lucide-react";

// ---------- Service metadata ----------
export interface ServiceMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;        // tailwind classes for icon tile bg + text
  accent: string;       // hex for chart color
  description: string;
  credentialFields: { key: string; label: string; placeholder?: string; type?: "text" | "password" }[];
}

export const SERVICE_META: Record<string, ServiceMeta> = {
  payment: {
    key: "payment",
    label: "Payment",
    icon: CreditCard,
    color: "bg-emerald-500/15 text-emerald-500",
    accent: "#10b981",
    description: "Card, mobile-money & bank payment processors",
    credentialFields: [
      { key: "apiKey", label: "API Key", placeholder: "sk_live_...", type: "password" },
      { key: "secretKey", label: "Secret Key", placeholder: "sk_secret_...", type: "password" },
      { key: "publishableKey", label: "Publishable Key", placeholder: "pk_live_..." },
    ],
  },
  blockchain: {
    key: "blockchain",
    label: "Blockchain",
    icon: Bitcoin,
    color: "bg-orange-500/15 text-orange-500",
    accent: "#f97316",
    description: "Crypto price, RPC & on-chain data",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "rpcUrl", label: "RPC URL", placeholder: "https://mainnet.infura.io/v3/..." },
      { key: "privateKey", label: "Private Key", type: "password" },
    ],
  },
  kyc: {
    key: "kyc",
    label: "KYC",
    icon: Shield,
    color: "bg-sky-500/15 text-sky-500",
    accent: "#0ea5e9",
    description: "Identity verification providers",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "secret", label: "Secret", type: "password" },
      { key: "sandboxKey", label: "Sandbox Key", type: "password" },
    ],
  },
  kyb: {
    key: "kyb",
    label: "KYB",
    icon: Building,
    color: "bg-indigo-500/15 text-indigo-500",
    accent: "#6366f1",
    description: "Business verification & registry lookups",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "secret", label: "Secret", type: "password" },
      { key: "sandboxKey", label: "Sandbox Key", type: "password" },
    ],
  },
  sms: {
    key: "sms",
    label: "SMS",
    icon: MessageSquare,
    color: "bg-cyan-500/15 text-cyan-500",
    accent: "#06b6d4",
    description: "Transactional & OTP SMS gateways",
    credentialFields: [
      { key: "accountSid", label: "Account SID" },
      { key: "authToken", label: "Auth Token", type: "password" },
      { key: "fromNumber", label: "From Number", placeholder: "+1234567890" },
    ],
  },
  email: {
    key: "email",
    label: "Email",
    icon: Mail,
    color: "bg-rose-500/15 text-rose-500",
    accent: "#f43f5e",
    description: "Transactional & marketing email providers",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "domain", label: "Domain", placeholder: "mail.gaexpay.com" },
      { key: "fromEmail", label: "From Email", placeholder: "no-reply@gaexpay.com" },
    ],
  },
  push: {
    key: "push",
    label: "Push",
    icon: Bell,
    color: "bg-amber-500/15 text-amber-500",
    accent: "#f59e0b",
    description: "Mobile & web push notification services",
    credentialFields: [
      { key: "serverKey", label: "Server Key", type: "password" },
      { key: "projectId", label: "Project ID" },
    ],
  },
  geolocation: {
    key: "geolocation",
    label: "Geolocation",
    icon: MapPin,
    color: "bg-teal-500/15 text-teal-500",
    accent: "#14b8a6",
    description: "IP-based & address geocoding services",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
    ],
  },
  ai: {
    key: "ai",
    label: "AI",
    icon: Brain,
    color: "bg-violet-500/15 text-violet-500",
    accent: "#8b5cf6",
    description: "LLM, embeddings & vision providers",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "model", label: "Default Model", placeholder: "glm-4.6" },
    ],
  },
  exchange_rate: {
    key: "exchange_rate",
    label: "Exchange Rate",
    icon: TrendingUp,
    color: "bg-green-500/15 text-green-500",
    accent: "#22c55e",
    description: "FX rate providers for currency conversion",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
    ],
  },
  cloud_storage: {
    key: "cloud_storage",
    label: "Cloud Storage",
    icon: Cloud,
    color: "bg-blue-500/15 text-blue-500",
    accent: "#3b82f6",
    description: "Object storage for files, KYC docs & exports",
    credentialFields: [
      { key: "accessKey", label: "Access Key", type: "password" },
      { key: "secretKey", label: "Secret Key", type: "password" },
      { key: "bucket", label: "Bucket Name" },
      { key: "region", label: "Region", placeholder: "us-east-1" },
    ],
  },
  auth: {
    key: "auth",
    label: "Auth",
    icon: Lock,
    color: "bg-purple-500/15 text-purple-500",
    accent: "#a855f7",
    description: "OAuth / OIDC identity providers",
    credentialFields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password" },
    ],
  },
  other: {
    key: "other",
    label: "Other",
    icon: HelpCircle,
    color: "bg-zinc-500/15 text-zinc-500",
    accent: "#71717a",
    description: "Miscellaneous integrations",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password" },
    ],
  },
};

export const SERVICES = Object.keys(SERVICE_META);

export function getServiceMeta(service: string): ServiceMeta {
  return SERVICE_META[service] || SERVICE_META.other;
}

// ---------- Types (mirror the Prisma models on the client) ----------
export interface ApiConfig {
  id: string;
  service: string;
  name: string;
  provider: string | null;
  baseUrl: string | null;
  webhookUrl: string | null;
  environment: string;        // sandbox | production
  enabled: boolean;
  isDefault: boolean;
  rateLimitPerMin: number | null;
  rateLimitPerDay: number | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  totalRequests: number;
  failedRequests: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConfigWithCreds extends ApiConfig {
  credentials: string;        // JSON string
}

export interface TestResult {
  success: boolean;
  responseTimeMs: number;
  statusCode: number;
  message: string;
  responseBody?: string;
  endpoint?: string;
}

export interface ApiLog {
  id: string;
  apiConfigId: string;
  level: string;              // info | warn | error
  message: string;
  endpoint: string | null;
  statusCode: number | null;
  responseTimeMs: number | null;
  requestBody: string | null;
  responseBody: string | null;
  createdAt: string;
}

// ---------- Stats types ----------
export interface Stats {
  totals: {
    configs: number;
    enabled: number;
    disabled: number;
    healthy: number;
    warnings: number;
    errors: number;
    totalRequests: number;
    totalFailed: number;
    overallErrorRate: number;
  };
  byService: {
    service: string;
    count: number;
    enabledCount: number;
    totalRequests: number;
    failedRequests: number;
  }[];
  topUsed: {
    id: string;
    name: string;
    service: string;
    totalRequests: number;
    failedRequests: number;
  }[];
  topErrors: {
    id: string;
    name: string;
    service: string;
    failedRequests: number;
    totalRequests: number;
    errorRate: number;
    lastErrorAt: string | null;
  }[];
  series: {
    date: string;
    label: string;
    requests: number;
    errors: number;
    warns: number;
    infos: number;
    avgResponseMs: number;
  }[];
  responseTimeDistribution: { bucket: string; count: number }[];
  recentErrors: {
    id: string;
    apiConfigId: string;
    message: string;
    endpoint: string | null;
    statusCode: number | null;
    responseTimeMs: number | null;
    createdAt: string;
  }[];
}

// ---------- Health helpers ----------
export type HealthState = "healthy" | "warning" | "error" | "disabled";

export function getHealth(c: ApiConfig): HealthState {
  if (!c.enabled) return "disabled";
  const errorRate = c.totalRequests > 0 ? c.failedRequests / c.totalRequests : 0;
  const now = Date.now();
  const ONE_HOUR = 3600000;
  const ONE_DAY = 86400000;
  if (c.lastErrorAt) {
    const since = now - new Date(c.lastErrorAt).getTime();
    if (since < ONE_HOUR || errorRate > 0.1) return "error";
    if (since < ONE_DAY || errorRate > 0.01) return "warning";
  }
  if (errorRate > 0.05) return "warning";
  return "healthy";
}

export const HEALTH_META: Record<HealthState, {
  label: string;
  color: string;       // for badge
  dot: string;         // for indicator dot
}> = {
  healthy:  { label: "Healthy",  color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", dot: "bg-emerald-500" },
  warning:  { label: "Warning",  color: "bg-amber-500/15 text-amber-600 border-amber-500/30",       dot: "bg-amber-500" },
  error:    { label: "Error",    color: "bg-rose-500/15 text-rose-600 border-rose-500/30",          dot: "bg-rose-500" },
  disabled: { label: "Disabled", color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",          dot: "bg-zinc-400" },
};
