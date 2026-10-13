export type AuthStateConfigEnvironment = Record<string, string | undefined>;

export type AuthStateConfig = {
  baseURL: URL;
  storageStatePath: string;
  metadataPath: string;
};

export type AuthEnvironmentMetadata = {
  version: 1;
  appOrigin: string;
  authEndpoint: string;
  dataAPIEndpoint: string;
};

export function resolveAuthStateConfig(
  environment: AuthStateConfigEnvironment,
  projectDirectory?: string,
): AuthStateConfig;

export function createEnvironmentMetadata(input: {
  baseURL: URL;
  authBaseURL: string;
  dataAPIURL: string;
}): AuthEnvironmentMetadata;

export function canReuseStorageState(
  existingState: unknown,
  existingMetadata: unknown,
  expectedMetadata: AuthEnvironmentMetadata,
): boolean;
