import type { Profile, Role } from "./types";

export const roleValues = [
  "admin",
  "manager",
  "member",
  "guest",
  "session_musician",
  "pr",
] as const satisfies readonly Role[];

const roleSet = new Set<Role>(roleValues);

export function normalizeRole(value: unknown): Role | null {
  return typeof value === "string" && roleSet.has(value as Role) ? value as Role : null;
}

export function isAdmin(role?: Role | null) {
  return role === "admin";
}

export function canManageUsers(role?: Role | null) {
  return isAdmin(role);
}

export function canManageFinance(role?: Role | null) {
  return isAdmin(role);
}

export function canDeleteCriticalData(role?: Role | null) {
  return isAdmin(role);
}

export function canDeleteOperationalData(role?: Role | null) {
  return role === "admin" || role === "manager";
}

export function canManageWorkspaceContent(role?: Role | null) {
  return role === "admin" || role === "manager" || role === "member";
}

export function isProfileSessionUnavailable(profile?: Pick<Profile, "auth_status"> | null) {
  return Boolean(
    profile?.auth_status
    && !["ok", "no_session"].includes(profile.auth_status),
  );
}
