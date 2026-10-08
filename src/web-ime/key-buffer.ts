import { isImeField, type ImeField } from "./fields";

type HeldKey = { key: string; code: string; shiftKey: boolean };

/**
 * 引擎还在加载时，替它接住打进文本框的键，就绪后按原样重放。
 *
 * 首次启用要下载十几 MB，慢的网络上要等十几秒。不接住的话，这段时间里打的 `fangkuang` 会原样落进文本框，接上之后才开始变成拼音，看起来就是输入法没生效。重放是在文本框上派发同样的 keydown，走的就是 SDK 处理真实按键的那条路，组字、候选栏和上屏都和就绪后才打的一样。
 *
 * 只接可打印字符（含空格）；已经接住了字时，退格删掉最后一个，回车和 Esc 也一并接住，交给引擎决定它们的意思。快捷键、系统输入法正在处理的键和空闲时的命名键照常交给浏览器。焦点换到另一个文本框时，前一个文本框接住的字作为普通文字写回去；加载失败或输入法被关掉时也这样，打的字不会丢。
 */
export function createKeyBuffer(onFirstKey: () => void) {
  let target: ImeField | null = null;
  let keys: HeldKey[] = [];
  let listening = false;

  const take = () => {
    const held = { target, keys };
    target = null;
    keys = [];
    return held;
  };

  // 和 SDK 上屏一样用 setRangeText 加 input 事件，受控的 React 输入框才会收到 onChange。
  const writeText = ({ target: field, keys: held }: { target: ImeField | null; keys: HeldKey[] }) => {
    const text = held.map((item) => item.key).filter((key) => key.length === 1).join("");
    if (!field || !text) return;
    field.setRangeText(text, field.selectionStart ?? field.value.length, field.selectionEnd ?? field.value.length, "end");
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!isImeField(event.target)) return;
    if (target && event.target !== target) writeText(take());
    const holding = keys.length > 0;
    if (event.key === "Backspace") {
      if (!holding) return;
      keys.pop();
    } else if (event.key.length === 1 || (holding && (event.key === "Enter" || event.key === "Escape"))) {
      if (!holding) onFirstKey();
      target = event.target;
      keys.push({ key: event.key, code: event.code, shiftKey: event.shiftKey });
    } else {
      return;
    }
    event.preventDefault();
  };

  const stop = () => {
    if (!listening) return;
    listening = false;
    document.removeEventListener("keydown", onKeyDown, true);
  };

  return {
    /** Starts holding keys; called whenever the engine starts loading. */
    start() {
      if (listening) return;
      listening = true;
      document.addEventListener("keydown", onKeyDown, true);
    },
    /** The engine is attached to the focused field: type the held keys into it. A field that lost focus meanwhile gets them as plain text. */
    replay() {
      stop();
      const held = take();
      if (!held.target || held.keys.length === 0) return;
      if (document.activeElement !== held.target) {
        writeText(held);
        return;
      }
      for (const item of held.keys) held.target.dispatchEvent(new KeyboardEvent("keydown", { ...item, bubbles: true, cancelable: true }));
    },
    /** Loading failed or the IME was turned off: the held keys go in as plain text. */
    flush() {
      stop();
      writeText(take());
    },
  };
}
