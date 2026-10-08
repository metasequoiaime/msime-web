import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../theme";
import { useToast } from "../ui";
import { useLocale } from "../use-locale";
import type { WebImeController, WebImeScheme, WebImeStatus } from "./engine";
import { createKeyBuffer } from "./key-buffer";

export type { WebImeScheme, WebImeStatus };

export const WEB_IME_SCHEMES: readonly WebImeScheme[] = ["quanpin", "xiaohe", "ziranma", "wubi86"];

export const WEB_IME_LABELS: Record<WebImeScheme, string> = {
  quanpin: "全拼",
  xiaohe: "小鹤",
  ziranma: "自然码",
  wubi86: "五笔",
};

const STORAGE_KEY = "msime-web-ime";
/** The same query as the header button's `any-pointer-fine:` variant. */
const FINE_POINTER = "(any-pointer: fine)";

const isScheme = (value: unknown): value is WebImeScheme => WEB_IME_SCHEMES.includes(value as WebImeScheme);

const readStored = (): WebImeScheme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isScheme(stored) ? stored : null;
  } catch {
    return null;
  }
};

const store = (scheme: WebImeScheme | null) => {
  try {
    if (scheme) localStorage.setItem(STORAGE_KEY, scheme);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 无痕模式等存不了时，只在这一页生效。
  }
};

/**
 * 顶栏「网页输入法」开关的状态：选中的方案（null 是关闭）和引擎的加载状态。
 *
 * 选择记在 localStorage，全站每一页都生效。引擎有十几 MB 资源和上百 MB 内存，只有开着时才加载：SDK 在单独的 chunk 里按需 import，资源第一次下载后由浏览器缓存。开着的话页面一接管就加载，不等第一次点进文本框——那样的话，加载那一两秒里打的字会原样落进文本框，接上之后才变成拼音。站内换页不重新加载页面，引擎每个标签页只起一次。
 */
export function useWebIme() {
  const { isLight } = useTheme();
  const { t } = useLocale();
  const { show } = useToast();
  const [scheme, setScheme] = useState<WebImeScheme | null>(null);
  const [status, setStatusState] = useState<WebImeStatus | null>(null);
  // 每次在菜单里选方案加一：加载失败后再选同一个方案就是重试，方案没变也要让下面的 effect 重跑。
  const [attempt, setAttempt] = useState(0);
  const controller = useRef<WebImeController | null>(null);
  const dark = useRef(!isLight);
  dark.current = !isLight;
  const notice = useRef("");
  notice.current = t("水杉输入法还在加载，刚打的字会在就绪后接着输入");
  // 加载期间接住打进文本框的键（见 key-buffer.ts）；第一次接住时提示一下，免得以为键盘没反应。
  const [buffer] = useState(() => createKeyBuffer(() => show(notice.current)));

  const setStatus = useCallback(
    (next: WebImeStatus | null) => {
      setStatusState(next);
      if (next?.state === "loading") buffer.start();
      else if (next?.state === "ready") buffer.replay();
      else buffer.flush();
    },
    [buffer]
  );

  // 静态预渲染的页面里没有 localStorage，接管后再读，免得水合时两边不一致。没有精确指针的设备（手机、平板）上顶栏不显示这个开关，软键盘也不发出引擎认得的按键，记着的选择在那里不生效。
  useEffect(() => setScheme(window.matchMedia(FINE_POINTER).matches ? readStored() : null), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 不在函数体里用，它是重试的触发条件
  useEffect(() => {
    if (!scheme) return;
    if (controller.current) {
      controller.current.setScheme(scheme);
      return;
    }
    let cancelled = false;
    setStatus({ state: "loading", loaded: 0, total: 0 });
    import("./engine").then(
      ({ startWebIme }) => {
        if (!cancelled) controller.current = startWebIme(scheme, dark.current, setStatus);
      },
      () => {
        if (!cancelled) setStatus({ state: "error", code: "network" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [scheme, attempt, setStatus]);

  useEffect(() => {
    if (scheme) return;
    controller.current?.stop();
    controller.current = null;
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

  /** Picking a scheme (again, after an error) loads the engine right away; null turns the IME off and frees the engine. */
  const choose = useCallback((next: WebImeScheme | null) => {
    store(next);
    setScheme(next);
    if (next) setAttempt((count) => count + 1);
  }, []);

  return { scheme, status, choose };
}
