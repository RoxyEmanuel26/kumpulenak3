"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Play, Database } from "lucide-react";

interface QueueMetrics {
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  waiting: number;
}

interface QueueData {
  queues: {
    sync: QueueMetrics;
    broadcast: QueueMetrics;
  };
  recentBroadcasts: Array<{
    id: string;
    videoId: string;
    channelId: string;
    status: "PENDING" | "SENT" | "FAILED";
    retryCount: number;
    errorMessage: string | null;
    updatedAt: string;
    video: { title: string };
    channel: { name: string };
  }>;
  recentFailed: Array<{
    id: string;
    videoId: string;
    channelId: string;
    retryCount: number;
    errorMessage: string | null;
    updatedAt: string;
    video: { title: string };
    channel: { name: string };
  }>;
}

export default function WorkersDashboard() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const handleTriggerSync = async () => {
    setSyncLoading(true);
    setSyncSuccess(null);
    try {
      const res = await fetch("/api/admin/queues", { method: "POST" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Gagal memicu sinkronisasi.");
      setSyncSuccess("Sukses: Pekerjaan sinkronisasi konten berhasil dimasukkan ke antrean worker!");
      fetchData();
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queues");
      if (!res.ok) throw new Error("Gagal mengambil data dari API.");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const getStatusBadge = (status: "PENDING" | "SENT" | "FAILED") => {
    switch (status) {
      case "SENT":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">SENT</Badge>;
      case "FAILED":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">FAILED</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">PENDING</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Workers</h1>
          <p className="text-muted-foreground text-sm">
            Pantau status antrean BullMQ dan pengiriman Telegram secara langsung
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerSync}
            disabled={syncLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary/95 text-white border-0 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {syncLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Mulai Sync Manual
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
              autoRefresh
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-white/5"
            }`}
          >
            {autoRefresh ? "● Auto Refresh ON" : "Auto Refresh OFF"}
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            disabled={loading}
            className="p-2 border border-white/10 hover:bg-muted rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {syncSuccess && (
        <div className="bg-green-500/10 text-green-500 border border-green-500/20 p-4 rounded-lg flex items-center gap-2 text-sm animate-in fade-in">
          <CheckCircle className="h-4 w-4" />
          <span>{syncSuccess}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Queue */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-sky-400" />
                Sync Content Queue
              </CardTitle>
              <CardDescription className="text-xs">Antrean penarikan video terbaru Eporner</CardDescription>
            </div>
            <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20">sync-queue</Badge>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 text-center mt-2">
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-sky-400">{data?.queues.sync.active || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Active</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-yellow-400">{data?.queues.sync.waiting || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Waiting</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-purple-400">{data?.queues.sync.delayed || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Delayed</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-green-500">{data?.queues.sync.completed || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Completed</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-red-500">{data?.queues.sync.failed || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Failed</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcast Queue */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-400" />
                Telegram Broadcast Queue
              </CardTitle>
              <CardDescription className="text-xs">Antrean pengiriman notifikasi Telegram</CardDescription>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">broadcast-queue</Badge>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 text-center mt-2">
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-emerald-400">{data?.queues.broadcast.active || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Active</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-yellow-400">{data?.queues.broadcast.waiting || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Waiting</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-purple-400">{data?.queues.broadcast.delayed || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Delayed</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-green-500">{data?.queues.broadcast.completed || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Completed</div>
                </div>
                <div className="p-2 bg-background/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-red-500">{data?.queues.broadcast.failed || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Failed</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Telegram Deliveries */}
      <Card className="bg-card/40 backdrop-blur-sm border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Play className="h-4 w-4 text-primary animate-pulse" />
            Live Telegram Deliveries
          </CardTitle>
          <CardDescription>Log pengiriman pesan terbaru ke berbagai channel Telegram</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-hidden border border-white/5 rounded-lg">
              <Table>
                <TableHeader className="bg-background/50">
                  <TableRow>
                    <TableHead>Video</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Retries</TableHead>
                    <TableHead>Waktu Update</TableHead>
                    <TableHead>Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentBroadcasts.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/10 border-white/5">
                      <TableCell className="font-medium max-w-[200px] truncate" title={log.video?.title}>
                        {log.video?.title || `ID: ${log.videoId}`}
                      </TableCell>
                      <TableCell>{log.channel?.name || log.channelId}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-center font-mono">{log.retryCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.updatedAt).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-xs text-red-400 font-mono max-w-[200px] truncate" title={log.errorMessage || ""}>
                        {log.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.recentBroadcasts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Belum ada data pengiriman Telegram.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
