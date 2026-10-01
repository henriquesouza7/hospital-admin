import Link from "next/link";
import { Building2 } from "lucide-react";
import { navigationItems } from "@/lib/navigation";

type AdminShellProps = Readonly<{ children: React.ReactNode }>;

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[17rem_1fr]">
      <aside className="border-b bg-sidebar md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-none">Hospital Admin</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gestão administrativa
            </p>
          </div>
        </div>
        <nav
          aria-label="Navegação principal"
          className="flex gap-1 overflow-x-auto p-3 md:flex-col"
        >
          {navigationItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <p className="text-sm font-medium">Painel administrativo</p>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
