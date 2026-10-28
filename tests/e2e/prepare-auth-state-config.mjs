import { relative, resolve, sep } from "node:path";

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const authStateDirectory = "tests/e2e/.auth";

export function resolveAuthStateConfig(
  environment,
  projectDirectory = process.cwd(),
) {
  const configuredBaseURL = environment.PLAYWRIGHT_BASE_URL;
  if (!configuredBaseURL) {
    throw new Error(
      "Defina PLAYWRIGHT_BASE_URL com a origem localhost via HTTP e porta explícita, por exemplo http://localhost:3006.",
    );
  }

  let baseURL;
  try {
    baseURL = new URL(configuredBaseURL);
  } catch {
    throw new Error(
      "PLAYWRIGHT_BASE_URL inválida. Use uma origem localhost via HTTP com porta explícita.",
    );
  }

  if (
    baseURL.protocol !== "http:" ||
    !localHosts.has(baseURL.hostname) ||
    !baseURL.port ||
    baseURL.username ||
    baseURL.password ||
    baseURL.pathname !== "/" ||
    baseURL.search ||
    baseURL.hash
  ) {
    throw new Error(
      "PLAYWRIGHT_BASE_URL deve ser uma origem localhost via HTTP com porta explícita, sem caminho, credenciais ou parâmetros.",
    );
  }

  const configuredStorageState = environment.PLAYWRIGHT_AUTH_STORAGE_STATE;
  if (!configuredStorageState) {
    throw new Error(
      "Defina PLAYWRIGHT_AUTH_STORAGE_STATE para um arquivo exclusivo do ambiente dentro de tests/e2e/.auth.",
    );
  }

  const storageStatePath = resolve(projectDirectory, configuredStorageState);
  const authDirectoryPath = resolve(projectDirectory, authStateDirectory);
  const relativeStoragePath = relative(authDirectoryPath, storageStatePath);
  if (
    !relativeStoragePath ||
    relativeStoragePath === ".." ||
    relativeStoragePath.startsWith(`..${sep}`) ||
    resolve(authDirectoryPath, relativeStoragePath) !== storageStatePath
  ) {
    throw new Error(
      "PLAYWRIGHT_AUTH_STORAGE_STATE deve apontar para um arquivo dentro de tests/e2e/.auth.",
    );
  }

  return {
    baseURL,
    storageStatePath,
    metadataPath: `${storageStatePath}.meta.json`,
  };
}

export function createEnvironmentMetadata({
  baseURL,
  authBaseURL,
  dataAPIURL,
}) {
  const authEndpoint = parseNeonEndpoint(authBaseURL);
  const dataEndpoint = parseNeonEndpoint(dataAPIURL);

  return {
    version: 1,
    appOrigin: baseURL.origin,
    authEndpoint: `${authEndpoint.origin}${authEndpoint.pathname}`,
    dataAPIEndpoint: `${dataEndpoint.origin}${dataEndpoint.pathname}`,
  };
}

export function canReuseStorageState(
  existingState,
  existingMetadata,
  expectedMetadata,
) {
  return (
    Array.isArray(existingState?.cookies) &&
    Array.isArray(existingState?.origins) &&
    existingMetadata?.version === expectedMetadata.version &&
    existingMetadata?.appOrigin === expectedMetadata.appOrigin &&
    existingMetadata?.authEndpoint === expectedMetadata.authEndpoint &&
    existingMetadata?.dataAPIEndpoint === expectedMetadata.dataAPIEndpoint
  );
}

function parseNeonEndpoint(value) {
  let endpoint;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error(
      "Configuração de Auth/Data API inválida; confira NEON_AUTH_BASE_URL e NEON_DATA_API_URL no ambiente local.",
    );
  }

  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error(
      "NEON_AUTH_BASE_URL e NEON_DATA_API_URL devem usar HTTPS sem credenciais embutidas.",
    );
  }

  return endpoint;
}
