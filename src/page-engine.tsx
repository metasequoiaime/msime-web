import type { ReactNode } from "react";
import { LocaleLink } from "./locale-link";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { AnchorButton, Card, Container, cx, GitHubIcon, LinkButton, RustIcon } from "./ui";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";

const REPO = "https://github.com/metasequoiaime/msime";
const ENGINE_DIR = `${REPO}/tree/develop/crates/engine`;
const ENGINE_README = `${REPO}/blob/develop/crates/engine/README.md`;
const QUICKSTART = `${REPO}/blob/develop/crates/engine/examples/quickstart.rs`;
const CAPI_README = `${REPO}/blob/develop/crates/engine-capi/README.md`;
const DATA_FORMATS = `${REPO}/blob/develop/docs/data-formats.md`;
const CRATE = "https://crates.io/crates/msime-engine";
const CRATE_DOCS = "https://docs.rs/msime-engine";
const CRATE_CAPI = "https://crates.io/crates/msime-engine-capi";
/** Prebuilt C libraries and the minimal data pack are attached to the msime-engine-capi-v* releases of the main repository, which share it with the apps' releases; this filter lists only them. */
const CAPI_RELEASES = `${REPO}/releases?q=msime-engine-capi&expanded=true`;
const DICTIONARY_RELEASES = "https://github.com/metasequoiaime/msime-dictionary/releases";
const DICTIONARY_NOTICE = "https://github.com/metasequoiaime/msime-dictionary/blob/main/NOTICE.md";

/** Trimmed from crates/engine/README.md「快速上手」 (examples/quickstart.rs in the crate): the comments are dropped and explained in the prose instead, the calls are unchanged. */
const RUST_SNIPPET = `use msime_engine::{prepare_runtime_paths, DictionaryAccess, Session, SessionOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let resources = std::path::absolute("msime-engine-data-quanpin-2.0.39")?;
    let work = std::env::temp_dir().join("msime-quickstart");
    let paths = prepare_runtime_paths(&resources, &work.join("user"), &work.join("cache"), "dict-v2_0_39")?;
    let access = DictionaryAccess::try_session(&paths.user_data, &paths.dictionaries)?
        .ok_or("the dictionaries are being maintained")?;
    let mut session = Session::new(SessionOptions::new(paths))?;

    for key in b"nihao" {
        session.character(*key, false);
    }
    let state = session.display_snapshot();
    for (index, candidate) in state.candidates.iter().take(9).enumerate() {
        println!("{}. {}", index + 1, candidate.word);
    }
    if let Some(text) = session.select(0).commit {
        println!("commit: {text}");
    }

    drop(session);
    drop(access);
    msime_engine::shutdown();
    Ok(())
}`;

/** The call order from crates/engine-capi/README.md「生命周期」; the compilable program is examples/c/example.c in every archive. */
const C_SNIPPET = `#include <msime_engine.h>

msime_engine_prepare_runtime(&paths, "dict-v2_0_39", 12, &dictionaries);
msime_engine_session_new(options_json, len, &session);
msime_engine_key_char(session, 'n', 0, &result);
msime_engine_state_get(session, &state);
msime_engine_candidate_get(session, state.revision, i, &candidate);
msime_engine_select(session, state.revision, i, &result);
msime_engine_session_free(session);
msime_engine_flush_learning(MSIME_ENGINE_FLUSH_STOP_THREAD);
msime_engine_string_free(dictionaries);`;

/** Top level of the data pack as crates/engine-capi/packaging/data-pack.py builds it: the directory is the engine's resources root. */
const DATA_SNIPPET = `msime-engine-data-quanpin-<词库版本>/
├── msime-pinyin.db
├── msime-english.db
├── msime-bigram.bin
├── msime-trigram.bin
├── msime-scowl_Copyright.txt
├── README.md
└── licenses/`;

/** The ten SchemeType variants; the C ABI covers all of them. */
const SCHEMES = ["全拼", "双拼", "五笔 86/98", "日文", "韩文", "粤拼", "注音", "越南文", "藏文", "笔画"] as const;

/** Ways each language loads a C library; the engine-capi README documents only C, the rest is the language's own FFI. */
const C_HOSTS = [
  ["C / C++", "fcitx5、IBus、Windows TSF 这类前端直接包含头文件"],
  ["Swift / Objective-C", "经桥接头文件或 module map 导入"],
  ["Kotlin / Java", "经 JNI"],
  ["Go", "cgo"],
  ["Python", "ctypes 或 cffi"],
  ["C#", "P/Invoke"],
  ["Dart", "dart:ffi"],
] as const;

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-panel px-1.5 py-px font-code text-[13px] text-ink [overflow-wrap:anywhere] [box-decoration-break:clone]">{children}</code>;
}

/** Code is shown as written in the repository; the caller converts it only when it holds a Chinese placeholder (the data pack's version), since conversion touches nothing but Han characters. `font-code`, not `font-mono`: on this site `font-mono` is the sans label face, and Tailwind's preflight (which sets `pre` and `code` to that face) outranks the `:where()` rule in base.css. */
function CodeBlock({ label, code }: { label: string; code: string }) {
  const { t } = useLocale();
  return (
    <figure className="m-0 mt-4 min-w-0">
      <figcaption className="mb-1.5 text-[13px] font-medium text-accent-ink">{t(label)}</figcaption>
      <pre className="m-0 overflow-x-auto rounded-field bg-panel-2 px-3.5 py-3 font-code text-[13px] leading-[1.7] text-ink">
        <code className="font-code">{code}</code>
      </pre>
    </figure>
  );
}

/** An external link led by the mark of the site it goes to, so a reader can tell GitHub and crates.io apart before following it. */
function LogoLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
      {icon}
      {children}
    </a>
  );
}

function LinkRow({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14.5px]">{children}</div>;
}

function NumberedSection({ index, title, id, children }: { index: number; title: string; id: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <section aria-labelledby={id} className="flex flex-wrap gap-x-[clamp(24px,4vw,56px)] gap-y-3 py-[clamp(24px,3vw,36px)] shadow-divider-t-2" data-reveal>
      <div className="max-w-full flex-[0_0_220px]">
        <p className="m-0 font-mono text-xs tracking-[0.16em] text-accent-ink" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </p>
        <h2 id={id} className="m-0 mt-2 font-heading text-[21px] leading-[1.4] font-bold text-ink">
          {t(title)}
        </h2>
      </div>
      <div className="min-w-0 flex-[1_1_480px] text-[15.5px] leading-[1.95] text-body">{children}</div>
    </section>
  );
}

function Question({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const { t } = useLocale();
  return (
    <div className={cx("min-w-0", className)}>
      <h3 className="m-0 text-[17px] leading-[1.6] font-bold text-ink">{t(title)}</h3>
      <p className="m-0 mt-1.5">{children}</p>
    </div>
  );
}

/** 引擎库页：水杉输入法的输入引擎作为可嵌入的库（crates.io 上的 msime-engine 与 msime-engine-capi）是什么、能做什么、怎么开始用，以及代码与数据各自的许可证。 */
export function EnginePage() {
  const { t } = useLocale();
  usePageMeta();
  useReveal();

  return (
    <>
      <PageHero
        kicker="引擎库"
        title="把水杉的输入引擎嵌进你的输入法"
        lead="水杉输入法的 Rust 输入引擎也单独发布成库。你的输入法负责界面和与系统的对接，按键交给它，候选、排序、上屏文字和学习由它给出。Rust 项目直接依赖，C、C++、Swift、Kotlin、Go、Python 等语言用预编译的 C 库。引擎代码以 MPL-2.0 授权。"
      />
      <main className="w-full">
        <Container className="pt-[clamp(28px,4vw,48px)]">
          <NumberedSection index={1} title="它是什么" id="engine-what">
            <p className="m-0">
              {t("一个开箱即用的拼音与多语言输入引擎：组字状态、各输入方案、词库查询、整句排序和学习都在里面，水杉输入法的 macOS、Linux、手机和网页版用的就是它。候选窗、键位映射、和 fcitx5、IBus、TSF 或手机键盘框架的对接，由接入它的输入法自己写。")}
            </p>
            <p className="m-0 mt-3">
              {t("它不是 Rime 那样的方案框架：没有方案描述语言，不能靠配置文件拼出新的输入方式。方案和算法都是内置的；能自己定制的是方案选项、自定义双拼表和个人词典。")}
            </p>
          </NumberedSection>

          <NumberedSection index={2} title="能做什么" id="engine-capabilities">
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t("输入方案")}>
              {SCHEMES.map((name) => (
                <li key={name} className="rounded-full bg-accent-soft px-3.5 py-1 text-sm font-medium text-accent-ink">
                  {t(name)}
                </li>
              ))}
            </ul>
            <ul className="m-0 mt-4 list-disc pl-5 marker:text-accent-ink">
              <li>{t("整句：词格解码组句，可以再用 n-gram 表和神经重排模型给整句打分。")}</li>
              <li>{t("纠错：全拼的拼写纠错；Rust 库另有触屏键盘的触点纠错。")}</li>
              <li>{t("学习：用户选过的词和个人词典存在本地 SQLite 里，按日志回放。")}</li>
              <li>{t("Rust 库另有九键与 14 键布局。")}</li>
            </ul>
            <p className="m-0 mt-3 text-muted">
              {t("C 接口（ABI 1.0）覆盖词格整句、拼写纠错、学习、个人词典和上面十种方案；九键、触点纠错、神经重排和搭配模型目前只在 Rust 库里，C 接口留到后续版本。神经重排的效果和模型见")}
              <LocaleLink to="/model/">{t("神经联想")}</LocaleLink>
              {t("。")}
            </p>
          </NumberedSection>

          <NumberedSection index={3} title="Rust" id="engine-rust">
            <p className="m-0">
              {t("一条命令加依赖，SQLite 已经编进引擎，不用另装任何库，也不用克隆仓库：")}
            </p>
            <CodeBlock label="添加依赖" code="cargo add msime-engine" />
            <CodeBlock label="打一句全拼，选第一个候选上屏" code={RUST_SNIPPET} />
            <p className="m-0 mt-3">
              {t("引擎不带词库，第一个路径是解开的数据包（见下面「数据」），工作目录用来放学习日志和工作词库，两者都要是绝对路径。数据换了就换一个 content id（最后那个参数）。会话结束、释放租约之后调 ")}
              <InlineCode>shutdown()</InlineCode>
              {t("，把排着的学习写完。")}
            </p>
            <p className="m-0 mt-3 text-muted">
              {t("0.x 期间 Rust API 不承诺稳定，小版本之间也可能改；文档里的公开面是核心层 Session、SessionOptions 和它们旁边的函数与类型。依赖了别的版本的 rusqlite、在 dev 构建里打开神经重排，这些要注意的地方写在 README 的「从 crates.io 使用」里。")}
            </p>
            <LinkRow>
              <LogoLink href={CRATE} icon={<RustIcon size={15} className="text-ink" />}>
                {t("crates.io")}
              </LogoLink>
              <LogoLink href={CRATE_DOCS} icon={<RustIcon size={15} className="text-ink" />}>
                {t("docs.rs 上的 API 文档")}
              </LogoLink>
              <LogoLink href={ENGINE_README} icon={<GitHubIcon size={15} className="text-ink" />}>
                {t("README 与快速上手")}
              </LogoLink>
              <LogoLink href={QUICKSTART} icon={<GitHubIcon size={15} className="text-ink" />}>
                {t("完整示例 quickstart.rs")}
              </LogoLink>
            </LinkRow>
          </NumberedSection>

          <NumberedSection index={4} title="C 和其他语言" id="engine-c">
            <p className="m-0">
              {t("不用装 Rust：从 GitHub Releases 下载预编译的 C 库，有 Linux x86_64、macOS universal（arm64 与 x86_64 合一）和 Windows x86_64 MSVC 三种归档，同一个发布里的 SHA256SUMS 是校验值。解开就是一个装好的前缀：头文件 ")}
              <InlineCode>include/msime_engine.h</InlineCode>
              {t("、共享库和静态库、pkg-config 文件 ")}
              <InlineCode>msime-engine.pc</InlineCode>
              {t("，以及一个可以直接编译的 C 示例。函数一律以 msime_engine_ 开头，带 ABI 版本号，头文件里写了每个函数的说明。")}
            </p>
            <CodeBlock label="编译" code="cc app.c $(pkg-config --cflags --libs msime-engine)" />
            <CodeBlock label="调用顺序（节选）" code={C_SNIPPET} />
            <p className="m-0 mt-3">{t("能调用 C 函数的语言都能用它：")}</p>
            {/* One column on phones, so every language sits above its note instead of only the long ones wrapping. */}
            <dl className="m-0 mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-[11em_minmax(0,1fr)]">
              {C_HOSTS.map(([language, how]) => (
                <div key={language} className="contents">
                  <dt className="mt-2 text-sm leading-[1.95] font-semibold text-ink sm:mt-0">{language}</dt>
                  <dd className="m-0 min-w-0 text-muted">{t(how)}</dd>
                </div>
              ))}
            </dl>
            <p className="m-0 mt-3 text-muted">
              {t("按键怎么路由、分页和修订号怎么配合，README 里有完整的约定。想自己从源码构建，用 cargo-c 构建 crates.io 上的 msime-engine-capi。")}
            </p>
            <LinkRow>
              <LogoLink href={CAPI_RELEASES} icon={<GitHubIcon size={15} className="text-ink" />}>
                {t("预编译库下载")}
              </LogoLink>
              <LogoLink href={CAPI_README} icon={<GitHubIcon size={15} className="text-ink" />}>
                {t("C 接口 README 与快速上手")}
              </LogoLink>
              <LogoLink href={CRATE_CAPI} icon={<RustIcon size={15} className="text-ink" />}>
                {t("crates.io")}
              </LogoLink>
            </LinkRow>
          </NumberedSection>

          <NumberedSection index={5} title="数据" id="engine-data">
            <p className="m-0">
              {t("引擎只带算法和几张很小的内嵌表，不带词库，运行时由你给出数据目录。最省事的是 C 库同一个发布里的最小数据包 ")}
              <InlineCode>{t("msime-engine-data-quanpin-<词库版本>.tar.gz")}</InlineCode>
              {t("（Windows 用同名的 .zip），解开的目录就是数据目录，够全拼和双拼用。Rust 和 C 用的是同一个包。")}
            </p>
            <CodeBlock label="数据包的内容" code={t(DATA_SNIPPET)} />
            <p className="m-0 mt-3">
              {t("这些文件逐字节取自 msime-dictionary 的 dict-v* 发布，也可以从那里逐个下载。五笔、日文、粤拼、注音、笔画等方案还要各自的数据文件，见数据格式文档的「每个方案的最小数据集」；文件格式也写在那份文档里，可以换成自己构建的数据。")}
            </p>
            <LinkRow>
              <LogoLink href={CAPI_RELEASES} icon={<GitHubIcon size={15} className="text-ink" />}>
                {t("数据包下载")}
              </LogoLink>
              <LogoLink href={DICTIONARY_RELEASES} icon={<GitHubIcon size={15} className="text-ink" />}>
                {t("msime-dictionary 发布")}
              </LogoLink>
              <LogoLink href={DATA_FORMATS} icon={<GitHubIcon size={15} className="text-ink" />}>
                {t("数据格式文档")}
              </LogoLink>
            </LinkRow>
          </NumberedSection>

          <NumberedSection index={6} title="许可证" id="engine-license">
            <ul className="m-0 list-disc pl-5 marker:text-accent-ink">
              <li>
                {t("引擎代码（msime-engine、msime-engine-capi 和它们依赖的 msime-path-trust）按 MPL-2.0 授权，不附 Exhibit B。可以和闭源代码一起分发，也可以上架 App Store；MPL 是按文件的 copyleft，你改了引擎自己的源文件，分发时要公开这些文件的改动，你自己的代码不受影响。")}
              </li>
              <li className="mt-2">
                {t("编进引擎的几张小表和改编的代码保留各自的许可证（BSD、Apache-2.0、MIT、CC-BY-3.0 等）。分发时随附 LICENSE 和 licenses/ 目录，预编译归档里还带着 THIRD_PARTY_NOTICES.txt。")}
              </li>
              <li className="mt-2">
                <strong className="font-semibold text-ink">{t("数据不是 MPL-2.0。")}</strong>
                {t("默认的中文词库含 rime-ice 的 GPL-3.0 数据，n-gram 表的计数来自中文维基百科（CC-BY-SA-4.0），目前每个方案都要的 msime-english.db 也含 GPL-3.0 数据。带哪套数据由你决定，逐项的来源和许可证见数据包里的 README.md。")}
              </li>
            </ul>
            <p className="m-0 mt-3 text-muted">{t("以上是摘要，以仓库里的 LICENSE 和各数据文件的许可证为准。")}</p>
          </NumberedSection>

          <NumberedSection index={7} title="常见问题" id="engine-faq">
            <Question title="它是 Rime 吗？">
              {t("不是。Rime 是方案驱动的框架，输入方式由方案配置文件定义。水杉的引擎是做好的引擎：方案和算法都内置，开箱就有整句、纠错和学习，没有方案描述语言。想要什么都能配置的框架，Rime 更合适；想直接拿一个能用的拼音和多语言引擎，用这个。")}
            </Question>
            <Question title="闭源应用或 App Store 里的应用能用吗？" className="mt-5">
              {t("引擎代码可以：MPL-2.0 允许和闭源代码一起分发，只要求公开你对引擎源文件本身的改动，并随附许可证文本。要单独考虑的是数据：默认的中文和英文词库含 GPL-3.0 数据，n-gram 表是 CC-BY-SA-4.0。把它们打包进闭源或 App Store 应用之前，请先评估这些许可证，或者换用别的数据。")}
            </Question>
            <Question title="词库从哪里来？" className="mt-5">
              {t("引擎本身不带词库。水杉的词库在 msime-dictionary 维护，以 dict-v* 发布，数据包就取自那里；中文词库的主体来自 rime-ice（GPL-3.0）及其补充，n-gram 计数来自中文维基百科。每个来源的上游和条款见 msime-dictionary 的 ")}
              <a href={DICTIONARY_NOTICE} target="_blank" rel="noreferrer">NOTICE</a>
              {t("。按数据格式文档自己构建数据也可以。")}
            </Question>
            <Question title="接口稳定吗？" className="mt-5">
              {t("Rust 库还在 0.x，API 可能在小版本之间改。C 接口按 ABI 版本号管理，主版本号就是共享库 SONAME 的主版本，运行时可以用 msime_engine_abi_version() 核对。")}
            </Question>
          </NumberedSection>

          <Card as="section" tone="muted" className="mt-[clamp(28px,4vw,48px)] rounded-panel p-[clamp(24px,3.4vw,40px)]" aria-labelledby="engine-source" data-reveal>
            <h2 id="engine-source" className="m-0 font-heading text-[clamp(22px,2.4vw,26px)] leading-[1.4] font-bold text-ink">
              {t("源码与反馈")}
            </h2>
            <p className="m-0 mt-3 max-w-[72ch] text-[15.5px] leading-[1.95] text-body">
              {t("引擎在 msime 主仓库的 crates/engine，C 接口在 crates/engine-capi。接入时遇到问题或缺什么接口，欢迎到主仓库开 Issue。")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AnchorButton href={ENGINE_DIR} size="md">
                <GitHubIcon size={16} />
                {t("引擎源码")}
              </AnchorButton>
              <AnchorButton href={`${REPO}/issues`} variant="secondary" size="md">
                <GitHubIcon size={16} />
                {t("Issue")}
              </AnchorButton>
              <LinkButton to="/code/" variant="ghost" size="md">
                {t("全部开源仓库")}
              </LinkButton>
            </div>
          </Card>
        </Container>
      </main>
    </>
  );
}
