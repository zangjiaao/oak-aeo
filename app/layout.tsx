import type { Metadata, Viewport } from "next";
import { Theme } from "@astryxdesign/core/theme";
import { themes, defaultThemeSlug } from "../astryx-themes";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";

export const metadata: Metadata = {
  title: {
    default: "okdata GEO",
    template: "%s · okdata GEO",
  },
  description: "把产品事实变成可下钻的 AI 提及证据。当前是页面骨架。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        <Theme theme={themes[defaultThemeSlug]}>{children}</Theme>
      </body>
    </html>
  );
}
