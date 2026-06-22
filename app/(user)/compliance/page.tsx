import { Metadata } from "next";

export const metadata: Metadata = {
  title: "18 U.S.C. 2257 Compliance",
  description: "Read the LustHub 18 U.S.C. 2257 record-keeping compliance statement.",
};

export default function CompliancePage() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl text-left text-white space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-purple-500 bg-clip-text text-transparent font-heading mb-4">
        18 U.S.C. § 2257 Compliance Statement
      </h1>

      <p className="text-sm text-foreground/80 leading-relaxed">
        LustHub is a modern media indexer and video search platform. We take content compliance and federal record-keeping regulations with the utmost seriousness. The following statement sets forth our compliance procedures under 18 U.S.C. § 2257 and 28 C.F.R. Part 75.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">1. Record-Keeping Compliance Notice</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        For all visual depictions of actual or simulated sexually explicit conduct featured, displayed, or indexed on this website, the original records required to be maintained pursuant to 18 U.S.C. § 2257 and 28 C.F.R. Part 75 are kept by the respective primary producers of the content, who are responsible for verifying the age and identity of all performers depicted.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">2. Exemption Statement</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        LustHub does not produce, film, or co-produce any of the visual materials indexed or displayed on this platform. Pursuant to the federal record-keeping regulations, LustHub is exempt from the requirement to maintain records directly, as it acts solely as a secondary distributor or indexer. All record-keeping obligations remain with the primary producers who generated the material.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">3. Third-Party Content &amp; Indexing</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        All media streams and video players visible on this site are integrated via iframe embeds from third-party suppliers (such as public tube networks). The hosting platforms are the primary producers under the law. We monitor external suppliers to ensure compliance. If you believe any indexed content violates record-keeping rules, please report it immediately using our contact channels.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">4. Age Verification &amp; Producer Definitions</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        All primary producers uploading or serving content to this platform are required by law, contract, and industry standards to certify that:
      </p>
      <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1.5 pl-4">
        <li>Every performer depicted in the content was 18 years of age or older at the time of creation.</li>
        <li>They have obtained and verified government-issued identification for every depicted performer.</li>
        <li>They maintain all records required under 18 U.S.C. § 2257 at their corporate offices.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 text-white/90">5. Custodian of Records</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Inquiries regarding compliance, record-keeping documentation, or primary producer details can be directed to our designated agent:
      </p>
      <div className="bg-[#1A1A1A] border border-white/5 p-4 rounded-xl space-y-1 font-mono text-xs text-[#AAAAAA] mt-3">
        <p className="text-white font-semibold">LustHub Compliance Operations</p>
        <p>Attention: Custodian of Records</p>
        <p>Email: <a href="mailto:compliance@lusthub.web.id" className="text-red-400 hover:underline">compliance@lusthub.web.id</a></p>
      </div>

      <h2 className="text-xl font-bold mt-6 text-white/90">6. Legal Jurisdiction</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        This compliance statement is issued pursuant to applicable law. LustHub reserves the right to amend, update, or remove content links that fail to verify or provide satisfactory documentation of compliance with these regulations.
      </p>
    </div>
  );
}
