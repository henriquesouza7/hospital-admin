import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardPlus,
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

export const navigationItems: readonly NavigationItem[] = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro", icon: WalletCards },
  { href: "/financeiro/farmacia", label: "Farmácia", icon: Pill },
  { href: "/financeiro/laboratorio", label: "Laboratório", icon: FlaskConical },
  { href: "/financeiro/feira", label: "Feira", icon: ShoppingBasket },
  { href: "/internacoes", label: "Internações", icon: CalendarDays },
  { href: "/producao", label: "Produção", icon: ChartNoAxesCombined },
  {
    href: "/pequenas-cirurgias",
    label: "Pequenas cirurgias",
    icon: ClipboardPlus,
  },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;
