// Sign-off validation and blocking rules. Pure, so the dialog and tests share them.

export function signoffBlockers(input: {
  preparedBy: string;
  reviewedBy: string;
  unresolved: number;
  unexplained: number;
}): string[] {
  const out: string[] = [];
  const prep = input.preparedBy.trim();
  const rev = input.reviewedBy.trim();
  if (!prep) out.push("Enter who prepared the close.");
  if (!rev) out.push("Enter who reviewed the close.");
  if (prep && rev && prep.toLowerCase() === rev.toLowerCase()) {
    out.push("Prepared by and Reviewed by must be different people.");
  }
  if (input.unresolved > 0) out.push(`${input.unresolved} open item${input.unresolved === 1 ? " remains" : "s remain"} — resolve them in Open Items.`);
  if (input.unexplained > 0) {
    out.push(`${input.unexplained} flagged flux line${input.unexplained === 1 ? " needs" : "s need"} an explanation in Flux Review.`);
  }
  return out;
}
