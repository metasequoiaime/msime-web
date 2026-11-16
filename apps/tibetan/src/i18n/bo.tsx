import type { Messages } from "./types";

// Tibetan copy. Chinese appears only as product names (水杉藏文, 水杉输入法) and as the app's own Chinese UI labels, each followed by a Tibetan gloss; scripts/seo-output.test.mjs keeps it that way.
export const bo: Messages = {
  languageName: "བོད་ཡིག",
  switchLabel: "བོད་ཡིག་ཏུ་ལྟ།",
  skipToContent: "ནང་དོན་ལ་མཆོང་།",
  nav: { label: "ཤོག་ངོས།", home: "མ་ངོས།", download: "ཕབ་ལེན།", guide: "ལམ་སྟོན།", faq: "དྲི་བ།" },
  theme: { label: "ཁ་དོག", light: "དཀར་པོ།", dark: "ནག་པོ།", system: "མ་ལག་ལྟར།" },
  footer: { fullProduct: "水杉输入法 · msime.app", source: "GitHub", feedback: "བསམ་འཆར།", privacy: "སྒེར་དོན་སྲུང་སྐྱོབ།", terms: "སྤྱོད་མཁན་གྱི་གན་རྒྱ།" },
  home: {
    eyebrow: "水杉藏文 · MSIME Tibetan",
    title: "ལ་ཏིན་མཐེབ་གཞོང་ནས་བོད་ཡིག་འབྲི།",
    lead: (
      <>
        水杉藏文 ནི་བོད་ཡིག་ཁོ་ན་འབྲི་བའི་ཡིག་འཇུག་ཅིག་ཡིན། EWTS (Wylie) ལྟར་ལ་ཏིན་ཡི་གེ་རྡེབ་ན་ཐད་ཀར་བོད་ཡིག་ཏུ་འགྱུར། macOS དང་ Linux། Android། Windows ཚོད་ལྟའི་པར་གཞི་བཅས་སུ་སྤྱོད་ཆོག
      </>
    ),
    download: "ཕབ་ལེན།",
    guide: "སྤྱོད་ཐབས་ལྟ།",
    demoTitle: "དཔེར་ན།",
    demoKeys: "རྡེབ་པ།",
    demoResult: "ཐོན་འབྲས།",
    featuresTitle: "ཁྱད་ཆོས།",
    features: [
      { title: "EWTS ལྟར་འབྲི།", body: "ལ་ཏིན་ཡི་གེ་རྡེབ་བཞིན་པའི་སྐབས་སུ་བོད་ཡིག་མཐོང་། ཡིག་ཆེ་དང་ཡིག་ཆུང་ལ་དབྱེ་བ་ཡོད།" },
      {
        title: "ཚེག་དང་ཤད།",
        body: (
          <>
            བར་སྟོང་མཐེབ་ཀྱིས་ཚེག་བར་མཇུག་སྒྲིལ་ནས་ཚེག (<code>་</code>) སྣོན། <code>/</code> ཡིས་ཤད (<code>།</code>) སྣོན། <kbd>Enter</kbd> ཡིས་ཚེག་མེད་པར་འཇུག
          </>
        ),
      },
      {
        title: "བརྩེགས་ཡིག",
        body: (
          <>
            <code>+</code> ཡིས་ཡི་གེ་བརྩེགས། <code>.</code> ཡིས་ཡི་གེ་སོ་སོར་འབྱེད། <code>'</code> ཡིས་འ་ཆུང་འབྲི།
          </>
        ),
      },
      {
        title: "ལ་ཏིན་ཡི་གེར་ལོག",
        body: (
          <>
            <kbd>Esc</kbd> ཐེངས་དང་པོས་ཁྱེད་ཀྱིས་རྡེབ་པའི་ལ་ཏིན་ཡི་གེ་སྟོན། ཐེངས་གཉིས་པས་ཕྱིར་འཐེན།
          </>
        ),
      },
      { title: "ཚིག་འདེམས་མེད།", body: "ལ་ཏིན་ཡི་གེ་བོད་ཡིག་ཏུ་ཐད་ཀར་འགྱུར་བས་འདེམས་རྒྱུ་མེད། ཁྱེད་ཀྱིས་བྲིས་པ་ལས་སློབ་སྦྱོང་མི་བྱེད། ཚིག་མཛོད་ཕབ་ལེན་མི་དགོས།" },
      { title: "水杉输入法 དང་མཉམ་དུ།", body: "水杉藏文 ནི་མཉེན་ཆས་སོ་སོ་ཞིག་ཡིན། 水杉输入法 ཆ་ཚང་བ་དང་མཉམ་དུ་སྒྲིག་ཆོག ཡིག་འཇུག་དང་སྒྲིག་བཀོད། གཞི་གྲངས་སོ་སོར་ཡོད།" },
    ],
    platformsTitle: "མ་ལག",
    platforms: [
      { name: "macOS", note: "macOS 13 ཡན། Apple silicon · Intel", available: true },
      { name: "Linux", note: "x86_64 · aarch64 · Fcitx5 · IBus", available: true },
      { name: "Android", note: "Android 9 ཡན།", available: true },
      { name: "Windows", note: "ཚོད་ལྟའི་པར་གཞི། ཨང་སྒྲིག་མིང་རྟགས་མེད།", available: true },
      { name: "iOS · HarmonyOS", note: "ད་ལྟ་མེད།", available: false },
    ],
    fullTitle: "水杉输入法 ཆ་ཚང་བ།",
    fullBody: "水杉藏文 ནི་ 水杉输入法 (MSIME) ལས་ཕྱེ་བའི་པར་གཞི་ཞིག་ཡིན། རྒྱ་ཡིག་དང་ཉི་ཧོང་ཡིག ཀོ་རེ་ཡིག་སོགས་འབྲི་ཐབས་ཚང་མ་ཡོད་པའི་པར་གཞི་ཆ་ཚང་བ་ནི་ msime.app ལ་ཡོད།",
    fullLink: "msime.app ལ་འགྲོ།",
  },
  download: {
    title: "水杉藏文 ཕབ་ལེན།",
    lead: "སྒྲིག་འཇུག་ཡིག་ཆ་ཚང་མ་ GitHub ནས་ཡོང་། ཕབ་ལེན་རྗེས་ SHA-256 ཡིས་ཞིབ་བཤེར་བྱེད་རོགས།",
    version: "པར་གཞི།",
    size: "ཆེ་ཆུང་།",
    published: "འགྲེམས་དུས།",
    github: "GitHub ནས་ཕབ་ལེན།",
    mirror: "ཕབ་ལེན་ལམ་གཞན།",
    releasePage: "འགྲེམས་སྤེལ་ཤོག་ངོས།",
    macos: {
      note: "macOS 13 ཡན། Apple silicon དང་ Intel གཉིས་ཀར་སྤྱོད་ཆོག Homebrew ཡིས་ཀྱང་སྒྲིག་ཆོག",
      missing: "macOS འགྲེམས་སྤེལ་གསར་ཤོས་ནང་ 水杉藏文 ཡི་སྒྲིག་འཇུག་ཡིག་ཆ་མི་འདུག འགྲེམས་སྤེལ་ཤོག་ངོས་ལ་གཟིགས།",
    },
    linux: {
      note: "Debian 12+ / Ubuntu 22.04+ དང་ Fedora 44། Fcitx5 དང་ IBus གཉིས་ཀར་སྤྱོད་ཆོག",
      missing: "Linux འགྲེམས་སྤེལ་གསར་ཤོས་ནང་ 水杉藏文 ཡི་སྒྲིག་འཇུག་ཡིག་ཆ་མི་འདུག འགྲེམས་སྤེལ་ཤོག་ངོས་ལ་གཟིགས།",
      formats: { deb: "Debian / Ubuntu", rpm: "Fedora", "tar.gz": "Debian རིགས། apt མི་སྤྱོད་པ།" },
    },
    android: {
      note: "Android 9 ཡན། ཉོ་ཚོང་ཁང་ཕྱི་ཡི་ APK ཡིན་པས་ “Install unknown apps” ལ་ཆོག་མཆན་སྤྲོད་དགོས།",
      missing: "Android འགྲེམས་སྤེལ་གསར་ཤོས་ནང་ 水杉藏文 ཡི་ APK མི་འདུག འགྲེམས་སྤེལ་ཤོག་ངོས་ལ་གཟིགས།",
    },
    windows: {
      badge: "ཚོད་ལྟ། ཨང་སྒྲིག་མིང་རྟགས་མེད།",
      note: "msime མཛོད་ཁང་གི་ཚོད་ལྟའི་པར་གཞི་ཡིན། ཨང་སྒྲིག་མིང་རྟགས་མེད་པས་ Windows ཡིས་ཉེན་བརྡ་གཏོང་སྲིད། Windows ཡི་ 水杉输入法 ཚད་ལྡན་པར་གཞི (Metasequoia IME) ནང་བོད་ཡིག་མེད།",
      missing: (
        <>
          ཚོད་ལྟའི་པར་གཞི་གསར་ཤོས་ནང་ 水杉藏文 ཡི་སྒྲིག་འཇུག་ཡིག་ཆ་མི་འདུག msime ཡི་འགྲེམས་སྤེལ་ཐོ་ནང་ <code>windows-v</code> ཡིས་འགོ་བཙུགས་པ་ལ་གཟིགས།
        </>
      ),
    },
    other: {
      title: "iOS · HarmonyOS",
      body: (
        <>
          iPhone དང་ iPad། HarmonyOS ཆེད་དུ་ 水杉藏文 ད་ལྟ་མེད། 水杉输入法 ཆ་ཚང་བའི་ཕབ་ལེན་ནི་ <a href="https://msime.app/download/">msime.app/download</a> ལ་ཡོད།
        </>
      ),
    },
    verify: {
      title: "SHA-256 ཞིབ་བཤེར།",
      body: "ཕབ་ལེན་བྱས་པའི་ཡིག་ཆའི་ SHA-256 དང་གོང་གི་ SHA-256 མཐུན་མིན་ལ་བལྟོས། macOS: shasum -a 256། Linux: sha256sum། Windows: Get-FileHash།",
    },
  },
  guide: files => ({
    title: "སྒྲིག་འཇུག་དང་འབྲི་སྟངས།",
    lead: "མ་ལག་སོ་སོར་སྒྲིག་འཇུག་བྱེད་ཐབས་དང་ EWTS ཡིས་བོད་ཡིག་འབྲི་སྟངས།",
    toc: "ནང་དོན།",
    platforms: [
      {
        id: "macos",
        title: "macOS",
        body: "macOS 13 ཡན།",
        steps: [
          <>
            ཕབ་ལེན་ཤོག་ངོས་ནས་ macOS ཡི་སྒྲིག་འཇུག་ཡིག་ཆ་ཕབ་ལེན་བྱས་ནས་སྒྲིག ཡང་ན་ Homebrew ཡིས་སྒྲིག
            <pre>brew install --cask metasequoiaime/tap/msime-tibetan</pre>
          </>,
          "Applications ནང་གི་ 水杉藏文 ཁ་ཕྱེ་ནས་མཛུབ་སྟོན་ལྟར་སྒྲིག་འཇུག་མཇུག་སྒྲིལ།",
          "Mac འདིར་ 水杉输入法 སྔོན་ཆད་ནམ་ཡང་སྒྲིག་མྱོང་མེད་ན། ཕྱིར་ཐོན་ (Log Out) བྱས་ནས་ཡང་བསྐྱར་ནང་འཛུལ་དགོས།",
          <>
            ཡིག་འཇུག་ཐོ་ནང་མ་ཐོན་ན། <b>System Settings → Keyboard → Text Input → Edit…</b> ནས་ Tibetan (བོད་སྐད) འོག་གི་ 水杉藏文 ཁ་སྣོན་བྱོས།
          </>,
          <>
            <kbd>Control + Space</kbd> ཡིས་ 水杉藏文 ལ་བརྗེ།
          </>,
        ],
      },
      {
        id: "linux",
        title: "Linux",
        body: "Debian / Ubuntu དང་ Fedora། x86_64 དང་ aarch64།",
        steps: [
          <>
            ཕབ་ལེན་ཤོག་ངོས་ནས་ཡིག་ཆ་ཕབ་ལེན་བྱས་ནས་སྒྲིག Debian / Ubuntu ལ་ apt། Fedora ལ་ dnf སྤྱོད། ARM64 ཡིན་ན་ aarch64 ཡིག་ཆ་སྤྱོད།
            <pre>{`sudo apt install ./${files.deb}\nsudo dnf install ./${files.rpm}`}</pre>
          </>,
          <>
            ཐོག་མའི་སྒྲིག་བཀོད་ཐེངས་གཅིག་བྱོས། ཉེར་སྤྱོད་ཐོ་ནང་གི་ 水杉藏文 ཁ་ཕྱེ་བའམ་འོག་གི་བཀའ་ཚིག་བེད་སྤྱོད་གཏོང་།
            <pre>msime-linux-tibetan-setup --download</pre>
          </>,
          <>
            སྒྲིག་བཀོད་ཚར་རྗེས་ Fcitx5 དང་ IBus ཡི་ཡིག་འཇུག་ཐོ་ནང་ Tibetan (བོད་སྐད) འོག་ཏུ་ 水杉藏文 ཐོན། IBus ནང་ “Metasequoia 水杉藏文” ཞེས་སྟོན། མ་ཐོན་ན་ <code>fcitx5-configtool</code> སམ་ <code>ibus restart</code> རྗེས་ལག་བསྟར་གྱིས་ཁ་སྣོན་བྱོས།
          </>,
        ],
      },
      {
        id: "android",
        title: "Android",
        body: "Android 9 ཡན།",
        steps: [
          "ཕབ་ལེན་ཤོག་ངོས་ནས་ APK ཕབ་ལེན་བྱས་ནས་སྒྲིག ཉོ་ཚོང་ཁང་ཕྱི་ཡི་མཉེན་ཆས་ཡིན་པས་ “Install unknown apps” ལ་ཆོག་མཆན་སྤྲོད་དགོས།",
          <>
            <b>Settings → System → Languages &amp; input → On-screen keyboard</b> ནང་ 水杉藏文 ཁ་ཕྱེ། ཁ་པར་སོ་སོར་མིང་ཅུང་ཟད་མི་འདྲ།
          </>,
          "ཡི་གེ་འབྲི་སའི་སྒྲོམ་ཞིག་མནན་ནས་མཐེབ་གཞོང་རྟགས་ལས་ 水杉藏文 འདེམས།",
          <>
            水杉输入法 ཆ་ཚང་བ་སྤྱོད་ན། <b>「设置 → 输入 → 语言与方案」</b> (སྒྲིག་བཀོད → ཡིག་འཇུག → སྐད་ཡིག་དང་འབྲི་ཐབས) ནང་ <b>「添加语言」</b> (སྐད་ཡིག་ཁ་སྣོན) ནས་ <b>「藏语」</b> (བོད་སྐད) ཁ་སྣོན་བྱོས།
          </>,
        ],
      },
      {
        id: "windows",
        title: "Windows",
        body: "ཚོད་ལྟའི་པར་གཞི། ཨང་སྒྲིག་མིང་རྟགས་མེད།",
        steps: [
          <>
            ཕབ་ལེན་ཤོག་ངོས་ནས་ <code>MetasequoiaIME-Tibetan_Setup</code> ཕབ་ལེན་བྱས་ནས་ཁ་ཕྱེ།
          </>,
          "Windows ཡིས་པར་སྐྲུན་པ་ངོ་མི་ཤེས་ (Unknown publisher) ཞེས་སྟོན་སྲིད། ཡིག་ཆ་ GitHub ནས་ཡིན་པ་དང་ SHA-256 མཐུན་པ་གཏན་འཁེལ་བྱས་རྗེས་མུ་མཐུད།",
          "Windows ཡི་ 水杉输入法 ཚད་ལྡན་པར་གཞི (Metasequoia IME) དང་མཉམ་དུ་སྒྲིག་ཆོག",
          <>
            <kbd>Win + Space</kbd> ཡིས་ 水杉藏文 ལ་བརྗེ།
          </>,
        ],
      },
    ],
    typingTitle: "འབྲི་སྟངས།",
    typingLead: "水杉藏文 ཡིས་ EWTS (Extended Wylie) ལག་ལེན་བྱེད། ཡི་གེ་རྡེབ་དུས་འབྲི་བཞིན་པའི་ཡི་གེ་བོད་ཡིག་ཏུ་མཐོང་། ཡིག་ཆེ་དང་ཡིག་ཆུང་ལ་དབྱེ་བ་ཡོད།",
    keyColumn: "མཐེབ།",
    effectColumn: "ནུས་པ།",
    keys: [
      { key: <code>a–z</code>, effect: <>EWTS ཡི་གེ། <code>q</code> <code>x</code> མ་གཏོགས།</> },
      { key: <code>A D H I M N R S T U W X Y</code>, effect: <>ཡིག་ཆེ། <code>Ta</code> → ཊ། <code>kA</code> → ཀཱ། <code>oM</code> → ཨོཾ།</> },
      { key: <kbd>Space</kbd>, effect: <>ཚེག་བར་མཇུག་སྒྲིལ་ནས་ཚེག (<code>་</code>) སྣོན།</> },
      { key: <code>/</code>, effect: <>ཚེག་བར་མཇུག་སྒྲིལ་ནས་ཤད (<code>།</code>) སྣོན། <code>ང</code> རྗེས་སུ་ <code>ང་།</code> ལྟར་ཚེག་རང་བཞིན་གྱིས་སྣོན། ཡི་གེ་མེད་དུས་ཤད་ཁོ་ན་འབྲི།</> },
      { key: <kbd>Enter</kbd>, effect: "ཚེག་མེད་པར་བོད་ཡིག་འཇུག" },
      { key: <code>+</code>, effect: <>ཡི་གེ་བརྩེགས། <code>pad+ma</code> → པདྨ</> },
      { key: <code>.</code>, effect: <>ཡི་གེ་སོ་སོར་འབྱེད། <code>g.yag</code> → གཡག <code>gyag</code> → གྱག</> },
      { key: <code>'</code>, effect: <>འ་ཆུང་། <code>'od</code> → འོད</> },
      { key: <code>-</code>, effect: <>ལོག་འབྲི། <code>k-i</code> → ཀྀ</> },
      { key: <kbd>Backspace</kbd>, effect: "ལ་ཏིན་ཡི་གེ་གཅིག་སུབ།" },
      { key: <kbd>Esc</kbd>, effect: "ཐེངས་དང་པོར་ལ་ཏིན་ཡི་གེ་སྟོན། ཐེངས་གཉིས་པར་ཕྱིར་འཐེན།" },
      { key: <>B O q x …</>, effect: "EWTS ལ་མི་དགོས་པའི་ཡི་གེ་ནི་བོད་ཡིག་འཇུག་རྗེས་ལ་ཏིན་ཡི་གེ་ཉིད་དུ་འཇུག" },
    ],
    examplesTitle: "དཔེ་མཚོན།",
    examplesLead: "གཤམ་གྱི་བར་སྟོང་ནི་བར་སྟོང་མཐེབ་ཡིན།",
    typedColumn: "རྡེབ་པ།",
    resultColumn: "ཐོན་འབྲས།",
  }),
  faq: {
    title: "དྲི་བ་རྒྱུན་མ།",
    lead: "水杉藏文 སྐོར་གྱི་དྲི་བ་དང་ལན།",
    items: [
      {
        id: "coexist",
        q: "水杉藏文 དང་ 水杉输入法 མཉམ་དུ་སྒྲིག་ཆོག་གམ།",
        a: "ཆོག macOS དང་ Linux། Android སྟེང་ 水杉藏文 ནི་མཉེན་ཆས་སོ་སོ་ཞིག་ཡིན། 水杉输入法 ཆ་ཚང་བ་དང་མཉམ་དུ་སྒྲིག་ཆོག་ལ། ཡིག་འཇུག་དང་སྒྲིག་བཀོད། གཞི་གྲངས་སོ་སོར་ཡོད།",
      },
      {
        id: "first-use",
        q: "ཐོག་མར་སྤྱོད་དུས་ཡིག་ཆ་ཕབ་ལེན་དགོས་སམ།",
        a: "བོད་ཡིག་འབྲི་བར་ཚིག་མཛོད་མི་དགོས་པས་དེའི་ཆེད་དུ་ཕབ་ལེན་བྱ་རྒྱུ་མེད། Linux སྟེང་སྒྲིག་འཇུག་བྱས་རྗེས་ཐོག་མའི་སྒྲིག་བཀོད་ཐེངས་གཅིག་བྱེད་དགོས། Mac འདིར་ 水杉输入法 སྔོན་ཆད་སྒྲིག་མྱོང་མེད་ན་ཕྱིར་ཐོན་བྱས་ནས་ཡང་བསྐྱར་ནང་འཛུལ་དགོས།",
      },
      {
        id: "ios",
        q: "iPhone དང་ HarmonyOS སྟེང་སྤྱོད་ཆོག་གམ།",
        a: "ད་ལྟ་མི་ཆོག iOS དང་ HarmonyOS ཆེད་དུ་ 水杉藏文 མེད།",
      },
      {
        id: "windows",
        q: "Windows སྟེང་སྤྱོད་ཆོག་གམ།",
        a: "Windows ཡི་ 水杉输入法 ཚད་ལྡན་པར་གཞི (Metasequoia IME) ནང་བོད་ཡིག་མེད། 水杉藏文 ནི་ msime མཛོད་ཁང་གི་ཚོད་ལྟའི་པར་གཞི་ནང་ཁོ་ནར་ཡོད། དེ་ལ་ཨང་སྒྲིག་མིང་རྟགས་མེད་པས་སྒྲིག་འཇུག་དུས་ Windows ཡིས་པར་སྐྲུན་པ་ངོ་མི་ཤེས་ཞེས་སྟོན་སྲིད།",
      },
      {
        id: "case",
        q: "ཡིག་ཆེ་དང་ཡིག་ཆུང་ལ་དབྱེ་བ་ཡོད་དམ། Caps Lock ཁ་ཕྱེ་ན་ཅི་འགྱུར།",
        a: (
          <>
            ཡོད། <code>T</code> <code>D</code> <code>N</code> ནི་ ཊ ཌ ཎ ཡིན། <code>A</code> <code>I</code> <code>U</code> ནི་དབྱངས་རིང་ཡིན། <code>M</code> ནི་ ཾ། <code>H</code> ནི་ ཿ ཡིན། EWTS ལ་མི་དགོས་པའི་ཡི་གེ (<code>B</code> <code>O</code> <code>q</code> <code>x</code> སོགས) རྡེབ་ན་བྲིས་ཟིན་པའི་བོད་ཡིག་འཇུག་རྗེས་ཡི་གེ་དེ་ལ་ཏིན་ཡི་གེ་ཉིད་དུ་འཇུག
          </>
        ),
      },
      {
        id: "latin",
        q: "ལ་ཏིན་ཡི་གེ་ཇི་ལྟར་འབྲི།",
        a: (
          <>
            ཡི་གེ་རྡེབ་རྗེས་ <kbd>Esc</kbd> ཐེངས་གཅིག་མནན་ན་ལ་ཏིན་ཡི་གེར་ལོག དེ་ནས་ <kbd>Enter</kbd> མནན་ན་ལ་ཏིན་ཡི་གེ་ཇི་བཞིན་འཇུག <kbd>Esc</kbd> ཐེངས་གཉིས་པ་མནན་ན་ཕྱིར་འཐེན།
          </>
        ),
      },
      {
        id: "candidates",
        q: "ཚིག་འདེམས་སྒྲོམ་ཅིའི་ཕྱིར་མེད།",
        a: "EWTS ལ་ཏིན་ཡི་གེ་དང་བོད་ཡིག་ཐད་ཀར་མཐུད་ཡོད་པས་འདེམས་རྒྱུ་མེད། 水杉藏文 ཡིས་ཁྱེད་ཀྱིས་བྲིས་པ་ལས་སློབ་སྦྱོང་མི་བྱེད།",
      },
      {
        id: "uninstall",
        q: "ཇི་ལྟར་སུབ།",
        a: (
          <>
            macOS: 水杉藏文 ཡི་སྒྲིག་བཀོད་ནང་ <b>「维护与诊断 → 卸载」</b> (ཉམས་གསོ → སུབ་པ)། Homebrew ཡིས་སྒྲིག་ན་ <code>brew uninstall --cask msime-tibetan</code>། Linux: <code>sudo apt remove msime-linux-tibetan</code> ཡང་ན་ <code>sudo dnf remove msime-linux-tibetan</code>། Linux སྟེང་སུབ་ཀྱང་སྤྱོད་མཁན་གྱི་གཞི་གྲངས་མི་སུབ།
          </>
        ),
      },
      {
        id: "licence",
        q: "ཆོག་མཆན་ཅི་ཡིན།",
        a: (
          <>
            EWTS ནས་བོད་ཡིག་ཏུ་བསྒྱུར་བ་ནི་ཁ་ཕྱེ་བའི་ <a href="https://crates.io/crates/ewts">ewts</a> (MIT / Apache-2.0) ཡིས་བྱེད། 水杉输入法 ཡི་འབྱུང་ཁུངས་ཨང་སྒྲིག་ནི་ <a href="https://github.com/metasequoiaime/msime">GitHub</a> སྟེང་ཡོད།
          </>
        ),
      },
      {
        id: "feedback",
        q: "དཀའ་ངལ་ག་པར་ཞུ།",
        a: (
          <>
            GitHub ཡི་ <a href="https://github.com/metasequoiaime/msime/issues">msime Issues</a> ལ་ཞུ། GitHub ཐོ་མེད་ན་ <a href="https://msime.app/feedback/">msime.app/feedback</a> ནས་ཞུ་ཆོག པར་གཞི་དང་མ་ལག ནོར་འཁྲུལ་བྱུང་སྟངས་འབྲི་རོགས།
          </>
        ),
      },
    ],
  },
  notFound: {
    title: "ཤོག་ངོས་འདི་མི་འདུག",
    body: "ས་གནས་འདི་ན་ནང་དོན་མེད། མཐུད་ལམ་ནོར་བའམ་རྙིང་པ་ཡིན་སྲིད།",
    home: "མ་ངོས་སུ་ལོག",
    guide: "ལམ་སྟོན་ལྟ།",
  },
};
