"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Divider } from "@astryxdesign/core/Divider";
import {
  SideNav,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import {
  BeakerIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { AppHeader } from "@/components/app-header";

const WORK = [
  { href: "/work/agent", label: "Agent", icon: ChatBubbleLeftRightIcon },
  { href: "/work/opportunities", label: "机会看板", icon: ChartBarIcon },
  { href: "/work/diagnosis", label: "诊断分析", icon: BeakerIcon },
  { href: "/work/content", label: "内容", icon: PencilSquareIcon },
] as const;

const SETTINGS = [
  { href: "/work/brand", label: "品牌设置", icon: RectangleStackIcon },
  { href: "/work/system", label: "系统设置", icon: Cog6ToothIcon },
] as const;

export function WorkShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell
      height="fill"
      contentPadding={0}
      variant="section"
      topNav={<AppHeader />}
      sideNav={
        <SideNav
          aria-label="工作台"
          collapsible
          resizable={{ defaultWidth: 248, minWidth: 200, maxWidth: 320 }}
        >
          <SideNavSection title="工作台">
            {WORK.map((item) => (
              <SideNavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                isSelected={pathname === item.href}
              />
            ))}
          </SideNavSection>
          <Divider />
          <SideNavSection title="设置">
            {SETTINGS.map((item) => (
              <SideNavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                isSelected={pathname === item.href}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }
    >
      {children}
    </AppShell>
  );
}
