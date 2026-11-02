import { Fragment } from "react";

/** Marks a point in copy where a line may wrap (e.g. in a JSON data file). */
export const THAI_BREAK = "|";

/** Copy without break markers — for meta tags, alt text, aria labels. */
export function stripThaiBreaks(text: string): string {
  return text.split(THAI_BREAK).join("");
}

type ThaiPhrasesProps = {
  /** Copy with `|` where a line may wrap. Spaces are wrap points too. */
  text: string;
};

/**
 * Thai has no spaces between words, so the browser picks wrap points from a
 * dictionary — and sometimes cuts a word apart ("มาตามหา" → "มาตา" / "มหา",
 * "ผู้ไข" → "ผู้" / "ไข"). Write the copy with `|` between phrases; each phrase
 * then wraps only at a marker or a space. A phrase wider than its container
 * still wraps inside (inline-block + max-w-full), so nothing overflows.
 */
export function ThaiPhrases({ text }: ThaiPhrasesProps) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "") return null;
        if (/^\s+$/.test(part)) return " ";
        const phrases = part.split(THAI_BREAK).filter(Boolean);
        return (
          <Fragment key={i}>
            {phrases.map((phrase, j) => (
              <Fragment key={j}>
                {j > 0 ? <wbr /> : null}
                <span className="inline-block max-w-full">{phrase}</span>
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}
