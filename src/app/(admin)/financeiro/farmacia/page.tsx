import Link from "next/link";
import { ArrowUpRight, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PharmacyNavigation } from "@/modules/finance/pharmacy/pharmacy-navigation";
import { formatCurrency, formatDate } from "@/modules/finance/pharmacy/format";
import { listPurchaseOrders } from "@/modules/finance/pharmacy/repository";

export default async function PharmacyPage() {
  const orders = await listPurchaseOrders();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Farmácia"
        description="Acompanhe compras de medicamentos e insumos e mantenha o histórico de preços por fornecedor."
        actions={
          <Button render={<Link href="/financeiro/farmacia/pedidos/novo" />}>
            <PackagePlus aria-hidden="true" />
            Novo pedido
          </Button>
        }
      />
      <PharmacyNavigation />
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Pedidos de compra</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Exibindo os 100 pedidos mais recentes.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
          </p>
        </div>
        {orders.length ? (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Data
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Fornecedor
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Itens
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Detalhe</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 tabular-nums">
                        {formatDate(order.order_date)}
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {order.supplier_name}
                      </td>
                      <td className="px-4 py-4">{order.item_count}</td>
                      <td className="px-4 py-4 text-right font-medium tabular-nums">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={
                            <Link
                              href={`/financeiro/farmacia/pedidos/${order.id}`}
                            />
                          }
                        >
                          <span>Detalhes</span>
                          <ArrowUpRight aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={PackagePlus}
            title="Nenhum pedido registrado"
            description="Crie um pedido para iniciar o acompanhamento das compras e dos preços praticados."
          />
        )}
      </section>
    </div>
  );
}
