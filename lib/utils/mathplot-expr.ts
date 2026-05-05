import { Parser } from 'expr-eval';

const parser = new Parser({
  allowMemberAccess: false,
});

/** Huruf, angka, operator umum, spasi, koma desimal; pangkat ^; titik untuk desimal / pemanggilan */
const SAFE_EXPR =
  /^[0-9+\-*/().,\s_a-zA-Z^]+$/;

function assertSafeExpression(expr: string): void {
  const t = expr.trim();
  if (!t.length) throw new Error('Ekspresi kosong');
  if (!SAFE_EXPR.test(t)) throw new Error('Ekspresi mengandung karakter tidak diizinkan');
  const banned = /\b(constructor|__proto__|prototype|eval|Function)\b/i;
  if (banned.test(t)) throw new Error('Ekspresi tidak diizinkan');
}

/** Ubah `Math.sin(x)` menjadi bentuk yang dikenali expr-eval (`sin(x)`). */
export function normalizeMathExpression(expr: string): string {
  return expr.trim().replace(/\bMath\./g, '');
}

function compileToFn(expr: string, paramName: 'x' | 'y' | 't'): (n: number) => number {
  assertSafeExpression(expr);
  const normalized = normalizeMathExpression(expr);
  const ast = parser.parse(normalized);
  const js = ast.toJSFunction(paramName);
  return (n: number) => {
    const v = js(n);
    return typeof v === 'number' && Number.isFinite(v) ? v : NaN;
  };
}

export function compileOfX(fnExpr: string): (x: number) => number {
  return compileToFn(fnExpr, 'x');
}

export function compileOfY(fnExpr: string): (y: number) => number {
  return compileToFn(fnExpr, 'y');
}

export function compileParametricXY(
  xExpr: string,
  yExpr: string,
): (t: number) => [number, number] {
  const fx = compileToFn(xExpr, 't');
  const fy = compileToFn(yExpr, 't');
  return (t: number) => [fx(t), fy(t)];
}

type InequalitySide = '>' | '<' | '<=' | '>=';

/** Untuk `Plot.Inequality`: prop `y={{ ... }}` pakai inputVar `x`; prop `x={{ ... }}` pakai inputVar `y`. */
export function compileInequalityRecord(
  bounds: Partial<Record<InequalitySide, string>>,
  inputVar: 'x' | 'y',
): Partial<Record<InequalitySide, (v: number) => number>> {
  const out: Partial<Record<InequalitySide, (v: number) => number>> = {};
  for (const key of Object.keys(bounds) as InequalitySide[]) {
    const raw = bounds[key];
    if (raw == null || raw === '') continue;
    out[key] = compileToFn(raw, inputVar);
  }
  return out;
}
