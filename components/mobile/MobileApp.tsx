"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { BookOpenText, Home, SquarePen, UserRound } from "lucide-react";
import { setAppRouter } from "./navigation";
import { MobileFavorites } from "./screens/FavoritesScreen";
import { MobileGrammarHub } from "./screens/GrammarScreen";
import { MobileHomeScreen } from "./screens/HomeScreen";
import { MobileMistakes } from "./screens/MistakesScreen";
import { MobilePracticeScreen } from "./screens/PracticeScreen";
import { MobileProfileScreen } from "./screens/ProfileScreen";
import { MobileQuiz } from "./screens/QuizScreen";
import { MobileResourceDetail, MobileResourcesScreen } from "./screens/ResourcesScreen";
import { MobileSettings } from "./screens/SettingsScreen";
import { MobileStats } from "./screens/StatsScreen";
import { MobileTestSetup } from "./screens/TestSetupScreen";
import { MobileWordLibrary } from "./screens/WordLibraryScreen";
import { MobileWordStudy } from "./screens/WordStudyScreen";

const TAB_ITEMS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/test", label: "练习", icon: SquarePen },
  { href: "/resources", label: "资料", icon: BookOpenText },
  { href: "/profile", label: "我的", icon: UserRound },
] as const;

function MobileTabBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  // A study round owns the whole screen (its rating row sits at the bottom), so
  // the bar steps aside while one is running.
  if (params?.get("mobile") === "study") return null;
  return (
      <nav className="m2-tabbar" aria-label="移动端主导航">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className={`m2-tabbar-item${active ? " active" : ""}`} href={item.href} key={item.href}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
  );
}

export function MobileApp() {
  return (
    <div className="m2-app">
      <Suspense fallback={null}>
        <MobileExperience />
      </Suspense>
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}

function MobileExperience() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    setAppRouter(router);
  }, [router]);
  const section = pathname.split("/").filter(Boolean)[0] ?? "home";
  const params = searchParams ?? new URLSearchParams();
  if (section === "home") return <MobileHomeScreen />;
  if (section === "words") return params.get("mobile") === "study" ? <MobileWordStudy params={params} /> : <MobileWordLibrary />;
  if (section === "grammar") return <MobileGrammarHub params={params} />;
  if (section === "mistakes") return <MobileMistakes params={params} />;
  if (section === "test") return params.get("mobile") === "setup" ? <MobileTestSetup /> : params.get("mobile") === "quiz" ? <MobileQuiz params={params} /> : <MobilePracticeScreen />;
  if (section === "resources") return params.get("mobile") === "topic" ? <MobileResourceDetail topicId={params.get("topic")} /> : <MobileResourcesScreen />;
  if (section === "profile") return <MobileProfileScreen />;
  if (section === "stats") return <MobileStats />;
  if (section === "settings") return <MobileSettings />;
  if (section === "favorites") return <MobileFavorites />;
  return <MobileHomeScreen />;
}
