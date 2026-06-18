"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-64 border-r bg-muted/30 hidden md:flex flex-col justify-between">
        <nav className="flex flex-col gap-2 p-4 text-sm font-medium">
          <Link href="/admin" className="px-3 py-2 hover:bg-accent rounded-md transition-colors">Dashboard</Link>
          <Link href="/admin/channels" className="px-3 py-2 hover:bg-accent rounded-md transition-colors">Telegram Channels</Link>
          <Link href="/admin/bots" className="px-3 py-2 hover:bg-accent rounded-md transition-colors">Telegram Bots</Link>
          <Link href="/admin/workers" className="px-3 py-2 hover:bg-accent rounded-md transition-colors">Real-Time Workers</Link>
          <Link href="/admin/analytics" className="px-3 py-2 hover:bg-accent rounded-md transition-colors">Advanced Analytics</Link>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
