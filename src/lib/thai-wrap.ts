/*
 * Thai word pieces for line wrapping (browser only: Intl.Segmenter).
 * Used by the HBD card maker (canvas text) and by text that fans typed on /hbd/2026.
 */

type Segmenter = { segment(input: string): Iterable<{ segment: string }> };

let segmenter: Segmenter | null | undefined;
function getSegmenter(): Segmenter | null {
  if (segmenter !== undefined) return segmenter;
  const Ctor = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => Segmenter }).Segmenter;
  segmenter = Ctor ? new Ctor("th", { granularity: "word" }) : null;
  return segmenter;
}

/**
 * Word-sized pieces of one paragraph; spaces stay as their own pieces.
 * - ICU splits "ความสุขมากๆ" as "ความ|สุ|ขมา|กๆ" (a line could break inside "สุข").
 *   A zero-width space before "ๆ" makes it "ความ|สุข|มาก|ๆ"; it is removed again here.
 * - "ๆ" never starts a piece (it joins the word before it).
 * - "#tag" and "@name" stay whole (a lone "#" / "@" joins the next piece).
 */
export function thaiWordPieces(paragraph: string): string[] {
  const seg = getSegmenter();
  const raw = seg
    ? Array.from(seg.segment(paragraph.replace(/ๆ/g, "​ๆ")), (s) => s.segment.replace(/​/g, "")).filter(Boolean)
    : Array.from(paragraph);
  const out: string[] = [];
  for (const piece of raw) {
    const prev = out[out.length - 1];
    const glue = (/[#@]$/.test(prev ?? "") && !/^\s/.test(piece)) || /^\s*ๆ/.test(piece);
    if (prev !== undefined && glue) out[out.length - 1] = prev + piece;
    else out.push(piece);
  }
  return out;
}
