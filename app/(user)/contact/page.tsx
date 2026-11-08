import { Metadata } from "next";
import { ContactForm } from "@/components/layout/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.lusthub.web.id";

export const metadata: Metadata = {
  title: "Contact Support & Inquiries",
  description: "Contact the LustHub team for support, business inquiries, content takedown requests, or technical feedback.",
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    title: "Contact Us — LustHub",
    description: "Contact the LustHub team for support, business inquiries, or technical feedback.",
    type: "website",
    url: `${SITE_URL}/contact`,
    siteName: "LustHub",
  },
};

export default function ContactPage() {
  const contactJsonLd = [
    {
      "@type": "ContactPage",
      "@id": `${SITE_URL}/contact#contactpage`,
      "name": "Contact LustHub",
      "url": `${SITE_URL}/contact`,
      "description": "Contact LustHub support, administration, and compliance officers.",
      "isPartOf": { "@id": `${SITE_URL}/#website` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/contact#breadcrumb`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": SITE_URL,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Contact",
          "item": `${SITE_URL}/contact`,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={contactJsonLd} />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <ContactForm />
      </div>
    </>
  );
}
