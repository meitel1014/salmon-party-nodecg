import { z } from 'zod';

export const playerScreenSchema = z.object({
  teamName: z.string().default(''),
  players: z.tuple([z.string(), z.string(), z.string(), z.string()]).default(['', '', '', '']),
  rule: z.string().default(''),
});

export type PlayerScreen = z.infer<typeof playerScreenSchema>;
