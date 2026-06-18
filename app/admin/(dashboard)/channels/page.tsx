"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Trash2, Sliders, Bot, Send, Check, AlertCircle } from "lucide-react";

interface TelegramBot {
  id: string;
  name: string;
  username: string | null;
}

interface TelegramChannel {
  id: string;
  name: string;
  isActive: boolean;
  template: string | null;
  routingRules: {
    order?: "latest" | "top-rated" | null;
    tags?: string[];
    categories?: string[];
  } | null;
  botId: string | null;
  bot: TelegramBot | null;
}

export default function ChannelsAdmin() {
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [template, setTemplate] = useState("");
  const [botId, setBotId] = useState("");
  
  // Routing rules states
  const [order, setOrder] = useState<"latest" | "top-rated">("latest");
  const [categoriesInput, setCategoriesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  const fetchBotsAndChannels = async () => {
    try {
      const [channelsRes, botsRes] = await Promise.all([
        fetch("/api/admin/channels"),
        fetch("/api/admin/bots"),
      ]);

      if (!channelsRes.ok || !botsRes.ok) throw new Error("Failed to fetch data from API.");

      const channelsData = await channelsRes.json();
      const botsData = await botsRes.json();

      setChannels(channelsData);
      setBots(botsData);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBotsAndChannels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitLoading(true);

    const routingRules = {
      order: order || "latest",
      categories: categoriesInput ? categoriesInput.split(",").map((c) => c.trim()).filter(Boolean) : [],
      tags: tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          isActive,
          template: template || null,
          botId: botId || null,
          routingRules,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save channel.");
      }

      setSuccess(`Channel "${data.name}" successfully saved!`);
      resetForm();
      fetchBotsAndChannels();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (ch: TelegramChannel) => {
    setIsEditing(true);
    setId(ch.id);
    setName(ch.name);
    setIsActive(ch.isActive);
    setTemplate(ch.template || "");
    setBotId(ch.botId || "");
    
    // Parse routing rules
    if (ch.routingRules) {
      setOrder(ch.routingRules.order || "latest");
      setCategoriesInput(ch.routingRules.categories ? ch.routingRules.categories.join(", ") : "");
      setTagsInput(ch.routingRules.tags ? ch.routingRules.tags.join(", ") : "");
    } else {
      setOrder("latest");
      setCategoriesInput("");
      setTagsInput("");
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this Telegram channel?")) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/channels?id=${channelId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete channel.");
      }

      setSuccess("Channel deleted successfully.");
      fetchBotsAndChannels();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setId("");
    setName("");
    setIsActive(true);
    setTemplate("");
    setBotId("");
    setOrder("latest");
    setCategoriesInput("");
    setTagsInput("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Telegram Channels</h1>
        <p className="text-muted-foreground text-sm">
          Manage destination channels for Telegram broadcasts, configure sending bots, and set video filtering criteria
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Add/Edit Channel Form */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 xl:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              {isEditing ? "Edit Channel" : "Add New Channel"}
            </CardTitle>
            <CardDescription className="text-xs">
              Configure the channel and its automatic content filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-md text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 text-green-500 border border-green-500/20 p-3 rounded-md text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Channel ID</label>
                <Input
                  type="text"
                  placeholder="@my_channel or -10012345678"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                  disabled={isEditing || submitLoading}
                  className="bg-background/50 border-white/10 text-xs focus-visible:ring-primary/50 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Channel Name (Label)</label>
                <Input
                  type="text"
                  placeholder="Latest Collection"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitLoading}
                  className="bg-background/50 border-white/10 text-xs focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Telegram Sending Bot</label>
                <select
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  disabled={submitLoading}
                  className="w-full bg-background/50 border border-white/10 rounded-md text-xs p-2 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground cursor-pointer"
                >
                  <option value="">Default Bot (from .env file)</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      @{bot.username} ({bot.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-muted/20 border border-white/5 rounded-lg space-y-3">
                <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" />
                  Smart Routing
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Content Order / Rating</label>
                  <select
                    value={order}
                    onChange={(e) => setOrder(e.target.value as "latest" | "top-rated")}
                    disabled={submitLoading}
                    className="w-full bg-background/50 border border-white/10 rounded-md text-[11px] p-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground cursor-pointer"
                  >
                    <option value="latest">All New Videos (Latest)</option>
                    <option value="top-rated">Only High Rating (Top-Rated &gt;= 90%)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Category Filter (comma-separated)</label>
                  <Input
                    type="text"
                    placeholder="Teen, Amateur, POV"
                    value={categoriesInput}
                    onChange={(e) => setCategoriesInput(e.target.value)}
                    disabled={submitLoading}
                    className="bg-background/50 border-white/10 text-[11px] h-8 focus-visible:ring-primary/50"
                  />
                  <p className="text-[9px] text-muted-foreground">Leave blank to allow all categories</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Tag Filter (comma-separated)</label>
                  <Input
                    type="text"
                    placeholder="college, blonde, milf"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    disabled={submitLoading}
                    className="bg-background/50 border-white/10 text-[11px] h-8 focus-visible:ring-primary/50"
                  />
                  <p className="text-[9px] text-muted-foreground">Leave blank to allow all tags</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Custom Message Template (Optional)</label>
                <textarea
                  placeholder="🎬 {title}&#10;⏱ Duration: {duration}&#10;⭐ Rating: {rating}"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  disabled={submitLoading}
                  className="w-full h-20 bg-background/50 border border-white/10 rounded-md text-xs p-2 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={submitLoading}
                  className="rounded border-white/10 text-primary focus:ring-primary/50 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-muted-foreground cursor-pointer">
                  Active Channel (Receives Broadcasts)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 text-xs font-medium" disabled={submitLoading}>
                  {submitLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEditing ? (
                    "Save Changes"
                  ) : (
                    "Add Channel"
                  )}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" className="text-xs font-medium" onClick={resetForm} disabled={submitLoading}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Channels Table */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Configured Channels</CardTitle>
            <CardDescription className="text-xs">
              List of active channels with sending bots and routing filter rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-hidden border border-white/5 rounded-lg">
                <Table>
                  <TableHeader className="bg-background/50">
                    <TableRow>
                      <TableHead>Channel ID</TableHead>
                      <TableHead>Channel Name</TableHead>
                      <TableHead>Sending Bot</TableHead>
                      <TableHead>Routing Filter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.map((ch) => (
                      <TableRow key={ch.id} className="hover:bg-muted/10 border-white/5">
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate" title={ch.id}>
                          {ch.id}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">{ch.name}</TableCell>
                        <TableCell className="text-xs">
                          {ch.bot ? (
                            <span className="flex items-center gap-1.5 text-primary">
                              <Bot className="h-3.5 w-3.5 shrink-0" />
                              @{ch.bot.username}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Default Bot</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="space-y-1 text-[11px] text-muted-foreground">
                            {ch.routingRules?.order && (
                              <div>Order: <span className="text-foreground font-semibold">{ch.routingRules.order}</span></div>
                            )}
                            {ch.routingRules?.categories && ch.routingRules.categories.length > 0 && (
                              <div className="truncate" title={ch.routingRules.categories.join(", ")}>
                                Categories: <span className="text-primary">{ch.routingRules.categories.join(", ")}</span>
                              </div>
                            )}
                            {ch.routingRules?.tags && ch.routingRules.tags.length > 0 && (
                              <div className="truncate" title={ch.routingRules.tags.join(", ")}>
                                Tags: <span className="text-emerald-400">{ch.routingRules.tags.join(", ")}</span>
                              </div>
                            )}
                            {(!ch.routingRules?.order && (!ch.routingRules?.categories || ch.routingRules.categories.length === 0) && (!ch.routingRules?.tags || ch.routingRules.tags.length === 0)) && (
                              <span className="text-muted-foreground/60 italic">All Incoming Content</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ch.isActive ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-1.5 py-0 h-5">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0 h-5">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(ch)}
                              className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-md transition-colors cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ch.id)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {channels.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-xs">
                          No Telegram channels configured yet.
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
    </div>
  );
}
