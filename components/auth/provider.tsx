"use client";

import type { ReactNode } from "react";

import { AuthGate } from "./auth-gate";

export function AuthProvider({ children }: { children: ReactNode }) {
  // No automatic session creation - let users browse anonymously
  // Anonymous sessions will be created on-demand when needed
  return <AuthGate>{children}</AuthGate>;
}
