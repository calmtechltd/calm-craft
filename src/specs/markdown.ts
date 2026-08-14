import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
] as const;

export type RenderedMarkdown = {
  html: string;
  changed: boolean;
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: { a: ["href", "title", "target", "rel"] },
  allowedSchemes: ["https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
};

export function renderMarkdown(markdown: string): RenderedMarkdown {
  const rendered = marked.parse(markdown, { async: false, gfm: true });
  const sanitized = sanitizeHtml(rendered, SANITIZE_OPTIONS);
  const html = sanitizeHtml(rendered, {
    ...SANITIZE_OPTIONS,
    transformTags: {
      a: (tagName, attributes) => {
        const href = attributes.href ?? "";
        if (!/^https:/iu.test(href)) return { tagName, attribs: attributes };
        return {
          tagName,
          attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" },
        };
      },
    },
  });
  return { html, changed: sanitized !== rendered };
}
