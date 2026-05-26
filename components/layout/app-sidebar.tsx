import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/debts", label: "Dívidas" },
  { href: "/decision", label: "Decisão" },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <p className="text-sm font-semibold">Cockpit</p>
        <p className="text-xs text-sidebar-foreground/70">MVP Bloco 0</p>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link
                href={item.href}
                className="flex h-8 items-center rounded-md px-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {item.label}
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
