import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { R_CHIP_PRI_CLASS, R_CHIP_SOFT_CLASS, R_H3_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";

export type CoverMedia = "square-contain" | "wide-cover";
export type CoverPosition = "top" | "center" | "bottom";
export type CoverCardTone = "default" | "muted" | "featured";

const POSITION_CLASS: Record<CoverPosition, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

const TONE_CLASS: Record<CoverCardTone, string> = {
  default: "hover:shadow-[inset_0_0_0_1px_rgba(242,67,125,0.45)]",
  muted: "opacity-90 hover:opacity-100 hover:shadow-[inset_0_0_0_1px_rgba(243,184,196,0.3)]",
  featured:
    "shadow-[inset_0_0_0_1px_rgba(242,67,125,0.35),0_16px_40px_rgba(242,67,125,0.12)] hover:shadow-[inset_0_0_0_1px_rgba(242,67,125,0.6),0_16px_40px_rgba(242,67,125,0.16)]",
};

type CoverImageProps = {
  src: string;
  alt: string;
  media?: CoverMedia;
  position?: CoverPosition;
  dimmed?: boolean;
  /** Scale the image on parent `group` hover (cards only). */
  hoverZoom?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Cover frame shared by cards and the event modal.
 * `square-contain` keeps posters whole over a blurred copy of themselves;
 * `wide-cover` fills a 16:10 frame.
 */
export function CoverImage({
  src,
  alt,
  media = "wide-cover",
  position = "center",
  dimmed = false,
  hoverZoom = false,
  className,
  children,
}: CoverImageProps) {
  const zoom = hoverZoom && "transition duration-700 group-hover:scale-[1.04]";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#12080c]",
        media === "square-contain" ? "aspect-square" : "aspect-[16/10]",
        className
      )}
    >
      {media === "square-contain" ? (
        <>
          <ProtectedImage
            src={src}
            alt=""
            aria-hidden
            wrapClassName="absolute inset-0 block"
            className="h-full w-full scale-110 object-cover opacity-45 blur-2xl"
          />
          <ProtectedImage
            src={src}
            alt={alt}
            wrapClassName="absolute inset-0 block"
            className={cn("h-full w-full object-contain", zoom, dimmed && "opacity-85")}
          />
        </>
      ) : (
        <ProtectedImage
          src={src}
          alt={alt}
          wrapClassName="absolute inset-0 block"
          className={cn(
            "h-full w-full object-cover",
            POSITION_CLASS[position],
            zoom,
            dimmed && "opacity-85"
          )}
        />
      )}
      {children}
    </div>
  );
}

type CoverCardProps = {
  /** Renders a Link when set, otherwise a button calling `onClick`. */
  href?: string;
  onClick?: () => void;
  cover: string;
  coverAlt: string;
  media?: CoverMedia;
  coverPosition?: CoverPosition;
  status?: { label: string; tone: "accent" | "soft" };
  /** Custom badge pinned top-left of the cover; replaces `status`. */
  badge?: ReactNode;
  tone?: CoverCardTone;
  eyebrow?: ReactNode;
  title: string;
  subtitle?: string;
  summary?: string;
  footnote?: ReactNode;
  ctaLabel?: string;
  headingAs?: "h2" | "h3" | "h4";
  /** Clamp text and pin the footnote to the bottom so cards in a grid line up. */
  uniform?: boolean;
};

/** Cover + text card used by Events and Fan Projects (home and list pages). */
export function CoverCard({
  href,
  onClick,
  cover,
  coverAlt,
  media,
  coverPosition,
  status,
  badge,
  tone = "default",
  eyebrow,
  title,
  subtitle,
  summary,
  footnote,
  ctaLabel,
  headingAs: Heading = "h3",
  uniform = false,
}: CoverCardProps) {
  const className = cn(
    "r-card group flex h-full w-full flex-col overflow-hidden rounded-3xl text-left transition",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-r-acc",
    TONE_CLASS[tone]
  );

  const body = (
    <>
      <CoverImage
        src={cover}
        alt={coverAlt}
        media={media}
        position={coverPosition}
        dimmed={tone === "muted"}
        hoverZoom
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-r-bg via-r-bg/40 to-transparent" />
        {badge ? (
          <div className="absolute top-3 left-3">{badge}</div>
        ) : status ? (
          <span
            className={cn(
              status.tone === "accent"
                ? R_CHIP_PRI_CLASS
                : cn(R_CHIP_SOFT_CLASS, "bg-r-bg/80 backdrop-blur-sm"),
              "absolute top-3 left-3 uppercase"
            )}
          >
            {status.label}
          </span>
        ) : null}
      </CoverImage>

      <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
        {eyebrow}

        <Heading
          className={cn(
            eyebrow && "mt-2",
            "transition group-hover:text-white",
            R_H3_CLASS,
            uniform && "line-clamp-2"
          )}
        >
          {title}
        </Heading>
        {subtitle ? (
          <p
            className={cn(
              "mt-1 text-sm text-r-text-3",
              uniform && "line-clamp-1"
            )}
          >
            {subtitle}
          </p>
        ) : null}

        {summary ? (
          <p
            className={cn(
              "mt-3 text-sm leading-relaxed text-r-text-2",
              uniform ? "line-clamp-2" : "line-clamp-3"
            )}
          >
            {summary}
          </p>
        ) : null}

        {footnote ? (
          <p
            className={cn(
              "text-xs text-r-text-3",
              uniform ? "mt-auto line-clamp-1 pt-4" : "mt-2"
            )}
          >
            {footnote}
          </p>
        ) : null}

        {ctaLabel ? (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm tracking-wide text-r-pri transition-all group-hover:gap-2.5">
            {ctaLabel}
            <ArrowUpRight className="size-4" />
          </span>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
