import { redirect, RedirectType } from "next/navigation";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  // Belt-and-suspenders: primary redirect is the 301 in next.config.ts.
  // Both now point to the canonical /watch/{id} path.
  redirect(`/watch/${resolvedParams.id}`, RedirectType.permanent);
}
