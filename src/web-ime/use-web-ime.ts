import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../theme";
import { useToast } from "../ui";
import { useLocale } from "../use-locale";
import type { WebImeController, WebImeScheme, WebImeStatus } from "./engine";
import { isImeField } from "./fields";
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
/** 官网默认用水杉的网页输入法：没选过的访客也是全拼。 */
const DEFAULT_SCHEME: WebImeScheme = "quanpin";
/** 选了「关闭」要记下来，否则下次又回到默认的全拼。 */
const OFF = "off";
/** The same query as the header button's `any-pointer-fine:` variant. */
const FINE_POINTER = "(any-pointer: fine)";

const isScheme = (value: unknown): value is WebImeScheme => WEB_IME_SCHEMES.includes(value as WebImeScheme);

const readStored = (): WebImeScheme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === OFF ? null : isScheme(stored) ? stored : DEFAULT_SCHEME;
  } catch {
    return DEFAULT_SCHEME;
  }
};

const store = (scheme: WebImeScheme | null) => {
  try {
    localStorage.setItem(STORAGE_KEY, scheme ?? OFF);
  } catch {
    // 无痕模式等存不了时，只在这一页生效。
  }
};

/**
 * 顶栏「网页输入法」开关的状态：选中的方案（null 是关闭）和引擎的加载状态。
 *
 * 官网默认开着（全拼），选择记在 localStorage，全站每一页都生效。引擎有十几 MB 资源和上百 MB 内存，所以默认开着也只在用得上时加载：第一次点进文本框，或者在菜单里选方案时。首页、下载页这些没有文本框的页面什么都不下载。SDK 在单独的 chunk 里按需 import，资源第一次下载后由浏览器缓存；加载期间打的字由 key-buffer.ts 接住，就绪后重放。站内换页不重新加载页面，引擎每个标签页只起一次。
 */
export function useWebIme() {
  const { isLight } = useTheme();
  const { t } = useLocale();
  const { show } = useToast();
  const [scheme, setScheme] = useState<WebImeScheme | null>(null);
  const [status, setStatusState] = useState<WebImeStatus | null>(null);
  // 引擎该不该加载：开着的输入法要等到第一次点进文本框（或在菜单里选方案）才加载。
  const [active, setActive] = useState(false);
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
        if (!cancelled) controller.current = startWebIme(scheme, dark.current, setStatus);
      },
      () => {
        if (!cancelled) setStatus({ state: "error", code: "network" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [scheme, active, attempt, setStatus]);

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

  /** Picking a scheme (again, after an error) loads the engine right away; null turns the IME off and frees the engine. */
  const choose = useCallback((next: WebImeScheme | null) => {
    store(next);
    setScheme(next);
    if (!next) return;
    setActive(true);
    setAttempt((count) => count + 1);
  }, []);

  return { scheme, status, choose };
}
