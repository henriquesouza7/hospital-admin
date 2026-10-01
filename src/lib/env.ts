import { z } from "zod";

const supabaseEnvSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
});

export type SupabasePublicEnv = z.infer<typeof supabaseEnvSchema>;

type Environment = Record<string, string | undefined>;

/**
 * Reads only the public Supabase values needed by browser and server clients.
 * The key accepted here is always a publishable/anon key, never a service role key.
 */
export function getSupabaseEnv(
  environment: Environment = process.env,
): SupabasePublicEnv {
  const parsed = supabaseEnvSchema.safeParse({
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    key:
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return parsed.data;
}
