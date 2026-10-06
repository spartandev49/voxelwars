// Scale a base army composition to ~n units (keeps proportions, at least 1 of each type).
export function scaleGroups(groups, n) {
  const tot = groups.reduce((s, g) => s + g.n, 0);
  return groups.map((g) => ({ defId: g.defId, n: Math.max(1, Math.round(g.n * n / tot)) }));
}
