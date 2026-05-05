'use client';

import {
  compileInequalityRecord,
  compileOfX,
  compileOfY,
  compileParametricXY,
} from '@/lib/utils/mathplot-expr';
import { Coordinates, Mafs, Plot } from 'mafs';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import 'mafs/core.css';

export type MathPlotProps = {
  /** Isi fence mentah (JSON object atau JSON array). */
  raw: string;
  className?: string;
};

type Vec2 = [number, number];

type ViewBoxJson = {
  x?: Vec2;
  y?: Vec2;
  padding?: number;
};

type PlotDef = Record<string, unknown>;

function isVec2(v: unknown): v is Vec2 {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'number' &&
    typeof v[1] === 'number' &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  );
}

function normalizePlotType(t: unknown): string {
  return String(t ?? '').toLowerCase();
}

const DEFAULT_VIEW_XY: Vec2 = [-4, 4];

function buildSinglePlotElement(parsed: PlotDef, idx: number): ReactNode {
  const type = normalizePlotType(parsed.type);
  const color = parsed.color ? String(parsed.color) : undefined;

  if (type === 'ofx') {
    const fn = String(parsed.fn ?? '');
    const domain = parsed.domain;
    if (!isVec2(domain)) throw new Error('domain harus [min, max]');
    const yFn = compileOfX(fn);
    return <Plot.OfX key={idx} domain={domain as Vec2} y={yFn} color={color} />;
  }

  if (type === 'ofy') {
    const fn = String(parsed.fn ?? '');
    const domain = parsed.domain;
    if (!isVec2(domain)) throw new Error('domain harus [min, max] (sumbu y)');
    const xFn = compileOfY(fn);
    return <Plot.OfY key={idx} domain={domain as Vec2} x={xFn} color={color} />;
  }

  if (type === 'parametric') {
    const xExpr = String(parsed.x ?? '');
    const yExpr = String(parsed.y ?? '');
    const domain = parsed.domain;
    if (!isVec2(domain)) throw new Error('domain harus [tMin, tMax]');
    const xy = compileParametricXY(xExpr, yExpr);
    return <Plot.Parametric key={idx} domain={domain as Vec2} xy={(t) => xy(t)} color={color} />;
  }

  if (type === 'inequality') {
    const yBounds = parsed.y as Partial<Record<string, string>> | undefined;
    const xBounds = parsed.x as Partial<Record<string, string>> | undefined;
    if (yBounds && xBounds) throw new Error('Hanya salah satu dari `y` atau `x` pada inequality');
    if (yBounds) {
      const compiled = compileInequalityRecord(yBounds, 'x');
      return <Plot.Inequality key={idx} y={compiled} color={color} />;
    }
    if (xBounds) {
      const compiled = compileInequalityRecord(xBounds, 'y');
      return <Plot.Inequality key={idx} x={compiled} color={color} />;
    }
    throw new Error('inequality memerlukan objek `y` atau `x`');
  }

  throw new Error(`type tidak dikenal: ${type}`);
}

function computeViewBox(plots: PlotDef[]): { x: Vec2; y: Vec2; padding: number } {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const p of plots) {
    const vb = p.viewBox as ViewBoxJson | undefined;
    if (vb?.x && isVec2(vb.x)) {
      xMin = Math.min(xMin, vb.x[0]);
      xMax = Math.max(xMax, vb.x[1]);
    }
    if (vb?.y && isVec2(vb.y)) {
      yMin = Math.min(yMin, vb.y[0]);
      yMax = Math.max(yMax, vb.y[1]);
    }

    const domain = p.domain;
    if (isVec2(domain)) {
      const type = normalizePlotType(p.type);
      if (type === 'ofy') {
        yMin = Math.min(yMin, domain[0]);
        yMax = Math.max(yMax, domain[1]);
      } else {
        xMin = Math.min(xMin, domain[0]);
        xMax = Math.max(xMax, domain[1]);
      }
    }

    const yDom = p.yDomain;
    if (isVec2(yDom)) {
      yMin = Math.min(yMin, yDom[0]);
      yMax = Math.max(yMax, yDom[1]);
    }
    const xDom = p.xDomain;
    if (isVec2(xDom)) {
      xMin = Math.min(xMin, xDom[0]);
      xMax = Math.max(xMax, xDom[1]);
    }
  }

  return {
    x: Number.isFinite(xMin) ? [xMin, xMax] : DEFAULT_VIEW_XY,
    y: Number.isFinite(yMin) ? [yMin, yMax] : DEFAULT_VIEW_XY,
    padding: 0.12,
  };
}

function buildPlotTree(trimmed: string): ReactNode {
  const data = JSON.parse(trimmed) as PlotDef | PlotDef[];
  const plots: PlotDef[] = Array.isArray(data) ? data : [data];

  if (plots.length === 0) throw new Error('Empty plot data');

  // Single plot legacy path (renders viewBox from its own definition)
  if (plots.length === 1) {
    const parsed = plots[0];
    const type = normalizePlotType(parsed.type);
    const vbFromJson = parsed.viewBox as ViewBoxJson | undefined;

    if (type === 'ofx') {
      const domain = parsed.domain;
      if (!isVec2(domain)) throw new Error('domain harus [min, max]');
      const yDom = parsed.yDomain as Vec2 | undefined;
      const fallbackY: Vec2 = yDom && isVec2(yDom) ? yDom : [-4, 4];
      const viewBox =
        vbFromJson?.x && vbFromJson?.y
          ? { x: vbFromJson.x as Vec2, y: vbFromJson.y as Vec2, padding: vbFromJson.padding ?? 0.12 }
          : { x: domain as Vec2, y: fallbackY, padding: vbFromJson?.padding ?? 0.12 };

      return (
        <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
          <Coordinates.Cartesian subdivisions={4} />
          {buildSinglePlotElement(parsed, 0)}
        </Mafs>
      );
    }

    if (type === 'ofy') {
      const domain = parsed.domain;
      if (!isVec2(domain)) throw new Error('domain harus [min, max] (sumbu y)');
      const xDom = parsed.xDomain as Vec2 | undefined;
      const fallbackX: Vec2 = xDom && isVec2(xDom) ? xDom : [-4, 4];
      const viewBox =
        vbFromJson?.x && vbFromJson?.y
          ? { x: vbFromJson.x as Vec2, y: vbFromJson.y as Vec2, padding: vbFromJson.padding ?? 0.12 }
          : { x: fallbackX, y: domain as Vec2, padding: vbFromJson?.padding ?? 0.12 };

      return (
        <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
          <Coordinates.Cartesian subdivisions={4} />
          {buildSinglePlotElement(parsed, 0)}
        </Mafs>
      );
    }

    const viewBox =
      vbFromJson?.x && vbFromJson?.y
        ? { x: vbFromJson.x as Vec2, y: vbFromJson.y as Vec2, padding: vbFromJson.padding ?? 0.12 }
        : { x: DEFAULT_VIEW_XY, y: DEFAULT_VIEW_XY, padding: vbFromJson?.padding ?? 0.12 };

    return (
      <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
        <Coordinates.Cartesian subdivisions={4} />
        {buildSinglePlotElement(parsed, 0)}
      </Mafs>
    );
  }

  // Multi-plot: render all on one canvas with combined viewBox
  const viewBox = computeViewBox(plots);
  return (
    <Mafs height={300} pan={true} zoom={true} viewBox={viewBox} width="auto">
      <Coordinates.Cartesian subdivisions={4} />
      {plots.map((p, i) => buildSinglePlotElement(p, i))}
    </Mafs>
  );
}

export function MathPlot({ raw, className = '' }: MathPlotProps) {
  const { plot, error } = useMemo(() => {
    const trimmed = raw.trim();
    if (!trimmed.length) return { plot: null as ReactNode, error: null as string | null };
    try {
      return { plot: buildPlotTree(trimmed), error: null as string | null };
    } catch (e) {
      return {
        plot: null as ReactNode,
        error: e instanceof Error ? e.message : 'Gagal menyiapkan plot',
      };
    }
  }, [raw]);

  if (error) {
    return (
      <span
        className={[
          'my-3 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900',
          className,
        ].join(' ')}
      >
        {error}
      </span>
    );
  }

  if (!plot) return null;

  return <span className={['my-3 block w-full overflow-x-auto', className].join(' ')}>{plot}</span>;
}
