/**
 * src/lib/rbac.ts
 *
 * Role-Based Access Control (RBAC) for GaexPay.
 *
 * Design
 * ------
 *  - The `role` field on User is the primary role identifier.
 *  - The `permissions` field on User is a JSON-encoded string array of
 *    granular permission strings (e.g. "users.view", "transactions.reverse").
 *    A wildcard "*" grants all permissions (used by super_admin).
 *  - Each role has a default permission set, but permissions can be
 *    overridden per-user via the admin UI.
 *
 * Roles
 * -----
 *  super_admin          — full access (wildcard "*")
 *  admin                — manage users, transactions, content (no roles.*, no api.delete)
 *  moderator            — content moderation, disputes
 *  support              — user assistance, tickets
 *  financial_manager    — transactions, wallets, fees, reports
 *  kyc_manager          — KYC/KYB verification
 *  marketplace_manager  — businesses, products, merchants
 *  content_manager      — content, notifications, templates
 *  user                 — standard user (no admin permissions)
 */

export type Role =
  | "super_admin"
  | "admin"
  | "moderator"
  | "support"
  | "financial_manager"
  | "kyc_manager"
  | "marketplace_manager"
  | "content_manager"
  | "user";

export interface RoleDefinition {
  value: Role;
  label: string;
  description: string;
}

export const ROLES: RoleDefinition[] = [
  { value: "super_admin", label: "Super Administrateur", description: "Accès total à toutes les fonctionnalités" },
  { value: "admin", label: "Administrateur", description: "Gestion des utilisateurs et opérations" },
  { value: "moderator", label: "Modérateur", description: "Modération du contenu et litiges" },
  { value: "support", label: "Support", description: "Assistance utilisateurs et tickets" },
  { value: "financial_manager", label: "Gestionnaire Financier", description: "Transactions, wallets, rapports" },
  { value: "kyc_manager", label: "Gestionnaire KYC/KYB", description: "Vérification d'identité et entreprise" },
  { value: "marketplace_manager", label: "Gestionnaire Marketplace", description: "Produits, services, marchands" },
  { value: "content_manager", label: "Gestionnaire Contenu", description: "Notifications, contenus, communication" },
  { value: "user", label: "Utilisateur", description: "Utilisateur standard" },
];

export const PERMISSIONS = [
  // Users
  "users.view", "users.create", "users.edit", "users.delete", "users.suspend",
  // Businesses
  "businesses.view", "businesses.verify", "businesses.reject", "businesses.suspend",
  // Transactions
  "transactions.view", "transactions.reverse", "transactions.flag", "transactions.export",
  // Wallets
  "wallets.view", "wallets.adjust", "wallets.freeze",
  // Currencies
  "currencies.view", "currencies.add", "currencies.edit", "currencies.toggle",
  // Fees
  "fees.view", "fees.edit", "fees.create",
  // API Config
  "api.view", "api.create", "api.edit", "api.delete", "api.test", "api.logs",
  // Feature Flags
  "features.view", "features.toggle",
  // Notifications
  "notifications.view", "notifications.send", "notifications.template",
  // Content
  "content.view", "content.edit", "content.publish",
  // Roles & Permissions
  "roles.view", "roles.assign", "roles.edit",
  // Disputes
  "disputes.view", "disputes.resolve", "disputes.assign",
  // Reports
  "reports.view", "reports.export", "reports.schedule",
  // Security
  "security.view", "security.audit", "security.block", "security.unblock",
  // KYC/KYB
  "kyc.view", "kyc.approve", "kyc.reject", "kyb.view", "kyb.approve", "kyb.reject",
  // Modules
  "modules.view", "modules.toggle",
  // Settings
  "settings.view", "settings.edit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Check if a list of permissions grants a specific permission.
 * The wildcard "*" grants every permission.
 */
export function hasPermission(userPermissions: string[], permission: string): boolean {
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(permission);
}

/**
 * Check if any of the given permissions is granted.
 */
export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  if (userPermissions.includes("*")) return true;
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if ALL of the given permissions are granted.
 */
export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
  if (userPermissions.includes("*")) return true;
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Default permission set per role. Used when seeding new admin users or
 * when the admin UI assigns a role to a user without specifying permissions.
 */
export function getRolePermissions(role: Role): string[] {
  if (role === "super_admin") return ["*"];

  const rolePermissionMap: Record<string, string[]> = {
    admin: PERMISSIONS.filter(
      (p) => !p.startsWith("roles.") && p !== "api.delete",
    ),
    moderator: [
      "disputes.view",
      "disputes.resolve",
      "disputes.assign",
      "content.view",
      "content.edit",
      "users.view",
    ],
    support: [
      "users.view",
      "tickets.view",
      "tickets.resolve",
      "notifications.view",
    ],
    financial_manager: [
      "transactions.view",
      "transactions.reverse",
      "transactions.flag",
      "transactions.export",
      "wallets.view",
      "wallets.adjust",
      "wallets.freeze",
      "fees.view",
      "fees.edit",
      "reports.view",
      "reports.export",
    ],
    kyc_manager: [
      "kyc.view",
      "kyc.approve",
      "kyc.reject",
      "kyb.view",
      "kyb.approve",
      "kyb.reject",
      "users.view",
    ],
    marketplace_manager: [
      "businesses.view",
      "businesses.verify",
      "businesses.reject",
      "products.view",
      "products.edit",
      "merchants.view",
    ],
    content_manager: [
      "content.view",
      "content.edit",
      "content.publish",
      "notifications.view",
      "notifications.send",
      "notifications.template",
    ],
    user: [],
  };

  return rolePermissionMap[role] || [];
}

/**
 * True for any role that has administrative privileges (super_admin or admin).
 */
export function isAdmin(role: string): boolean {
  return role === "super_admin" || role === "admin";
}

/**
 * True only for the super_admin role.
 */
export function isSuperAdmin(role: string): boolean {
  return role === "super_admin";
}

/**
 * Get a human-readable label for a role value.
 */
export function getRoleLabel(role: string): string {
  const def = ROLES.find((r) => r.value === role);
  return def?.label ?? role;
}

/**
 * Parse a user's `permissions` field (stored as a JSON string in the DB) into
 * a string array. Returns an empty array on parse failure.
 */
export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}
