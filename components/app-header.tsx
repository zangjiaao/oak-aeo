"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@astryxdesign/core/Icon";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { SparklesIcon } from "@heroicons/react/24/outline";

export function AppHeader() {
  const pathname = usePathname();
  const inGuide = pathname === "/";
  const inWork = pathname.startsWith("/work");

  return (
    <TopNav
      label="okdata GEO"
      heading={
        <TopNavHeading
          heading="okdata GEO"
          headingHref="/"
          logo={<NavIcon icon={<Icon icon={SparklesIcon} size="sm" />} />}
        />
      }
      startContent={
        <>
          <TopNavItem label="引导" href="/" isSelected={inGuide} />
          <TopNavItem label="工作台" href="/work/agent" isSelected={inWork} />
        </>
      }
      endContent={
        <Text type="supporting" color="secondary">
          okdata · 品牌工作台
        </Text>
      }
    />
  );
}
