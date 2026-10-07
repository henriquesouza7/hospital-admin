import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialProductionActionState } from "./action-state";
import { createCategoryAction, createProductionEntryAction } from "./actions";
import {
  createProductionEntry,
  createProcedureCategory,
  DuplicateProductionRecordError,
} from "./repository";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./repository", () => ({
  createProductionEntry: vi.fn(),
  createProductionProcedure: vi.fn(),
  createProcedureCategory: vi.fn(),
  DuplicateProductionRecordError: class DuplicateProductionRecordError extends Error {},
  setProductionProcedureActive: vi.fn(),
  setProcedureCategoryActive: vi.fn(),
  updateProductionEntry: vi.fn(),
  updateProductionProcedure: vi.fn(),
  updateProcedureCategory: vi.fn(),
}));

const mockedCreateCategory = vi.mocked(createProcedureCategory);
const mockedCreateEntry = vi.mocked(createProductionEntry);

beforeEach(() => vi.clearAllMocks());

describe("production server actions", () => {
  it("trims and persists a valid category", async () => {
    const data = new FormData();
    data.set("name", " Laboratório ");

    const result = await createCategoryAction(
      initialProductionActionState,
      data,
    );

    expect(mockedCreateCategory).toHaveBeenCalledWith("Laboratório");
    expect(result.status).toBe("success");
  });

  it("rejects malformed category data before persistence", async () => {
    const result = await createCategoryAction(
      initialProductionActionState,
      new FormData(),
    );

    expect(mockedCreateCategory).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });

  it("maps duplicate monthly sources to a clear error", async () => {
    vi.mocked(mockedCreateEntry).mockRejectedValueOnce(
      new DuplicateProductionRecordError(
        "Já existe um registro com os mesmos dados de origem.",
      ),
    );
    const data = new FormData();
    data.set("procedure_id", "f10a7281-2a42-4fd4-b7f5-d5b7d46d54bd");
    data.set("reference_period", "2026-03");
    data.set("quantity", "8");
    data.set("source", "manual");

    const result = await createProductionEntryAction(
      initialProductionActionState,
      data,
    );

    expect(result).toEqual({
      status: "error",
      message: "Já existe um registro com os mesmos dados de origem.",
    });
  });
});
