import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as ts from "typescript";
import { initialMinorSurgeryActionState } from "./action-state";

describe("minor surgery action state", () => {
  it("should_keep_runtime_values_out_of_the_use_server_module", () => {
    const source = readFileSync(
      new URL("./actions.ts", import.meta.url),
      "utf8",
    );
    const file = ts.createSourceFile(
      "actions.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const runtimeValueExports = file.statements.filter((statement) => {
      const modifiers = ts.canHaveModifiers(statement)
        ? ts.getModifiers(statement)
        : undefined;
      const isExported = modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      );

      return (
        isExported &&
        (ts.isVariableStatement(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isEnumDeclaration(statement))
      );
    });

    expect(initialMinorSurgeryActionState).toEqual({
      status: "idle",
      message: "",
    });
    expect(runtimeValueExports).toHaveLength(0);
  });
});
