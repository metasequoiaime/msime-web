// Prism 在加载时默认会等 DOMContentLoaded 后自动扫描并改写整页的代码块，那会和 React 的水合抢同一批节点。打包进来的 Prism 读不到 <script data-manual>，只能在它加载之前先放一个带 manual 的全局对象，所以这个文件必须先于 prismjs 被导入。
(globalThis as { Prism?: { manual?: boolean } }).Prism = { manual: true };
