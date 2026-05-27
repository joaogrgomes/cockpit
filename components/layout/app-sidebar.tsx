"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  GaugeIcon,
  HandCoinsIcon,
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
];

const DEBT_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon, exact: true },
  { href: "/debts", label: "Lista de dívidas", icon: HandCoinsIcon },
  { href: "/decision", label: "Decisão", icon: ListChecksIcon },
];

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
          Controle de dívidas e gastos
        </p>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {renderGroup("Gastos", EXPENSE_NAV_ITEMS)}
        {renderGroup("Dívidas", DEBT_NAV_ITEMS)}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
