"use client";

import { useUI } from "./UIContext";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useUI();
  return (
    <main className={`flex-1 min-w-0 transition-all duration-200 min-h-[calc(100dvh-3.5rem)] ${
      isSidebarCollapsed ? "md:pl-[72px]" : "md:pl-60"
    }`}>
      {children}
    </main>
  );
}
