import { stripHtml } from "@/lib/formatters";

type DescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: "Product details" | "Care" }
  | { type: "list"; items: string[] };

/** Recognize only the catalog's plain-text contract; render all content as text. */
function parseDescription(description: string | null | undefined): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];

  function flushParagraph() {
    const text = stripHtml(paragraph.join(" "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  }

  function flushList() {
    if (items.length) blocks.push({ type: "list", items });
    items = [];
  }

  for (const rawLine of (description ?? "").split(/\r\n|\r|\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
    } else if (/^(Product details|Care):?$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        text: line.startsWith("Product details") ? "Product details" : "Care",
      });
    } else if (/^[-•] /.test(line)) {
      flushParagraph();
      const text = stripHtml(line.slice(2));
      if (text) items.push(text);
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function ProductDescription({ description }: { description: string | null | undefined }) {
  const blocks = parseDescription(description);
  if (!blocks.length) return <p>No description available for this product yet.</p>;

  return (
    <div className="space-y-3 [overflow-wrap:anywhere]">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h4 key={index} className="text-foreground pt-1 text-sm font-semibold">
              {block.text}
            </h4>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
