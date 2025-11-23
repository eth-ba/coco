"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const dynamic = 'force-dynamic';

export default function Settings() {
  const { authenticated, ready, smartAccountAddress, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col px-6 pt-8 pb-24">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-secondary p-6">
          <p className="font-semibold mb-1">Account</p>
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs text-muted-foreground uppercase">Wallet ID</p>
            <p className="text-sm font-mono truncate bg-background/50 p-2 rounded-lg">
              {user?.wallet?.address}
            </p>
            <p className="text-xs text-muted-foreground uppercase mt-2">
              Smart Account
            </p>
            <p className="text-sm font-mono truncate bg-background/50 p-2 rounded-lg">
              {smartAccountAddress || "Not generated"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-secondary p-6">
          <p className="font-semibold mb-1">App Info</p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-mono">0.1.0</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="rounded-2xl bg-red-500/10 text-red-500 p-6 font-semibold hover:bg-red-500/20 transition-colors text-left"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
