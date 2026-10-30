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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("should_reject_duplicate_patient_booking_without_duplicate_row_or_audit", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const day = new Date();
  day.setDate(day.getDate() + 30 + Math.floor(Math.random() * 300));
  const procedureDate = formatDate(day);
  const dayLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${procedureDate}T12:00:00Z`));
  const patientName = `QA Pessoa Sintética ${randomUUID()}`;

  await page.goto("/pequenas-cirurgias");
  const dayForm = page
    .locator("form")
    .filter({ has: page.locator('input[name="procedure_date"]') });
  await dayForm.locator('input[name="procedure_date"]').fill(procedureDate);
  await dayForm.locator('input[name="capacity"]').fill("2");
  await dayForm.getByRole("button", { name: "Criar dia" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Dia de cirurgia criado." }),
  ).toBeVisible();

  await page.reload();
  const dayLink = page
    .locator('a[href^="/pequenas-cirurgias/dias/"]')
    .filter({ hasText: dayLabel })
    .first();
  await expect(dayLink).toBeVisible();
  const dayPath = await dayLink.getAttribute("href");
  if (!dayPath)
    throw new Error("O dia sintético não gerou um link de detalhe.");

  await page.goto(dayPath);
  const appointmentForm = page
    .locator("form")
    .filter({ has: page.locator('input[name="patient_name"]') })
    .first();
  await appointmentForm.locator('input[name="patient_name"]').fill(patientName);
  await appointmentForm.getByRole("button", { name: "Agendar pessoa" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Agendamento criado." }),
  ).toBeVisible();
  await page.reload();

  const matchingAppointments = page
    .locator("tbody tr")
    .filter({ hasText: patientName });
  await expect(matchingAppointments).toHaveCount(1);

  const session = await page.evaluate(async () => {
    const response = await fetch("/api/auth/get-session");
    const value: unknown = await response.json();
    if (typeof value !== "object" || value === null || !("user" in value)) {
      return null;
    }
    const user = value.user;
    return typeof user === "object" && user !== null && "id" in user
      ? user.id
      : null;
  });
  if (typeof session !== "string") {
    throw new Error("Não foi possível confirmar o ator sintético da sessão.");
  }

  const auditCount = async () => {
    const from = formatDate(new Date());
    const through = new Date();
    through.setDate(through.getDate() + 1);
    const params = new URLSearchParams({
      module: "pequenas-cirurgias",
      entity: "surgery_appointment",
      actor: session,
      from,
      through: formatDate(through),
    });
    await page.goto(`/auditoria?${params}`);
    await expect(
      page.getByRole("heading", { name: "Histórico de alterações" }),
    ).toBeVisible();
    return page.locator("ol li").count();
  };

  const auditEventsAfterCreation = await auditCount();
  expect(auditEventsAfterCreation).toBeGreaterThan(0);

  await page.goto(dayPath);
  const duplicateForm = page
    .locator("form")
    .filter({ has: page.locator('input[name="patient_name"]') })
    .first();
  await duplicateForm.getByLabel("Buscar cadastro pelo nome").fill(patientName);
  await duplicateForm.getByRole("button", { name: "Buscar" }).click();
  const patientOption = duplicateForm.locator('select[name="patient_id"]');
  await expect(patientOption).toBeVisible();
  await patientOption.selectOption({ label: patientName });
  await duplicateForm.getByRole("button", { name: "Agendar pessoa" }).click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Já existe um registro equivalente para essa pessoa ou data.",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(matchingAppointments).toHaveCount(1);
  await expect(await auditCount()).toBe(auditEventsAfterCreation);
});
