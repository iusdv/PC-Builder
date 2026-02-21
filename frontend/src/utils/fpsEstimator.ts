import type { Build } from '../types';
import { lookupBenchmark, type BenchmarkEntry, type Sensitivity } from './gameBenchmarkData';

export type FpsPresetId = '1080p-high' | '1440p-high' | '4k-ultra';
export type FpsConfidence = 'high' | 'medium' | 'low';

export type GameCatalogItem = {
  igdbId?: number;
  slug: string;
  name: string;
  imagePath: string;
  sourceUrl?: string;
  genres?: string[];
  themes?: string[];
  gameModes?: string[];
  firstReleaseDate?: string | null;
  totalRating?: number | null;
  totalRatingCount?: number | null;
  baseFps1080High?: number;
  cpuWeight?: number;
  gpuWeight?: number;
  preset1440Multiplier?: number;
  preset4kMultiplier?: number
  fpsCap?: number;
};

export type EstimatedGame = {
  gameId: number;
  igdbId?: number;
  slug: string;
  name: string;
  imagePath: string;
  sourceUrl?: string;
  averageFps: number;
  low1PercentFps: number;
  bottleneck: 'cpu' | 'gpu' | 'balanced';
};

export type GameResolution = '1080p' | '1440p' | '4k';
export type GameQualityPreset = 'low' | 'medium' | 'epic';
export type Playability = 'Great' | 'Good' | 'Playable' | 'Needs tuning';

export type GameScenarioEstimate = {
  resolution: GameResolution;
  quality: GameQualityPreset;
  averageFps: number;
  low1PercentFps: number;
  cpuUsagePercent: number;
  gpuUsagePercent: number;
  bottleneck: 'cpu' | 'gpu' | 'balanced';
  playability: Playability;
};

export type SpecsRecommendation = {
  minimum: {
    cpu: string;
    gpu: string;
    ramGb: number;
    estimated1080pLowFps: number;
  };
  recommended: {
    cpu: string;
    gpu: string;
    ramGb: number;
    estimated1080pLowFps: number;
  };
};

export type GameInsights = {
  confidence: FpsConfidence;
  scenarios: GameScenarioEstimate[];
  specRecommendation: SpecsRecommendation;
};

type BuildTierProfile = {
  cpuNorm: number;
  gpuNorm: number;
  ramFactor: number;
  bottleneck: 'cpu' | 'gpu' | 'balanced';
  confidence: FpsConfidence;
};

type InferredGameProfile = {
  baseFps1080High: number;
  cpuWeight: number;
  gpuWeight: number;
  preset1440Multiplier: number;
  preset4kMultiplier: number;
  fpsCap: number;
  fromBenchmark: boolean;
};

const GPU_RULES: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /rtx\s*5090/i, score: 220 },
  { pattern: /rtx\s*5080/i, score: 205 },
  { pattern: /rtx\s*4090/i, score: 198 },
  { pattern: /rtx\s*5070\s*ti/i, score: 188 },
  { pattern: /rtx\s*5070/i, score: 178 },
  { pattern: /rtx\s*4080/i, score: 182 },
  { pattern: /rtx\s*4070\s*ti/i, score: 170 },
  { pattern: /rtx\s*4070/i, score: 158 },
  { pattern: /rtx\s*4060\s*ti/i, score: 142 },
  { pattern: /rtx\s*4060/i, score: 132 },
  { pattern: /rtx\s*3090/i, score: 166 },
  { pattern: /rtx\s*3080/i, score: 152 },
  { pattern: /rtx\s*3070/i, score: 136 },
  { pattern: /rtx\s*3060\s*ti/i, score: 125 },
  { pattern: /rtx\s*3060/i, score: 114 },
  { pattern: /rx\s*9090/i, score: 214 },
  { pattern: /rx\s*9080/i, score: 196 },
  { pattern: /rx\s*9070\s*xt/i, score: 184 },
  { pattern: /rx\s*9070/i, score: 170 },
  { pattern: /rx\s*7900\s*xtx/i, score: 186 },
  { pattern: /rx\s*7900\s*xt/i, score: 176 },
  { pattern: /rx\s*7800\s*xt/i, score: 160 },
  { pattern: /rx\s*7700\s*xt/i, score: 146 },
  { pattern: /rx\s*7600\s*xt/i, score: 132 },
  { pattern: /rx\s*7600/i, score: 124 },
  { pattern: /arc\s*b580/i, score: 138 },
  { pattern: /arc\s*a770/i, score: 118 },
  { pattern: /arc\s*a750/i, score: 108 },
];

const CPU_RULES: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /threadripper\s*pro\s*9995wx/i, score: 172 },
  { pattern: /threadripper\s*pro\s*7995wx/i, score: 166 },
  { pattern: /threadripper\s*pro\s*7985wx/i, score: 162 },
  { pattern: /threadripper\s*pro\s*7975wx/i, score: 160 },
  { pattern: /threadripper\s*7990x/i, score: 168 },
  { pattern: /threadripper\s*7980x/i, score: 164 },
  { pattern: /threadripper\s*7970x/i, score: 160 },
  { pattern: /ryzen\s*9\s*9950x3d/i, score: 190 },
  { pattern: /ryzen\s*9\s*9950x/i, score: 184 },
  { pattern: /ryzen\s*9\s*9900x/i, score: 178 },
  { pattern: /ryzen\s*7\s*9800x3d/i, score: 188 },
  { pattern: /ryzen\s*7\s*9700x/i, score: 170 },
  { pattern: /ryzen\s*7\s*7800x3d/i, score: 180 },
  { pattern: /ryzen\s*7\s*7700x/i, score: 162 },
  { pattern: /ryzen\s*5\s*9600x/i, score: 158 },
  { pattern: /ryzen\s*5\s*7600x/i, score: 148 },
  { pattern: /ryzen\s*5\s*5600x/i, score: 124 },
  { pattern: /core\s*ultra\s*9\s*285k/i, score: 182 },
  { pattern: /core\s*ultra\s*7\s*265k/i, score: 172 },
  { pattern: /core\s*ultra\s*5\s*245k/i, score: 158 },
  { pattern: /i9[-\s]*14900k/i, score: 182 },
  { pattern: /i7[-\s]*14700k/i, score: 170 },
  { pattern: /i5[-\s]*14600k/i, score: 156 },
  { pattern: /i9[-\s]*13900k/i, score: 174 },
  { pattern: /i7[-\s]*13700k/i, score: 162 },
  { pattern: /i5[-\s]*13600k/i, score: 148 },
  { pattern: /i5[-\s]*12600k/i, score: 132 },
  { pattern: /ryzen\s*5\s*3600/i, score: 96 },
];

const QUALITY_MULTIPLIER: Record<GameQualityPreset, number> = {
  low: 1.28,
  medium: 1.08,
  epic: 0.97,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const parseSeriesFallback = (name: string, vendor: 'gpu' | 'cpu'): number => {
  const series = name.match(/(\d{3,5})/g);
  if (!series?.length) return vendor === 'gpu' ? 92 : 102;
  const last = Number(series[series.length - 1]);
  if (!Number.isFinite(last)) return vendor === 'gpu' ? 92 : 102;

  if (vendor === 'gpu') {
    if (last >= 5090) return 220;
    if (last >= 4090) return 198;
    if (last >= 4080) return 182;
    if (last >= 4070) return 160;
    if (last >= 4060) return 134;
    if (last >= 3080) return 150;
    if (last >= 3070) return 136;
    if (last >= 3060) return 116;
    if (last >= 2080) return 118;
    if (last >= 2070) return 108;
    if (last >= 2060) return 96;
    return 82;
  }

  if (/threadripper/i.test(name)) {
    if (last >= 9900) return 172;
    if (last >= 7900) return 164;
    if (last >= 5900) return 154;
    return 146;
  }

  if (/ryzen/i.test(name) && last >= 9000) {
    if (/x3d/i.test(name)) return 186;
    if (last >= 9950) return 182;
    if (last >= 9900) return 176;
    if (last >= 9700) return 168;
    if (last >= 9600) return 158;
    return 150;
  }

  if (last >= 14900) return 180;
  if (last >= 14700) return 170;
  if (last >= 14600) return 156;
  if (last >= 13900) return 172;
  if (last >= 13700) return 162;
  if (last >= 13600) return 148;
  if (last >= 12700) return 142;
  if (last >= 12600) return 132;
  if (last >= 9700) return 110;
  if (last >= 8700) return 100;
  return 92;
};

const resolveTierScore = (
  name: string | undefined | null,
  rules: Array<{ pattern: RegExp; score: number }>,
  vendor: 'gpu' | 'cpu',
) => {
  if (!name) return { score: vendor === 'gpu' ? 92 : 102, exactMatch: false };
  for (const rule of rules) {
    if (rule.pattern.test(name)) return { score: rule.score, exactMatch: true };
  }
  return { score: parseSeriesFallback(name, vendor), exactMatch: false };
};

const resolveRamFactor = (build: Build) => {
  const cap = build.ram?.capacityGB ?? 16;
  const speed = build.ram?.speedMHz ?? 3200;
  let factor = 1;

  if (cap < 16) factor -= 0.1;
  else if (cap >= 64) factor += 0.08;
  else if (cap >= 32) factor += 0.05;

  if (speed < 3000) factor -= 0.06;
  else if (speed >= 5200) factor += 0.06;
  else if (speed >= 3600) factor += 0.03;

  return clamp(factor, 0.82, 1.16);
};

const resolveBuildProfile = (build: Build): BuildTierProfile => {
  const cpuTier = resolveTierScore(build.cpu?.name, CPU_RULES, 'cpu');
  const gpuTier = resolveTierScore(build.gpu?.name, GPU_RULES, 'gpu');
  const ramFactor = resolveRamFactor(build);
  const cpuNorm = clamp(cpuTier.score / 150, 0.55, 1.45);
  const gpuNorm = clamp(gpuTier.score / 150, 0.5, 1.6);

  const bottleneck: 'cpu' | 'gpu' | 'balanced' =
    cpuTier.score + 10 < gpuTier.score
      ? 'cpu'
      : gpuTier.score + 10 < cpuTier.score
        ? 'gpu'
        : 'balanced';

  const confidence: FpsConfidence = cpuTier.exactMatch && gpuTier.exactMatch
    ? 'high'
    : cpuTier.exactMatch || gpuTier.exactMatch
      ? 'medium'
      : 'low';

  return {
    cpuNorm,
    gpuNorm,
    ramFactor,
    bottleneck,
    confidence,
  };
};

const parseReleaseYear = (dateText: string | null | undefined): number | null => {
  if (!dateText) return null;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
};

const stableHash = (input: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const tagsLower = (game: GameCatalogItem): string[] => {
  const all = [...(game.genres ?? []), ...(game.themes ?? []), ...(game.gameModes ?? [])];
  return all.map((v) => v.toLowerCase());
};

const hasAnyTag = (tags: string[], needles: string[]): boolean => {
  return needles.some((needle) => tags.some((tag) => tag.includes(needle)));
};

const hasAnyText = (text: string, needles: string[]): boolean => {
  return needles.some((needle) => text.includes(needle));
};

const inferGameProfile = (game: GameCatalogItem): InferredGameProfile => {
  const tags = tagsLower(game);
  const year = parseReleaseYear(game.firstReleaseDate);
  const fingerprint = `${game.igdbId ?? 0}:${game.slug}:${game.name}`;
  const hash = stableHash(fingerprint);
  const jitter = ((hash % 2001) / 1000 - 1) * 0.9;

  let baseFps1080High = 122;
  if (year !== null) {
    if (year >= 2024) baseFps1080High -= 24;
    else if (year >= 2021) baseFps1080High -= 16;
    else if (year >= 2018) baseFps1080High -= 10;
    else if (year >= 2013) baseFps1080High -= 4;
    else if (year <= 2008) baseFps1080High += 14;
    else if (year <= 2012) baseFps1080High += 8;
  }

  if (hasAnyTag(tags, ['first-person shooter', 'racing', 'adventure', 'action'])) {
    baseFps1080High -= 6;
  }
  if (hasAnyTag(tags, ['battle royale', 'open world', 'vr'])) {
    baseFps1080High -= 9;
  }
  if (hasAnyTag(tags, ['strategy', 'simulation', 'real time strategy'])) {
    baseFps1080High -= 7;
  }
  if (hasAnyTag(tags, ['indie', 'puzzle', 'turn-based strategy', 'card'])) {
    baseFps1080High += 9;
  }

  const ratingCount = game.totalRatingCount ?? 0;
  if (ratingCount > 20000) baseFps1080High -= 4;
  else if (ratingCount < 150) baseFps1080High += 2;

  baseFps1080High += jitter * 8;

  let cpuWeight = 0.43;
  let gpuWeight = 0.51;

  if (hasAnyTag(tags, ['strategy', 'simulation', 'real time strategy', 'city builder', 'moba'])) {
    cpuWeight += 0.12;
  }
  if (hasAnyTag(tags, ['multiplayer', 'co-operative', 'massively multiplayer'])) {
    cpuWeight += 0.05;
  }
  if (hasAnyTag(tags, ['battle royale'])) {
    cpuWeight += 0.04;
  }

  if (hasAnyTag(tags, ['first-person shooter', 'third person shooter', 'racing', 'action'])) {
    gpuWeight += 0.09;
  }
  if (hasAnyTag(tags, ['open world', 'vr', 'sandbox'])) {
    gpuWeight += 0.08;
  }
  if (hasAnyTag(tags, ['puzzle', 'visual novel', 'card'])) {
    gpuWeight -= 0.08;
  }

  if (year !== null && year >= 2021) gpuWeight += 0.04;

  cpuWeight += jitter * 0.03;
  gpuWeight -= jitter * 0.02;
  gpuWeight -= (cpuWeight - 0.43) * 0.24;

  cpuWeight = clamp(cpuWeight, 0.3, 0.72);
  gpuWeight = clamp(gpuWeight, 0.34, 0.78);

  let preset1440Multiplier = 0.82 - (gpuWeight - 0.5) * 0.10 + jitter * 0.02;
  let preset4kMultiplier = 0.55 - (gpuWeight - 0.5) * 0.12 + jitter * 0.02;

  preset1440Multiplier = clamp(preset1440Multiplier, 0.68, 0.92);
  preset4kMultiplier = clamp(preset4kMultiplier, 0.38, 0.68);

  //Engine / game FPS cap inference 
  let fpsCap = 9999;
  const nameLower = game.name.toLowerCase();

  if (year !== null) {
    if (year <= 2003) fpsCap = Math.min(fpsCap, 250);
    else if (year <= 2007) fpsCap = Math.min(fpsCap, 350);
    else if (year <= 2010) fpsCap = Math.min(fpsCap, 450);
  }

  // Source-engine family (Portal, HL2, CS:Source, L4D, TF2, Garry's Mod)
  if (hasAnyText(nameLower, ['portal', 'half-life', 'counter-strike: source', 'team fortress', 'left 4 dead', "garry's mod"])) {
    fpsCap = Math.min(fpsCap, 300);
  }
  // Bethesda Creation / Gamebryo engine — physics tied to framerate
  if (hasAnyText(nameLower, ['skyrim', 'fallout 4', 'fallout: new vegas', 'oblivion'])) {
    fpsCap = Math.min(fpsCap, 120);
  }
  // GTA San Andreas — hardcoded 25 / 30 internal tick
  if (hasAnyText(nameLower, ['gta: san andreas', 'grand theft auto: san andreas', 'gta san andreas'])) {
    fpsCap = Math.min(fpsCap, 60);
  }
  // From Software 60 fps locks (Dark Souls, Elden Ring, Sekiro, AC6)
  if (hasAnyText(nameLower, ['dark souls', 'elden ring', 'sekiro', 'armored core vi'])) {
    fpsCap = Math.min(fpsCap, 60);
  }
  // Emulated / retro titles
  if (hasAnyTag(tags, ['emulator', 'retro'])) {
    fpsCap = Math.min(fpsCap, 60);
  }

  return {
    baseFps1080High: clamp(baseFps1080High, 45, 190),
    cpuWeight,
    gpuWeight,
    preset1440Multiplier,
    preset4kMultiplier,
    fpsCap,
    fromBenchmark: false,
  };
};

const sensitivityToWeight = (s: Sensitivity): number => {
  if (s === 'high') return 0.65;
  if (s === 'medium') return 0.48;
  return 0.28;
};

const benchmarkToProfile = (entry: BenchmarkEntry): InferredGameProfile => {
  return {
    baseFps1080High: entry.refFps,
    cpuWeight: sensitivityToWeight(entry.cpuSensitivity),
    gpuWeight: sensitivityToWeight(entry.gpuSensitivity),
    preset1440Multiplier: entry.res1440Scale,
    preset4kMultiplier: entry.res4kScale,
    fpsCap: entry.fpsCap ?? 9999,
    fromBenchmark: true,
  };
};

const resolveGameProfile = (game: GameCatalogItem): InferredGameProfile => {
  // 1. Check curated benchmark table first (by slug)
  const bench = lookupBenchmark(game.slug);
  if (bench) return benchmarkToProfile(bench);

  // 2. Fall back to heuristic inference
  const inferred = inferGameProfile(game);
  return {
    baseFps1080High: game.baseFps1080High ?? inferred.baseFps1080High,
    cpuWeight: game.cpuWeight ?? inferred.cpuWeight,
    gpuWeight: game.gpuWeight ?? inferred.gpuWeight,
    preset1440Multiplier: game.preset1440Multiplier ?? inferred.preset1440Multiplier,
    preset4kMultiplier: game.preset4kMultiplier ?? inferred.preset4kMultiplier,
    fpsCap: game.fpsCap ?? inferred.fpsCap,
    fromBenchmark: false,
  };
};

const getResolutionMultiplier = (profile: InferredGameProfile, resolution: GameResolution): number => {
  if (resolution === '1080p') return 1;
  if (resolution === '1440p') return profile.preset1440Multiplier;
  return profile.preset4kMultiplier;
};

const detectBottleneck = (
  fpsCpuLimited: number,
  fpsGpuLimited: number,
  fpsEngineCap: number,
): 'cpu' | 'gpu' | 'balanced' => {
  const eCpu = Math.min(fpsCpuLimited, fpsEngineCap);
  const eGpu = Math.min(fpsGpuLimited, fpsEngineCap);

  if (eCpu < eGpu * 0.95) return 'cpu';
  if (eGpu < eCpu * 0.95) return 'gpu';
  return 'balanced';
};

const compute1PercentLow = (
  avgFps: number,
  bottleneck: 'cpu' | 'gpu' | 'balanced',
  buildProfile: BuildTierProfile,
): number => {
  let ratio: number;
  if (bottleneck === 'cpu') {
    ratio = 0.70; 
  } else if (bottleneck === 'gpu') {
    ratio = 0.78;
  } else {
    ratio = 0.74;
  }


  if (bottleneck !== 'gpu') {
    const pressure = clamp(avgFps / 180, 0.3, 1.0);
    ratio -= pressure * 0.05;
  }


  ratio *= 0.88 + buildProfile.ramFactor * 0.12;


  ratio += (buildProfile.cpuNorm - 1.0) * 0.07;

  ratio = clamp(ratio, 0.55, 0.88);

  const raw = Math.round(avgFps * ratio);
  return clamp(raw, 12, avgFps);
};

// Reference system constants
//   GPU: RTX 3060 12 GB  → score 114, gpuNorm = 114/150 = 0.76
//   CPU: Ryzen 5 5600X   → score 124, cpuNorm = 124/150 = 0.827

const REF_GPU_NORM = 114 / 150; 
const REF_CPU_NORM = 124 / 150;

// Core per-scenario estimator
const estimateForScenario = (
  buildProfile: BuildTierProfile,
  game: GameCatalogItem,
  resolution: GameResolution,
  quality: GameQualityPreset,
): GameScenarioEstimate => {
  const gameProfile = resolveGameProfile(game);
  const qualityMult = QUALITY_MULTIPLIER[quality];
  const resMult = getResolutionMultiplier(gameProfile, resolution);

  let fpsGpuLimited: number;
  let fpsCpuLimited: number;

  if (gameProfile.fromBenchmark) {
    const gpuRatio = buildProfile.gpuNorm / REF_GPU_NORM;
    const cpuRatio = buildProfile.cpuNorm / REF_CPU_NORM;

    // GPU limit: refFps × (gpuRatio ^ 1.35) × resScale × qualityScale × ram
    fpsGpuLimited =
      gameProfile.baseFps1080High *
      Math.pow(gpuRatio, 1.35) *
      resMult *
      qualityMult *
      buildProfile.ramFactor;

  
    const cpuExp = 0.7 + gameProfile.cpuWeight * 0.8;  // 0.89 – 1.22
    const cpuResOverhead = resolution === '4k' ? 0.92 : resolution === '1440p' ? 0.96 : 1.0;
    const cpuQualityFactor = quality === 'low' ? 1.06 : quality === 'medium' ? 1.02 : 1.0;

    fpsCpuLimited =
      gameProfile.baseFps1080High *
      Math.pow(cpuRatio, cpuExp) *
      cpuResOverhead *
      cpuQualityFactor *
      buildProfile.ramFactor;
  } else {
    const gpuExp = 0.65 + gameProfile.gpuWeight * 1.6;

    let effectiveResMult = resMult;
    if (resolution === '1440p' && gameProfile.baseFps1080High >= 110) {
      const boost = clamp((gameProfile.baseFps1080High - 110) / 200, 0, 0.08);
      effectiveResMult *= 1.0 + boost;
    }

    fpsGpuLimited =
      gameProfile.baseFps1080High *
      Math.pow(buildProfile.gpuNorm, gpuExp) *
      effectiveResMult *
      qualityMult *
      buildProfile.ramFactor;

    const cpuExp = 0.45 + gameProfile.cpuWeight * 1.5;
    const cpuResOverhead = resolution === '4k' ? 0.88 : resolution === '1440p' ? 0.95 : 1.0;
    const cpuQualityFactor = quality === 'low' ? 1.08 : quality === 'medium' ? 1.03 : 1.0;

    fpsCpuLimited =
      gameProfile.baseFps1080High *
      Math.pow(buildProfile.cpuNorm, cpuExp) *
      cpuResOverhead *
      cpuQualityFactor *
      buildProfile.ramFactor;
  }

  // --- Engine / game FPS cap ---
  const fpsEngineCap = gameProfile.fpsCap;

  const rawFps = Math.min(fpsGpuLimited, fpsCpuLimited, fpsEngineCap);
  
  const averageFps = Math.round(clamp(rawFps, 18, 1200));

  const bottleneck = detectBottleneck(fpsCpuLimited, fpsGpuLimited, fpsEngineCap);

  //1 % low FPS
  const low1PercentFps = compute1PercentLow(averageFps, bottleneck, buildProfile);

  // CPU / GPU usage estimates
  const framePressure = clamp(averageFps / 165, 0.45, 1.2);
  const resWeight = resolution === '4k' ? 0.34 : resolution === '1440p' ? 0.24 : 0.16;
  const qualWeight = quality === 'epic' ? 0.26 : quality === 'medium' ? 0.18 : 0.12;

  let cpuUsagePercent: number;
  let gpuUsagePercent: number;

  if (bottleneck === 'gpu') {
    gpuUsagePercent = Math.round(clamp(85 + resWeight * 20 + qualWeight * 10, 80, 99));
    cpuUsagePercent = Math.round(clamp(30 + framePressure * 25 / buildProfile.cpuNorm, 22, 85));
  } else if (bottleneck === 'cpu') {
    cpuUsagePercent = Math.round(clamp(82 + framePressure * 12, 75, 99));
    gpuUsagePercent = Math.round(clamp(40 + resWeight * 30 + qualWeight * 15, 30, 88));
  } else {
    cpuUsagePercent = Math.round(clamp(65 + framePressure * 15 / buildProfile.cpuNorm, 55, 95));
    gpuUsagePercent = Math.round(clamp(68 + resWeight * 20 + qualWeight * 12, 58, 96));
  }

  const playability: Playability =
    averageFps >= 120 ? 'Great' : averageFps >= 75 ? 'Good' : averageFps >= 50 ? 'Playable' : 'Needs tuning';

  return {
    resolution,
    quality,
    averageFps,
    low1PercentFps,
    cpuUsagePercent,
    gpuUsagePercent,
    bottleneck,
    playability,
  };
};

const cpuLabelForScore = (score: number): string => {
  if (score >= 192) return 'Ryzen 7 9800X3D / Core i9-14900KS class';
  if (score >= 182) return 'Ryzen 7 7800X3D / Core i7-14700K class';
  if (score >= 172) return 'Ryzen 7 9700X / Core i5-14600K class';
  if (score >= 162) return 'Ryzen 5 9600X / Core i5-13600K class';
  if (score >= 152) return 'Ryzen 5 7600X / Core i7-12700K class';
  if (score >= 142) return 'Ryzen 5 7600 / Core i5-12600K class';
  if (score >= 132) return 'Ryzen 7 5700X / Core i5-12400F class';
  if (score >= 120) return 'Ryzen 5 5600 / Core i3-12100F class';
  if (score >= 108) return 'Ryzen 5 3600 / Core i5-10400 class';
  if (score >= 96) return 'Ryzen 5 2600 / Core i5-9400F class';
  if (score >= 86) return 'Ryzen 3 3300X / Core i3-10100 class';
  return 'Ryzen 3 1200 / Core i5-7500 class';
};

const gpuLabelForScore = (score: number): string => {
  if (score >= 205) return 'RTX 5090 / RX 9090 class';
  if (score >= 190) return 'RTX 5080 / RX 7900 XTX class';
  if (score >= 176) return 'RTX 4080 / RX 7900 XT class';
  if (score >= 164) return 'RTX 4070 Ti / RX 7800 XT class';
  if (score >= 152) return 'RTX 4070 / RX 7700 XT class';
  if (score >= 140) return 'RTX 4060 Ti / RX 7600 XT class';
  if (score >= 128) return 'RTX 4060 / RX 7600 class';
  if (score >= 116) return 'RTX 3060 / RX 6700 XT class';
  if (score >= 104) return 'RTX 2060 / RX 6600 class';
  if (score >= 92) return 'GTX 1660 Super / RTX 3050 / RX 5600 XT class';
  if (score >= 80) return 'GTX 1060 6GB / RX 580 class';
  return 'GTX 970 / RX 570 class';
};

const estimateRecommendedSpecs = (game: GameCatalogItem): SpecsRecommendation => {
  const gameProfile = resolveGameProfile(game);
  const tags = tagsLower(game);
  const year = parseReleaseYear(game.firstReleaseDate);
  const title = game.name.toLowerCase();

  const complexity = clamp(gameProfile.cpuWeight * 0.62 + gameProfile.gpuWeight * 0.98, 0.45, 1.35);
  const modernity = year ? clamp((year - 2012) / 12, 0, 1) : 0.35;
  const demand = clamp((120 - gameProfile.baseFps1080High) / 72, 0, 1);
  const totalWeight = gameProfile.cpuWeight + gameProfile.gpuWeight;
  const effectiveWeight = totalWeight <= 0.1 ? 1 : totalWeight;

  const likelyLightweight =
    hasAnyTag(tags, ['puzzle', 'indie', 'arcade', 'platform', 'point-and-click', 'visual novel', 'card']) ||
    hasAnyText(title, ['minecraft', 'terraria', 'stardew', 'among us', 'hades', 'celeste', 'undertale']);
  const likelyHeavy =
    hasAnyTag(tags, ['open world', 'battle royale', 'vr', 'first-person shooter', 'third person shooter']) ||
    hasAnyText(title, ['cyberpunk', 'flight simulator', 'starfield', 'black myth', 'alan wake']);

  let minTarget = 38 + complexity * 16 + modernity * 9 + demand * 14;
  let recommendedTarget = 58 + complexity * 24 + modernity * 16 + demand * 20;

  if (likelyLightweight && !likelyHeavy) {
    minTarget -= 8;
    recommendedTarget -= 10;
  }
  if (likelyHeavy) {
    minTarget += 5;
    recommendedTarget += 8;
  }

  minTarget = clamp(minTarget, 30, 98);
  recommendedTarget = clamp(recommendedTarget, 45, 150);

  const minNorm = clamp(
    Math.pow(minTarget / Math.max(28, gameProfile.baseFps1080High * 1.02), 1 / effectiveWeight),
    0.44,
    1.45,
  );
  const recNorm = clamp(
    Math.pow(recommendedTarget / Math.max(30, gameProfile.baseFps1080High * QUALITY_MULTIPLIER.epic), 1 / effectiveWeight),
    0.56,
    1.65,
  );

  const minCpuScore = Math.round(150 * minNorm * (0.82 + gameProfile.cpuWeight * 0.34));
  const minGpuScore = Math.round(150 * minNorm * (0.78 + gameProfile.gpuWeight * 0.38));
  const recCpuScore = Math.round(150 * recNorm * (0.84 + gameProfile.cpuWeight * 0.33));
  const recGpuScore = Math.round(150 * recNorm * (0.8 + gameProfile.gpuWeight * 0.37));

  const memoryHeavy =
    hasAnyTag(tags, ['open world', 'simulation', 'strategy', 'vr', 'battle royale', 'massively multiplayer']) ||
    (year !== null && year >= 2021) ||
    gameProfile.gpuWeight >= 0.6 ||
    gameProfile.baseFps1080High <= 90;

  const minRamFactor = likelyLightweight && !memoryHeavy ? 0.96 : memoryHeavy ? 0.93 : 0.95;
  const recRamFactor = likelyLightweight && !memoryHeavy ? 1.0 : memoryHeavy ? 1.07 : 1.03;
  const minCpuNorm = clamp(minCpuScore / 150, 0.4, 1.5);
  const minGpuNorm = clamp(minGpuScore / 150, 0.4, 1.7);
  const recCpuNorm = clamp(recCpuScore / 150, 0.5, 1.7);
  const recGpuNorm = clamp(recGpuScore / 150, 0.5, 1.9);

  const minimum1080pLowFps = Math.round(
    clamp(
      gameProfile.baseFps1080High *
        Math.pow(minCpuNorm, gameProfile.cpuWeight) *
        Math.pow(minGpuNorm, gameProfile.gpuWeight) *
        minRamFactor *
        QUALITY_MULTIPLIER.low,
      20,
      320,
    ),
  );
  const recommended1080pLowFps = Math.round(
    clamp(
      gameProfile.baseFps1080High *
        Math.pow(recCpuNorm, gameProfile.cpuWeight) *
        Math.pow(recGpuNorm, gameProfile.gpuWeight) *
        recRamFactor *
        QUALITY_MULTIPLIER.low,
      28,
      420,
    ),
  );

  return {
    minimum: {
      cpu: cpuLabelForScore(minCpuScore),
      gpu: gpuLabelForScore(minGpuScore),
      ramGb: likelyLightweight && !memoryHeavy ? 8 : memoryHeavy ? 16 : 12,
      estimated1080pLowFps: minimum1080pLowFps,
    },
    recommended: {
      cpu: cpuLabelForScore(recCpuScore),
      gpu: gpuLabelForScore(recGpuScore),
      ramGb: likelyLightweight && !memoryHeavy ? 12 : memoryHeavy ? 32 : 16,
      estimated1080pLowFps: recommended1080pLowFps,
    },
  };
};

export function estimateBuildFpsFromCatalog(
  build: Build,
  preset: FpsPresetId,
  catalog: GameCatalogItem[],
): { items: EstimatedGame[]; confidence: FpsConfidence } {
  const buildProfile = resolveBuildProfile(build);
  const resolution: GameResolution = preset === '1440p-high' ? '1440p' : preset === '4k-ultra' ? '4k' : '1080p';

  // All presets use 'epic' quality (= Ultra raster, RT OFF, multiplier 0.97).
  // baseFps1080High is calibrated for "High" settings, so 0.97 is a ~3 % step
  // down — representative of the High-to-Ultra raster range without the old
  // 0.82 hidden nerf.
  const items = catalog.map((game, index) => {
    const estimate = estimateForScenario(buildProfile, game, resolution, 'epic');
    return {
      gameId: index + 1,
      igdbId: game.igdbId,
      slug: game.slug,
      name: game.name,
      imagePath: game.imagePath,
      sourceUrl: game.sourceUrl,
      averageFps: estimate.averageFps,
      low1PercentFps: estimate.low1PercentFps,
      bottleneck: estimate.bottleneck,
    };
  });

  return { items, confidence: buildProfile.confidence };
}

export function estimateGameInsights(build: Build, game: GameCatalogItem): GameInsights {
  const buildProfile = resolveBuildProfile(build);
  const scenarios: GameScenarioEstimate[] = [];
  const resolutions: GameResolution[] = ['1080p', '1440p', '4k'];
  const qualityPresets: GameQualityPreset[] = ['low', 'medium', 'epic'];

  for (const resolution of resolutions) {
    for (const quality of qualityPresets) {
      scenarios.push(estimateForScenario(buildProfile, game, resolution, quality));
    }
  }

  return {
    confidence: buildProfile.confidence,
    scenarios,
    specRecommendation: estimateRecommendedSpecs(game),
  };
}
