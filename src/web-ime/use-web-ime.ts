import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../theme";
import { useToast } from "../ui";
import { useLocale } from "../use-locale";
import type { WebImeController, WebImeHelpcode, WebImeScheme, WebImeStatus } from "./engine";
import { isImeField } from "./fields";
import { createKeyBuffer } from "./key-buffer";

export type { WebImeHelpcode, WebImeScheme, WebImeStatus };

type ShuangpinLayout = Extract<WebImeScheme, "xiaohe" | "ziranma" | "shoudao" | "microsoft">;
type HelpcodeName = NonNullable<WebImeHelpcode>;

export const SHUANGPIN_LAYOUTS: readonly ShuangpinLayout[] = ["xiaohe", "ziranma", "shoudao", "microsoft"];

/** 菜单格子里的短名。 */
export const WEB_IME_LABELS: Record<WebImeScheme, string> = {
  quanpin: "全拼",
  xiaohe: "小鹤",
  ziranma: "自然码",
  shoudao: "首道",
  microsoft: "微软",
  wubi86: "五笔",
};

/** 提示里用的全名。 */
const WEB_IME_NAMES: Record<WebImeScheme, string> = {
  quanpin: "全拼",
  xiaohe: "小鹤双拼",
  ziranma: "自然码双拼",
  shoudao: "首道双拼",
  microsoft: "微软双拼",
  wubi86: "五笔 86",
};

/** SDK 的 `HELPCODES`，顺序相同。这里另写一份是因为 SDK 的入口在按需加载的 chunk 里，顶栏菜单不该为了几个名字把它拉进主包。 */
export const HELPCODE_SCHEMES: readonly HelpcodeName[] = ["lantian", "ziranma", "shouyou2_0", "shouyouplus", "xiaohe", "jiajia"];

export const HELPCODE_LABELS: Record<HelpcodeName, string> = {
  lantian: "蓝天",
  ziranma: "自然码",
  shouyou2_0: "首右 2.0",
  shouyouplus: "首右 plus",
  xiaohe: "小鹤",
  jiajia: "加加",
};

const HELPCODE_NAMES: Record<HelpcodeName, string> = {
  lantian: "蓝天小雨点",
  ziranma: "自然码辅助码",
  shouyou2_0: "首右 2.0",
  shouyouplus: "首右 plus",
  xiaohe: "小鹤形码",
  jiajia: "加加辅助码",
};

export const isShuangpin = (scheme: WebImeScheme | null): scheme is ShuangpinLayout => SHUANGPIN_LAYOUTS.includes(scheme as ShuangpinLayout);
/** 辅助码只对全拼和双拼起作用。 */
export const takesHelpcode = (scheme: WebImeScheme | null) => scheme === "quanpin" || isShuangpin(scheme);

/** 在文本框里按它切到下一个方案。借用 Rime 呼出方案选单的 Ctrl+`，浏览器和系统都没占用它。 */
export const WEB_IME_SWITCH_KEY = "Ctrl+`";
const isSwitchKey = (event: KeyboardEvent) => event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.code === "Backquote";

const STORAGE_KEY = "msime-web-ime";
/** 最近用的双拼布局：从全拼或五笔切回「双拼」时回到它。 */
const SHUANGPIN_KEY = "msime-web-ime-shuangpin";
/** 辅助码方案，没有这一项就是关闭。 */
const HELPCODE_KEY = "msime-web-ime-helpcode";
/** 第一次就绪时提示过怎么切换方案，之后不再提示。 */
const HINT_KEY = "msime-web-ime-hinted";
/** 官网默认用水杉的网页输入法：没选过的访客也是全拼。 */
const DEFAULT_SCHEME: WebImeScheme = "quanpin";
const DEFAULT_SHUANGPIN: ShuangpinLayout = "xiaohe";
/** 选了「关闭」要记下来，否则下次又回到默认的全拼。 */
const OFF = "off";
/** The same query as the header button's `any-pointer-fine:` variant. */
const FINE_POINTER = "(any-pointer: fine)";

const SCHEMES = new Set<string>(["quanpin", ...SHUANGPIN_LAYOUTS, "wubi86"]);
const isScheme = (value: unknown): value is WebImeScheme => SCHEMES.has(value as string);
const isHelpcode = (value: unknown): value is HelpcodeName => HELPCODE_SCHEMES.includes(value as HelpcodeName);

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 无痕模式等存不了时，只在这一页生效。
  }
};

const readScheme = (): WebImeScheme | null => {
  const stored = read(STORAGE_KEY);
  return stored === OFF ? null : isScheme(stored) ? stored : DEFAULT_SCHEME;
};

const readShuangpin = (): ShuangpinLayout => {
  const stored = read(SHUANGPIN_KEY);
  return isShuangpin(stored as WebImeScheme) ? (stored as ShuangpinLayout) : DEFAULT_SHUANGPIN;
};

const readHelpcode = (): WebImeHelpcode => {
  const stored = read(HELPCODE_KEY);
  return isHelpcode(stored) ? stored : null;
};

/** 这个浏览器第一次用上网页输入法：记下来并返回 true。存不了时（无痕模式等）每个页面提示一次也无妨。 */
const firstUse = () => {
  if (read(HINT_KEY)) return false;
  write(HINT_KEY, "1");
  return true;
};

/** Ctrl+` 按方案类别轮换：全拼、双拼（最近用的布局）、五笔，再回到全拼。 */
const nextScheme = (scheme: WebImeScheme, shuangpin: ShuangpinLayout): WebImeScheme =>
  scheme === "quanpin" ? shuangpin : isShuangpin(scheme) ? "wubi86" : "quanpin";

/**
 * 顶栏「网页输入法」开关的状态：选中的方案（null 是关闭）、最近用的双拼布局、辅助码和引擎的加载状态。
 *
 * 官网默认开着（全拼），选择记在 localStorage，全站每一页都生效。引擎有十几 MB 资源和上百 MB 内存，所以默认开着也只在用得上时加载：第一次点进文本框，或者在菜单里选方案时。首页、下载页这些没有文本框的页面什么都不下载。SDK 在单独的 chunk 里按需 import，资源第一次下载后由浏览器缓存；加载期间打的字由 key-buffer.ts 接住，就绪后重放。站内换页不重新加载页面，引擎每个标签页只起一次。
 *
 * 辅助码默认关闭，打开后在全拼和各种双拼之间保留；切到五笔时不起作用，切回来照旧。
 */
export function useWebIme() {
  const { isLight } = useTheme();
  const { t } = useLocale();
  const { show } = useToast();
  const [scheme, setScheme] = useState<WebImeScheme | null>(null);
  const [shuangpin, setShuangpin] = useState<ShuangpinLayout>(DEFAULT_SHUANGPIN);
  const [helpcode, setHelpcode] = useState<WebImeHelpcode>(null);
  const [status, setStatusState] = useState<WebImeStatus | null>(null);
  // 引擎该不该加载：开着的输入法要等到第一次点进文本框（或在菜单里选方案）才加载。
  const [active, setActive] = useState(false);
  // 每次在菜单里选方案加一：加载失败后再选同一个方案就是重试，方案没变也要让下面的 effect 重跑。
  const [attempt, setAttempt] = useState(0);
  const controller = useRef<WebImeController | null>(null);
  const dark = useRef(!isLight);
  dark.current = !isLight;
  const helpcodeRef = useRef(helpcode);
  helpcodeRef.current = helpcode;
  const notice = useRef("");
  notice.current = t("水杉输入法还在加载，刚打的字会在就绪后接着输入");
  const schemeRef = useRef(scheme);
  schemeRef.current = scheme;
  const translate = useRef(t);
  translate.current = t;
  // 加载期间接住打进文本框的键（见 key-buffer.ts）；第一次接住时提示一下，免得以为键盘没反应。
  const [buffer] = useState(() => createKeyBuffer(() => show(notice.current)));

  const setStatus = useCallback(
    (next: WebImeStatus | null) => {
      setStatusState(next);
      if (next?.state === "loading") buffer.start();
      else if (next?.state === "ready") buffer.replay();
      else buffer.flush();
      // 默认开着，访客可能根本不知道这是网页里的输入法、也不知道能换方案，所以第一次用上时说一次。
      const current = schemeRef.current;
      if (next?.state === "ready" && current && firstUse())
        show(translate.current(`正在用水杉网页输入法（${WEB_IME_NAMES[current]}）· ${WEB_IME_SWITCH_KEY} 或顶栏键盘图标切换方案 · 单按 Shift 切换中英文`), 8000);
    },
    [buffer, show]
  );

  // 码表没下下来时，控制器已经退回引擎原来的设置，这里让菜单和存下的选择跟上。
  const onHelpcodeError = useCallback(
    (wanted: HelpcodeName, kept: WebImeHelpcode) => {
      setHelpcode(kept);
      write(HELPCODE_KEY, kept);
      show(translate.current(`${HELPCODE_NAMES[wanted]}的码表没能下载下来，检查网络后再选一次`));
    },
    [show]
  );

  // 静态预渲染的页面里没有 localStorage，接管后再读，免得水合时两边不一致。没有精确指针的设备（手机、平板）上顶栏不显示这个开关，软键盘也不发出引擎认得的按键，记着的选择在那里不生效。
  useEffect(() => {
    setScheme(window.matchMedia(FINE_POINTER).matches ? readScheme() : null);
    setShuangpin(readShuangpin());
    setHelpcode(readHelpcode());
  }, []);

  useEffect(() => {
    if (!scheme || active) return;
    // 从这一刻起就接住按键：加载状态要等下面的 effect 下一轮才报出来，这中间打的字不能漏到浏览器。
    const wake = () => {
      buffer.start();
      setActive(true);
    };
    if (isImeField(document.activeElement)) {
      wake();
      return;
    }
    const onFocusIn = (event: FocusEvent) => {
      if (isImeField(event.target)) wake();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [scheme, active, buffer]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 不在函数体里用，它是重试的触发条件
  useEffect(() => {
    if (!scheme || !active) return;
    if (controller.current) {
      controller.current.setScheme(scheme);
      return;
    }
    let cancelled = false;
    setStatus({ state: "loading", loaded: 0, total: 0 });
    import("./engine").then(
      ({ startWebIme }) => {
        if (!cancelled) controller.current = startWebIme(scheme, helpcodeRef.current, dark.current, setStatus, onHelpcodeError);
      },
      () => {
        if (!cancelled) setStatus({ state: "error", code: "network" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [scheme, active, attempt, setStatus, onHelpcodeError]);

  useEffect(() => {
    controller.current?.setHelpcode(helpcode);
  }, [helpcode]);

  useEffect(() => {
    if (scheme) return;
    controller.current?.stop();
    controller.current = null;
    setActive(false);
    setStatus(null);
  }, [scheme, setStatus]);

  useEffect(() => {
    controller.current?.setDark(!isLight);
  }, [isLight]);

  useEffect(
    () => () => {
      controller.current?.stop();
      controller.current = null;
      buffer.flush();
    },
    [buffer]
  );

  /** Picking a scheme (again, after an error) loads the engine right away; null turns the IME off and frees the engine. A shuangpin layout is also remembered as the one 双拼 returns to. */
  const choose = useCallback((next: WebImeScheme | null) => {
    write(STORAGE_KEY, next ?? OFF);
    setScheme(next);
    if (!next) return;
    if (isShuangpin(next)) {
      write(SHUANGPIN_KEY, next);
      setShuangpin(next);
    }
    setActive(true);
    setAttempt((count) => count + 1);
  }, []);

  const chooseHelpcode = useCallback((next: WebImeHelpcode) => {
    write(HELPCODE_KEY, next);
    setHelpcode(next);
  }, []);

  // 在文本框里按 Ctrl+` 轮换方案，不用回到顶栏。输入法关着时不接管这个键，关掉了就是不想要它。
  useEffect(() => {
    if (!scheme) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSwitchKey(event) || !isImeField(event.target)) return;
      event.preventDefault();
      const next = nextScheme(scheme, shuangpin);
      choose(next);
      show(translate.current(`已切换到${WEB_IME_NAMES[next]}`));
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [scheme, shuangpin, choose, show]);

  return { scheme, shuangpin, helpcode, status, choose, chooseHelpcode };
}
