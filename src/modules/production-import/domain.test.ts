import { describe, expect, it } from "vitest";
import {
  containsPatientColumns,
  mapSusRowsToProcedures,
  parseSusCsv,
  summarizeSusRows,
} from "./domain";

describe("production SUS CSV import", () => {
  it("should_parse_quoted_semicolon_csv_when_fields_contain_delimiters", () => {
    const document = parseSusCsv(
      '\uFEFFcodigo;procedimento;quantidade;situacao\r\n"01;02";"Exame, especial";12;realizado\r\n',
      ";",
    );

    expect(document.headers).toEqual([
      "codigo",
      "procedimento",
      "quantidade",
      "situacao",
    ]);
    expect(document.rows[0]).toEqual([
      "01;02",
      "Exame, especial",
      "12",
      "realizado",
    ]);
  });

  it("should_reject_patient_identifiers_when_headers_include_patient_fields", () => {
    expect(containsPatientColumns(["procedimento", "nome do paciente"])).toBe(
      true,
    );
    expect(() => parseSusCsv("procedimento;nome\nTeste;Paciente", ";")).toThrow(
      /identificação de pacientes/,
    );
  });

  it("should_reject_qualified_patient_identifiers_when_headers_are_sensitive", () => {
    expect(containsPatientColumns(["procedimento", "patientId"])).toBe(true);
    expect(containsPatientColumns(["patient_name", "quantidade"])).toBe(true);
    expect(containsPatientColumns(["cpf_do_paciente"])).toBe(true);
    expect(containsPatientColumns(["CNS do paciente"])).toBe(true);
    expect(containsPatientColumns(["numero_prontuario"])).toBe(true);
    expect(containsPatientColumns(["telefone do paciente"])).toBe(true);
  });

  it("should_reject_malformed_csv_when_quotes_are_unclosed", () => {
    expect(() => parseSusCsv('codigo;procedimento\n1;"Teste', ";")).toThrow(
      /aspa não fechada/,
    );
  });

  it("should_group_same_procedure_rows_when_type_and_key_match", () => {
    const document = parseSusCsv(
      "codigo;procedimento;quantidade;situacao\n010101;Hemograma;8;realizado\n010101;Hemograma;4;realizado\n",
      ";",
    );
    const groups = summarizeSusRows(document, {
      code: 0,
      procedure: 1,
      quantity: 2,
      sourceType: 3,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      rowCount: 2,
      quantity: "12",
      sourceType: "realizado",
    });
  });

  it("should_keep_distinct_source_types_separate_when_classification_differs", () => {
    const document = parseSusCsv(
      "codigo;procedimento;quantidade;situacao\n010101;Hemograma;8;apresentado\n010101;Hemograma;4;aprovado\n",
      ";",
    );
    const groups = summarizeSusRows(document, {
      code: 0,
      procedure: 1,
      quantity: 2,
      sourceType: 3,
    });
    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((group) => group.sourceType))).toEqual(
      new Set(["apresentado", "aprovado"]),
    );
  });

  it("should_reject_non_integer_or_negative_quantities_when_rows_are_invalid", () => {
    const document = parseSusCsv(
      "procedimento;quantidade;situacao\nHemograma;-1;realizado",
      ";",
    );
    expect(() =>
      summarizeSusRows(document, { procedure: 0, quantity: 1, sourceType: 2 }),
    ).toThrow(/linha 2/);
    const decimal = parseSusCsv(
      "procedimento;quantidade;situacao\nHemograma;1.5;realizado",
      ";",
    );
    expect(() =>
      summarizeSusRows(decimal, { procedure: 0, quantity: 1, sourceType: 2 }),
    ).toThrow(/linha 2/);
  });

  it("should_require_manual_mapping_when_external_codes_have_no_catalog_match", () => {
    const document = parseSusCsv(
      "codigo;procedimento;quantidade;situacao\n010101;Hemograma;8;realizado",
      ";",
    );
    const columns = { code: 0, procedure: 1, quantity: 2, sourceType: 3 };
    const groups = summarizeSusRows(document, columns);

    expect(() => mapSusRowsToProcedures(document, columns, {})).toThrow(
      /Associe cada procedimento/,
    );
    expect(
      mapSusRowsToProcedures(document, columns, {
        [groups[0].mappingKey]: "3a7ac6e8-5f2f-4d55-946c-4c047e6c5a0a",
      })[0].procedure_id,
    ).toBe("3a7ac6e8-5f2f-4d55-946c-4c047e6c5a0a");
  });

  it("should_keep_mixed_source_types_separate_for_one_procedure_mapping", () => {
    const document = parseSusCsv(
      "procedimento;quantidade;situacao\nExame A;1;realizado\nExame B;1;aprovado",
      ";",
    );
    const groups = summarizeSusRows(document, {
      procedure: 0,
      quantity: 1,
      sourceType: 2,
    });
    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((group) => group.sourceType))).toEqual(
      new Set(["realizado", "aprovado"]),
    );
  });
});
