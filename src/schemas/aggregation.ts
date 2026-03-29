import { z } from 'zod';

export const aggregationRowSchema = z.object({
  teamName: z.string(),
  scenarioNumber: z.number(),
  goldenEgg: z.number(),
  redEgg: z.number(),
});

export const aggregationDataSchema = z.array(aggregationRowSchema).default([]);

export type AggregationRow = z.infer<typeof aggregationRowSchema>;
export type AggregationData = z.infer<typeof aggregationDataSchema>;
