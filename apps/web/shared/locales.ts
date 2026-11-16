/** All public product pages share layout and behavior across these locales. */
export const traditionalPages = {
  '/': { title: '水杉輸入法 MSIME｜開源中文輸入法', description: '水杉輸入法（MSIME）是開源中文輸入法，面向 Windows、macOS、Linux、Android、iOS 與 HarmonyOS 開發，也能嵌入網頁使用，支援全拼、雙拼、五筆，候選字旁直接顯示譯文；輸入引擎也以函式庫形式開放給其他輸入法嵌入。' },
  '/features/': { title: '功能與介面｜水杉輸入法', description: '以 Windows 版為例，了解水杉輸入法的候選字視窗、輔助碼、佈景主題與詞庫設定。' },
  '/download/': { title: '下載與安裝｜水杉輸入法', description: '下載水杉輸入法 Windows、macOS 與 Linux 版本，或透過 TestFlight 安裝 iOS 版。網站開發者可以透過 npm 套件把 Web 版嵌入自己的網頁。' },
  '/faq/': { title: '常見問題與疑難排解｜水杉輸入法', description: '水杉輸入法常見問題：字型方框、安裝與啟動、快捷鍵、候選字和連線功能的排查方式。' },
  '/feedback/': { title: '回報問題與提出建議｜水杉輸入法', description: '了解如何回報水杉輸入法問題或提出功能建議。可使用繁體中文描述，提交內容會公開刊登於 GitHub。' },
  '/words/': { title: '提交詞條｜水杉輸入法', description: '無需 GitHub 帳號，為水杉輸入法詞庫提交新詞與拼音、英文單字或候選譯文。詞條經維護者審核後，隨後續詞庫版本發布到所有平台。' },
  '/skins/': { title: '社群佈景主題｜水杉輸入法', description: '瀏覽水杉輸入法使用者公開發布的鍵盤佈景主題與候選字視窗佈景主題，依名稱搜尋，查看配色預覽、下載次數與評分。無需登入即可下載電腦候選字視窗佈景主題包；鍵盤佈景主題在水杉輸入法中下載套用。' },
  '/gallery/': { title: '水杉娘畫廊 Gallery｜水杉輸入法', description: '認識水杉娘，瀏覽姿勢、表情、服裝與場景插畫，收藏春夏秋冬的不同模樣。支援依分類與名稱尋找、點擊查看大圖。' },
  '/dictionaries/': { title: '詞庫與回覆範本｜水杉輸入法', description: '瀏覽水杉輸入法的專業詞庫，以及使用者分享的詞庫與回覆範本，依名稱搜尋，查看詞條範例、收藏數與評分。專業詞庫可以直接下載匯入；社群內容登入後可以收藏、評分，在水杉輸入法的「社群」頁使用。' },
  '/plugins/': { title: '外掛｜水杉輸入法', description: '瀏覽水杉輸入法的官方外掛與使用者發布的外掛：音效包、音樂包、指令表與特效包，查看版本、授權、下載次數與評分。官方外掛可以直接下載 .zip 匯入；社群外掛登入後可以收藏、評分，在水杉輸入法的「社群」頁下載安裝。' },
  '/me/': { title: '我的｜水杉輸入法', description: '管理水杉輸入法帳號：我的佈景主題、個人詞庫、快捷片語、雲端剪貼簿與收藏。', noindex: true },
  '/about/': { title: '關於專案與開發者｜水杉輸入法', description: '認識水杉輸入法的名稱由來、專案理念、開源授權、簽章與社群聯絡方式。' },
  '/code/': { title: '原始碼與參與開發｜水杉輸入法', description: '瀏覽各平台、輸入引擎、詞庫、語言模型及文件的原始碼，了解如何參與開發。' },
  '/model/': { title: '神經聯想與整句重排模型｜水杉輸入法', description: '神經聯想以 4.5 MB 起的字級語言模型，在輸入引擎拼出的幾種整句讀法中，參照已經上屏的文字挑出更通順的一句。查看實測效果與代價、在水杉輸入法中啟用的方式、它與引擎庫的關係，以及供其他輸入法使用的開源函式庫與模型。' },
  '/engine/': { title: '引擎庫：可嵌入的拼音與多語言輸入引擎｜水杉輸入法', description: '水杉輸入法的輸入引擎單獨發布成函式庫，供其他輸入法嵌入：Rust 使用 crates.io 上的 msime-engine，C、C++、Swift、Kotlin、Go、Python 等使用預先編譯的 C 函式庫。十種輸入方案、詞格整句、拼寫糾錯與學習，可選神經聯想重排整句；程式碼採 MPL-2.0 授權，資料依各自的授權條款。' },
  '/price/': { title: '價格與付費計畫｜水杉輸入法', description: '水杉輸入法目前可免費使用，查看後續自願付費支持計畫與第三方服務費用說明。' },
  '/privacy/': { title: '隱私政策｜水杉輸入法', description: '了解本機資料、雲端候選字、語音等連線功能的資料流程，以及關閉方式。' },
  '/terms/': { title: '使用者協議｜水杉輸入法', description: '水杉輸入法帳號、雲端同步、社群與官網等線上服務的使用者協議：帳號與註銷、行為規範、使用者發布的內容、開源授權與第三方服務。' },
  '/docs/': { title: '使用指南｜水杉輸入法', description: '選擇 Windows、macOS、Linux、Android 或 iOS 使用指南，查看安裝、設定與疑難排解。' },
  '/docs/windows/': { title: 'Windows 安裝與使用指南｜水杉輸入法', description: 'Windows 版水杉輸入法完整使用指南：安裝、輸入方案、設定、詞庫與疑難排解。' },
  '/docs/macos/': { title: 'macOS 安裝與使用指南｜水杉輸入法', description: 'macOS 版水杉輸入法使用指南：安裝、鍵盤輸入、設定、備份與更新。' },
  '/docs/macos-voice/': { title: 'macOS 語音輸入指南｜水杉輸入法', description: '設定 macOS 語音輸入的雲端辨識、本機模型與系統辨識，了解錄音按鍵、文字潤飾和隱私。' },
  '/docs/linux/': { title: 'Linux 安裝與使用指南｜水杉輸入法', description: 'Linux 版水杉輸入法指南：安裝與首次設定、Fcitx5 與 IBus 啟用、輸入功能、資料與疑難排解。' },
  '/docs/android/': { title: 'Android 安裝與使用指南｜水杉輸入法', description: 'Android 版水杉輸入法指南：下載與各版本、啟用鍵盤、升級、中英文切換、9 鍵與 26 鍵、浮動鍵盤、外接鍵盤與語音輸入。' },
  '/docs/ios/': { title: 'iOS 安裝與使用指南｜水杉輸入法', description: 'iOS 版水杉輸入法指南：TestFlight 安裝與更新、啟用鍵盤、輸入方案與輔助碼、佈景主題與鍵盤、詞庫匯入、完全取用與回報。' },
} as const;
export const TW_PREFIX = '/zh-TW';
export const isTraditional = (path: string) => path === TW_PREFIX || path.startsWith(`${TW_PREFIX}/`);
export const baseLocalePath = (path: string) => isTraditional(path) ? path.slice(TW_PREFIX.length) || '/' : path;
export const traditionalPath = (path: string) => `${TW_PREFIX}${path}`;
export const languageAlternates = (path: string) => {
  const source = baseLocalePath(path);
  const base = source === "/docs/" ? "/docs/windows/" : source;
  return base in traditionalPages || base === '/docs/$guide/' ? [
    { lang: 'zh-Hans', path: base },
    { lang: 'zh-Hant-TW', path: traditionalPath(base) },
    { lang: 'x-default', path: base },
  ] : [];
};

/** Preserve query/fragment and leave external URLs, downloads and API paths alone. */
export function localeHref(url: string, currentPath: string): string {
  if (!isTraditional(currentPath)) return url;
  const local = url.startsWith('https://msime.app/') ? url.slice('https://msime.app'.length) : url;
  if (!local.startsWith('/') || local.startsWith('//') || isTraditional(local)) return url;
  const match = /^([^?#]*)(.*)$/.exec(local);
  if (!match) return url;
  const base = match[1].endsWith('/') ? match[1] : `${match[1]}/`;
  return base in traditionalPages || base === '/docs/$guide/' ? `${traditionalPath(base)}${match[2]}` : url;
}
