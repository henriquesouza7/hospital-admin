"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";

export type DashboardQuickViewDetail = Readonly<{
  label: string;
  value: string;
  exactValue?: string;
  exactLabel?: string;
}>;

export type DashboardQuickViewSection = Readonly<{
  title: string;
  details: readonly DashboardQuickViewDetail[];
}>;

export type DashboardQuickViewStatus = Readonly<{
  label: string;
  tone: "neutral" | "success" | "warning" | "error";
}>;

type QuickViewContentProps = Readonly<{
  title: string;
  description?: string;
  period?: string;
  primaryLabel?: string;
  primaryValue?: string;
  primaryExactValue?: string;
  details?: readonly DashboardQuickViewDetail[];
  sections?: readonly DashboardQuickViewSection[];
  status?: DashboardQuickViewStatus;
  href?: string;
  hrefLabel?: string;
  finalFocusRef?: RefObject<HTMLElement | null>;
  presentation?: "dialog" | "drawer";
}>;

function QuickViewContent({
  title,
  description,
  period,
  primaryLabel,
  primaryValue,
  primaryExactValue,
  details = [],
  sections = [],
  status,
  href,
  hrefLabel = "Abrir módulo completo",
  finalFocusRef,
  presentation = "dialog",
}: QuickViewContentProps) {
  const isDrawer = presentation === "drawer";
  const statusClassName =
    status?.tone === "success"
      ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
      : status?.tone === "warning"
        ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
        : status?.tone === "error"
          ? "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
          : "bg-muted text-muted-foreground";

  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[100] bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
      <Dialog.Viewport
        className={`fixed inset-0 z-[101] flex ${isDrawer ? "items-end justify-center md:items-stretch md:justify-end" : "items-end justify-center sm:items-center sm:p-5"}`}
      >
        <Dialog.Popup
          finalFocus={finalFocusRef}
          className={`dashboard-quick-view-popup relative flex w-full flex-col overflow-y-auto border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-dashboard-modal)] outline-none transition-[opacity,transform] duration-200 data-[starting-style]:translate-y-3 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-3 data-[ending-style]:opacity-0 motion-reduce:transform-none motion-reduce:transition-none ${isDrawer ? "max-h-[88dvh] rounded-t-[var(--radius-dashboard-card)] md:h-full md:max-h-full md:w-[min(30rem,92vw)] md:rounded-none md:rounded-l-[var(--radius-dashboard-card)] md:p-7 md:data-[starting-style]:translate-y-0 md:data-[starting-style]:translate-x-3 md:data-[ending-style]:translate-y-0 md:data-[ending-style]:translate-x-3" : "max-h-[min(84dvh,44rem)] rounded-t-[var(--radius-dashboard-card)] sm:max-w-xl sm:rounded-[var(--radius-dashboard-card)] sm:p-6"}`}
        >
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {period ? (
                <p className="text-sm leading-5 text-muted-foreground">
                  {period}
                </p>
              ) : null}
              <Dialog.Title className="mt-1 text-lg font-semibold leading-6 tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm leading-5 text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
              {status ? (
                <span
                  role="status"
                  className={`mt-3 inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ${statusClassName}`}
                >
                  {status.label}
                </span>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Fechar detalhes"
              className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </header>

          {primaryValue !== undefined ? (
            <section className="mt-5 rounded-xl bg-muted/45 px-4 py-3.5">
              {primaryLabel ? (
                <p className="text-sm leading-5 text-muted-foreground">
                  {primaryLabel}
                </p>
              ) : null}
              <p className="mt-1 text-2xl font-semibold leading-8 tracking-tight text-foreground tabular-nums">
                {primaryValue}
              </p>
              {primaryExactValue && primaryExactValue !== primaryValue ? (
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Valor exato:{" "}
                  <span className="tabular-nums">{primaryExactValue}</span>
                </p>
              ) : null}
            </section>
          ) : null}

          {details.length > 0 ? (
            <dl className="mt-4 divide-y divide-border/70">
              {details.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-5 py-3 first:pt-0 last:pb-0"
                >
                  <dt className="min-w-0 text-sm leading-5 text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="min-w-0 text-right text-sm font-medium leading-5 text-foreground">
                    <span className="block tabular-nums">{item.value}</span>
                    {item.exactValue && item.exactValue !== item.value ? (
                      <span className="mt-0.5 block text-xs font-normal leading-4 text-muted-foreground tabular-nums">
                        {item.exactLabel ?? "Exato"}: {item.exactValue}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {sections.map((section) => (
            <section
              key={section.title}
              className="mt-5 border-t border-border/70 pt-4 first:mt-4"
            >
              <h3 className="text-sm font-semibold leading-5 text-foreground">
                {section.title}
              </h3>
              <dl className="mt-2 divide-y divide-border/70">
                {section.details.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-5 py-3 first:pt-2 last:pb-0"
                  >
                    <dt className="min-w-0 text-sm leading-5 text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="min-w-0 text-right text-sm font-medium leading-5 text-foreground">
                      <span className="block tabular-nums">{item.value}</span>
                      {item.exactValue && item.exactValue !== item.value ? (
                        <span className="mt-0.5 block text-xs font-normal leading-4 text-muted-foreground tabular-nums">
                          {item.exactLabel ?? "Exato"}: {item.exactValue}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <footer className="mt-auto flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
            <Dialog.Close className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
              Fechar
            </Dialog.Close>
            {href ? (
              <Link
                href={href}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {hrefLabel}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
          </footer>
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  );
}

type DashboardQuickViewProps = QuickViewContentProps &
  Readonly<{
    trigger: ReactNode;
    triggerLabel: string;
    triggerClassName?: string;
  }>;

export function DashboardQuickView({
  trigger,
  triggerLabel,
  triggerClassName,
  ...content
}: DashboardQuickViewProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        type="button"
        aria-label={triggerLabel}
        className={triggerClassName}
      >
        {trigger}
      </Dialog.Trigger>
      <QuickViewContent {...content} />
    </Dialog.Root>
  );
}

export function DashboardQuickViewDialog({
  open,
  onOpenChange,
  ...content
}: QuickViewContentProps &
  Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <QuickViewContent {...content} />
    </Dialog.Root>
  );
}
