/**
 * Detect Mild-R "Live Schedule" posts (case-insensitive, flexible spaces).
 * Matches ASCII and stylized Unicode (e.g. ʟɪᴠᴇ ꜱᴄʜᴇᴅᴜʟᴇ).
 */

export const LIVE_SCHEDULE_RE = /live\s*schedule/i;

/** Latin letter small capitals / phonetic forms used in aesthetic X fonts. */
const STYLIZED_LATIN: Record<string, string> = {
  ʟ: "l",
  ɪ: "i",
  ᴠ: "v",
  ᴇ: "e",
  ꜱ: "s",
  ᴄ: "c",
  ʜ: "h",
  ᴅ: "d",
  ᴜ: "u",
  ᴀ: "a",
  ʙ: "b",
  ꜰ: "f",
  ɢ: "g",
  ᴊ: "j",
  ᴋ: "k",
  ᴍ: "m",
  ɴ: "n",
  ᴏ: "o",
  ᴘ: "p",
  ǫ: "q",
  ʀ: "r",
  ᴛ: "t",
  ᴡ: "w",
  ʏ: "y",
  ᴢ: "z",
  ı: "i",
  ɩ: "i",
 ʋ: "v",
};

/**
 * Fold Mathematical Alphanumeric Symbols (U+1D400–U+1D7FF) and small-caps
 * phonetic forms down to plain ASCII letters for matching.
 */
export function foldStylizedLatin(input: string): string {
  let out = "";
  for (const ch of input) {
    const mapped = STYLIZED_LATIN[ch];
    if (mapped) {
      out += mapped;
      continue;
    }
    const cp = ch.codePointAt(0)!;
    // Mathematical Alphanumeric Symbols → A-Z / a-z
    if (cp >= 0x1d400 && cp <= 0x1d7ff) {
      const ascii = mathAlnumToAscii(cp);
      out += ascii ?? ch;
      continue;
    }
    out += ch;
  }
  return out.normalize("NFKD").replace(/\p{M}/gu, "");
}

function mathAlnumToAscii(cp: number): string | null {
  // Bold, italic, bold italic, script, … Latin capital blocks of 26
  const ranges: Array<{ start: number; base: number; count: number }> = [
    { start: 0x1d400, base: 65, count: 26 }, // A-Z bold
    { start: 0x1d41a, base: 97, count: 26 }, // a-z bold
    { start: 0x1d434, base: 65, count: 26 },
    { start: 0x1d44e, base: 97, count: 26 },
    { start: 0x1d468, base: 65, count: 26 },
    { start: 0x1d482, base: 97, count: 26 },
    { start: 0x1d49c, base: 65, count: 26 },
    { start: 0x1d4b6, base: 97, count: 26 },
    { start: 0x1d4d0, base: 65, count: 26 },
    { start: 0x1d4ea, base: 97, count: 26 },
    { start: 0x1d504, base: 65, count: 26 },
    { start: 0x1d51e, base: 97, count: 26 },
    { start: 0x1d538, base: 65, count: 26 },
    { start: 0x1d552, base: 97, count: 26 },
    { start: 0x1d56c, base: 65, count: 26 },
    { start: 0x1d586, base: 97, count: 26 },
    { start: 0x1d5a0, base: 65, count: 26 },
    { start: 0x1d5ba, base: 97, count: 26 },
    { start: 0x1d5d4, base: 65, count: 26 },
    { start: 0x1d5ee, base: 97, count: 26 },
    { start: 0x1d608, base: 65, count: 26 },
    { start: 0x1d622, base: 97, count: 26 },
    { start: 0x1d63c, base: 65, count: 26 },
    { start: 0x1d656, base: 97, count: 26 },
    { start: 0x1d670, base: 65, count: 26 },
    { start: 0x1d68a, base: 97, count: 26 },
  ];
  for (const r of ranges) {
    if (cp >= r.start && cp < r.start + r.count) {
      return String.fromCharCode(r.base + (cp - r.start));
    }
  }
  return null;
}

export function isLiveScheduleText(text: string | null | undefined): boolean {
  if (!text) return false;
  return LIVE_SCHEDULE_RE.test(foldStylizedLatin(text));
}

export function isLikelyImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("pbs.twimg.com") ||
    u.includes("twimg.com") ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)
  );
}

export function firstImageUrl(urls: string[] | null | undefined): string | null {
  return (urls ?? []).find((u) => u && isLikelyImageUrl(u)) ?? null;
}
