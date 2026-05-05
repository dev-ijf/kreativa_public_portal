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
            theme: 'neutral',
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
