// 首屏之下才算入场动画的判定线。与观察器的 rootMargin 是同一条线，两边必须用同一个数：只在 fold 之上摘掉 data-reveal，观察器却把 fold 上方的元素也算作已相交，那条缝里的元素会先以 opacity: 0 画出来再淡入，正好是要避免的首屏闪动。
const FOLD_OFFSET_PERCENT = 8;

const revealObserver = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-revealed");
      revealObserver?.unobserve(entry.target);
    }
  },
  // threshold 保持 0：文档正文是一整张很高的卡片，按比例判定时它永远达不到阈值
  { rootMargin: `0px 0px -${FOLD_OFFSET_PERCENT}% 0px`, threshold: 0 }
);

/**
 * 登记入场动画。只有需要滚动才看得到的部分才做动画 —— 否则每次换页整屏都要重新淡入一遍，看起来就是闪屏。markdown 渲染出来的节点在插入之后再调一次。
 *
 * 首屏内的元素直接摘掉 data-reveal，而不是补 is-revealed：量 rect 会强制一次样式计算，把 opacity: 0 定下来，之后再加类就真的会跑一遍过渡。摘属性会连隐藏样式带 transition 声明一起失配，元素直接回到不透明状态，不会有过渡。
 */
export const observeReveals = (root: ParentNode = document) => {
  const foldLine = window.innerHeight * (1 - FOLD_OFFSET_PERCENT / 100);
  const observed: Element[] = [];

  root.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((element) => {
    if (element.getBoundingClientRect().top < foldLine) {
      element.removeAttribute("data-reveal");
      return;
    }

    revealObserver?.observe(element);
    observed.push(element);
  });

  // The stylesheet only hides [data-reveal] under `has-reveal`, and the mark goes on here rather than at module load: this runs in a layout effect after hydration, once everything above the fold has already lost its attribute. Marking earlier (the module is evaluated while the lazy route chunk loads, before hydrateRoot) would blank the prerendered first screen for the frames in between, and measuring after marking would read positions shifted by the hidden state's transform.
  if (revealObserver) document.documentElement.classList.add("has-reveal");

  // 换页时把还没进过视口的节点退订。观察器对目标是强引用，客户端路由下这些节点已经从文档里摘掉了，不退订就再也不会有人放开它们。
  return () => {
    for (const element of observed) revealObserver?.unobserve(element);
  };
};
