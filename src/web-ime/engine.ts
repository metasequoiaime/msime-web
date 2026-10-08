import { attachInput, createMsimeEngine, version, type MsimeEngine, type MsimeErrorCode, type MsimeHelpcode } from "@msime/web-engine";
import { isImeField, type ImeField } from "./fields";

/** The schemes the header menu offers. Japanese and Korean are left out: the site is Chinese, and their assets are not copied (scripts/copy-web-engine.mjs). */
export type WebImeScheme = "quanpin" | "xiaohe" | "ziranma" | "shoudao" | "microsoft" | "wubi86";

/** 辅助码方案，null 是关闭。只对全拼和双拼起作用。 */
export type WebImeHelpcode = MsimeHelpcode | null;

export type WebImeStatus = { state: "loading"; loaded: number; total: number } | { state: "ready" } | { state: "error"; code: MsimeErrorCode };

export type WebImeController = {
  setScheme: (scheme: WebImeScheme) => void;
  setHelpcode: (helpcode: WebImeHelpcode) => void;
  setDark: (dark: boolean) => void;
  stop: () => void;
};

/** scripts/copy-web-engine.mjs publishes the wasm and dictionaries under the package version, so this always matches the SDK bundled here. */
const ASSET_BASE = `/msime/${version}/assets/`;
/** The desktop settings preview's platform look, light or dark with the site theme. */
const SKIN = "system";
/** Full pinyin and the four shuangpin schemes share one dictionary and switch in place, keeping the helpcode setting; wubi needs an engine of its own. */
const PINYIN = new Set<string>(["quanpin", "xiaohe", "ziranma", "shoudao", "microsoft"]);

/**
 * 全站网页输入法：在浏览器里起一个水杉引擎，接到当前获得焦点的文本框上，焦点移到别的文本框时改接过去。
 *
 * 同一时刻只接一个文本框，候选栏也只有一个。换方案、换深浅色都先解除绑定再接回去，正在组的字随之放弃（SDK 换皮肤的做法也是这样）。换方案的请求串行处理，每一轮都对齐到最新选中的方案，连点几个方案也只会留下最后一个引擎。
 *
 * 辅助码在引擎起来之后用 `setHelpcode` 打开，不随 `createMsimeEngine` 一起：码表下载失败时 SDK 只让这一次调用失败，引擎照常可用；随引擎一起下载的话，一张几十 KB 的表没下下来就会让整个输入法起不来。失败时退回引擎当前的设置，并经 `onHelpcodeError` 告诉页面。
 */
export function startWebIme(
  initialScheme: WebImeScheme,
  initialHelpcode: WebImeHelpcode,
  initialDark: boolean,
  onStatus: (status: WebImeStatus) => void,
  onHelpcodeError: (wanted: MsimeHelpcode, kept: WebImeHelpcode) => void
): WebImeController {
  let scheme = initialScheme;
  let helpcode = initialHelpcode;
  let dark = initialDark;
  let stopped = false;
  let engine: MsimeEngine | null = null;
  let field: ImeField | null = null;
  let detach: (() => void) | null = null;
  let queue = Promise.resolve();

  const release = () => {
    detach?.();
    detach = null;
    field = null;
  };

  const attach = (target: ImeField) => {
    release();
    if (!engine) return;
    field = target;
    detach = attachInput(target, engine, { skin: SKIN, dark });
  };

  const drop = () => {
    release();
    engine?.dispose();
    engine = null;
  };

  const reconcile = async () => {
    while (!stopped) {
      if (engine?.scheme === scheme) {
        // 五笔引擎上 setHelpcode 什么也不做，它的辅助码永远是 null，不用对齐。
        if (!PINYIN.has(engine.scheme) || engine.helpcode === helpcode) break;
        const wanted = helpcode;
        try {
          await engine.setHelpcode(wanted);
        } catch {
          // 码表没下下来：引擎还是原来的设置，下面把页面的设置也退回去。
        }
        if (helpcode === wanted && engine && engine.helpcode !== wanted) {
          helpcode = engine.helpcode;
          if (wanted) onHelpcodeError(wanted, helpcode);
        }
        continue;
      }
      release();
      const target = scheme;
      if (engine && PINYIN.has(engine.scheme) && PINYIN.has(target)) {
        await engine.setScheme(target);
        continue;
      }
      drop();
      onStatus({ state: "loading", loaded: 0, total: 0 });
      const created = await createMsimeEngine({
        scheme: target,
        assetBase: ASSET_BASE,
        onProgress: (loaded, total) => {
          if (!stopped) onStatus({ state: "loading", loaded, total });
        },
      });
      if (stopped) {
        created.dispose();
        return;
      }
      engine = created;
      // 引擎 panic 之后所有请求都会失败，只能扔掉；再选一次方案会新建一个。
      created.onError((error) => {
        if (engine !== created) return;
        drop();
        onStatus({ state: "error", code: error.code });
      });
    }
    if (stopped || !engine) return;
    // 引擎加载期间点进的文本框，就绪后直接接上，不用再点一次。先接上再报告就绪：页面收到就绪就重放加载期间接住的键，那时必须已经有人在听。
    const active = document.activeElement;
    if (isImeField(active)) attach(active);
    onStatus({ state: "ready" });
  };

  const sync = () => {
    queue = queue.then(reconcile).catch((error: { code?: MsimeErrorCode }) => {
      drop();
      if (!stopped) onStatus({ state: "error", code: error.code ?? "engine" });
    });
  };

  const onFocusIn = (event: FocusEvent) => {
    if (engine?.scheme === scheme && event.target !== field && isImeField(event.target)) attach(event.target);
  };
  document.addEventListener("focusin", onFocusIn);
  sync();

  return {
    setScheme(next) {
      scheme = next;
      sync();
    },
    setHelpcode(next) {
      helpcode = next;
      sync();
    },
    setDark(next) {
      if (next === dark) return;
      dark = next;
      if (field) attach(field);
    },
    stop() {
      stopped = true;
      document.removeEventListener("focusin", onFocusIn);
      drop();
    },
  };
}
