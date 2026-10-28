import {
  Activity,
  ClipboardList,
  FileUp,
  Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ModuleAreaCard, ModuleAreaGrid } from "@/components/module-area";

const sections = [
  {
    href: "/producao/procedimentos",
    title: "Procedimentos e categorias",
    description:
      "Mantenha o catálogo, as unidades de contagem e os status dos procedimentos.",
    icon: Stethoscope,
  },
  {
    href: "/producao/lancamentos",
    title: "Lançamentos mensais",
    description:
      "Registre e corrija quantidades agregadas por competência e fonte.",
    icon: ClipboardList,
  },
  {
    href: "/producao/indicadores",
    title: "Indicadores e dashboards",
    description:
      "Analise volumes por procedimento, competência, unidade histórica e origem.",
    icon: Activity,
  },
  {
    href: "/producao/importacoes",
    title: "Importação SUS e reconciliação",
    description:
      "Valide arquivos CSV, associe procedimentos manualmente e reconcilie colisões sem duplicar volumes.",
    icon: FileUp,
  },
] as const;

export default function ProductionPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Módulo administrativo"
        title="Produção hospitalar"
        description="Gerencie o catálogo e os volumes mensais por procedimento, sem dados individualizados de pacientes."
      />
      <ModuleAreaGrid label="Áreas de Produção">
        {sections.map((section) => <ModuleAreaCard key={section.href} {...section} />)}
      </ModuleAreaGrid>
    </div>
  );
}
