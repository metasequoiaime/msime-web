import { useLayoutEffect, type DependencyList } from "react";
import { observeReveals } from "./reveal";

/**
 * 登记本次渲染出来的入场动画节点，换页时退订。
 *
 * 必须用 layout effect：React 把节点插进文档的那一刻样式表就把 `[data-reveal]` 定成 opacity: 0，等绘制之后的 useEffect 再来摘属性，首屏内的元素会先闪一帧空白 —— 正是 reveal 那套判定要避免的情况。
 */
export const useReveal = (deps: DependencyList = []) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖由调用方给出，表示"这批节点变了，重新登记"
  useLayoutEffect(() => observeReveals(), deps);
};
