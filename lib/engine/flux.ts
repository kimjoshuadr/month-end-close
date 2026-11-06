// Flux review: September 2026 adjusted income-statement lines vs August 2026
// and vs September 2025. Flags when |change| >= $1,000 AND |%| >= 10%
// against either comparison. Percentages use |prior| so sign flips and
// negative priors stay sane; a zero prior yields pct null (never flagged
// on that side alone).

import { AUG, type IsFigures, type IsLine } from "../reference/august";

const r2 = (n: number) => Math.round(n * 100) / 100;

export type FluxLine = {
  line: IsLine;
  current: number;
  aug: number;
  sep25: number;
  dAug: number;
  pctAug: number | null;
  dSep25: number;
  pctSep25: number | null;
  flagged: boolean;
};

function vs(current: number, prior: number): { d: number; pct: number | null; hit: boolean } {
  const d = r2(current - prior);
  const pct = prior === 0 ? null : r2((d / Math.abs(prior)) * 1000) / 10;
  const hit = Math.abs(d) >= 1000 && pct !== null && Math.abs(pct) >= 10;
  return { d, pct, hit };
}

export function fluxReview(
  current: IsFigures,
  priors: { aug: IsFigures; sep25: IsFigures } = { aug: AUG.is.month, sep25: AUG.sep2025 }
): FluxLine[] {
  return (Object.keys(current) as IsLine[]).map((line) => {
    const a = vs(current[line], priors.aug[line]);
    const s = vs(current[line], priors.sep25[line]);
    return {
      line,
      current: current[line],
      aug: priors.aug[line],
      sep25: priors.sep25[line],
      dAug: a.d,
      pctAug: a.pct,
      dSep25: s.d,
      pctSep25: s.pct,
      flagged: a.hit || s.hit,
    };
  });
}
