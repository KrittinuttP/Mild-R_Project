/**
 * Master roster — Pixela talents provided for this project.
 * Does not replace LUMINA_CHANNELS (collab-poll allowlist).
 */

export const PIXELA_AGENCY = "Pixela" as const;

/** High-level project under Pixela */
export type PixelaProject = "lumina" | "pixela";

/** Lumina generation / unit slug (roster may include a subset) */
export type PixelaLuminaUnit = "world-end";

/** Non-Lumina Pixela unit slug */
export type PixelaOtherUnit =
  | "isekai"
  | "legends"
  | "sololist"
  | "mystic"
  | "destiny"
  | "gen-1";

export type PixelaUnit = PixelaLuminaUnit | PixelaOtherUnit;

export type PixelaSourceLabel = "Lumina Pixela" | "Pixela";

export type PixelaTalent = {
  /** Short roster label */
  title: string;
  name: string;
  channelTitle: string | null;
  handle: string | null;
  channelId: string | null;
  /** Canonical YouTube URL when known (handle or /c/…) */
  channelUrl: string | null;
  agency: typeof PIXELA_AGENCY;
  project: PixelaProject;
  unit: PixelaUnit;
  /**
   * Label for sync/manual metadata — e.g. "Lumina Pixela" / "Pixela"
   */
  sourceLabel: PixelaSourceLabel;
  /** Optional roster primary flag (from source data) */
  isMain?: boolean;
};

function luminaTalent(
  partial: Omit<PixelaTalent, "agency" | "project" | "sourceLabel">
): PixelaTalent {
  return {
    ...partial,
    agency: PIXELA_AGENCY,
    project: "lumina",
    sourceLabel: "Lumina Pixela",
  };
}

function pixelaTalent(
  partial: Omit<PixelaTalent, "agency" | "project" | "sourceLabel">
): PixelaTalent {
  return {
    ...partial,
    agency: PIXELA_AGENCY,
    project: "pixela",
    sourceLabel: "Pixela",
  };
}

/** Pixela talents from the provided roster only. */
export const PIXELA_TALENTS: PixelaTalent[] = [
  // ——— Lumina · World End ———
  luminaTalent({
    title: "Debirun",
    name: "Debirun",
    channelTitle: "Debirun Ch. Pixela-World-End",
    handle: "@DebirunWorldEnd",
    channelId: "UCot8DHNnZ2X0ARgaNYZopjw",
    channelUrl: "https://www.youtube.com/@DebirunWorldEnd",
    unit: "world-end",
    
  }),

  // ——— Pixela · Isekai ———
  pixelaTalent({
    title: "Jolly Estaa",
    name: "Jolly Estaa",
    channelTitle: "Jolly Estaa Ch. PIXELA",
    handle: "@JollyEstaa",
    channelId: null,
    channelUrl: "https://www.youtube.com/@JollyEstaa",
    unit: "isekai",
    
  }),
  pixelaTalent({
    title: "Aranis Elvene",
    name: "Aranis Elvene",
    channelTitle: "Aranis Elvene Ch. PIXELA",
    handle: "@AranisElvene",
    channelId: null,
    channelUrl: "https://www.youtube.com/@AranisElvene",
    unit: "isekai",
    
  }),
  pixelaTalent({
    title: "Hanabi Lafy",
    name: "Hanabi Lafy",
    channelTitle: "Hanabi Lafy Ch. PIXELA",
    handle: "@HanabiLafy",
    channelId: null,
    channelUrl: "https://www.youtube.com/@HanabiLafy",
    unit: "isekai",
    
  }),
  pixelaTalent({
    title: "Kitsuneko Mewten",
    name: "Kitsuneko Mewten",
    channelTitle: "Kitsuneko Mewten Ch. PIXELA",
    handle: "@KitsunekoMewten",
    channelId: null,
    channelUrl: "https://www.youtube.com/@KitsunekoMewten",
    unit: "isekai",
    
  }),

  // ——— Pixela · Legends ———
  pixelaTalent({
    title: "Superpretty TAKOPERO",
    name: "Superpretty TAKOPERO",
    channelTitle: "Superpretty TAKOPERO Ch. PIXELA",
    handle: "@TAKOPERO",
    channelId: null,
    channelUrl: "https://www.youtube.com/@TAKOPERO",
    unit: "legends",
    
  }),
  pixelaTalent({
    title: "Akemi Arlin",
    name: "Akemi Arlin",
    channelTitle: "Akemi Arlin Ch. PIXELA",
    handle: "@AkemiArlin",
    channelId: null,
    channelUrl: "https://www.youtube.com/@AkemiArlin",
    unit: "legends",
    
  }),
  pixelaTalent({
    title: "Nezumi Elze",
    name: "Nezumi Elze",
    channelTitle: "Nezumi Elze Ch. PIXELA",
    handle: "@NezumiElze",
    channelId: null,
    channelUrl: "https://www.youtube.com/@NezumiElze",
    unit: "legends",
    
  }),
  pixelaTalent({
    title: "Umino Ciala",
    name: "Umino Ciala",
    channelTitle: "Umino Ciala Ch. PIXELA",
    handle: "@UminoCiala",
    channelId: null,
    channelUrl: "https://www.youtube.com/@UminoCiala",
    unit: "legends",
    
  }),

  // ——— Pixela · Sololist ———
  pixelaTalent({
    title: "Roselia De Magentia",
    name: "Roselia De Magentia",
    channelTitle: "Roselia De Magentia Ch. PIXELA",
    handle: "@RoseliadeMagentia",
    channelId: null,
    channelUrl: "https://www.youtube.com/@RoseliadeMagentia",
    unit: "sololist",
    
  }),
  pixelaTalent({
    title: "Sisira Hydrangea",
    name: "Sisira Hydrangea",
    channelTitle: "Sisira Hydrangea Ch.",
    handle: "@SisiraHydrangea",
    channelId: "UCjrs5Sse402rafaOP-k37Xw",
    channelUrl: "https://www.youtube.com/@SisiraHydrangea",
    unit: "sololist",
    
  }),
  pixelaTalent({
    title: "Divina",
    name: "Divina",
    channelTitle: "Divina Ch. PixelaS",
    handle: "@DivinaCh.PixelaS",
    channelId: null,
    channelUrl: "https://www.youtube.com/@DivinaCh.PixelaS",
    unit: "sololist",
    
  }),

  // ——— Pixela · Mystic ———
  pixelaTalent({
    title: "Mycara Melony",
    name: "Mycara Melony",
    channelTitle: "Mycara Melony Ch. PIXELA",
    handle: "@MycaraMelony",
    channelId: null,
    channelUrl: "https://www.youtube.com/@MycaraMelony",
    unit: "mystic",
    
  }),

  // ——— Pixela · Destiny ———
  pixelaTalent({
    title: "Grimus Grimm",
    name: "Grimus Grimm",
    channelTitle: "Grimus Grimm Ch. PIXELA",
    handle: "@GrimmGrimus",
    channelId: null,
    channelUrl: "https://www.youtube.com/@GrimmGrimus",
    unit: "destiny",
    
  }),
  pixelaTalent({
    title: "Biscuit Blythe",
    name: "Biscuit Blythe",
    channelTitle: "Biscuit Blythe Ch. PIXELA",
    handle: "@BlytheBiscuit",
    channelId: null,
    channelUrl: "https://www.youtube.com/@BlytheBiscuit",
    unit: "destiny",
    
  }),

  // ——— Pixela · Gen-1 ———
  pixelaTalent({
    title: "Princess Zelina",
    name: "Princess Zelina",
    channelTitle: "Princess Zelina Ch. PIXELA",
    handle: "@PrincessZelina",
    channelId: null,
    channelUrl: "https://www.youtube.com/@PrincessZelina",
    unit: "gen-1",
    
  }),
];

export const PIXELA_UNIT_LABEL: Record<PixelaUnit, string> = {
  "world-end": "Lumina World End",
  isekai: "Pixela Isekai",
  legends: "Pixela Legends",
  sololist: "Pixela Sololist",
  mystic: "Pixela Mystic",
  destiny: "Pixela Destiny",
  "gen-1": "Pixela Gen-1",
};

export function listPixelaByUnit(unit: PixelaUnit): PixelaTalent[] {
  return PIXELA_TALENTS.filter((t) => t.unit === unit);
}

export function getPixelaByChannelId(
  channelId: string | null | undefined
): PixelaTalent | null {
  if (!channelId) return null;
  return PIXELA_TALENTS.find((t) => t.channelId === channelId) ?? null;
}

export function normalizePixelaKey(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Resolve talent from short name, handle, channel URL, or UC… id. */
export function resolvePixelaTalent(input: string | null | undefined) {
  if (!input?.trim()) return null;
  const raw = input.trim();
  const byId = PIXELA_TALENTS.find((t) => t.channelId === raw);
  if (byId) return byId;

  const byUrl = PIXELA_TALENTS.find(
    (t) => t.channelUrl && t.channelUrl.toLowerCase() === raw.toLowerCase()
  );
  if (byUrl) return byUrl;

  const key = normalizePixelaKey(raw);
  if (!key) return null;

  for (const t of PIXELA_TALENTS) {
    if (normalizePixelaKey(t.title) === key) return t;
    if (normalizePixelaKey(t.name) === key) return t;
    if (t.handle && normalizePixelaKey(t.handle) === key) return t;
    if (t.channelUrl && normalizePixelaKey(t.channelUrl) === key) return t;
  }

  const fuzzy = PIXELA_TALENTS.filter((t) => {
    const title = normalizePixelaKey(t.title);
    const name = normalizePixelaKey(t.name);
    return (
      title.startsWith(key) ||
      key.startsWith(title) ||
      title.includes(key) ||
      name.includes(key)
    );
  });

  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    fuzzy.sort(
      (a, b) =>
        normalizePixelaKey(a.title).length - normalizePixelaKey(b.title).length
    );
    return fuzzy[0];
  }
  return null;
}
