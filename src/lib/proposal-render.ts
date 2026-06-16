import { marked } from "marked";
import DOMPurifyImport from "dompurify";

/**
 * Resolve o DOMPurify de forma robusta entre bundlers: às vezes o `default`
 * vem como uma fábrica não inicializada (sem `.sanitize`); nesse caso a
 * inicializamos com `window`. Evita "sanitize is not a function" no browser.
 */
type Sanitizer = { sanitize: (html: string, cfg?: unknown) => string };
const candidate = DOMPurifyImport as unknown as
  | Sanitizer
  | ((w: Window) => Sanitizer);
const DOMPurify: Sanitizer =
  typeof (candidate as Sanitizer).sanitize === "function"
    ? (candidate as Sanitizer)
    : (candidate as (w: Window) => Sanitizer)(window);

/** Conteúdo colado como arquivo .html completo (<!doctype html> ou <html>). */
function isFullHtmlDocument(content: string): boolean {
  const t = content.trimStart();
  return /^<!doctype\s+html/i.test(t) || /^<html[\s>]/i.test(t);
}

const SANITIZE_OPTS = {
  WHOLE_DOCUMENT: true,
  ADD_TAGS: ["link"],
  ADD_ATTR: ["crossorigin", "rel", "href", "target"],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "base"],
};

function sanitizeHtml(html: string): string {
  try {
    return DOMPurify.sanitize(html, SANITIZE_OPTS);
  } catch {
    return html;
  }
}

/**
 * Converte fragmento Markdown/HTML em HTML sanitizado (sem documento completo).
 * O `marked` repassa HTML embutido adiante; o DOMPurify remove scripts/on*.
 */
export function renderProposalContent(content: string): string {
  let rawHtml: string;
  try {
    rawHtml = marked.parse(content ?? "", { async: false }) as string;
  } catch {
    rawHtml = content ?? "";
  }
  return sanitizeHtml(rawHtml);
}

/**
 * CSS base (reset + tipografia legível) injetado dentro do iframe. Como o
 * conteúdo é renderizado num `<iframe srcDoc>`, ele fica totalmente isolado
 * do CSS global do app (e vice-versa): nada do Tailwind/estilos do site
 * vaza para dentro, nem o CSS da proposta afeta o app.
 */
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.65;
    color: #1f2937;
    background: #ffffff;
    padding: 32px;
    max-width: 860px;
    margin: 0 auto;
    word-wrap: break-word;
  }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.6em 0 0.6em; font-weight: 700; color: #111827; }
  h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  p { margin: 0 0 1em; }
  a { color: #4f46e5; text-decoration: underline; }
  ul, ol { padding-left: 1.6em; margin: 0 0 1em; }
  li { margin: 0.25em 0; }
  blockquote {
    margin: 0 0 1em; padding: 0.4em 1em; color: #4b5563;
    border-left: 4px solid #c7d2fe; background: #f8fafc;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em;
  }
  pre {
    background: #0f172a; color: #e2e8f0; padding: 1em; border-radius: 8px;
    overflow: auto; margin: 0 0 1em;
  }
  pre code { background: transparent; padding: 0; color: inherit; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }
  th, td { border: 1px solid #e5e7eb; padding: 0.5em 0.75em; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2em 0; }
`;

/**
 * Monta documento HTML para fragmentos Markdown/HTML (não documentos completos).
 */
export function buildProposalSrcDoc(sanitizedHtml: string, title = ""): string {
  const safeTitle = (title || "Proposta")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>${BASE_CSS}</style>
</head>
<body>${sanitizedHtml}</body>
</html>`;
}

/**
 * Conteúdo bruto → documento completo para o iframe.
 * HTML completo (.html colado) vai direto, sem embrulhar de novo.
 * Fragmentos Markdown/HTML recebem o shell com CSS base.
 */
export function proposalToSrcDoc(content: string, title = ""): string {
  const raw = content ?? "";
  if (isFullHtmlDocument(raw)) {
    return sanitizeHtml(raw);
  }
  return buildProposalSrcDoc(renderProposalContent(raw), title);
}
