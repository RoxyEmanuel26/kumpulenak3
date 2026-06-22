import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the LustHub Terms of Service regarding platform utilization, content attribution, and limitations of liability.",
  alternates: {
    canonical: "https://lusthub.web.id/terms",
  },
};


export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl text-left text-white space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-purple-500 bg-clip-text text-transparent font-heading mb-4">
        Terms of Service
      </h1>
      
      <p className="text-sm text-foreground/80 leading-relaxed">
        Welcome to LustHub. By accessing our platform, you agree to the following terms:
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">1. Usage Limitation</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        This platform is designed for automated indexing and media curation purposes. You agree not to abuse 
        our endpoints or queue synchronization servers with malicious payloads or high-volume automated requests.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">2. Content Attribution</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        LustHub is a search aggregator. We do not host or compile media files. All streams are served via 
        standard iframe integrations directly from third-party media suppliers.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">3. Disclaimer of Liability</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        The system is provided &quot;as is&quot; without warranties of any kind. Administrators reserve the right to 
        update synchronization schedules, categories, or filtering parameters at their sole discretion.
      </p>
    </div>
  );
}
