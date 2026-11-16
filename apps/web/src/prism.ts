// Prism 在加载时默认会等 DOMContentLoaded 后自动扫描并改写整页的代码块，那会和 React 的水合抢同一批节点。打包进来的 Prism 读不到 <script data-manual>，只能在它加载之前先放一个带 manual 的全局对象，所以这个文件必须先于 prismjs 被导入。
// 只在核心还没加载时放：静态渲染把 prismjs 当外部包导入，它会先于本文件的语句执行并把自己挂到全局；这时再覆盖成占位对象，随后加载的语法文件就找不到 `Prism.languages`。
const scope = globalThis as { Prism?: { manual?: boolean } };
scope.Prism ??= { manual: true };
