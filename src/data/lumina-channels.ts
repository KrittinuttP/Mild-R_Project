/**
 * Master roster of Lumina YouTube channels used for collab live discovery.
 * Mild-R is listed for reference but must not be polled as a "related/guest" channel.
 */

export type LuminaUnit =
  | "world-end"
  | "muse"
  | "first-myth"
  | "mutelu";

export type LuminaChannel = {
  name: string;
  channelTitle: string;
  handle: string | null;
  channelId: string;
  unit: LuminaUnit;
  /** Mild-R main channel — excluded from related playlist polls */
  isMain?: boolean;
};

export const LUMINA_CHANNELS: LuminaChannel[] = [
  // World End
  {
    name: "Mild-R",
    channelTitle: "Mild-R Ch. Lumina-World-End",
    handle: "@MildRWorldEnd",
    channelId: "UCknOyz3O0-G6w5SJNAgO7uQ",
    unit: "world-end",
    isMain: true,
  },
  {
    name: "Xonebu X'thulhu",
    channelTitle: "Xonebu X'thulhu Ch. Lumina-World-End",
    handle: "@XonebuWorldEnd",
    channelId: "UCGo7fnmWfGQewxZVDmC3iJQ",
    unit: "world-end",
  },
  {
    name: "Kumoku Tsururu",
    channelTitle: "Kumoku Tsururu Ch. Lumina-World-End",
    handle: "@TsururuWorldEnd",
    channelId: "UC3qnb4Sgo4QtiOi8iS7jOsQ",
    unit: "world-end",
  },
  {
    name: "T-Reina Ashyra",
    channelTitle: "T-Reina Ashyra Ch. Lumina-World-End",
    handle: "@AshyraWorldEnd",
    channelId: "UCZYTMrnVmu1iUVyGeqB6zJQ",
    unit: "world-end",
  },
  {
    name: "Beta AMI",
    channelTitle: "Beta AMI Ch. Lumina-World-End",
    handle: "@AMIWorldEnd",
    channelId: "UCa8ILv94qHT6oar_jVzg9sQ",
    unit: "world-end",
  },
  {
    name: "Debirun",
    channelTitle: "Debirun Ch. Lumina-World-End",
    handle: null,
    channelId: "UCot8DHNnZ2X0ARgaNYZopjw",
    unit: "world-end",
  },

  // Muse
  {
    name: "Antolnette the Magnificent",
    channelTitle: "Antolnette the Magnificent Ch. Lumina-Muse",
    handle: null,
    channelId: "UCiZyQDO7v9UY_-Q24VsSLlQ",
    unit: "muse",
  },
  {
    name: "Dëa Ex Δ",
    channelTitle: "Dëa Ex Δ Ch. Lumina-Muse",
    handle: null,
    channelId: "UC-KEm4E7Yp_t0Gzix4SwkwA",
    unit: "muse",
  },
  {
    name: "Hinaree Kannari",
    channelTitle: "Hinaree Kannari Ch. Lumina-Muse",
    handle: null,
    channelId: "UC0sN779hXum_LluFaWfJjcw",
    unit: "muse",
  },
  {
    name: "Lunessa Florynne",
    channelTitle: "Lunessa Florynne Ch. Lumina-Muse",
    handle: null,
    channelId: "UCbypR_t0teWxIdrQ9i83XiQ",
    unit: "muse",
  },

  // First-Myth
  {
    name: "Kamiyu Reirin",
    channelTitle: "Kamiyu Reirin Ch. Lumina-First-Myth",
    handle: null,
    channelId: "UCLNBff3KDEUxdfH_lkvyOKQ",
    unit: "first-myth",
  },
  {
    name: "Atlanteia Sireen",
    channelTitle: "Atlanteia Sireen Ch. Lumina-First-Myth",
    handle: "@atlanteiasireen",
    channelId: "UCuyrIzf_bCTnyJHktJVpe4g",
    unit: "first-myth",
  },
  {
    name: "Ardalita Lilibelle",
    channelTitle: "Ardalita Lilibelle Ch. Lumina-First-Myth",
    handle: "@ArdalitaLili",
    channelId: "UC2eai5waelgobAHgp20DEYg",
    unit: "first-myth",
  },
  {
    name: "Cerafine Mikael",
    channelTitle: "Cerafine Mikael Ch. Lumina-First-Myth",
    handle: null,
    channelId: "UCgSsXxQ71nScJ-GIc90ZkYw",
    unit: "first-myth",
  },
  {
    name: "Draki Kona",
    channelTitle: "Draki Kona Ch. Lumina-First-Myth",
    handle: null,
    channelId: "UCg53fzp6UNYvsyAg8UoNXCA",
    unit: "first-myth",
  },

  // Mutelu
  {
    name: "Kryspeia Cosmelis",
    channelTitle: "Kryspeia Cosmelis Ch. Lumina-Mutelu",
    handle: "@KryspeiaCosmelis",
    channelId: "UCIBdFlC2Fk3rID8CAETV35g",
    unit: "mutelu",
  },
  {
    name: "Pixiang Meiyin",
    channelTitle: "Pixiang Meiyin Ch. Lumina-Mutelu",
    handle: "@PixiangMeiyin",
    channelId: "UCSoFIMz3y6jOVMg8nggpcMQ",
    unit: "mutelu",
  },
  {
    name: "Eveshaiah Miraclover",
    channelTitle: "Eveshaiah Miraclover Ch. Lumina-Mutelu",
    handle: null,
    channelId: "UCGtHn0fmqCAp_8AzV_PWd6A",
    unit: "mutelu",
  },
  {
    name: "Arcanon Tarotar",
    channelTitle: "Arcanon Tarotar Ch. Lumina-Mutelu",
    handle: "@ArcanonTarotar",
    channelId: "UCgMHb11ydIWSAgvzrxOPjRg",
    unit: "mutelu",
  },
  {
    name: "Mikotomi Maneneko",
    channelTitle: "Mikotomi Maneneko Ch. Lumina-Mutelu",
    handle: null,
    channelId: "UCSlT8Mc_dty5c_cFmi1zz4Q",
    unit: "mutelu",
  },
];

/** Guest/collab hosts — everyone except Mild-R main */
export const LUMINA_RELATED_CHANNEL_IDS: string[] = LUMINA_CHANNELS.filter(
  (c) => !c.isMain
).map((c) => c.channelId);
