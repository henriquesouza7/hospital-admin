import { redirect } from "next/navigation";

export default function LegacySuppliersPage() {
  redirect("/financeiro/fornecedores?setor=farmacia");
}
