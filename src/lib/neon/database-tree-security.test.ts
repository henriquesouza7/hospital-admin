import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("database inspection helper migration", () => {
  it("should_revoke_public_execution_when_the_optional_helper_exists", async () => {
    const migration = await readFile(
      new URL(
        "../../../db/migrations/20261013154000_revoke_public_access_to_database_tree_helper.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(migration).toContain("to_regprocedure('public.show_db_tree()')");
    expect(migration).toContain(
      "revoke all on function public.show_db_tree() from public",
    );
  });
});
