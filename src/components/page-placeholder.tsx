import { Construction } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

type PagePlaceholderProps = Readonly<{
  title: string;
  description: string;
}>;

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Hospital Admin"
        title={title}
        description={description}
      />
      <EmptyState
        icon={Construction}
        title="Módulo em preparação"
        description="Esta área faz parte da estrutura inicial e receberá seus fluxos administrativos em uma próxima etapa."
      />
    </div>
  );
}
