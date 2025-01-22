import { z } from "zod";
export const formSchema = z.object({
  lib: z
    .string()
    .max(20, {
      message: "Library must be at most 20 characters.",
    })
    .optional(),
  owners: z
    .array(z.string())
    .min(1, {
      message: "At least one owner is required.",
    })
    .max(10, {
      message: "At most 10 owners are allowed.",
    }),
  prefix: z
    .string()
    .max(3, {
      message: "Prefix must be at most 3 characters.",
    })
    .optional(),
  short: z
    .string()
    .min(11, {
      message: "Short description must be at least 11 characters.",
    })
    .max(150, {
      message: "Short description must be at most 150 characters.",
    }),
  desc: z
    .string()
    .min(100, {
      message: "Description must be at least 100 characters.",
    })
    .max(10000, {
      message: "Description must be at most 10000 characters.",
    }),
  support: z.string().optional(),
  source_repo: z.string().optional(),
  website: z.string().optional(),
  webhook: z.string().optional(),
  bg: z.string().optional(),
  donate: z.string().optional(),
  invite: z.string(),
  slug: z.string().optional(),
});
