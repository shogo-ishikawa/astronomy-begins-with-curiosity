import { z } from "zod";

export const accessibleMediaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  textAlternative: z.string().min(1),
});

export const contentBlockSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  heading: z.string().min(1),
  body: z.string().min(1),
  glossaryTerms: z.array(z.string()),
});

export const themeSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1),
  id: z.literal("cosmic-web-growth"),
  locale: z.literal("ja"),
  title: z.string().min(1),
  question: z.string().min(1),
  method: z.object({
    kind: z.literal("precomputed-collisionless-dark-matter-simulation"),
    summary: z.string().min(1),
    scientificLimitations: z.array(z.string().min(1)).min(1),
  }),
  provenanceRequirements: z.array(
    z.enum([
      "units",
      "redshift",
      "cosmology",
      "code-version",
      "data-version",
      "source",
    ]),
  ),
  accessibility: z.object({
    language: z.literal("ja"),
    media: z.array(accessibleMediaSchema),
  }),
  blocks: z.array(contentBlockSchema),
});

export type ThemeContent = z.infer<typeof themeSchema>;
