import { z } from "zod";

export const bundleConfigSchema = z.object({
  apiUrl: z.string().default(''),
});

export type BundleConfig = z.infer<typeof bundleConfigSchema>;