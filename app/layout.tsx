import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
    .trim()
    .replace(/\/+$/, "");
  const appUrl = `${origin}${basePath}`;
  const title = "LinguaStep · 日英阶梯";
  const description =
    "日语与英语，一起稳步进阶。专注于日英单词、日语语法、测试与错题复习的个人学习应用。";

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: "%s · LinguaStep",
    },
    description,
    applicationName: "LinguaStep 日英阶梯",
    openGraph: {
      type: "website",
      url: appUrl,
      siteName: "LinguaStep 日英阶梯",
      title,
      description,
      locale: "zh_CN",
      images: [
        {
          url: `${appUrl}/og.png`,
          width: 1731,
          height: 909,
          alt: "LinguaStep 日英阶梯——日语与英语，一起稳步进阶",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
