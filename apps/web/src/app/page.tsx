"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { login, authenticated, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex min-h-screen w-full flex-col items-center justify-center px-6 sm:px-8">
        <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            🥥 Coco
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground">
            High-yield stablecoin savings. Any chain. Zero complexity.
          </p>
          <div className="flex flex-col gap-4 w-full sm:flex-row sm:justify-center mt-8">
            <button
              onClick={login}
              disabled={!ready}
              className="flex h-14 items-center justify-center rounded-xl bg-primary px-8 text-lg font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {ready ? "Get Started" : "Loading..."}
            </button>
            <button className="flex h-14 items-center justify-center rounded-xl border-2 border-border px-8 text-lg font-semibold transition-colors hover:bg-secondary">
              Learn More
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
