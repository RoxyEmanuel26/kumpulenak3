import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-64 border-r bg-muted/30 hidden md:block">
        <nav className="flex flex-col gap-2 p-4 text-sm font-medium">
          <Link href="/admin" className="px-3 py-2 hover:bg-accent rounded-md transition-colors">Dashboard</Link>
          <Link href="/admin/channels" className="px-3 py-2 hover:bg-accent rounded-md transition-colors">Telegram Channels</Link>
          <Link href="/admin/logs" className="px-3 py-2 hover:bg-accent rounded-md transition-colors text-muted-foreground pointer-events-none">Broadcast Logs (WIP)</Link>
          <Link href="/admin/settings" className="px-3 py-2 hover:bg-accent rounded-md transition-colors text-muted-foreground pointer-events-none">Settings (WIP)</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
