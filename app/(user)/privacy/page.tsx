import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - KumpulEnak",
  description: "Read our privacy policy regarding local storage settings, logging, and data safety.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl text-left text-white space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-purple-500 bg-clip-text text-transparent font-heading mb-4">
        Privacy Policy
      </h1>
      
      <p className="text-sm text-foreground/80 leading-relaxed">
        Your privacy is important to us. We operate KumpulEnak under privacy-by-design standards:
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">1. Local Configuration & Storage</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Your video likes and watch history are stored entirely locally on your own device using 
        browser-based <code className="bg-white/10 px-1 py-0.5 rounded text-xs">localStorage</code>. 
        We do not collect, send, or sell this personalized data to external servers. You can clear this history anytime 
        from the Library tab.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">2. Cookies</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        We only set standard technical cookies to support secure administrator session management 
        (e.g., <code className="bg-white/10 px-1 py-0.5 rounded text-xs">admin_session</code>). No third-party 
        tracking or advertising cookies are embedded.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">3. Third-Party Integrations</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        All video streams utilize standard iframe embeds directly from original suppliers. Please refer to 
        each platform&apos;s privacy policy for details on external player tracking.
      </p>
    </div>
  );
}
