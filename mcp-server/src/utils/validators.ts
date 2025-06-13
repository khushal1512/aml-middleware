import { z } from "zod";

export const txidSchema = z
  .string()
  .min(8, "TXID must be at least 8 characters")
  .max(64, "TXID must be at most 64 characters")
  .regex(/^[a-f0-9]+$/i, "TXID must be hexadecimal");

export const addressSchema = z
  .string()
  .min(10, "Address too short")
  .max(62, "Address too long");

export const patternTypeSchema = z.enum([
  "normal",
  "coin_burst",
  "peel_chain",
  "mixer",
]);

export const chainIdSchema = z
  .string()
  .min(4, "Chain ID too short")
  .max(32, "Chain ID too long");

export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(500)
  .default(50);

export const depthSchema = z
  .number()
  .int()
  .min(1)
  .max(50)
  .default(10);

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}