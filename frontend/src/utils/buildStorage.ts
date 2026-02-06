const ACTIVE_BUILD_ID_KEY = 'pcpp.buildId';
const RECENT_BUILD_IDS_KEY = 'pcpp.buildIds';
const BUILD_META_KEY = 'pcpp.buildMeta';

export const DEFAULT_DRAFT_MAX_AGE_MS = 10 * 60 * 1000;

type BuildMetaEntry = {
  lastSeen: number;
  saved: boolean;
};

type BuildMetaMap = Record<string, BuildMetaEntry>;

const isFinitePositiveInt = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const parseBuildId = (raw: string | null): number | undefined => {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const loadMeta = (): BuildMetaMap => {
  const raw = localStorage.getItem(BUILD_META_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as BuildMetaMap;
  } catch {
    return {};
  }
};

const saveMeta = (meta: BuildMetaMap) => {
  localStorage.setItem(BUILD_META_KEY, JSON.stringify(meta));
};

const nowMs = () => Date.now();

const isFresh = (entry: BuildMetaEntry | undefined, draftMaxAgeMs: number) => {
  // Backwards compatibility: if we don't have meta for an id,
  // assume it's a saved build and keep it.
  if (!entry) return true;
  if (entry.saved) return true;
  if (!Number.isFinite(entry.lastSeen)) return false;
  return nowMs() - entry.lastSeen <= draftMaxAgeMs;
};

export function touchBuildMeta(id: number, opts?: { saved?: boolean }) {
  if (!isFinitePositiveInt(id)) return;

  const meta = loadMeta();
  const key = String(id);
  const prev = meta[key];

  meta[key] = {
    lastSeen: nowMs(),
    saved: opts?.saved ?? prev?.saved ?? false,
  };
  saveMeta(meta);
}

export function pruneExpiredDraftBuildIds(ids: number[], draftMaxAgeMs = DEFAULT_DRAFT_MAX_AGE_MS): number[] {
  const meta = loadMeta();
  const next = ids.filter((id) => isFresh(meta[String(id)], draftMaxAgeMs));
  if (next.length === ids.length) return ids;

  localStorage.setItem(RECENT_BUILD_IDS_KEY, JSON.stringify(next));
  return next;
}

export function loadActiveBuildId(opts?: { draftMaxAgeMs?: number }): number | undefined {
  const id = parseBuildId(localStorage.getItem(ACTIVE_BUILD_ID_KEY));
  if (!id) return undefined;

  const draftMaxAgeMs = opts?.draftMaxAgeMs ?? DEFAULT_DRAFT_MAX_AGE_MS;
  const meta = loadMeta();
  if (isFresh(meta[String(id)], draftMaxAgeMs)) return id;

  // Expired draft (or unknown) → clear it.
  saveActiveBuildId(undefined);
  removeRecentBuildId(id);
  return undefined;
}

export function saveActiveBuildId(id: number | undefined) {
  if (!id) {
    localStorage.removeItem(ACTIVE_BUILD_ID_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_BUILD_ID_KEY, String(id));
  touchBuildMeta(id);
}

export function loadRecentBuildIds(opts?: { draftMaxAgeMs?: number }): number[] {
  const raw = localStorage.getItem(RECENT_BUILD_IDS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: number[] = [];
    for (const item of parsed) {
      const n = typeof item === 'number' ? item : Number(item);
      if (!isFinitePositiveInt(n)) continue;
      if (out.includes(n)) continue;
      out.push(n);
    }
    const draftMaxAgeMs = opts?.draftMaxAgeMs ?? DEFAULT_DRAFT_MAX_AGE_MS;
    return pruneExpiredDraftBuildIds(out, draftMaxAgeMs);
  } catch {
    return [];
  }
}

export function saveRecentBuildIds(ids: number[]) {
  const normalized = ids.filter((id) => isFinitePositiveInt(id));
  localStorage.setItem(RECENT_BUILD_IDS_KEY, JSON.stringify(normalized));
}

export function addRecentBuildId(id: number, limit = 10, opts?: { saved?: boolean }): number[] {
  if (!isFinitePositiveInt(id)) return loadRecentBuildIds();

  const current = loadRecentBuildIds();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, Math.max(1, limit));
  saveRecentBuildIds(next);
  touchBuildMeta(id, opts);
  return next;
}

export function removeRecentBuildId(id: number): number[] {
  const current = loadRecentBuildIds();
  const next = current.filter((x) => x !== id);
  saveRecentBuildIds(next);
  return next;
}

export function clearLocalBuildState() {
  localStorage.removeItem(ACTIVE_BUILD_ID_KEY);
  localStorage.removeItem(RECENT_BUILD_IDS_KEY);
  localStorage.removeItem(BUILD_META_KEY);
  localStorage.removeItem('pcpp.buildLabels');
}
