// Outputs structured data (schema.org JSON-LD) for search engines. "<" is escaped so the
// content can never close the <script> tag early.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
