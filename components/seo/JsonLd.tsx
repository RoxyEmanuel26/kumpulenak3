/**
 * components/seo/JsonLd.tsx
 *
 * Reusable, XSS-safe JSON-LD structured data injector.
 * Sanitizes opening angle brackets to prevent script injection exploits.
 * Works seamlessly with both single schema objects and array graphs.
 */

interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data)
    ? {
        "@context": "https://schema.org",
        "@graph": data.map((item) => {
          const { "@context": _, ...rest } = item;
          return rest;
        }),
      }
    : (data["@context"]
        ? data
        : { "@context": "https://schema.org", ...data });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}
