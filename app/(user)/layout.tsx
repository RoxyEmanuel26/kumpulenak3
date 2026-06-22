import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { WebVitals } from "@/components/analytics/WebVitals";
import { Suspense } from "react";

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F0F]">
      <WebVitals />
      {/* Premium Top Navigation Bar */}
      <Topbar />
      
      {/* Content wrapper with Sidebar & PageWrapper */}
      <div className="flex flex-1 pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Suspense fallback={<div className="w-60 bg-[#0F0F0F] hidden md:block" />}>
          <Sidebar />
        </Suspense>
        <PageWrapper>{children}</PageWrapper>
      </div>

      {/* Mobile bottom tab navigation */}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
