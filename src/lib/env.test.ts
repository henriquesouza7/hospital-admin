import { describe, expect, it } from "vitest";
import { getSupabaseEnv } from "./env";

describe("getSupabaseEnv", () => {
  it("accepts the recommended publishable key", () => {
    expect(
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toEqual({
      url: "https://demo.supabase.co",
      key: "publishable-key",
    });
  });

  it("supports the legacy anon key name", () => {
    expect(
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }).key,
    ).toBe("anon-key");
  });

  it("rejects missing or malformed values without exposing secrets", () => {
    expect(() =>
      getSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });
});
