/**
 * Master roster of Lumina YouTube channels used for collab live discovery.
 * Mild-R is listed for reference but must not be polled as a "related/guest" channel.
 */

export type LuminaUnit =
  | "world-end"
  | "muse"
  | "first-myth"
  | "mutelu"
  | "dungeon-inc";

/** Affiliation project under Pixela agency */
export type LuminaProject = "Lumina" | "Pixela";

export type LuminaChannel = {
  /** Short roster label stored as live_streams.source_title */
  title: string;
  name: string;
  channelTitle: string;
  handle: string | null;
  /** UC… id — null until resolved; excluded from related polls */
  channelId: string | null;
  unit: LuminaUnit;
  /** Project affiliation — "Lumina" or "pixela" */
  project: LuminaProject;
  /** Mild-R main channel — excluded from related playlist polls */
  isMain?: boolean;
};

export const LUMINA_CHANNELS: LuminaChannel[] = [
  // World End
  {
    title: "Mild-R",
    name: "Mild-R",
    channelTitle: "Mild-R Ch. Lumina-World-End",
    handle: "@MildRWorldEnd",
    channelId: "UCknOyz3O0-G6w5SJNAgO7uQ",
    unit: "world-end",
    project: "Lumina",
    isMain: true,
  },
  {
    title: "Xonebu",
    name: "Xonebu X'thulhu",
    channelTitle: "Xonebu X'thulhu Ch. Lumina-World-End",
    handle: "@XonebuWorldEnd",
    channelId: "UCGo7fnmWfGQewxZVDmC3iJQ",
    unit: "world-end",
    project: "Lumina",
  },
  {
    title: "Tsururu",
    name: "Kumoku Tsururu",
    channelTitle: "Kumoku Tsururu Ch. Lumina-World-End",
    handle: "@TsururuWorldEnd",
    channelId: "UC3qnb4Sgo4QtiOi8iS7jOsQ",
    unit: "world-end",
    project: "Lumina",
  },
  {
    title: "Ashyra",
    name: "T-Reina Ashyra",
    channelTitle: "T-Reina Ashyra Ch. Lumina-World-End",
    handle: "@AshyraWorldEnd",
    channelId: "UCZYTMrnVmu1iUVyGeqB6zJQ",
    unit: "world-end",
    project: "Lumina",
  },
  {
    title: "AMI",
    name: "Beta AMI",
    channelTitle: "Beta AMI Ch. Lumina-World-End",
    handle: "@AMIWorldEnd",
    channelId: "UCa8ILv94qHT6oar_jVzg9sQ",
    unit: "world-end",
    project: "Lumina",
  },
  {
    title: "Debirun",
    name: "Debirun",
    channelTitle: "Debirun Ch. Lumina-World-End",
    handle: "@DebirunWorldEnd",
    channelId: "UCot8DHNnZ2X0ARgaNYZopjw",
    unit: "world-end",
    project: "Pixela",
  },

  // Muse
  {
    title: "Antolnette",
    name: "Antolnette the Magnificent",
    channelTitle: "Antolnette the Magnificent Ch. Lumina-Muse",
    handle: "@AntolnettetheMagnificent",
    channelId: "UCiZyQDO7v9UY_-Q24VsSLlQ",
    unit: "muse",
    project: "Lumina",
  },
  {
    title: "Dëa",
    name: "Dëa Ex Δ",
    channelTitle: "Dëa Ex Δ Ch. Lumina-Muse",
    handle: "@DeaExDelta",
    channelId: "UC-KEm4E7Yp_t0Gzix4SwkwA",
    unit: "muse",
    project: "Lumina",
  },
  {
    title: "Hinaree",
    name: "Hinaree Kannari",
    channelTitle: "Hinaree Kannari Ch. Lumina-Muse",
    handle: "@HinareeKannari",
    channelId: "UC0sN779hXum_LluFaWfJjcw",
    unit: "muse",
    project: "Lumina",
  },
  {
    title: "Florynne",
    name: "Lunessa Florynne",
    channelTitle: "Lunessa Florynne Ch. Lumina-Muse",
    handle: "@LunessaFlorynne",
    channelId: "UCbypR_t0teWxIdrQ9i83XiQ",
    unit: "muse",
    project: "Lumina",
  },

  // First-Myth
  {
    title: "Reirin",
    name: "Kamiyu Reirin",
    channelTitle: "Kamiyu Reirin Ch. Lumina-First-Myth",
    handle: "@KamiyuReirin",
    channelId: "UCLNBff3KDEUxdfH_lkvyOKQ",
    unit: "first-myth",
    project: "Lumina",
  },
  {
    title: "Sireen",
    name: "Atlanteia Sireen",
    channelTitle: "Atlanteia Sireen Ch. Lumina-First-Myth",
    handle: "@atlanteiasireen",
    channelId: "UCuyrIzf_bCTnyJHktJVpe4g",
    unit: "first-myth",
    project: "Lumina",
  },
  {
    title: "Lilibelle",
    name: "Ardalita Lilibelle",
    channelTitle: "Ardalita Lilibelle Ch. Lumina-First-Myth",
    handle: "@ArdalitaLili",
    channelId: "UC2eai5waelgobAHgp20DEYg",
    unit: "first-myth",
    project: "Lumina",
  },
  {
    title: "Mikael",
    name: "Cerafine Mikael",
    channelTitle: "Cerafine Mikael Ch. Lumina-First-Myth",
    handle: "@CerafineMikael",
    channelId: "UCgSsXxQ71nScJ-GIc90ZkYw",
    unit: "first-myth",
    project: "Lumina",
  },
  {
    title: "Kona",
    name: "Draki Kona",
    channelTitle: "Draki Kona Ch. Lumina-First-Myth",
    handle: "@DrakiKona",
    channelId: "UCg53fzp6UNYvsyAg8UoNXCA",
    unit: "first-myth",
    project: "Lumina",
  },

  // Mutelu
  {
    title: "Kryspeia",
    name: "Kryspeia Cosmelis",
    channelTitle: "Kryspeia Cosmelis Ch. Lumina-Mutelu",
    handle: "@KryspeiaCosmelis",
    channelId: "UCIBdFlC2Fk3rID8CAETV35g",
    unit: "mutelu",
    project: "Lumina",
  },
  {
    title: "Meiyin",
    name: "Pixiang Meiyin",
    channelTitle: "Pixiang Meiyin Ch. Lumina-Mutelu",
    handle: "@PixiangMeiyin",
    channelId: "UCSoFIMz3y6jOVMg8nggpcMQ",
    unit: "mutelu",
    project: "Lumina",
  },
  {
    title: "Eveshaiah",
    name: "Eveshaiah Miraclover",
    channelTitle: "Eveshaiah Miraclover Ch. Lumina-Mutelu",
    handle: "@EveshaiahMiraclover",
    channelId: "UCGtHn0fmqCAp_8AzV_PWd6A",
    unit: "mutelu",
    project: "Lumina",
  },
  {
    title: "Arcanon",
    name: "Arcanon Tarotar",
    channelTitle: "Arcanon Tarotar Ch. Lumina-Mutelu",
    handle: "@ArcanonTarotar",
    channelId: "UCgMHb11ydIWSAgvzrxOPjRg",
    unit: "mutelu",
    project: "Lumina",
  },
  {
    title: "Maneneko",
    name: "Mikotomi Maneneko",
    channelTitle: "Mikotomi Maneneko Ch. Lumina-Mutelu",
    handle: "@MikotomiManeneko",
    channelId: "UCSlT8Mc_dty5c_cFmi1zz4Q",
    unit: "mutelu",
    project: "Lumina",
  },

  // Dungeon Inc.
  {
    title: "Bettie",
    name: "Bettie MqBun",
    channelTitle: "Bettie MqBun Ch. LUMINA",
    handle: "@BettieMqBun",
    channelId: null,
    unit: "dungeon-inc",
    project: "Lumina",
  },
  {
    title: "Vifvi",
    name: "Vifvi von Kagikagi",
    channelTitle: "Vifvi von Kagikagi Ch. LUMINA",
    handle: "@VifvivonKagikagi",
    channelId: null,
    unit: "dungeon-inc",
    project: "Lumina",
  },
];

/** Guest/collab hosts — everyone except Mild-R main (requires channelId) */
export const LUMINA_RELATED_CHANNEL_IDS: string[] = LUMINA_CHANNELS.filter(
  (c): c is LuminaChannel & { channelId: string } =>
    !c.isMain && Boolean(c.channelId)
).map((c) => c.channelId);

/** channelId → short title (e.g. Xonebu) for DB source_title */
export const LUMINA_SOURCE_TITLE_BY_CHANNEL_ID: Record<string, string> =
  Object.fromEntries(
    LUMINA_CHANNELS.filter(
      (c): c is LuminaChannel & { channelId: string } => Boolean(c.channelId)
    ).map((c) => [c.channelId, c.title])
  );

export function getLuminaSourceTitle(channelId: string | null | undefined) {
  if (!channelId) return null;
  return LUMINA_SOURCE_TITLE_BY_CHANNEL_ID[channelId] ?? null;
}

/** Normalize free-text for channel matching: mild-r → mildr, Dëa → dea */
export function normalizeLuminaChannelKey(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Resolve roster channel from short name (mild-r, dea, xonebu) or UC… id.
 * Prefers exact title/name/handle, then unique prefix / includes match.
 */
export function resolveLuminaChannel(input: string | null | undefined) {
  if (!input?.trim()) return null;
  const raw = input.trim();
  const byId = LUMINA_CHANNELS.find((c) => c.channelId && c.channelId === raw);
  if (byId) return byId;

  const key = normalizeLuminaChannelKey(raw);
  if (!key) return null;

  for (const c of LUMINA_CHANNELS) {
    if (normalizeLuminaChannelKey(c.title) === key) return c;
    if (normalizeLuminaChannelKey(c.name) === key) return c;
    if (c.handle && normalizeLuminaChannelKey(c.handle) === key) return c;
  }

  const fuzzy = LUMINA_CHANNELS.filter((c) => {
    const t = normalizeLuminaChannelKey(c.title);
    const n = normalizeLuminaChannelKey(c.name);
    return (
      t.startsWith(key) ||
      key.startsWith(t) ||
      t.includes(key) ||
      n.includes(key)
    );
  });

  if (fuzzy.length === 1) return fuzzy[0];
  // Prefer shorter title match when multiple (e.g. mild vs mild-r already exact)
  if (fuzzy.length > 1) {
    fuzzy.sort(
      (a, b) =>
        normalizeLuminaChannelKey(a.title).length -
        normalizeLuminaChannelKey(b.title).length
    );
    return fuzzy[0];
  }
  return null;
}
