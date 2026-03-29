import { z } from 'zod';

export const broadcastRowSchema = z.object({
  scenarioNumber: z.number().nullable().default(null),
  teamName: z.string().default(''),
  players: z.tuple([z.string(), z.string(), z.string(), z.string()]).default(['', '', '', '']),
  rule: z.string().default(''),
});

export const broadcastScheduleSchema = z.array(broadcastRowSchema).default([]);

export type BroadcastRow = z.infer<typeof broadcastRowSchema>;
export type BroadcastSchedule = z.infer<typeof broadcastScheduleSchema>;
