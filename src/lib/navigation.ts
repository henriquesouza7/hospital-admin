import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardPlus,
  FileDown,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Settings,
  ShoppingBasket,
  WalletCards,
} from "lucide-react";

export type NavigationItem = Readonly<{
  href: string;
  label: string;
  icon: LucideIcon;
}>;

export type NavigationGroup = Readonly<{
  label: string;
  href: string;
  icon: LucideIcon;
  items?: readonly NavigationItem[];
}>;

export const navigationGroups: readonly NavigationGroup[] = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: WalletCards,
    items: [
      { href: "/financeiro/farmacia", label: "Farmácia", icon: Pill },
      {
        href: "/financeiro/laboratorio",
        label: "Laboratório",
        icon: FlaskConical,
      },
      { href: "/financeiro/feira", label: "Feira", icon: ShoppingBasket },
    ],
  },
  { href: "/internacoes", label: "Internações", icon: CalendarDays },
  { href: "/producao", label: "Produção", icon: ChartNoAxesCombined },
  {
    href: "/pequenas-cirurgias",
    label: "Pequenas cirurgias",
    icon: ClipboardPlus,
  },
  { href: "/auditoria", label: "Auditoria", icon: ClipboardCheck },
  { href: "/exportacoes", label: "Exportações", icon: FileDown },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
