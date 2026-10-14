import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import { chromium } from "@playwright/test";
import {
  canReuseStorageState,
  createEnvironmentMetadata,
  resolveAuthStateConfig,
} from "./prepare-auth-state-config.mjs";

const { loadEnvConfig } = nextEnv;

export async function prepareAuthState() {
  const projectDirectory = process.cwd();
  loadEnvConfig(projectDirectory);

  const { baseURL, storageStatePath, metadataPath } = resolveAuthStateConfig(
    process.env,
    projectDirectory,
  );
  const metadata = createEnvironmentMetadata({
    baseURL,
    authBaseURL: process.env.NEON_AUTH_BASE_URL,
    dataAPIURL: process.env.NEON_DATA_API_URL,
  });
  const relativeStoragePath = relative(projectDirectory, storageStatePath)
    .split(sep)
    .join("/");

  try {
    execFileSync("git", ["check-ignore", "--quiet", relativeStoragePath], {
      cwd: projectDirectory,
      stdio: "ignore",
    });
  } catch {
    throw new Error(
      "O storage state não está protegido pelo .gitignore; escolha um caminho ignorado dentro de tests/e2e/.auth.",
    );
  }

  await mkdir(dirname(storageStatePath), { recursive: true });
  const browser = await chromium.launch({ headless: false });

  try {
    if (await canReuseExistingState(storageStatePath, metadataPath, metadata)) {
      let context;
      try {
        context = await browser.newContext({
          storageState: storageStatePath,
        });
        const page = await context.newPage();
        const hasAdminAccess = await hasFinanceAdmin(page, baseURL);

        if (hasAdminAccess) {
          await saveStorageState(
            context,
            storageStatePath,
            metadataPath,
            metadata,
          );
          process.stdout.write("Sessão administrativa válida reutilizada.\n");
          return;
        }
      } catch {
        process.stdout.write(
          "Estado salvo inválido; solicitando novo login manual.\n",
        );
      } finally {
        await context?.close();
      }

      process.stdout.write(
        "Sessão salva inválida ou sem acesso administrativo; solicitando novo login manual.\n",
      );
    }

    await captureManualSession(
      browser,
      baseURL,
      storageStatePath,
      metadataPath,
      metadata,
    );
  } finally {
    await browser.close();
  }
}

async function canReuseExistingState(storageStatePath, metadataPath, metadata) {
  try {
    const savedMetadata = JSON.parse(await readFile(metadataPath, "utf8"));
    const savedState = JSON.parse(await readFile(storageStatePath, "utf8"));
    return canReuseStorageState(savedState, savedMetadata, metadata);
  } catch {
    return false;
  }
}

async function captureManualSession(
  browser,
  baseURL,
  storageStatePath,
  metadataPath,
  metadata,
) {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    await page.goto(new URL("/login", baseURL).toString());
    process.stdout.write(
      `Faça login administrativo real na janela aberta em ${baseURL.origin}.\n`,
    );
    await page.waitForURL((url) => url.pathname !== "/login", { timeout: 0 });

    if (!(await hasFinanceAdmin(page, baseURL))) {
      throw new Error(
        "A sessão autenticada não tem acesso administrativo ao Financeiro.",
      );
    }

    await saveStorageState(context, storageStatePath, metadataPath, metadata);
    process.stdout.write("Sessão administrativa salva localmente.\n");
  } finally {
    await context.close();
  }
}

async function saveStorageState(
  context,
  storageStatePath,
  metadataPath,
  metadata,
) {
  await context.storageState({ path: storageStatePath });
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
    mode: 0o600,
  });

  if (process.platform !== "win32") {
    await chmod(storageStatePath, 0o600);
    await chmod(metadataPath, 0o600);
  }
}

async function hasFinanceAdmin(page, baseURL) {
  await page.goto(new URL("/financeiro/indicadores", baseURL).toString());
  return page
    .getByRole("heading", {
      level: 1,
      name: "Indicadores e comparativos",
      exact: true,
    })
    .isVisible()
    .catch(() => false);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await prepareAuthState();
}
