"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { authenticated, ready, smartAccountAddress, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-6 pt-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign Out
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Smart Account Info */}
        <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
            Smart Account
          </p>
          <p className="text-sm font-mono truncate">
            {smartAccountAddress || "Generating account..."}
          </p>
        </div>

        {/* Balance Cards */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Balance</p>
            <p className="text-4xl font-bold">$0.00</p>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">Current APY</p>
            <p className="text-2xl font-bold text-accent">0.00%</p>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">
              Lifetime Earnings
            </p>
            <p className="text-2xl font-bold">$0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
