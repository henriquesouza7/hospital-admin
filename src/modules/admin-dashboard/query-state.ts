export type DashboardQueryState<T> =
  | Readonly<{ kind: "available"; data: T }>
  | Readonly<{ kind: "unavailable"; code: string | null }>;

export function dashboardQueryErrorMessage(
  code: string | null,
  resource: string,
): string {
  if (code === "42501") {
    return `Sem permissão para consultar ${resource}. Solicite revisão à administração.`;
  }
  return `Não foi possível consultar ${resource}.`;
}

export async function captureDashboardQuery<T>(
  query: () => Promise<T>,
  onFailure: (error: unknown) => void,
): Promise<DashboardQueryState<T>> {
  try {
    return { kind: "available", data: await query() };
  } catch (error: unknown) {
    onFailure(error);
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : null;
    return { kind: "unavailable", code };
  }
}
