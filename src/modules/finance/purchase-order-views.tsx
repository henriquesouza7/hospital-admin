import Link from "next/link";
import { ArrowUpRight, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PurchaseNavigation } from "@/modules/finance/purchase-navigation";
import { formatCurrency, formatDate } from "@/modules/finance/pharmacy/format";
import type {
  getPurchaseOrder,
  listPurchaseOrders,
} from "@/modules/finance/pharmacy/repository";
import type { FinanceSector } from "@/modules/finance/pharmacy/validation";

type PurchaseOrderSummary = Awaited<
  ReturnType<typeof listPurchaseOrders>
>[number];
type PurchaseOrderDetail = NonNullable<
  Awaited<ReturnType<typeof getPurchaseOrder>>
>;

function sectorLabel(sector: FinanceSector): string {
  return sector === "laboratorio" ? "Laboratório" : "Farmácia";
}

export function PurchaseOrderList({
  orders,
  sector,
}: {
  orders: PurchaseOrderSummary[];
  sector: FinanceSector;
}) {
  const basePath = `/financeiro/${sector}`;

  return (
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
                          <Link href={`${basePath}/pedidos/${order.id}`} />
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
          description={`Crie um pedido para iniciar o acompanhamento das compras e dos preços praticados em ${sectorLabel(sector)}.`}
        />
      )}
    </section>
  );
}

export function PurchaseOrderDetailView({
  order,
  sector,
}: {
  order: PurchaseOrderDetail;
  sector: FinanceSector;
}) {
  const total = order.items.reduce((sum, item) => {
    const [whole, fraction = ""] = item.line_total.split(".");
    return (
      sum +
      BigInt(whole) * BigInt(100) +
      BigInt(fraction.padEnd(2, "0").slice(0, 2))
    );
  }, BigInt(0));

  return (
    <>
      <PurchaseNavigation sector={sector} />
      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Setor</p>
          <p className="mt-1 font-medium">{sectorLabel(sector)}</p>
        </div>
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
          <div className="sm:col-span-4">
            <p className="text-sm text-muted-foreground">Observação</p>
            <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
          </div>
        ) : null}
      </section>
      {order.items.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Produto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Categoria histórica
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
                      {item.product_name_snapshot}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {item.product_presentation_snapshot}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {item.product_category_snapshot || "—"}
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
                  <th scope="row" colSpan={4} className="px-4 py-4 text-right">
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
          icon={PackagePlus}
          title="Pedido sem itens"
          description="Este registro ainda não possui itens associados."
        />
      )}
    </>
  );
}
