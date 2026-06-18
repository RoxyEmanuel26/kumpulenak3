"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const subject = encodeURIComponent(`Contact from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
      window.open(`mailto:admin@kumpulenak.com?subject=${subject}&body=${body}`, '_blank');
      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Failed to open email client. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-4 bg-background relative overflow-hidden">
      <div className="absolute left-10 bottom-10 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row gap-12">
          
          {/* Left Column: Contact Form */}
          <div className="w-full md:w-3/5 text-left space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                CONTACT US
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
                Send Message to Administrator
              </h2>
              <p className="text-xs text-muted-foreground">
                Ask questions, leave suggestions, or report system aggregator bugs.
              </p>
            </div>

            {success ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center space-y-4 animate-in zoom-in-95">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
                <div>
                  <h3 className="font-bold text-lg text-white">Message Sent!</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thank you for contacting us. We will respond via email as soon as possible.
                  </p>
                </div>
                <Button 
                  onClick={() => setSuccess(false)}
                  variant="outline" 
                  className="text-xs font-semibold rounded-xl border-white/5 cursor-pointer"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name Input */}
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder=" "
                    disabled={loading}
                    className="peer w-full bg-card/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 pt-6 pb-2.5 text-xs text-white placeholder-transparent outline-none transition-all duration-300 focus:bg-card/70"
                  />
                  <label 
                    htmlFor="name" 
                    className="absolute left-4 top-2 text-[10px] text-muted-foreground uppercase font-mono tracking-wider transition-all duration-300 peer-placeholder-shown:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:font-sans peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-mono peer-focus:tracking-wider peer-focus:text-primary cursor-text"
                  >
                    Full Name
                  </label>
                </div>

                {/* Email Input */}
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    disabled={loading}
                    className="peer w-full bg-card/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 pt-6 pb-2.5 text-xs text-white placeholder-transparent outline-none transition-all duration-300 focus:bg-card/70"
                  />
                  <label 
                    htmlFor="email" 
                    className="absolute left-4 top-2 text-[10px] text-muted-foreground uppercase font-mono tracking-wider transition-all duration-300 peer-placeholder-shown:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:font-sans peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-mono peer-focus:tracking-wider peer-focus:text-primary cursor-text"
                  >
                    Email Address
                  </label>
                </div>

                {/* Message Input */}
                <div className="relative">
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder=" "
                    disabled={loading}
                    className="peer w-full bg-card/40 border border-white/10 focus:border-primary/50 rounded-xl px-4 pt-6 pb-2.5 text-xs text-white placeholder-transparent outline-none transition-all duration-300 focus:bg-card/70 min-h-[100px] resize-y"
                  />
                  <label 
                    htmlFor="message" 
                    className="absolute left-4 top-2 text-[10px] text-muted-foreground uppercase font-mono tracking-wider transition-all duration-300 peer-placeholder-shown:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:font-sans peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-mono peer-focus:tracking-wider peer-focus:text-primary cursor-text"
                  >
                    Your Message
                  </label>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-premium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4 shrink-0" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Right Column: Contact info cards */}
          <div className="w-full md:w-2/5 flex flex-col justify-start space-y-6">
            <Card className="glass-card bg-card/30 border-white/5 shadow-premium">
              <CardContent className="p-6 space-y-6 text-left">
                <h3 className="font-bold text-white text-lg">Contact Information</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We are always open to discussing new feed feature additions, bot script optimization, and other business collaborations.
                </p>

                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex items-center gap-3 group">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary transition-transform duration-300 group-hover:scale-110"><Mail className="h-4.5 w-4.5" /></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase">Email Address</div>
                      <a href="mailto:admin@kumpulenak.com" className="text-xs font-semibold text-white hover:text-primary transition-colors">admin@kumpulenak.com</a>
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className="flex items-center gap-3 group">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 transition-transform duration-300 group-hover:scale-110"><MessageCircle className="h-4.5 w-4.5" /></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase">Telegram Support</div>
                      <a href="https://t.me/kumpulenak_support" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white hover:text-primary transition-colors">@kumpulenak_support</a>
                    </div>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-white/5" />
                <p className="text-[10px] text-muted-foreground font-mono uppercase">
                  OPERATIONAL TIME: 24/7 AUTOMATED SYSTEM
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </section>
  );
}
