"use client";

import "./admin-shell.css";
import "./admin-controls.css";
import Link from "next/link";
import {
  Bed,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  DollarSign,
  HeartPulse,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getEnvironmentLabel } from "@/lib/environment-label";
import { isNavigationItemActive, navigationGroups } from "@/lib/navigation";

type AdminShellProps = Readonly<{
  children: React.ReactNode;
  currentYear: string;
}>;

function getModuleName(pathname: string) {
  if (pathname.startsWith("/financeiro/farmacia")) return "pharmacy";
  if (pathname.startsWith("/financeiro/laboratorio")) return "laboratory";
  if (pathname.startsWith("/financeiro/feira")) return "fair";
  if (pathname.startsWith("/financeiro")) return "finance";
  if (pathname.startsWith("/internacoes")) return "admissions";
  if (pathname.startsWith("/producao")) return "production";
  if (pathname.startsWith("/pequenas-cirurgias")) return "minor-surgeries";
  return "administration";
}

export function AdminShell({ children, currentYear }: AdminShellProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/";
  const moduleName = getModuleName(pathname);
  const navigationRef = useRef<HTMLElement | null>(null);
  const [canScrollNavigation, setCanScrollNavigation] = useState(false);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) {
      setCanScrollNavigation(false);
      return;
    }

    const updateScrollCue = () => {
      setCanScrollNavigation(
        navigation.scrollLeft + navigation.clientWidth <
          navigation.scrollWidth - 1,
      );
    };
    const resizeObserver = new ResizeObserver(updateScrollCue);

    resizeObserver.observe(navigation);
    navigation.addEventListener("scroll", updateScrollCue, { passive: true });
    updateScrollCue();

    return () => {
      resizeObserver.disconnect();
      navigation.removeEventListener("scroll", updateScrollCue);
    };
  }, []);

  return (
    <div
      className={`${isDashboard ? "dashboard-shell" : "module-shell"} admin-motion-safe min-h-screen bg-background min-[601px]:grid min-[601px]:grid-cols-[72px_minmax(0,1fr)] min-[861px]:grid-cols-[var(--dashboard-sidebar-width)_minmax(0,1fr)]`}
      data-module={isDashboard ? undefined : moduleName}
    >
      <aside className="module-sidebar">
        <div className="module-brand flex items-center">
          <span className="module-brand-mark" aria-hidden="true">
            <HeartPulse className="size-5" strokeWidth={1.8} />
          </span>
          <div className="module-brand-text">
            <p className="font-semibold tracking-tight">Hospital Admin</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {getEnvironmentLabel()}
            </p>
          </div>
        </div>

        <p className="module-navigation-caption">Menu principal</p>
        <div className="module-navigation-viewport dashboard-navigation-viewport">
          <nav
            ref={navigationRef}
            id="primary-navigation"
            aria-label="Navegação principal"
            className="module-navigation"
          >
            {navigationGroups.map((group) => {
              const isGroupActive = isNavigationItemActive(
                pathname,
                group.href,
              );
              const NavigationIcon =
                group.href === "/financeiro"
                  ? DollarSign
                  : group.href === "/internacoes"
                    ? Bed
                    : group.href === "/producao"
                      ? ClipboardList
                      : group.icon;

              return (
                <div
                  key={group.href}
                  className={`module-navigation-group ${isGroupActive && group.href !== pathname ? "module-navigation-group-active" : ""}`}
                >
                  <Link
                    href={group.href}
                    aria-current={group.href === pathname ? "page" : undefined}
                    aria-label={group.label}
                    title={group.label}
                    onFocus={(event) =>
                      event.currentTarget.scrollIntoView({
                        block: "nearest",
                        inline: "nearest",
                      })
                    }
                    className={`module-navigation-link ${group.href === pathname ? "module-navigation-active" : ""}`}
                  >
                    <NavigationIcon
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.75}
                    />
                    <span className="module-navigation-label">
                      {group.label}
                    </span>
                  </Link>

                  {group.items ? (
                    <div className="module-navigation-children">
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
                            aria-label={item.label}
                            title={item.label}
                            onFocus={(event) =>
                              event.currentTarget.scrollIntoView({
                                block: "nearest",
                                inline: "nearest",
                              })
                            }
                            className={`module-navigation-link module-navigation-child ${isActive ? "module-navigation-active" : ""}`}
                          >
                            <item.icon
                              aria-hidden="true"
                              className="size-3.5"
                              strokeWidth={1.75}
                            />
                            <span className="module-navigation-label">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
          {canScrollNavigation ? (
            <button
              type="button"
              aria-label="Rolar navegação para a direita"
              aria-controls="primary-navigation"
              className="dashboard-navigation-scroll-cue"
              onClick={() => {
                const navigation = navigationRef.current;
                if (!navigation) return;
                navigation.scrollBy({
                  left: navigation.clientWidth * 0.75,
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                });
              }}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        <details className="module-account">
          <summary
            aria-label="Menu da conta: administrador"
            className="module-account-trigger"
          >
            <span className="dashboard-account-avatar" aria-hidden="true">
              AD
            </span>
            <span
              className="module-account-label"
              title="Conta administrativa · Administrador"
            >
              Conta administrativa
              <span className="dashboard-account-role">Administrador</span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="module-account-chevron"
            />
          </summary>
          <div className="module-account-menu">
            <p className="module-environment-label">{getEnvironmentLabel()}</p>
            <LogoutButton />
          </div>
        </details>
      </aside>

      <div
        className={
          isDashboard
            ? "admin-main admin-main-dashboard flex min-h-screen min-w-0 flex-col"
            : "admin-main flex min-h-screen min-w-0 flex-col"
        }
      >
        <main className="admin-content min-h-0 w-full flex-1">
          <div>{children}</div>
        </main>
        <footer className="mt-[var(--space-section-major)] flex flex-col gap-2 border-t border-border/70 py-4 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="font-medium text-foreground/80">Hospital Admin</p>
            <p>© {currentYear} · Gestão administrativa hospitalar.</p>
          </div>
          <p className="font-medium">Uso interno</p>
        </footer>
      </div>
    </div>
  );
}
