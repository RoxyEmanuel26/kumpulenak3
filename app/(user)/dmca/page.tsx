import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Copyright Policy",
  description: "Read the LustHub DMCA Copyright Policy — copyright respect, takedown request procedures, and counter-notification details.",
};

export default function DmcaPage() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl text-left text-white space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-purple-500 bg-clip-text text-transparent font-heading mb-4">
        DMCA Copyright Policy
      </h1>

      <p className="text-sm text-foreground/80 leading-relaxed">
        LustHub respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (&quot;DMCA&quot;), the text of which may be found on the U.S. Copyright Office website, we will respond expeditiously to claims of copyright infringement.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">1. DMCA Policy Overview</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        As a video search engine and indexer, LustHub does not host, upload, or store video files on its servers. We aggregate links and iframe players pointing to public third-party media suppliers. Under the Safe Harbor provisions of the DMCA (17 U.S.C. § 512), we respond to valid copyright infringement notifications by removing links to infringing material.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">2. Filing a DMCA Notice</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        If you are a copyright owner, authorized to act on behalf of one, or authorized to act under any exclusive right under copyright, please report alleged copyright infringements by sending a formal DMCA Notice to our designated Copyright Agent.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">3. Required Information for a Valid Notice</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        To be effective under the DMCA, your infringement notification must be a written communication that includes the following details:
      </p>
      <ul className="list-disc list-inside text-sm text-foreground/80 space-y-2 pl-4">
        <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
        <li>Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works.</li>
        <li>Identification of the material that is claimed to be infringing and that is to be removed or access to which is to be disabled, including the exact URL(s) or link locations on LustHub.</li>
        <li>Information reasonably sufficient to permit LustHub to contact you, such as an address, telephone number, and email address.</li>
        <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
        <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 text-white/90">4. Counter-Notification Process</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        If content you submitted has been removed due to a DMCA notice, you may file a counter-notification if you believe the removal was a result of mistake or misidentification. A valid counter-notification must be a written communication sent to our Copyright Agent containing:
      </p>
      <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1.5 pl-4">
        <li>Your physical or electronic signature.</li>
        <li>Identification of the material that has been removed and the location at which it appeared before removal.</li>
        <li>A statement under penalty of perjury that you have a good faith belief that the material was removed as a result of mistake or misidentification.</li>
        <li>Your name, address, telephone number, and a statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located, or if your address is outside the United States, for any judicial district in which LustHub may be found, and that you will accept service of process from the person who provided the original infringement notification.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 text-white/90">5. Repeat Infringer &amp; Account Termination Policy</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        LustHub maintains a strict policy to terminate access privileges, block syndication feeds, or restrict IP blocks of users and API channels who are determined to be repeat infringers.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">6. Abuse and False Claims Warning</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material or activity is infringing may be subject to liability for damages, including costs and attorneys&apos; fees, incurred by the alleged infringer or by LustHub.
      </p>

      <h2 className="text-xl font-bold mt-6 text-white/90">7. Contact Information</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        All DMCA notifications and counter-notifications should be addressed to:
      </p>
      <div className="bg-[#1A1A1A] border border-white/5 p-4 rounded-xl space-y-1 font-mono text-xs text-[#AAAAAA] mt-3">
        <p className="text-white font-semibold">LustHub Copyright Agent</p>
        <p>Email: <a href="mailto:dmca@lusthub.web.id" className="text-red-400 hover:underline">dmca@lusthub.web.id</a></p>
      </div>

      <h2 className="text-xl font-bold mt-6 text-white/90">8. Legal Notice &amp; Jurisdiction</h2>
      <p className="text-sm text-foreground/80 leading-relaxed">
        This DMCA Copyright Policy is governed by the applicable laws of the jurisdiction in which LustHub operates. LustHub operates in full compliance with the safe harbor regulations for service providers under applicable copyright law.
      </p>
    </div>
  );
}
