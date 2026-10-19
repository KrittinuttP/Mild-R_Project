import { FanmadeCredit } from "@/components/cafe/FanmadeCredit";

type CountdownFooterProps = {
  /** Credit to show. Leave out to keep the name blacked out until the reveal. */
  creator?: { name: string; xUrl: string };
};

/** Footer pinned to the bottom of the countdown frame. */
export function CountdownFooter({ creator }: CountdownFooterProps) {
  return (
    <footer className="absolute inset-x-0 bottom-[clamp(32px,3.6vw,52px)] px-[clamp(32px,5vw,72px)]">
      <FanmadeCredit creator={creator} />
    </footer>
  );
}
