import { z } from 'zod';

const rankingEntrySchema = z.object({
  rank: z.number(),
  teamName: z.string(),
  score: z.number(),
});

export const resultScreenSchema = z.object({
  scenarioDisplayName: z.string().default(''),
  rule: z.string().default(''),
  rankings: z.array(rankingEntrySchema).default([]),
});

export type ResultScreen = z.infer<typeof resultScreenSchema>;
