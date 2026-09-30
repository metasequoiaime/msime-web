
let converter: ((text: string) => string) | undefined;
let loading: Promise<void> | undefined;
/** Load the dictionary only for Traditional routes, before rendering or formatting. */
export function loadTraditional() {
  loading ??= import('opencc-js/cn2t').then(OpenCC => {
    converter = OpenCC.Converter({ from: 'cn', to: 'twp' });
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}
const overrides: Record<string, string> = {
  '问题与建议': '問題與建議', '季节皮肤': '季節配色', '提交反馈': '送出回報', '反馈已提交': '回報已提交',
  '反馈问题或提出建议': '回報問題或提出建議', '隐私说明': '隱私說明',
  '下载': '下載', '全拼': '全拼', '双拼': '雙拼', '五笔': '五筆',
  '跟随系统': '跟隨系統', '亮色': '淺色', '暗色': '深色',
};
const terms: [string, string][] = [
  ['候選窗', '候選字視窗'], ['候選視窗', '候選字視窗'], ['字號', '字級'],
  ['懸浮工具欄', '懸浮工具列'], ['螢幕鍵盤', '螢幕小鍵盤'], ['執行庫', '執行階段'],
  ['釋出', '發布'], ['安裝包', '安裝套件'], ['倉庫', '儲存庫'], ['憑據', '憑證'],
  ['回報物件', '回報對象'], ['雲候選', '雲端候選字'], ['賬號', '帳號'], ['自定義', '自訂'], ['全域性', '全域'], ['豎排', '直排'], ['畫素', '像素'],
  ['皮膚', '佈景主題'], ['當前', '目前'], ['許可權', '權限'], ['識別', '辨識'], ['快捷短語', '快捷片語'], ['反饋', '回報'], ['提交', '送出'], ['重試', '再試一次'],
  // 「提交」 as a git commit is not a form submission: undo the rule above for the contributor counts.
  [' 次送出', ' 次提交'], ['送出數', '提交數'],
];
/** Only presentation strings use this function. Do not transform user input or template option values. */
export function toTraditional(text: string): string {
  if (!/[\p{Script=Han}]/u.test(text)) return text;
  if (overrides[text]) return overrides[text];
  if (!converter) throw new Error('Traditional locale has not loaded');
  let result = converter(text);
  for (const [from, to] of terms) result = result.replaceAll(from, to);
  return result;
}
/** Translate prose without altering URLs, code examples, or Markdown link destinations. */
export function traditionalMarkdown(source: string): string {
  const tokens: string[] = [];
  const protectedSource = source.replace(/```[^\n]*\n[\s\S]*?```|`[^`\n]+`|\]\([^\n)]+\)|https?:\/\/[^\s<>]+/g, value => {
    tokens.push(value); return `ZXQPROTECTED${tokens.length - 1}QXZ`;
  });
  return toTraditional(protectedSource).replace(/ZXQPROTECTED(\d+)QXZ/g, (_, index) => tokens[Number(index)]);
}
