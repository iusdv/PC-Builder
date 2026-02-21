
// Curated per-game benchmark reference table
// To add a game: find its IGDB slug, look up RTX 3060 benchmarks at 1080p High,
// and fill in the fields.


export type GameCategory =
  | '2d-lightweight'      // 2D )
  | 'esports-light'       // Competitive / older multiplayer
  | 'indie-3d'            // Indie 3D, moderate demand
  | 'last-gen-aaa'        // Older AAA well optimized
  | 'modern-aaa'          // Modern AAA demanding
  | 'ultra-demanding'     //heavy AAA
  | 'engine-locked';      // Framerate-locked by engine (60/120 fps)

export type Sensitivity = 'low' | 'medium' | 'high';

export type BenchmarkEntry = {
  slug: string;
  refFps: number;
  cpuSensitivity: Sensitivity;
  gpuSensitivity: Sensitivity;
  fpsCap: number | null;
  category: GameCategory;
  res1440Scale: number;
  res4kScale: number;
};


export const BENCHMARK_TABLE: BenchmarkEntry[] = [
  // ── 2D / Lightweight
  { slug: 'minecraft',                   refFps: 450, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.92, res4kScale: 0.78 },
  { slug: 'terraria',                    refFps: 600, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.96, res4kScale: 0.90 },
  { slug: 'stardew-valley',              refFps: 600, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.97, res4kScale: 0.92 },
  { slug: 'hollow-knight',               refFps: 600, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.97, res4kScale: 0.93 },
  { slug: 'hollow-knight-silksong',      refFps: 600, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.97, res4kScale: 0.93 },
  { slug: 'celeste',                     refFps: 700, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.98, res4kScale: 0.95 },
  { slug: 'undertale',                   refFps: 999, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.99, res4kScale: 0.98 },
  { slug: 'hades',                       refFps: 500, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.96, res4kScale: 0.88 },
  { slug: 'hades-ii',                    refFps: 350, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: '2d-lightweight', res1440Scale: 0.92, res4kScale: 0.75 },
  { slug: 'cuphead',                     refFps: 600, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.98, res4kScale: 0.95 },
  { slug: 'among-us',                    refFps: 600, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.98, res4kScale: 0.95 },
  { slug: 'dead-cells',                  refFps: 500, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.97, res4kScale: 0.92 },
  { slug: 'ori-and-the-blind-forest',    refFps: 500, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.96, res4kScale: 0.90 },
  { slug: 'ori-and-the-will-of-the-wisps', refFps: 400, cpuSensitivity: 'low', gpuSensitivity: 'medium', fpsCap: null, category: '2d-lightweight', res1440Scale: 0.93, res4kScale: 0.78 },
  { slug: 'shovel-knight',               refFps: 999, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.99, res4kScale: 0.98 },
  { slug: 'the-binding-of-isaac-rebirth', refFps: 600, cpuSensitivity: 'low', gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.98, res4kScale: 0.95 },
  { slug: 'slay-the-spire',              refFps: 999, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.99, res4kScale: 0.98 },
  { slug: 'factorio',                    refFps: 300, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: 60,   category: '2d-lightweight', res1440Scale: 0.97, res4kScale: 0.92 },
  { slug: 'vampire-survivors',           refFps: 600, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: null, category: '2d-lightweight', res1440Scale: 0.98, res4kScale: 0.95 },
  { slug: 'rimworld',                    refFps: 200, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.97, res4kScale: 0.93 },
  { slug: 'disco-elysium',               refFps: 250, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.90, res4kScale: 0.68 },
  { slug: 'inside',                      refFps: 500, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: null, category: '2d-lightweight', res1440Scale: 0.96, res4kScale: 0.90 },

  // ── Esports / Competitive / Light 3D 
  { slug: 'counter-strike-2',            refFps: 220, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.82, res4kScale: 0.52 },
  { slug: 'counter-strike-global-offensive', refFps: 280, cpuSensitivity: 'high', gpuSensitivity: 'low', fpsCap: null, category: 'esports-light', res1440Scale: 0.85, res4kScale: 0.58 },
  { slug: 'valorant',                    refFps: 300, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: null, category: 'esports-light', res1440Scale: 0.88, res4kScale: 0.62 },
  { slug: 'fortnite',                    refFps: 130, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.78, res4kScale: 0.46 },
  { slug: 'league-of-legends',           refFps: 300, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: null, category: 'esports-light', res1440Scale: 0.90, res4kScale: 0.72 },
  { slug: 'dota-2',                      refFps: 180, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.82, res4kScale: 0.55 },
  { slug: 'apex-legends',                refFps: 130, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'overwatch-2',                 refFps: 170, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.80, res4kScale: 0.50 },
  { slug: 'overwatch',                   refFps: 170, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.80, res4kScale: 0.50 },
  { slug: 'rocket-league',               refFps: 280, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.87, res4kScale: 0.60 },
  { slug: 'rainbow-six-siege',           refFps: 200, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'team-fortress-2',             refFps: 350, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: null, category: 'esports-light', res1440Scale: 0.90, res4kScale: 0.72 },
  { slug: 'left-4-dead-2',               refFps: 300, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: null, category: 'esports-light', res1440Scale: 0.90, res4kScale: 0.75 },
  { slug: 'warframe',                    refFps: 170, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.80, res4kScale: 0.50 },
  { slug: 'world-of-warcraft',           refFps: 120, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.82, res4kScale: 0.55 },
  { slug: 'destiny-2',                   refFps: 110, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.75, res4kScale: 0.44 },
  { slug: 'path-of-exile',               refFps: 120, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.82, res4kScale: 0.55 },
  { slug: 'path-of-exile-2',             refFps: 90,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },

  // ── Source Engine & Valve Classics 
  { slug: 'portal',                      refFps: 300, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: 300,  category: 'esports-light', res1440Scale: 0.92, res4kScale: 0.78 },
  { slug: 'portal-2',                    refFps: 300, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: 300,  category: 'esports-light', res1440Scale: 0.90, res4kScale: 0.75 },
  { slug: 'half-life-2',                 refFps: 300, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: 300,  category: 'esports-light', res1440Scale: 0.92, res4kScale: 0.78 },
  { slug: 'half-life',                   refFps: 999, cpuSensitivity: 'low',  gpuSensitivity: 'low',  fpsCap: 999,  category: '2d-lightweight', res1440Scale: 0.99, res4kScale: 0.97 },
  { slug: 'garrys-mod',                  refFps: 300, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: 300,  category: 'esports-light', res1440Scale: 0.92, res4kScale: 0.78 },

  // ── Indie 3D / Mid-tier 
  { slug: 'subnautica',                  refFps: 110, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'subnautica-below-zero',       refFps: 100, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.80, res4kScale: 0.50 },
  { slug: 'satisfactory',                refFps: 80,  cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'deep-rock-galactic',          refFps: 140, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'valheim',                     refFps: 80,  cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.75, res4kScale: 0.45 },
  { slug: 'lethal-company',              refFps: 140, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.82, res4kScale: 0.55 },
  { slug: 'rust',                        refFps: 85,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'no-mans-sky',                 refFps: 75,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'sea-of-thieves',              refFps: 100, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'palworld',                    refFps: 70,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },

  // ── Last-gen AAA / Well-optimized 
  { slug: 'the-witcher-3-wild-hunt',     refFps: 90,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.75, res4kScale: 0.42 },
  { slug: 'grand-theft-auto-v',          refFps: 100, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'grand-theft-auto-iv',         refFps: 120, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.82, res4kScale: 0.58 },
  { slug: 'grand-theft-auto-san-andreas', refFps: 60, cpuSensitivity: 'low', gpuSensitivity: 'low',    fpsCap: 60,   category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'grand-theft-auto-vice-city',  refFps: 60,  cpuSensitivity: 'low', gpuSensitivity: 'low',    fpsCap: 60,   category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'red-dead-redemption-2',       refFps: 72,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'red-dead-redemption',         refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.78, res4kScale: 0.50 },
  { slug: 'god-of-war',                  refFps: 75,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.73, res4kScale: 0.42 },
  { slug: 'god-of-war-ragnarok',         refFps: 65,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'marvels-spider-man-remastered', refFps: 90, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'marvels-spider-man-miles-morales', refFps: 80, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'horizon-zero-dawn',           refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.73, res4kScale: 0.42 },
  { slug: 'horizon-forbidden-west',      refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.70, res4kScale: 0.38 },
  { slug: 'the-last-of-us-part-i',       refFps: 70,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'uncharted-4-a-thiefs-end',    refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'uncharted-legacy-of-thieves-collection', refFps: 75, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.73, res4kScale: 0.42 },
  { slug: 'ghost-of-tsushima',           refFps: 85,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.75, res4kScale: 0.44 },
  { slug: 'death-stranding',             refFps: 110, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'control',                     refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'doom-eternal',                refFps: 180, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: 1000, category: 'esports-light', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'doom-2016',                   refFps: 170, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'esports-light', res1440Scale: 0.82, res4kScale: 0.55 },
  { slug: 'resident-evil-village',       refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'resident-evil-4',             refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'monster-hunter-world',        refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'monster-hunter-wilds',        refFps: 50,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.68, res4kScale: 0.36 },

  // ── Modern AAA / Demanding 
  { slug: 'cyberpunk-2077',              refFps: 58,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.68, res4kScale: 0.35 },
  { slug: 'starfield',                   refFps: 48,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.68, res4kScale: 0.35 },
  { slug: 'alan-wake-2',                 refFps: 42,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.65, res4kScale: 0.32 },
  { slug: 'black-myth-wukong',           refFps: 50,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.68, res4kScale: 0.35 },
  { slug: 'hogwarts-legacy',             refFps: 65,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'marvels-spider-man-2',        refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.70, res4kScale: 0.38 },
  { slug: 'baldurs-gate-3',              refFps: 85,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'elden-ring',                  refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: 60,   category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'dark-souls-iii',              refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: 60, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'dark-souls-remastered',       refFps: 60,  cpuSensitivity: 'low',  gpuSensitivity: 'low',    fpsCap: 60,  category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'dark-souls-ii',               refFps: 60,  cpuSensitivity: 'low',  gpuSensitivity: 'low',    fpsCap: 60,  category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'sekiro-shadows-die-twice',    refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: 60, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'armored-core-vi-fires-of-rubicon', refFps: 60, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: 60, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'lies-of-p',                   refFps: 85,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'microsoft-flight-simulator',  refFps: 40,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.65, res4kScale: 0.32 },
  { slug: 'total-war-warhammer-iii',     refFps: 65,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'civilization-vi',             refFps: 120, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.82, res4kScale: 0.58 },

  // ── Bethesda Engine-locked
  { slug: 'the-elder-scrolls-v-skyrim',  refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: 120, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 0.92 },
  { slug: 'the-elder-scrolls-v-skyrim-special-edition', refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: 120, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 0.85 },
  { slug: 'fallout-4',                   refFps: 90,  cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'fallout-new-vegas',           refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'low',  fpsCap: 120, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 0.95 },
  { slug: 'the-elder-scrolls-iv-oblivion', refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: 120, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 0.95 },

  // ── Last-gen Classics
  { slug: 'bioshock',                    refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.85, res4kScale: 0.62 },
  { slug: 'bioshock-infinite',           refFps: 180, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.82, res4kScale: 0.58 },
  { slug: 'bioshock-2',                  refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.85, res4kScale: 0.62 },
  { slug: 'mass-effect-legendary-edition', refFps: 180, cpuSensitivity: 'low', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.82, res4kScale: 0.58 },
  { slug: 'mass-effect',                 refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'low',    fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.88, res4kScale: 0.68 },
  { slug: 'mass-effect-2',               refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'low',    fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.88, res4kScale: 0.68 },
  { slug: 'mass-effect-3',               refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.85, res4kScale: 0.62 },
  { slug: 'assassins-creed-ii',          refFps: 200, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.88, res4kScale: 0.68 },
  { slug: 'assassins-creed-brotherhood', refFps: 180, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.86, res4kScale: 0.65 },
  { slug: 'assassins-creed-origins',     refFps: 75,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'assassins-creed-odyssey',     refFps: 65,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'assassins-creed-valhalla',    refFps: 60,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.70, res4kScale: 0.38 },
  { slug: 'batman-arkham-city',          refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.85, res4kScale: 0.62 },
  { slug: 'batman-arkham-asylum',        refFps: 250, cpuSensitivity: 'low',  gpuSensitivity: 'low',    fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.88, res4kScale: 0.68 },
  { slug: 'batman-arkham-knight',        refFps: 100, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'tomb-raider-2013',            refFps: 180, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.82, res4kScale: 0.58 },
  { slug: 'rise-of-the-tomb-raider',     refFps: 100, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'shadow-of-the-tomb-raider',   refFps: 85,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'far-cry-5',                   refFps: 95,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'far-cry-6',                   refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'metro-exodus',                refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.70, res4kScale: 0.38 },
  { slug: 'metro-2033',                  refFps: 140, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'metro-last-light',            refFps: 130, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'borderlands-3',               refFps: 85,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'borderlands-2',               refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.85, res4kScale: 0.62 },
  { slug: 'dying-light-2-stay-human',    refFps: 55,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.70, res4kScale: 0.38 },
  { slug: 'dying-light',                 refFps: 100, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'the-legend-of-zelda-breath-of-the-wild', refFps: 60, cpuSensitivity: 'medium', gpuSensitivity: 'low', fpsCap: 60, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'the-legend-of-zelda-tears-of-the-kingdom', refFps: 60, cpuSensitivity: 'high', gpuSensitivity: 'low', fpsCap: 60, category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },

  // ── Call of Duty family
  { slug: 'call-of-duty-modern-warfare-2019', refFps: 110, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'call-of-duty-modern-warfare-ii', refFps: 100, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'call-of-duty-modern-warfare-iii', refFps: 95, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'call-of-duty-warzone',        refFps: 95,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'call-of-duty-black-ops-6',    refFps: 90,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },

  // ── Battlefield
  { slug: 'battlefield-2042',            refFps: 80,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'battlefield-v',               refFps: 110, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'battlefield-1',               refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.78, res4kScale: 0.48 },

  // ── Strategy / Simulation
  { slug: 'cities-skylines-ii',          refFps: 40,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.68, res4kScale: 0.35 },
  { slug: 'cities-skylines',             refFps: 70,  cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.78, res4kScale: 0.50 },
  { slug: 'total-war-warhammer-ii',      refFps: 70,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'age-of-empires-iv',           refFps: 100, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'age-of-empires-ii-definitive-edition', refFps: 200, cpuSensitivity: 'high', gpuSensitivity: 'low', fpsCap: null, category: 'esports-light', res1440Scale: 0.92, res4kScale: 0.78 },
  { slug: 'stellaris',                   refFps: 120, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: null, category: 'esports-light', res1440Scale: 0.90, res4kScale: 0.76 },
  { slug: 'europa-universalis-iv',       refFps: 150, cpuSensitivity: 'high', gpuSensitivity: 'low',  fpsCap: null, category: 'esports-light', res1440Scale: 0.92, res4kScale: 0.80 },

  // ── Horror / Survival
  { slug: 'phasmophobia',                refFps: 130, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'dead-by-daylight',            refFps: 110, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'the-forest',                  refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'indie-3d', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'sons-of-the-forest',          refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },

  // ── Racing
  { slug: 'forza-horizon-5',             refFps: 90,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'forza-horizon-4',             refFps: 110, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.78, res4kScale: 0.48 },
  { slug: 'forza-motorsport',            refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'assetto-corsa-competizione',  refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },

  // ── Souls-like / RPG 
  { slug: 'the-witcher-3-wild-hunt--complete-edition', refFps: 90, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.75, res4kScale: 0.42 },
  { slug: 'divinity-original-sin-2',     refFps: 130, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'dragon-age-the-veilguard',    refFps: 60,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.70, res4kScale: 0.38 },
  { slug: 'final-fantasy-xvi',           refFps: 70,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'final-fantasy-vii-rebirth',   refFps: 55,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.68, res4kScale: 0.35 },

  //More popular titles
  { slug: 'pubg-battlegrounds',          refFps: 100, cpuSensitivity: 'high', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.76, res4kScale: 0.45 },
  { slug: 'the-sims-4',                  refFps: 200, cpuSensitivity: 'medium', gpuSensitivity: 'low',  fpsCap: null, category: 'esports-light', res1440Scale: 0.90, res4kScale: 0.75 },
  { slug: 'genshin-impact',              refFps: 60,  cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: 60,  category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'it-takes-two',                refFps: 120, cpuSensitivity: 'medium', gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.80, res4kScale: 0.52 },
  { slug: 'a-plague-tale-requiem',        refFps: 55,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.70, res4kScale: 0.38 },
  { slug: 'a-way-out',                   refFps: 140, cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.82, res4kScale: 0.58 },
  { slug: 'persona-5-royal',             refFps: 200, cpuSensitivity: 'low',  gpuSensitivity: 'low',    fpsCap: null, category: 'last-gen-aaa', res1440Scale: 0.92, res4kScale: 0.78 },
  { slug: 'nier-automata',               refFps: 60,  cpuSensitivity: 'low',  gpuSensitivity: 'medium', fpsCap: 60,  category: 'engine-locked', res1440Scale: 1.00, res4kScale: 1.00 },
  { slug: 'ready-or-not',                refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'helldivers-2',                refFps: 70,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'escape-from-tarkov',          refFps: 75,  cpuSensitivity: 'high', gpuSensitivity: 'high',  fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'the-crew-motorfest',          refFps: 80,  cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.74, res4kScale: 0.42 },
  { slug: 'warhammer-40000-space-marine-2', refFps: 65, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'modern-aaa', res1440Scale: 0.72, res4kScale: 0.40 },
  { slug: 'indiana-jones-and-the-great-circle', refFps: 50, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.68, res4kScale: 0.35 },
  { slug: 'stalker-2-heart-of-chornobyl', refFps: 45, cpuSensitivity: 'medium', gpuSensitivity: 'high', fpsCap: null, category: 'ultra-demanding', res1440Scale: 0.65, res4kScale: 0.32 },
];


const BENCHMARK_INDEX = new Map<string, BenchmarkEntry>();
for (const entry of BENCHMARK_TABLE) {
  BENCHMARK_INDEX.set(entry.slug, entry);
}


export function lookupBenchmark(slug: string): BenchmarkEntry | null {
  return BENCHMARK_INDEX.get(slug) ?? null;
}
