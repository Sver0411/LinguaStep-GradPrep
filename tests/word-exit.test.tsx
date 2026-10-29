// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MobileApp } from "../components/mobile/MobileApp";
import { AppShell } from "../components/AppShell";
import { WordsView } from "../components/views/WordsView";
import { DEFAULT_SETTINGS, EMPTY_SNAPSHOT } from "../lib/constants";
import { WORD_PAIRS } from "../data/words";
import { setAppRouter } from "../components/mobile/navigation";

const state=vi.hoisted(()=>({pathname:"/words",search:"",useLearning:()=>({} as Record<string,unknown>),replace:vi.fn(),push:vi.fn()}));
vi.mock("@/context/learning",()=>({useLearning:()=>state.useLearning()}));
vi.mock("next/navigation",()=>({usePathname:()=>state.pathname,useSearchParams:()=>new URLSearchParams(state.search),useRouter:()=>({replace:state.replace,push:state.push})}));
vi.mock("next/link",()=>({default:({href,children,scroll: _scroll,...props}:AnchorHTMLAttributes<HTMLAnchorElement> & {href:string;children:ReactNode;scroll?:boolean})=><a href={href} {...props}>{children}</a>}));
vi.mock("@/lib/speech",()=>({isSpeechSupported:()=>false,preload:vi.fn(),stopSpeech:vi.fn(),speak:vi.fn(),speakSequence:vi.fn()}));
const snapshot={...EMPTY_SNAPSHOT,wordProgress:[],dailyPlans:[],dailyRecords:[]};
const settings={...DEFAULT_SETTINGS,autoSpeak:false};
function Host({desktop=false,empty=false}:{desktop?:boolean;empty?:boolean}) {
  const [focusMode,setFocusMode]=useState(false);
  state.useLearning=()=>({allWords:empty?[]:WORD_PAIRS,snapshot,settings,ready:true,focusMode,setFocusMode,isFavorite:()=>false,toggleFavorite:vi.fn(),updateSettings:vi.fn(),rebuildTodayPlan:vi.fn()});
  return desktop ? <AppShell focusMode={focusMode} onExitFocus={()=>{window.dispatchEvent(new Event("linguastep:exit-session"));setFocusMode(false);}}><WordsView /></AppShell> : <MobileApp />;
}
beforeEach(()=>{vi.spyOn(window,"scrollTo").mockImplementation(()=>{});state.pathname="/words";state.search="";window.history.replaceState(null,"","/words");});
afterEach(()=>{cleanup();setAppRouter(null);vi.restoreAllMocks();vi.clearAllMocks();});
describe("word study exits",()=>{
  it("restores all five phone tabs after a routed study exit, even before navigation commits",async()=>{
    state.search="mobile=study&source=new&mode=combined";
    const {rerender}=render(<Host />);
    fireEvent.click(await screen.findByRole("button",{name:"退出学习"}));
    expect(state.replace).toHaveBeenCalledWith("/words");
    expect(state.push).not.toHaveBeenCalled();
    expect(screen.getByRole("navigation",{name:"移动端主导航"})).toBeTruthy();
    for(const name of ["首页","单词","语法","资料","我的"]) expect(screen.getByRole("link",{name})).toBeTruthy();
    expect(screen.getByRole("heading",{name:"红宝书 N3"})).toBeTruthy();
    // The stale URL must not hide navigation or restart the round on rerender.
    rerender(<Host />);
    expect(screen.queryByRole("button",{name:"退出学习"})).toBeNull();
    state.search="";rerender(<Host />);
    for(let round=0;round<2;round++){
      fireEvent.click(screen.getByRole("button",{name:"顺序背诵"}));
      expect(screen.queryByRole("navigation",{name:"移动端主导航"})).toBeNull();
      fireEvent.click(screen.getByRole("button",{name:"退出学习"}));
      expect(screen.getByRole("navigation",{name:"移动端主导航"})).toBeTruthy();
    }
  });
  it("keeps phone navigation available when a routed study has no matching words",async()=>{
    state.search="mobile=study&source=new&mode=combined";
    render(<Host empty />);
    await screen.findByRole("status");
    expect(screen.getByRole("navigation",{name:"移动端主导航"})).toBeTruthy();
    expect(screen.queryByRole("button",{name:"退出学习"})).toBeNull();
  });
  it("keeps the desktop round mounted when focus opens, and closes it through the shell exit",async()=>{
    render(<Host desktop />);
    fireEvent.click(screen.getByRole("button",{name:"顺序背诵"}));
    await screen.findByRole("button",{name:"退出学习"});
    fireEvent.click(screen.getByRole("button",{name:/揭示答案/}));
    expect(screen.queryByRole("button",{name:/揭示答案/})).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:/退出专注/}));
    await waitFor(()=>expect(screen.getByRole("heading",{name:"红宝书 N3"})).toBeTruthy());
    expect(screen.queryByRole("button",{name:"退出学习"})).toBeNull();
    expect(screen.getByRole("complementary",{name:"主导航"}).hasAttribute("hidden")).toBe(false);
  });
});
