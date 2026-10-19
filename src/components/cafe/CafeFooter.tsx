import { CAFE_DEVELOPER, FanmadeCredit } from "@/components/cafe/FanmadeCredit";

/**
 * Cafe site footer: the same one-line credit as the countdown pages, with
 * the developer's name revealed. Takes no cafe data, so none is sent with it.
 */
export function CafeFooter() {
  return (
    <footer className="px-5 pt-6 pb-[clamp(32px,3.6vw,52px)] sm:px-10 lg:px-16">
      <FanmadeCredit creator={CAFE_DEVELOPER} />
    </footer>
  );
}
