import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { cookies } from "next/headers";

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.has("admin_session");

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F0F]">
      {/* Premium Top Navigation Bar */}
      <Topbar isAdmin={isAdmin} />
      
      {/* Content wrapper with Sidebar & PageWrapper */}
      <div className="flex flex-1 pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Sidebar />
        <PageWrapper>{children}</PageWrapper>
      </div>

      {/* Mobile bottom tab navigation */}
      <BottomNav />
    </div>
  );
}
