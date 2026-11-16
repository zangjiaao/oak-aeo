"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Banner } from "@astryxdesign/core/Banner";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import {
  SideNav,
  SideNavHeading,
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
  SparklesIcon,
} from "@heroicons/react/24/outline";

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
      banner={
        <Banner
          status="info"
          container="section"
          title="页面骨架"
          description="数字都是示意。采样、判读和发布还没接上。每天每模型最多采集 5 次。"
        />
      }
      sideNav={
        <SideNav
          aria-label="工作台"
          collapsible
          resizable={{ defaultWidth: 248, minWidth: 200, maxWidth: 320 }}
          header={
            <SideNavHeading
              heading="okdata GEO"
              headingHref="/work/agent"
              icon={<NavIcon icon={<Icon icon={SparklesIcon} size="sm" />} />}
            />
          }
          footer={
            <SideNavSection title="引导" isHeaderHidden>
              <SideNavItem label="返回引导对话" href="/" />
              <SideNavItem label="今日配额 0/5" isDisabled />
            </SideNavSection>
          }
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
