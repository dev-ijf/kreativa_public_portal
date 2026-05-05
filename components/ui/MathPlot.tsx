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
  /** Isi fence mentah (JSON). */
  raw: string;
  className?: string;
};

type Vec2 = [number, number];

type ViewBoxJson = {
  x?: Vec2;
  y?: Vec2;
  padding?: number;
};

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

function buildPlotTree(trimmed: string): ReactNode {
  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  const type = normalizePlotType(parsed.type);
  const vbFromJson = parsed.viewBox as ViewBoxJson | undefined;

  if (type === 'ofx') {
    const fn = String(parsed.fn ?? '');
    const domain = parsed.domain;
    if (!isVec2(domain)) throw new Error('domain harus [min, max]');
    const yDom = parsed.yDomain as Vec2 | undefined;
    const fallbackY: Vec2 = yDom && isVec2(yDom) ? yDom : [-4, 4];
    const viewBox =
      vbFromJson?.x && vbFromJson?.y
        ? {
            x: vbFromJson.x as Vec2,
            y: vbFromJson.y as Vec2,
            padding: vbFromJson.padding ?? 0.12,
          }
        : {
            x: domain as Vec2,
            y: fallbackY,
            padding: vbFromJson?.padding ?? 0.12,
          };

    const yFn = compileOfX(fn);
    return (
      <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
        <Coordinates.Cartesian subdivisions={4} />
        <Plot.OfX domain={domain as Vec2} y={yFn} />
      </Mafs>
    );
  }

  if (type === 'ofy') {
    const fn = String(parsed.fn ?? '');
    const domain = parsed.domain;
    if (!isVec2(domain)) throw new Error('domain harus [min, max] (sumbu y)');
    const xDom = parsed.xDomain as Vec2 | undefined;
    const fallbackX: Vec2 = xDom && isVec2(xDom) ? xDom : [-4, 4];
    const viewBox =
      vbFromJson?.x && vbFromJson?.y
        ? {
            x: vbFromJson.x as Vec2,
            y: vbFromJson.y as Vec2,
            padding: vbFromJson.padding ?? 0.12,
          }
        : {
            x: fallbackX,
            y: domain as Vec2,
            padding: vbFromJson?.padding ?? 0.12,
          };

    const xFn = compileOfY(fn);
    return (
      <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
        <Coordinates.Cartesian subdivisions={4} />
        <Plot.OfY domain={domain as Vec2} x={xFn} />
      </Mafs>
    );
  }

  if (type === 'parametric') {
    const xExpr = String(parsed.x ?? '');
    const yExpr = String(parsed.y ?? '');
    const domain = parsed.domain;
    if (!isVec2(domain)) throw new Error('domain harus [tMin, tMax]');
    const xy = compileParametricXY(xExpr, yExpr);
    const viewBox =
      vbFromJson?.x && vbFromJson?.y
        ? {
            x: vbFromJson.x as Vec2,
            y: vbFromJson.y as Vec2,
            padding: vbFromJson.padding ?? 0.12,
          }
        : {
            x: DEFAULT_VIEW_XY,
            y: DEFAULT_VIEW_XY,
            padding: vbFromJson?.padding ?? 0.12,
          };

    return (
      <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
        <Coordinates.Cartesian subdivisions={4} />
        <Plot.Parametric domain={domain as Vec2} xy={(t) => xy(t)} />
      </Mafs>
    );
  }

  if (type === 'inequality') {
    const yBounds = parsed.y as Partial<Record<string, string>> | undefined;
    const xBounds = parsed.x as Partial<Record<string, string>> | undefined;
    if (yBounds && xBounds) throw new Error('Hanya salah satu dari `y` atau `x` pada inequality');
    const viewBox =
      vbFromJson?.x && vbFromJson?.y
        ? {
            x: vbFromJson.x as Vec2,
            y: vbFromJson.y as Vec2,
            padding: vbFromJson.padding ?? 0.12,
          }
        : {
            x: DEFAULT_VIEW_XY,
            y: DEFAULT_VIEW_XY,
            padding: vbFromJson?.padding ?? 0.12,
          };

    if (yBounds) {
      const compiled = compileInequalityRecord(yBounds, 'x');
      return (
        <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
          <Coordinates.Cartesian subdivisions={4} />
          <Plot.Inequality y={compiled} />
        </Mafs>
      );
    }

    if (xBounds) {
      const compiled = compileInequalityRecord(xBounds, 'y');
      return (
        <Mafs height={260} pan={true} zoom={true} viewBox={viewBox} width="auto">
          <Coordinates.Cartesian subdivisions={4} />
          <Plot.Inequality x={compiled} />
        </Mafs>
      );
    }

    throw new Error('inequality memerlukan objek `y` atau `x`');
  }

  throw new Error(`type tidak dikenal: ${type}`);
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
