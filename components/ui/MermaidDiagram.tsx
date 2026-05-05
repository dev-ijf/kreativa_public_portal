'use client';

import { useEffect, useId, useRef, useState } from 'react';

let mermaidInitialized = false;
let renderCounter = 0;

type MermaidDiagramProps = {
  code: string;
  className?: string;
};

export function MermaidDiagram({ code, className = '' }: MermaidDiagramProps) {
  const baseId = useId().replace(/:/g, '');
  const hostRef = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const diagramId = `mmd-${baseId}-${++renderCounter}`;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'default',
            themeVariables: {
              pie1: '#6366f1',
              pie2: '#f59e0b',
              pie3: '#10b981',
              pie4: '#ef4444',
              pie5: '#8b5cf6',
              pie6: '#06b6d4',
              pie7: '#f97316',
              pie8: '#ec4899',
              pie9: '#14b8a6',
              pie10: '#84cc16',
              pie11: '#a855f7',
              pie12: '#0ea5e9',
              pieTitleTextColor: '#334155',
              pieSectionTextColor: '#ffffff',
              pieLegendTextColor: '#475569',
              pieLegendTextSize: '13px',
            },
          });
          mermaidInitialized = true;
        }
        const { svg } = await mermaid.render(diagramId, code);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Gagal render diagram');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
  }, [code, baseId]);

  if (error) {
    return (
      <span className="my-3 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {error}
      </span>
    );
  }

  return (
    <span
      ref={hostRef}
      className={['my-3 block w-full overflow-x-auto [&_svg]:max-h-[480px] [&_svg]:max-w-full', className].join(' ')}
    />
  );
}
