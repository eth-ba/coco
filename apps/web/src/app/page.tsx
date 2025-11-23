"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default function Home() {
  const { login, authenticated, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/home");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#1C1C1E' }}>
      <main className="flex min-h-screen w-full flex-col items-center justify-between px-6 py-12">
        {/* Logo in center */}
        <div className="flex-1 flex items-center justify-center">
          <Image
            src="/icons/splashcocologo.svg"
            alt="Coco Logo"
            width={200}
            height={200}
            priority
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>

        {/* Start growing button at bottom */}
        <button
          onClick={login}
          disabled={!ready}
          className="w-full max-w-md h-14 rounded-full bg-white text-black text-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 font-sans"
        >
          {ready ? "Start growing" : "Loading..."}
        </button>
      </main>
    </div>
  );
}
