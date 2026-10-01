"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { isNavigationItemActive, navigationGroups } from "@/lib/navigation";

type AdminShellProps = Readonly<{ children: React.ReactNode }>;

const activeLinkClasses =
  "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/20";
const inactiveLinkClasses =
  "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground";

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/40 md:grid md:grid-cols-[17rem_1fr]">
      <aside className="border-b bg-sidebar md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex h-20 items-center gap-3 border-b px-5">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-xl bg-primary/70 text-primary-foreground ring-1 ring-primary/50"
          >
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">Hospital Admin</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gestão administrativa
            </p>
          </div>
        </div>

        <nav
          aria-label="Navegação principal"
          className="flex gap-2 overflow-x-auto p-3 md:flex-col md:gap-1"
        >
          {navigationGroups.map((group) => {
            const isGroupActive = isNavigationItemActive(pathname, group.href);

            return (
              <div key={group.href} className="shrink-0 md:shrink">
                <Link
                  href={group.href}
                  aria-current={group.href === pathname ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${isGroupActive ? activeLinkClasses : inactiveLinkClasses}`}
                >
                  <group.icon aria-hidden="true" className="size-4" />
                  <span>{group.label}</span>
                </Link>

                {group.items ? (
                  <div className="mt-1 flex gap-1 border-l border-sidebar-border pl-3 md:ml-5 md:flex-col">
                    {group.items.map((item) => {
                      const isActive = isNavigationItemActive(
                        pathname,
                        item.href,
                      );

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
                        >
                          <item.icon aria-hidden="true" className="size-3.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-foreground/70">
              Operação administrativa
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              Painel hospitalar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              Ambiente de demonstração
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
