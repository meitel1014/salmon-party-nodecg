import { z } from 'zod';

export const scenarioInfoSchema = z.object({
  scenarioNumber: z.number(),
  displayName: z.string(),
  rule: z.string(),
  section: z.string(),
});

export const scenarioListSchema = z.array(scenarioInfoSchema).default([]);

export type ScenarioInfo = z.infer<typeof scenarioInfoSchema>;
export type ScenarioList = z.infer<typeof scenarioListSchema>;
