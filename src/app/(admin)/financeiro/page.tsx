import Link from "next/link";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  FlaskConical,
  FileSpreadsheet,
  Pill,
  ShoppingBasket,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import styles from "./page.module.css";

const areas = [
  {
    href: "/financeiro/farmacia",
    title: "Farmácia",
    description:
      "Cadastro de fornecedores e produtos, pedidos de compra e histórico de preços por item.",
    icon: Pill,
  },
  {
    href: "/financeiro/importacao-fiscal",
    title: "Importação fiscal",
    description:
      "Revise XMLs de NF-e e crie pedidos para Farmácia ou Laboratório com vínculo fiscal.",
    icon: FileSpreadsheet,
  },
  {
    href: "/financeiro/laboratorio",
    title: "Laboratório",
    description:
      "Cadastro de produtos e pedidos de compra com histórico de preços por item.",
    icon: FlaskConical,
  },
  {
    href: "/financeiro/feira",
    title: "Feira",
    description:
      "Registre o total mensal consolidado e acompanhe variações e resumo anual.",
    icon: ShoppingBasket,
  },
  {
    href: "/financeiro/indicadores",
    title: "Indicadores e comparativos",
    description:
      "Consulte gastos consolidados, evolução mensal e comparações históricas de preços.",
    icon: ChartNoAxesCombined,
  },
] as const;

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hospital Admin"
        title="Financeiro"
        description="Base compartilhada para compras, despesas e análises administrativas."
      />
      <section className={styles.grid} aria-label="Áreas do Financeiro">
        {areas.map(({ href, title, description, icon: Icon }) => (
          <Link className={styles.card} href={href} key={href}>
            <span className={styles.icon}>
              <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
            </span>
            <span className={styles.copy}>
              <span className={styles.title}>{title}</span>
              <span className={styles.description}>{description}</span>
            </span>
            <ArrowUpRight className={styles.arrow} aria-hidden="true" size={20} />
          </Link>
        ))}
      </section>
    </div>
  );
}
