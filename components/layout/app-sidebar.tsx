"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  BarChart3Icon,
  FileTextIcon,
  GaugeIcon,
  HandCoinsIcon,
  LandmarkIcon,
  ListChecksIcon,
  WalletCardsIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const EXPENSE_NAV_ITEMS = [
  { href: "/expenses", label: "Planejamento", icon: WalletCardsIcon, exact: true },
  { href: "/expenses/tracking", label: "Acompanhamento", icon: WalletCardsIcon },
  { href: "/expenses/future", label: "Futuras", icon: WalletCardsIcon },
];

const INCOME_NAV_ITEMS = [
  { href: "/incomes", label: "Planejamento", icon: LandmarkIcon, exact: true },
  { href: "/incomes/tracking", label: "Acompanhamento", icon: LandmarkIcon },
  { href: "/incomes/future", label: "Futuras", icon: LandmarkIcon },
];

const DEBT_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon, exact: true },
  { href: "/debts", label: "Lista de dívidas", icon: HandCoinsIcon },
  { href: "/decision", label: "Decisão", icon: ListChecksIcon },
];

const CASH_FLOW_NAV_ITEMS = [
  { href: "/cash-flow", label: "Fluxo de caixa", icon: BarChart3Icon, exact: true },
];

const STATEMENT_NAV_ITEMS = [{ href: "/statement", label: "Extrato", icon: FileTextIcon, exact: true }];

export function AppSidebar() {
  const pathname = usePathname();

  function renderGroup(
    label: string,
    items: Array<{
      href: string;
      label: string;
      icon: ComponentType<{ className?: string }>;
      exact?: boolean;
    }>
  ) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                    className="h-9 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90"
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <p className="text-sm font-semibold tracking-wide text-sidebar-foreground">Cockpit</p>
        <p className="text-xs text-sidebar-foreground/65">
          Controle de dívidas, gastos e entradas
        </p>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {renderGroup("Operação", STATEMENT_NAV_ITEMS)}
        {renderGroup("Entradas", INCOME_NAV_ITEMS)}
        {renderGroup("Gastos", EXPENSE_NAV_ITEMS)}
        {renderGroup("Fluxo", CASH_FLOW_NAV_ITEMS)}
        {renderGroup("Dívidas", DEBT_NAV_ITEMS)}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
