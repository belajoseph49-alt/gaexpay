/**
 * src/lib/chat-helpers.ts — Shared helpers for GaexChat API routes.
 *
 * Centralizes conversation-access checks so every messaging route uses the
 * same logic: the auth user must be a participant (1-to-1) OR a group member.
 */

import { db } from "@/lib/db";

export interface ConvContext {
  convId: string;
  userId: string;
  /** For 1-to-1: the other participant's id. For groups: null. */
  otherId: string | null;
  isGroup: boolean;
  groupId: string | null;
}

/**
 * Returns the conversation context if the user is a participant, else null.
 * Works for both 1-to-1 conversations (participantA/B) and group
 * conversations (groupId + ChatGroupMember rows).
 */
export async function getConvForUser(
  conversationId: string,
  userId: string,
): Promise<ConvContext | null> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participantAId: true,
      participantBId: true,
      groupId: true,
    },
  });
  if (!conv) return null;

  // Group conversation
  if (conv.groupId) {
    const membership = await db.chatGroupMember.findUnique({
      where: {
        groupId_userId: { groupId: conv.groupId, userId },
      },
      select: { id: true },
    });
    if (!membership) return null;
    return { convId: conv.id, userId, otherId: null, isGroup: true, groupId: conv.groupId };
  }

  // 1-to-1 conversation
  if (conv.participantAId !== userId && conv.participantBId !== userId) return null;
  const otherId = conv.participantAId === userId ? conv.participantBId : conv.participantAId;
  return { convId: conv.id, userId, otherId, isGroup: false, groupId: null };
}

/** Format a chat message for API responses (strips nothing — returns raw row). */
export function ref() {
  return "GXPC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/** Common emoji reactions offered in the picker. */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"];
