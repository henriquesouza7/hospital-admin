const labels: Readonly<Record<string, string>> = {
  production: "Produção",
  shared_demo: "Demonstração compartilhada",
  isolated_homologation: "Homologação isolada",
};

export function getEnvironmentLabel(
  environment = process.env.NEXT_PUBLIC_HOSPITAL_ENVIRONMENT,
): string {
  return (environment && labels[environment]) || "Ambiente não identificado";
}
