import { prisma } from "../../../lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const totalVideos = await prisma.video.count();
  const activeChannels = await prisma.telegramChannel.count({ where: { isActive: true } });
  const pendingBroadcasts = await prisma.broadcastLog.count({ where: { status: "PENDING" } });
  const sentBroadcasts = await prisma.broadcastLog.count({ where: { status: "SENT" } });
  const failedBroadcasts = await prisma.broadcastLog.count({ where: { status: "FAILED" } });
  
  const recentSyncs = await prisma.syncJob.findMany({
    take: 5,
    orderBy: { runStartedAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVideos.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeChannels}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{sentBroadcasts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingBroadcasts.toLocaleString()} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Broadcasts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{failedBroadcasts.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSyncs.map(job => (
                <div key={job.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{new Date(job.runStartedAt).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Status: <span className={job.status === 'COMPLETED' ? 'text-green-500' : 'text-yellow-500'}>{job.status}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-400">+{job.itemsAdded} added</p>
                    <p className="text-xs text-muted-foreground mt-1">{job.itemsProcessed} processed</p>
                  </div>
                </div>
              ))}
              {recentSyncs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No sync jobs run yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
