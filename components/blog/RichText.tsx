import Link from 'next/link';
import type { ReactNode } from 'react';

// Renders the light formatting allowed in blog text: **bold**, *italic* and [label](url).
// Everything else is plain text, so nothing typed in the admin editor can inject HTML.
// Links: "/path" stays in the site (next/link); http(s) opens in a new tab; any other scheme
// (javascript:, data:, ...) is shown as plain text instead of a link.
const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

const LINK_CLASS = 'text-[#a3610c] hover:text-[#c9781a] underline underline-offset-2';

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(TOKEN)) {
    const index = m.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const [whole, label, url, bold, italic] = m;
    if (label !== undefined && url !== undefined) {
      if (url.startsWith('/')) {
        out.push(<Link key={key++} href={url} className={LINK_CLASS}>{label}</Link>);
      } else if (/^https?:\/\//i.test(url)) {
        out.push(<a key={key++} href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{label}</a>);
      } else {
        out.push(whole);
      }
    } else if (bold !== undefined) {
      out.push(<strong key={key++} className="font-semibold text-[#2b2417]">{bold}</strong>);
    } else if (italic !== undefined) {
      out.push(<em key={key++}>{italic}</em>);
    }
    last = index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function RichText({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}
