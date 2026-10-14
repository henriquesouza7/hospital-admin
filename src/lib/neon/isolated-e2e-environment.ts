const isolatedAuthHost =
  "ep-small-river-b82tcab9.neonauth.c-14.us-east-1.aws.neon.tech";
const isolatedDataApiHost =
  "ep-small-river-b82tcab9.apirest.c-14.us-east-1.aws.neon.tech";

type E2eEnvironment = Readonly<{
  appOrigin?: string;
  authBaseUrl?: string;
  dataApiUrl?: string;
  label?: string;
}>;

export function isAuthorizedIsolatedE2eEnvironment(
  environment: E2eEnvironment,
): boolean {
  if (
    environment.appOrigin !== "http://localhost:3006" ||
    environment.label !== "isolated_homologation"
  ) {
    return false;
  }

  try {
    const auth = new URL(environment.authBaseUrl ?? "");
    const dataApi = new URL(environment.dataApiUrl ?? "");

    return (
      auth.protocol === "https:" &&
      auth.hostname === isolatedAuthHost &&
      auth.port === "" &&
      auth.pathname === "/neondb/auth" &&
      auth.username === "" &&
      auth.password === "" &&
      auth.search === "" &&
      auth.hash === "" &&
      dataApi.protocol === "https:" &&
      dataApi.hostname === isolatedDataApiHost &&
      dataApi.port === "" &&
      dataApi.pathname === "/neondb/rest/v1" &&
      dataApi.username === "" &&
      dataApi.password === "" &&
      dataApi.search === "" &&
      dataApi.hash === ""
    );
  } catch {
    return false;
  }
}
