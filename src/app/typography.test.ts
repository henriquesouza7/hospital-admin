import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const layout = readFileSync(
  resolve(process.cwd(), "src/app/layout.tsx"),
  "utf8",
);

describe("global typography contract", () => {
  it("should_map_sans_and_heading_tokens_to_geist_when_loading_global_theme", () => {
    expect(globalsCss).toContain("--font-sans: var(--font-geist-sans);");
    expect(globalsCss).toContain("--font-heading: var(--font-geist-sans);");
    expect(globalsCss).not.toMatch(/--font-sans:\s*var\(--font-sans\)/);
  });

  it("should_apply_geist_to_the_root_layout_when_loading_the_application", () => {
    expect(layout).toContain(
      'import { Geist, Geist_Mono } from "next/font/google"',
    );
    expect(layout).toContain("geistSans.className");
    expect(layout).toContain('import "./globals.css"');
  });
});
