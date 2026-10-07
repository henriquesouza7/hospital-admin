import { describe, expect, it } from "vitest";
import {
  getAdmissionsNameInputValue,
  type AdmissionsActionState,
} from "./action-state";

const errorState: AdmissionsActionState = {
  status: "error",
  message: "Não foi possível cadastrar o médico.",
};

const successState: AdmissionsActionState = {
  status: "success",
  message: "Médico cadastrado e ativo.",
};

describe("admissions name input state", () => {
  it("should_preserve_entered_name_when_action_returns_error", () => {
    expect(
      getAdmissionsNameInputValue(
        { value: "Dr. Teste", actionState: errorState },
        errorState,
      ),
    ).toBe("Dr. Teste");
  });

  it("should_clear_name_after_successful_action", () => {
    expect(
      getAdmissionsNameInputValue(
        { value: "Dr. Teste", actionState: errorState },
        successState,
      ),
    ).toBe("");
  });

  it("should_allow_typing_after_success_clears_the_previous_name", () => {
    expect(
      getAdmissionsNameInputValue(
        { value: "Dra. Teste", actionState: successState },
        successState,
      ),
    ).toBe("Dra. Teste");
  });
});
