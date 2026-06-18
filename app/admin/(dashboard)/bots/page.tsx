"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Loader2, Plus, Trash2, Bot, Check, AlertCircle } from "lucide-react";

interface TelegramBot {
  id: string;
  token: string;
  name: string;
  username: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function BotsManagement() {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBots = async () => {
    try {
      const res = await fetch("/api/admin/bots");
      if (!res.ok) throw new Error("Failed to retrieve bot data.");
      const data = await res.json();
      setBots(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBots();
  }, []);

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitLoading(true);

    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save Telegram bot.");
      }

      setSuccess(`Bot @${data.username} (${data.name}) successfully registered!`);
      setTokenInput("");
      fetchBots();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Telegram bot? All channels using this bot will revert to using the default bot.")) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/bots?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete bot.");
      }

      setSuccess("Bot deleted successfully.");
      fetchBots();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    }
  };

  const maskToken = (token: string) => {
    if (token.length < 15) return token;
    const parts = token.split(":");
    if (parts.length === 2) {
      return `${parts[0]}:••••••••••••••••••••${parts[1].slice(-4)}`;
    }
    return `${token.slice(0, 5)}••••••••••••••••${token.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Telegram Multi-Bot</h1>
        <p className="text-muted-foreground text-sm">
          Register and manage multiple Telegram bots to distribute the broadcast notification load across different channels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Register Bot Form */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Register New Bot
            </CardTitle>
            <CardDescription className="text-xs">
              Enter the bot token from @BotFather. The system will automatically fetch the name and username.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddBot} className="space-y-4">
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
                <label className="text-xs font-medium text-muted-foreground">Bot Token</label>
                <Input
                  type="text"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                  disabled={submitLoading}
                  className="bg-background/50 border-white/10 text-xs focus-visible:ring-primary/50"
                />
              </div>

              <Button type="submit" className="w-full text-xs font-medium" disabled={submitLoading}>
                {submitLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 h-4 w-4" />
                    Connect Bot
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bot List Table */}
        <Card className="bg-card/40 backdrop-blur-sm border-white/5 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Registered Bots</CardTitle>
            <CardDescription className="text-xs">
              List of active Telegram bots that can be paired with channels
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
                      <TableHead>Bot Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bots.map((bot) => (
                      <TableRow key={bot.id} className="hover:bg-muted/10 border-white/5">
                        <TableCell className="font-semibold text-sm">{bot.name}</TableCell>
                        <TableCell className="text-primary text-xs">
                          {bot.username ? `@${bot.username}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {maskToken(bot.token)}
                        </TableCell>
                        <TableCell>
                          {bot.isActive ? (
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
                          <button
                            onClick={() => handleDeleteBot(bot.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {bots.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs">
                          No custom bots registered yet. The system will use the default bot from the .env file.
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
