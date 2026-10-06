import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PharmacyNavigation } from "@/modules/finance/pharmacy/pharmacy-navigation";
import { formatCurrency, formatDate } from "@/modules/finance/pharmacy/format";
import { getPurchaseOrder } from "@/modules/finance/pharmacy/repository";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    notFound();
  const order = await getPurchaseOrder(id);
  if (!order) notFound();
  const total = order.items.reduce((sum, item) => {
    const [whole, fraction = ""] = item.line_total.split(".");
    return (
      sum +
      BigInt(whole) * BigInt(100) +
      BigInt(fraction.padEnd(2, "0").slice(0, 2))
    );
  }, BigInt(0));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Financeiro / Farmácia / Pedidos"
        title="Detalhe do pedido"
        description={`${order.supplier.name} · ${formatDate(order.order_date)}`}
        actions={
          <Button
            variant="outline"
            render={<Link href="/financeiro/farmacia" />}
          >
            <ArrowLeft aria-hidden="true" />
            Voltar aos pedidos
          </Button>
        }
      />
      <PharmacyNavigation />
      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">Fornecedor</p>
          <p className="mt-1 font-medium">{order.supplier.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Data</p>
          <p className="mt-1 font-medium">{formatDate(order.order_date)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Itens</p>
          <p className="mt-1 font-medium">{order.items.length}</p>
        </div>
        {order.notes ? (
          <div className="sm:col-span-3">
            <p className="text-sm text-muted-foreground">Observação</p>
            <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
          </div>
        ) : null}
      </section>
      {order.items.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Produto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Quantidade
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Valor unitário
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-medium">
                      {item.product.name}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {item.product.presentation}
                      </span>
                    </td>
                    <td className="px-4 py-4 tabular-nums">{item.quantity}</td>
                    <td className="px-4 py-4 tabular-nums">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium tabular-nums">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/40">
                <tr>
                  <th scope="row" colSpan={3} className="px-4 py-4 text-right">
                    Total do pedido
                  </th>
                  <td className="px-4 py-4 text-right text-base font-semibold tabular-nums">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={ArrowLeft}
          title="Pedido sem itens"
          description="Este registro ainda não possui itens associados."
        />
      )}
    </div>
  );
}
