/** Mild-R official YouTube channel */
export const MILD_R_CHANNEL_ID = "UCknOyz3O0-G6w5SJNAgO7uQ";

const COLLAB_TITLE_RE =
  /\bft\.?\b|\bfeat\.?\b|featuring|collab|コラボ|คอลาบ|ร่วมกับ/i;

export function classifyLiveOwnership(
  channelId: string | null | undefined,
  title: string | null | undefined
) {
  const is_own_channel = Boolean(
    channelId && channelId === MILD_R_CHANNEL_ID
  );
  const hasCollabKeyword = Boolean(title && COLLAB_TITLE_RE.test(title));
  /** Other channel ⇒ guest/collab; own channel still collab if title tags guests */
  const is_collab = !is_own_channel || hasCollabKeyword;

  return { is_own_channel, is_collab };
}
