import { z } from 'zod';

export const joinSessionBody = z.object({
  inviteCode: z.string().trim().min(4).max(12),
});

export type JoinSessionInput = z.infer<typeof joinSessionBody>;

export const sessionIdParams = z.object({ sessionId: z.uuid() });

export const participantView = z.object({
  userId: z.uuid(),
  handle: z.string().nullable(),
  role: z.enum(['host', 'member']),
  team: z.enum(['a', 'b']).nullable(),
  state: z.enum(['pending', 'joined', 'left']),
  joinedAt: z.string(),
});

export type ParticipantView = z.infer<typeof participantView>;

export const participantsResponse = z.object({ participants: z.array(participantView) });

export interface ParticipantRow {
  userId: string;
  handle: string | null;
  role: 'host' | 'member';
  team: 'a' | 'b' | null;
  state: 'pending' | 'joined' | 'left';
  joinedAt: Date;
}

export function toParticipantView(row: ParticipantRow): ParticipantView {
  return {
    userId: row.userId,
    handle: row.handle,
    role: row.role,
    team: row.team,
    state: row.state,
    joinedAt: row.joinedAt.toISOString(),
  };
}

/** Max joined participants by session mode. */
export const MODE_CAPACITY: Record<'solo' | 'date' | 'friends', number> = {
  solo: 1,
  date: 2,
  friends: 6,
};
