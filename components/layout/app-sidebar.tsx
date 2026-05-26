"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GaugeIcon, HandCoinsIcon, ListChecksIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/debts", label: "Dívidas", icon: HandCoinsIcon },
  { href: "/decision", label: "Decisão", icon: ListChecksIcon },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <p className="text-sm font-semibold tracking-wide text-sidebar-foreground">Cockpit</p>
        <p className="text-xs text-sidebar-foreground/65">Controle e decisão sobre dívidas</p>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

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
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
