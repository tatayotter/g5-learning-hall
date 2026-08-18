'use client';
import { useState, useEffect } from 'react';

function PromptCard({ title, subtitle, url }: { title: string; subtitle: string; url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [url]);

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{subtitle}</p>
          <p className="text-white font-bold">{title}</p>
        </div>
        <div className="flex gap-2">
          {content && (
            <button
              onClick={() => { navigator.clipboard.writeText(content); alert('Copied!'); }}
              className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              📋 Copy
            </button>
          )}
        </div>
      </div>
      {loading && <p className="text-gray-500 text-sm animate-pulse">Loading...</p>}
      {error && (
        <p className="text-red-400 text-sm">
          File not found. Place it at: <code className="bg-neutral-800 px-1 rounded">{url}</code>
        </p>
      )}
      {content && (
        <pre className="bg-neutral-950 rounded-xl p-4 text-xs text-gray-300 overflow-auto max-h-96 whitespace-pre-wrap font-mono">
          {content}
        </pre>
      )}
    </div>
  );
}

export default function PromptsSection() {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Prompts</h2>
      <p className="text-gray-500 text-sm mb-6">
        Weekly package generation prompts based on the official DepEd Budget of Work.
        Edit the markdown files in public/prompts/ to update without touching code.
      </p>

      <PromptCard
        title="Weekly Package Prompt"
        subtitle="✨ Grade 2"
        url="/prompts/tala-weekly-prompt.md"
      />

      <PromptCard
        title="Weekly Package Prompt"
        subtitle="🌱 Grade 3"
        url="/prompts/grade3-weekly-prompt.md"
      />

      <PromptCard
        title="Weekly Package Prompt"
        subtitle="📖 Grade 4"
        url="/prompts/grade4-weekly-prompt.md"
      />

      <PromptCard
        title="Weekly Package Prompt"
        subtitle="⚔️ Grade 5"
        url="/prompts/grade5-weekly-prompt.md"
      />

      <PromptCard
        title="Weekly Package Prompt"
        subtitle="🏆 Grade 6"
        url="/prompts/grade6-weekly-prompt.md"
      />
    </div>
  );
}
