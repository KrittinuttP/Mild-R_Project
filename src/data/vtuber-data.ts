/**
 * Mild-R profile assembler
 *
 * Content lives in JSON under `./mild-r/` (one file per category)
 * so it can later map 1:1 to Supabase tables / storage.
 *
 * Docs: doc/content-data.md · doc/vtuber-data-schema.md
 */

import type {
  CharacterDesign,
  FanArtItem,
  FanIdentity,
  GalleryItem,
  HashtagGroup,
  HbdPage,
  LoreBlock,
  MediaClip,
  ParallaxLayer,
  ProjectItem,
  SocialLink,
  VtuberBasic,
  VtuberProfile,
} from "@/types/vtuber";

import meta from "./mild-r/meta.json";
import basic from "./mild-r/basic.json";
import lore from "./mild-r/lore.json";
import characterDesign from "./mild-r/character-design.json";
import socials from "./mild-r/socials.json";
import hashtags from "./mild-r/hashtags.json";
import fan from "./mild-r/fan.json";
import gallery from "./mild-r/gallery.json";
import fanArt from "./mild-r/fan-art.json";
import media from "./mild-r/media.json";
import parallaxLayers from "./mild-r/parallax-layers.json";
import projects from "./mild-r/projects.json";
import hbd from "./mild-r/hbd.json";

/** Merge category JSON into a single profile document. */
export function loadMildRProfile(): VtuberProfile {
  return {
    id: meta.id,
    basic: basic as VtuberBasic,
    lore: lore as LoreBlock,
    characterDesign: characterDesign as CharacterDesign,
    socials: socials as SocialLink[],
    hashtags: hashtags as HashtagGroup[],
    fan: fan as FanIdentity,
    gallery: gallery as GalleryItem[],
    fanArt: fanArt as FanArtItem[],
    media: media as MediaClip[],
    parallax_layers: parallaxLayers as ParallaxLayer[],
    projects: projects as ProjectItem[],
    hbd: hbd as HbdPage,
  };
}

export const mildRData: VtuberProfile = loadMildRProfile();

export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return mildRData.projects.find((project) => project.slug === slug);
}

export function getProjectsByCategory(category: string): ProjectItem[] {
  return mildRData.projects.filter(
    (project) => project.category.toLowerCase() === category.toLowerCase()
  );
}

export function hasProjectCategory(category: string): boolean {
  return getProjectsByCategory(category).length > 0;
}

export default mildRData;

export type {
  CharacterDesign,
  FanArtItem,
  FanIdentity,
  GalleryItem,
  GalleryTileSize,
  HashtagGroup,
  HbdPage,
  HbdWish,
  LoreBlock,
  MediaCategory,
  MediaClip,
  ParallaxLayer,
  ProjectItem,
  ProjectStatus,
  SocialLink,
  VtuberBasic,
  VtuberProfile,
} from "@/types/vtuber";
