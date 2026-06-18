"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, BarChart2, TrendingUp, Users, MousePointer, Clock, Award } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalVideos: number;
    totalBroadcasts: number;
    totalClicks: number;
    ctr: string;
  };
  ctrChart: Array<{
    label: string;
    ctr: number;
    sent: number;
    clicks: number;
  }>;
  hourlyChart: Array<{
    hour: string;
    clicks: number;
  }>;
  channelChart: Array<{
    name: string;
    sent: number;
    clicks: number;
    ctr: number;
  }>;
  topVideos: Array<{
    id: string;
    title: string;
    clicks: number;
    views: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Gagal memuat data analitik.");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-lg flex items-center gap-2">
        <span>Gagal memuat analitik: {error || "Data kosong"}</span>
      </div>
    );
  }

  const { summary, ctrChart, hourlyChart, channelChart, topVideos } = data;

  // Find max values for chart scaling
  const maxCtrVal = Math.max(...ctrChart.map((d) => d.ctr), 10);
  const maxHourlyClicks = Math.max(...hourlyChart.map((d) => d.clicks), 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Statistik performa pengiriman Telegram, Click-Through Rate (CTR), dan ketertarikan penonton secara real-time
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchAnalytics();
          }}
          className="p-2 border border-white/10 hover:bg-muted rounded-md transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-sky-400 bg-sky-500/10 p-2 rounded-lg"><BarChart2 className="h-5 w-5" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Video</CardDescription>
            <CardTitle className="text-3xl font-bold">{summary.totalVideos.toLocaleString("id-ID")}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-[10px] text-muted-foreground">Video disinkronkan ke database</p></CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-white/5 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-emerald-400 bg-emerald-500/10 p-2 rounded-lg"><TrendingUp className="h-5 w-5" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Terkirim</CardDescription>
            <CardTitle className="text-3xl font-bold">{summary.totalBroadcasts.toLocaleString("id-ID")}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-[10px] text-muted-foreground">Notifikasi Telegram sukses terkirim</p></CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-white/5 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-purple-400 bg-purple-500/10 p-2 rounded-lg"><MousePointer className="h-5 w-5" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Klik Telegram</CardDescription>
            <CardTitle className="text-3xl font-bold">{summary.totalClicks.toLocaleString("id-ID")}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-[10px] text-muted-foreground">Klik link video dari Telegram</p></CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-white/5 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-primary bg-primary/10 p-2 rounded-lg"><Users className="h-5 w-5" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Click-Through Rate</CardDescription>
            <CardTitle className="text-3xl font-bold">{summary.ctr}%</CardTitle>
          </CardHeader>
          <CardContent><p className="text-[10px] text-muted-foreground">Rasio klik dibanding pesan terkirim</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CTR last 7 days chart */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Perkembangan CTR Harian (7 Hari Terakhir)
            </CardTitle>
            <CardDescription className="text-xs">Rata-rata persentase CTR notifikasi harian</CardDescription>
          </CardHeader>
          <CardContent>
            {/* SVG CTR Chart */}
            <div className="h-64 w-full flex items-end justify-between gap-4 pt-6 px-2 border-b border-white/10 font-mono text-[10px]">
              {ctrChart.map((d, index) => {
                const heightPercent = `${(d.ctr / maxCtrVal) * 85 + 5}%`;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-white/15 px-2 py-1 rounded text-center shadow-xl pointer-events-none z-20 w-24">
                      <div className="font-bold text-primary">{d.ctr}% CTR</div>
                      <div className="text-[9px] text-muted-foreground">{d.clicks} klik / {d.sent} kirim</div>
                    </div>
                    {/* Bar */}
                    <div className="w-full bg-primary/20 group-hover:bg-primary/40 border-t border-primary rounded-t transition-all relative flex flex-col justify-end overflow-hidden" style={{ height: heightPercent }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-primary/30" />
                      <div className="text-center pb-1 text-[9px] font-bold text-white relative z-10">{d.ctr}%</div>
                    </div>
                    {/* Axis Label */}
                    <span className="text-muted-foreground text-[10px] mt-1 shrink-0">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Clicks chart */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" />
              Rasio Klik Berdasarkan Jam (30 Hari Terakhir)
            </CardTitle>
            <CardDescription className="text-xs">Waktu paling aktif penonton membuka link Telegram</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Horizontal Line Chart or Scrollable Bar Chart */}
            <div className="overflow-x-auto">
              <div className="h-64 min-w-[600px] flex items-end justify-between gap-2 pt-6 px-2 border-b border-white/10 font-mono text-[9px]">
                {hourlyChart.map((d, index) => {
                  const heightPercent = `${(d.clicks / maxHourlyClicks) * 85 + 5}%`;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-pointer relative">
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-white/15 px-1.5 py-0.5 rounded text-center pointer-events-none z-20 w-16">
                        <div className="font-bold text-sky-400">{d.clicks} klik</div>
                      </div>
                      <div className="w-full bg-sky-500/20 group-hover:bg-sky-500/40 border-t border-sky-400 rounded-t transition-all relative flex flex-col justify-end" style={{ height: heightPercent }}>
                        {d.clicks > 0 && (
                          <div className="text-center pb-1 text-[8px] font-bold text-white relative z-10">{d.clicks}</div>
                        )}
                      </div>
                      <span className="text-muted-foreground text-[8px] mt-1 shrink-0 -rotate-45 origin-top-left">{d.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel CTR Leaderboard */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-400" />
              Performa Channel Telegram
            </CardTitle>
            <CardDescription className="text-xs">Performa pengiriman dan CTR per channel Telegram aktif</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden border border-white/5 rounded-lg">
              <Table>
                <TableHeader className="bg-background/50">
                  <TableRow>
                    <TableHead>Nama Channel</TableHead>
                    <TableHead className="text-center">Total Kirim</TableHead>
                    <TableHead className="text-center">Total Klik</TableHead>
                    <TableHead className="text-right">Click-Through Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelChart.map((ch, index) => (
                    <TableRow key={index} className="hover:bg-muted/10 border-white/5 text-xs">
                      <TableCell className="font-semibold">{ch.name}</TableCell>
                      <TableCell className="text-center font-mono">{ch.sent}</TableCell>
                      <TableCell className="text-center font-mono">{ch.clicks}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{ch.ctr}%</TableCell>
                    </TableRow>
                  ))}
                  {channelChart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Belum ada channel Telegram yang aktif.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Videos by clicks */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" />
              Top 5 Video Terpopuler (Telegram)
            </CardTitle>
            <CardDescription className="text-xs">Video paling banyak diklik dari postingan Telegram</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVideos.map((video, index) => (
                <div key={video.id} className="flex items-center gap-3 p-2 bg-background/30 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate" title={video.title}>
                      {video.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex gap-3 mt-1 font-mono">
                      <span>🖱 {video.clicks} Klik</span>
                      <span>👁 {video.views.toLocaleString()} Views</span>
                    </div>
                  </div>
                </div>
              ))}
              {topVideos.length === 0 && (
                <div className="text-center text-muted-foreground py-12 text-xs">
                  Belum ada data interaksi klik pada video.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
