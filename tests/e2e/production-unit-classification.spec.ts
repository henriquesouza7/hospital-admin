import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE;
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const canWriteSyntheticData =
  Boolean(storageState && existsSync(storageState)) &&
  baseURL === "http://localhost:3006" &&
  process.env.PLAYWRIGHT_ENABLE_SYNTHETIC_MUTATION_TESTS === "true";
test.use({ storageState: storageState ?? undefined });

test.beforeEach(async ({ request }) => {
  test.skip(
    !canWriteSyntheticData,
    "Ative explicitamente os testes mutativos com uma sessão autenticada em localhost:3006.",
  );
  const response = await request.get("/api/e2e/neon-isolation");
  test.skip(
    response.status() !== 204,
    "O servidor não confirmou o endpoint Neon isolado aprovado para escrita sintética.",
  );
});

test("should_keep_production_units_and_classifications_separate_after_catalog_change", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const suffix = randomUUID().slice(0, 8);
  const category = `QA Categoria Sintética ${suffix}`;
  const period = "2027-02";
  const procedures = [
    { name: `QA Matriz Atendimento ${suffix}`, unit: "atendimento" },
    { name: `QA Matriz Procedimento ${suffix}`, unit: "procedimento" },
    { name: `QA Matriz Exame ${suffix}`, unit: "exame" },
  ] as const;
  const classifications = [
    { source: "SUS: apresentado", quantity: 5 },
    { source: "SUS: aprovado", quantity: 7 },
    { source: "SUS: realizado", quantity: 11 },
  ] as const;

  await page.goto("/producao/procedimentos");
  const categoryForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Cadastrar categoria" }),
  });
  await categoryForm.locator('input[name="name"]').fill(category);
  await categoryForm
    .getByRole("button", { name: "Cadastrar categoria" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Categoria cadastrada." }),
  ).toBeVisible();

  for (const procedure of procedures) {
    const form = page
      .locator("form")
      .filter({ has: page.locator('input[name="counting_unit"]') })
      .filter({
        has: page.getByRole("button", { name: "Cadastrar", exact: true }),
      });
    await form
      .locator('select[name="category_id"]')
      .selectOption({ label: category });
    await form.locator('input[name="name"]').fill(procedure.name);
    await form.locator('input[name="counting_unit"]').fill(procedure.unit);
    await form.getByRole("button", { name: "Cadastrar", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Procedimento cadastrado." }),
    ).toBeVisible();
  }

  for (const procedure of procedures) {
    for (const classification of classifications) {
      await page.goto("/producao/lancamentos");
      const form = page
        .locator("form")
        .filter({
          has: page.getByRole("button", { name: "Registrar lançamento" }),
        })
        .first();
      const select = form.locator('select[name="procedure_id"]');
      const options = await select.locator("option").allTextContents();
      const option = options.find(
        (text) =>
          text.includes(procedure.name) && text.includes(`(${procedure.unit})`),
      );
      expect(option).toBeDefined();
      await select.selectOption({ label: option!.trim() });
      await form.locator('input[name="reference_period"]').fill(period);
      await form
        .locator('input[name="quantity"]')
        .fill(String(classification.quantity));
      await form.locator('input[name="source"]').fill(classification.source);
      await form.getByRole("button", { name: "Registrar lançamento" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Lançamento registrado." }),
      ).toBeVisible();
    }
  }

  await page.goto(
    `/producao/indicadores?visao=competencia&competencia=${period}`,
  );
  const dashboardRows = page.locator("main tbody tr");
  for (const procedure of procedures) {
    const procedureRows = dashboardRows.filter({ hasText: procedure.name });
    await expect(procedureRows).toHaveCount(classifications.length);
    const rowTexts = await procedureRows.allInnerTexts();
    for (const classification of classifications) {
      expect(
        rowTexts.filter((row) => {
          const columns = row.split("\t");
          return (
            columns[2] === String(classification.quantity) &&
            columns[3] === procedure.unit &&
            columns[4] === classification.source
          );
        }),
      ).toHaveLength(1);
    }
  }

  const changedUnit = "atendimento revisado";
  await page.goto("/producao/procedimentos");
  const catalogRow = page
    .locator("main tbody tr")
    .filter({ hasText: procedures[0].name });
  await catalogRow.locator("summary").filter({ hasText: "Editar" }).click();
  const editForm = catalogRow.locator("form").filter({
    has: page.locator('input[name="counting_unit"]'),
  });
  await editForm.locator('input[name="counting_unit"]').fill(changedUnit);
  await editForm.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Procedimento atualizado." }),
  ).toBeVisible();
  await page.reload();
  await expect(catalogRow).toContainText(changedUnit);

  const currentDate = new Date();
  const currentDay = [
    currentDate.getFullYear(),
    String(currentDate.getMonth() + 1).padStart(2, "0"),
    String(currentDate.getDate()).padStart(2, "0"),
  ].join("-");
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDay = [
    nextDate.getFullYear(),
    String(nextDate.getMonth() + 1).padStart(2, "0"),
    String(nextDate.getDate()).padStart(2, "0"),
  ].join("-");
  await page.goto(
    `/auditoria?module=producao&entity=procedure&from=${currentDay}&through=${nextDay}`,
  );
  await expect(
    page.getByRole("heading", { name: "Histórico de alterações" }),
  ).toBeVisible();
  await expect(page.getByText(/^Procedimento(?: ·|$)/).first()).toBeVisible();

  await page.goto(`/producao/lancamentos?de=${period}&ate=${period}`);
  const historyTexts = await page.locator("main tbody tr").allInnerTexts();
  const procedureHistory = historyTexts.filter(
    (row) => row.split("\t")[2] === procedures[0].name,
  );
  expect(procedureHistory).toHaveLength(classifications.length);
  for (const classification of classifications) {
    expect(
      procedureHistory.filter((row) => {
        const columns = row.split("\t");
        return (
          columns[3] === `${classification.quantity} ${procedures[0].unit}` &&
          columns[4] === classification.source
        );
      }),
    ).toHaveLength(1);
  }

  await page.goto(
    `/producao/indicadores?visao=competencia&competencia=${period}`,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Indicadores de produção" }),
  ).toBeVisible();
  await expect(page.locator("main tbody tr").first()).toBeVisible();
  const dashboardText = await page.locator("main tbody tr").allInnerTexts();
  const historicalRows = dashboardText.filter((row) =>
    row.startsWith(`${procedures[0].name}\t`),
  );
  expect(historicalRows).toHaveLength(classifications.length);
  for (const classification of classifications) {
    expect(
      historicalRows.filter((row) => {
        const columns = row.split("\t");
        return (
          columns[2] === String(classification.quantity) &&
          columns[3] === procedures[0].unit &&
          columns[4] === classification.source
        );
      }),
    ).toHaveLength(1);
  }
  expect(historicalRows.every((row) => !row.includes(changedUnit))).toBe(true);
});
