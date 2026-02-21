import type { Build } from '../types';

export function orderBuildsForDisplay(builds: Build[], activeBuildId?: number | null): Build[] {
  if (!builds.length) return [];
  if (!activeBuildId) return [...builds];

  const ordered = [...builds];
  const activeIndex = ordered.findIndex((b) => b.id === activeBuildId);
  if (activeIndex <= 0) return ordered;

  const [activeBuild] = ordered.splice(activeIndex, 1);
  ordered.unshift(activeBuild);
  return ordered;
}
