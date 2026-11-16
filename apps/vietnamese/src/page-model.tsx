import type { ReactNode } from "react";
import { INTEGRATION_SECTIONS } from "./integration/sections";
import { ModelEngineRelation } from "./integration/relation";
import { BENCHMARK_BASELINE, BENCHMARK_CASES } from "./model-benchmark";
import { ModelBenchmarkChart, ModelBenchmarkTable } from "./model-benchmark-chart";
import { PageHero } from "./page-content";
import { SectionNav } from "./section-nav";
import { usePageMeta } from "./page-meta";
import { textareaClass } from "./feedback/styles";
import { AndroidIcon, AnchorButton, AppleIcon, Card, Container, cx, GitHubIcon, HarmonyOSIcon, HuggingFaceIcon, LinkButton, LinuxIcon, RustIcon, WindowsIcon } from "./ui";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";

const REPO = "https://github.com/metasequoiaime/chinese-ime-lm";
const MEASUREMENTS = `${REPO}/blob/main/docs/measurements.md`;
const FORMAT = `${REPO}/blob/main/docs/format.md`;
const MODEL_4M = "https://huggingface.co/metasequoiaime/pinyin-ime-reranker-4M";
const MODEL_25M = "https://huggingface.co/metasequoiaime/pinyin-ime-reranker-25M";
const CRATE = "https://crates.io/crates/chinese-ime-lm";
const CRATE_FFI = "https://crates.io/crates/chinese-ime-lm-ffi";
const QINGJIAN = "https://github.com/qingjian-team/qingjian";
const ZHIYI = "https://github.com/dd1000001000/zhiyi_ime";

/** Brand colours: Android and Linux as Simple Icons records them, Windows as its logo is drawn (Simple Icons no longer carries Microsoft marks). Apple, HarmonyOS, Rust and GitHub are black marks, so they take the text colour and stay visible in the dark theme. */
const WINDOWS_BLUE = "text-[#0078D4]";
const ANDROID_GREEN = "text-[#3DDC84]";
const LINUX_YELLOW = "text-[#FCC624]";

/** 数字均出自 chinese-ime-lm 的 docs/measurements.md 与两张 Hugging Face 模型卡：60 句手写整句用例经真实输入法运行时驱动，其中 56 句的首选由引擎组句，重排只作用于这一类。 */
const RESULTS = [
  { label: "引擎自己的首选", correct: 41, note: "" },
  { label: "加 4.5 MB 快速模型", correct: 49, note: "救回 10 句，弄错 2 句" },
  { label: "加 25.5 MB 高精度模型", correct: 52, note: "救回 11 句，没有弄错" },
  { label: "候选里本来就有正确答案", correct: 52, note: "任何重排的上限" },
] as const;
const DECODER_CASES = 56;

const MODELS = [
  { name: "快速模型", size: "4.5 MB", params: "425 万参数", cost: "每个候选字 0.33 ms", worst: "15 字长句、9 个候选最慢 46 ms", href: MODEL_4M, use: "每次按键都跑，手机键盘也装得下" },
  { name: "高精度模型", size: "25.5 MB", params: "2486 万参数", cost: "每个候选字 2.0 ms", worst: "同样情形最慢 268 ms", href: MODEL_25M, use: "电脑上在输入停顿后接手" },
] as const;

/** An external link led by the mark of the site it goes to, so a reader can tell GitHub, Hugging Face and crates.io apart before following it. */
function LogoLink({ href, icon, className, children }: { href: string; icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cx("inline-flex items-center gap-1.5", className)}>
      {icon}
      {children}
    </a>
  );
}

/** A list item whose bullet is one or more marks, aligned with the first line of text. */
function MarkedItem({ marks, className, children }: { marks: ReactNode; className?: string; children: ReactNode }) {
  return (
    <li className={cx("flex items-start gap-3", className)}>
      {/* 15px marks centred on the first 30px line of 15.5px / 1.95 body text, not on the whole item. */}
      <span className="mt-[7px] flex flex-none items-center gap-1 text-ink" aria-hidden="true">
        {marks}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function NumberedSection({ index, title, id, children }: { index: number; title: string; id: string; children: ReactNode }) {
  const { t } = useLocale();
  // The first section sits right under the sub-navigation's underline, so only the later ones draw their own divider.
  return (
    <section aria-labelledby={id} className="flex flex-wrap gap-x-[clamp(24px,4vw,56px)] gap-y-3 py-[clamp(24px,3vw,36px)] not-first:shadow-divider-t-2" data-reveal>
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

/** 神经联想页：chinese-ime-lm 整句重排模型做什么、实测效果与代价、在水杉输入法里怎么打开，以及给其他输入法开发者的库和模型。 */
export function ModelPage() {
  const { t } = useLocale();
  usePageMeta();
  useReveal();

  return (
    <>
      <PageHero
        variant="plain"
        kicker="开源模型"
        title="神经联想"
        lead="打一整句拼音时，引擎会拼出好几种读法。神经联想用字级语言模型看着前文，在这些读法里挑出更通顺的那一个：每次按键都跑的快速模型只有 4.5 MB，手机键盘也装得下；电脑上在输入停顿后接手的高精度模型 25.5 MB。模型、代码和评测都开源，别的输入法也能直接用。"
      />
      <SectionNav group={INTEGRATION_SECTIONS} current="/model/" />
      <main className="w-full">
        <Container>
          <ModelEngineRelation current="/model/" />
          <NumberedSection index={1} title="它做什么" id="model-what">
            <p className="m-0">
              {t("拼音本身有歧义：同一串字母可以切成不同的音节，每个音节又对应很多字。引擎靠词库把可能的读法拼成整句候选，首选是它按词频估计最可能的那一个。词频只看单个词常不常见，看不出整句读起来顺不顺。")}
            </p>
            <p className="m-0 mt-3">
              {t("神经联想在引擎已经给出的候选里重新挑首选，判断依据是前面已经上屏的文字和候选本身读起来像不像一句话。它不负责把拼音变成汉字，也不会凭空造出候选；引擎没有拼出的读法，它选不到。")}
            </p>
            <p className="m-0 mt-3">
              {t("词典里能整段对上的词，它一律不动。这样的词带着语料里的词频，比模型更可信：在 2052 个这类用例上，保持引擎首选的正确率是 0.719，交给模型重排后最好也只有 0.690。")}
            </p>
          </NumberedSection>

          <NumberedSection index={2} title="效果与代价" id="model-results">
            <p className="m-0">
              {t(`评测用的是 60 句手写的整句用例，通过真实的输入法运行时逐键输入，其中 ${DECODER_CASES} 句的首选是引擎组出来的句子，也就是神经联想会参与的那一类。首选正确的句数：`)}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[14.5px] leading-[1.7]">
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="py-2 pr-4 font-semibold">{t("配置")}</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">{t(`首选正确 / ${DECODER_CASES}`)}</th>
                    <th scope="col" className="py-2 font-semibold">{t("说明")}</th>
                  </tr>
                </thead>
                <tbody>
                  {RESULTS.map((row) => (
                    <tr key={row.label} className="shadow-divider-t">
                      <th scope="row" className="py-2.5 pr-4 font-normal text-ink">{t(row.label)}</th>
                      <td className="py-2.5 pr-4 font-mono text-ink">{row.correct}</td>
                      <td className="py-2.5 text-muted">{t(row.note)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="m-0 mt-4">
              {t("救回和弄错分开算：用户感受到的是「它帮我改对了几句」和「它把我本来对的改错了几句」，合成一个总分就看不出后者。")}
            </p>
            <p className="m-0 mt-3 text-muted">
              {t("样本只有 60 句，两个模型之间的名次差异在统计噪声里，和下文其他开源模型之间的差异也大多如此，不能当成质量排名。能确定的是体积和耗时：")}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {MODELS.map((model) => (
                <Card key={model.name} tone="muted" className="rounded-panel p-5">
                  <p className="m-0 font-heading text-[17px] font-bold text-ink">
                    {t(model.name)} <span className="font-mono text-sm font-normal text-muted">{model.size}</span>
                  </p>
                  <ul className="m-0 mt-2 list-none p-0 text-[14.5px] leading-[1.8] text-body">
                    <li>{t(model.params)}</li>
                    <li>{t(model.cost)}</li>
                    <li>{t(model.worst)}</li>
                    <li className="text-muted">{t(model.use)}</li>
                  </ul>
                  <LogoLink href={model.href} icon={<HuggingFaceIcon size={17} />} className="mt-3 text-[14.5px]">
                    {t("在 Hugging Face 查看")}
                  </LogoLink>
                </Card>
              ))}
            </div>
            <p className="m-0 mt-3 text-[14px] text-muted">
              {t("耗时在 Apple M4 Pro 上用参考实现测得。完整的测量方法、负结果和与其他模型的对比见")}{" "}
              <LogoLink href={MEASUREMENTS} icon={<GitHubIcon size={14} className="text-ink" />}>
                {t("测量记录")}
              </LogoLink>
              {t("。")}
            </p>

            <h3 id="model-vs-open" className="m-0 mt-8 font-heading text-[17px] leading-[1.5] font-bold text-ink">
              {t("与其他开源模型比较")}
            </h3>
            <p className="m-0 mt-2">
              {t("常有人问，为什么不直接用开源的通用小模型，或者别的输入法已经训好的模型。同一批候选上量过四个开源通用模型（Qwen），和两个开源输入法自带的重排模型：")}
              <a href={QINGJIAN} target="_blank" rel="noreferrer">{t("青简输入法")}</a>
              {t("的含章·通变、含章·知微，")}
              <a href={ZHIYI} target="_blank" rel="noreferrer">{t("知意输入法")}</a>
              {t(`的知意（两个版本）。只取金标准落在候选池里的 ${BENCHMARK_CASES} 句，每句池里 6 到 7 个候选，各模型在池内挑一个，所以下图的分母是 ${BENCHMARK_CASES}，不是上表的 ${DECODER_CASES}。「挑对了几句」那张图里的竖线是引擎原序（不重排、不用任何模型）挑对的 ${BENCHMARK_BASELINE.hits} 句；「模型体积」按实际大小画。两张图都从零画起，同一行是同一个模型。`)}
            </p>
            <figure className="m-0 mt-5" aria-labelledby="model-vs-open">
              {/* The takeaway the rows support; re-check it when a model is added to src/model-benchmark.ts. Hits run 49 to 52 with the Qwen rows at their best scoring variant, sizes 4.49 MB (4.25M) to 1722 MB (Qwen3.5-2B). */}
              <p className="m-0 mb-4 text-[16px] leading-[1.6] font-semibold text-ink">{t("挑对的句数都在 49 到 52 句之间，体积却从 4.5 MB 到 1.7 GB 不等，最小的是本项目的快速模型")}</p>
              <ModelBenchmarkChart />
              <figcaption className="mt-4 text-[14px] leading-[1.8] text-muted">
                <span className="block">
                  {t(`${BENCHMARK_CASES} 句上相差三句以内是统计噪声：`)}
                  <a href={`${MEASUREMENTS}#52-条上命中相近的模型之间没有一对达到显著`} target="_blank" rel="noreferrer">
                    {t("测量记录")}
                  </a>
                  {t("里的 McNemar 精确检验中，即使一方 3 比 0 全胜，p 也有 0.25。各模型的 95% 置信区间见下方「图表数据」。")}
                </span>
                <span className="mt-1 block">
                  {t("* Qwen 四行取三种打分细节里对它们最有利的一种，四个模型都是每个候选前面接分词器的结束符 ")}
                  <code className="text-[13px] [font-variant-ligatures:none]">{"<|im_end|>"}</code>
                  {t("、首字也计分。之前发布的数字没有给每个候选的第一个 token 打分；同一份权重随这个细节在 42–52（Qwen2.5-0.5B）、49–50（Qwen3-0.6B）、48–49（Qwen3.5-0.8B）、45–51（Qwen3.5-2B）句之间变动，见")}
                  <a href={`${MEASUREMENTS}#复测原表没有给第一个-token-打分`} target="_blank" rel="noreferrer">
                    {t("复测")}
                  </a>
                  {t("。知意两行体积条里浅色的一段，是它另需的 34.4 MB 分词表。")}
                </span>
              </figcaption>
            </figure>
            <ModelBenchmarkTable />
            <p className="m-0 mt-4">
              {t(`十个模型都挑对 49 到 52 句。${BENCHMARK_CASES} 句上，一方至少要净多对 6 句才可能显著（6 比 0 时 McNemar p≈0.03），这十个之间最多差 3 句，所以两两之间没有一对的差别达到显著：上面说名次在噪声里，指的就是这个。Qwen 的成绩会随打分细节变动（见上方图注），这里取的是对它们最有利的口径。和不重排相比，本项目两个模型的提升是显著的（p 为 0.039 和 0.001）。`)}
            </p>
            <p className="m-0 mt-3">
              {t("能确定的是体积，它不是抽样估计，没有噪声可言。快速模型 4.5 MB，是这里最小的：青简的含章·通变 46.1 MB，是它的 10 倍；知意 Long-L12 的 int8 ONNX 84.4 MB，是它的 19 倍，算上分词表是 26 倍；四个 Qwen 是它的 62 到 384 倍。高精度模型 25.5 MB，也比青简、知意的模型都小。")}
            </p>
            <p className="m-0 mt-3">
              {t("速度上，本项目的模型并不比青简、知意的快。这次测量给一个池打一次分，快速模型在单个 CPU 线程上要 12 ms，高精度模型 72 ms；青简、知意的模型在 Apple M4 Pro 的 GPU（Metal）或 4 个 CPU 线程上是 5 到 10 ms。和 Qwen 比，快速模型快 2.2 到 8.5 倍（Qwen 在 GPU 上 27 到 101 ms），但 Qwen 这一侧是逐个候选单独计算，没有批处理，优化后差距可能缩到同一量级。快速模型在真实按键路径上还有跨按键续算，p95 是 8.6 ms，那是另一种测法，不和这里直接比。")}
            </p>
            <p className="m-0 mt-3">
              {t("青简和知意的模型是给各自输入法的候选生成配套训练、配套调参的，在自己的输入法里还和别的打分项加在一起用。这里只量其中一项能力：给同一个池，挑一个，所以这几行不代表它们在自己输入法里的表现。含章两款模型以 GPL-3.0-or-later 发布，知意模型以 Apache-2.0 发布。")}
            </p>
          </NumberedSection>

          <NumberedSection index={3} title="现在就试" id="model-try">
            <p className="m-0">
              {t("本站的文本框默认使用浏览器里运行的水杉引擎（顶栏的「网页输入法」可以换方案或关闭），它带着快速模型，用全拼和双拼时神经联想一直开着。在下面连续打一整句拼音，例如 wojintianqushangban，再按空格上屏。")}
            </p>
            <label htmlFor="model-try-input" className="mt-4 block text-sm font-semibold text-ink">
              {t("试着打一句话")}
            </label>
            <textarea id="model-try-input" className={`${textareaClass} mt-2`} rows={3} placeholder={t("在这里输入拼音")} />
            <p className="m-0 mt-2 text-[14px] text-muted">{t("这个输入框不属于任何表单，打的字不会被提交。")}</p>
          </NumberedSection>

          <NumberedSection index={4} title="在水杉输入法里打开" id="model-enable">
            <p className="m-0">
              {t("Windows 正式版从 v0.10.0 起默认开着速度优先的一档；其他平台默认关闭，因为它要在打字或停顿时多做一次模型计算，需要时在设置里打开：")}
            </p>
            <ul className="m-0 mt-3 list-none p-0">
              <MarkedItem marks={<WindowsIcon size={15} className={WINDOWS_BLUE} />}>
                {t("Windows：设置的输入页里，「神经网络模型整句（速度优先）」默认开启；「神经网络模型整句（效果优先）」默认关闭，要先下载约 25 MB 的模型才能打开。")}
              </MarkedItem>
              <MarkedItem marks={<><AppleIcon size={15} /><LinuxIcon size={15} className={LINUX_YELLOW} /></>} className="mt-2">
                {t("macOS、Linux：设置的输入页「候选与联想」一组里打开「桌面神经联想」，打开时会下载约 25 MB 的模型。")}
              </MarkedItem>
              <MarkedItem marks={<><AndroidIcon size={15} className={ANDROID_GREEN} /><AppleIcon size={15} /><HarmonyOSIcon size={15} /></>} className="mt-2">
                {t("Android、iOS、鸿蒙手机：在「表达」页把「整句联想」从「标准」改成「增强」。")}
              </MarkedItem>
            </ul>
            <p className="m-0 mt-3 text-muted">
              {t("模型只用于拼音输入。五笔版和日文、越南文、藏文这些单一方案的版本不带手机上用的模型，「整句联想」也就没有「增强」这一档。")}
            </p>
          </NumberedSection>

          <NumberedSection index={5} title="给输入法开发者" id="model-developers">
            <p className="m-0">
              {t("推理代码和权重都以 Apache-2.0 授权，链接到 MIT、BSD、Apache 许可的输入法里不会带来传染性义务。")}
            </p>
            <ul className="m-0 mt-3 list-none p-0">
              <MarkedItem marks={<RustIcon size={15} />}>
                <a href={CRATE} target="_blank" rel="noreferrer" className="font-mono">chinese-ime-lm</a>
                {t("：Rust 写的引擎直接依赖，")}
                <code className="rounded-md bg-panel px-1.5 py-px text-[13px] text-ink">cargo add chinese-ime-lm</code>
              </MarkedItem>
              <MarkedItem marks={<RustIcon size={15} />} className="mt-2">
                <a href={CRATE_FFI} target="_blank" rel="noreferrer" className="font-mono">chinese-ime-lm-ffi</a>
                {t("：C ABI，提供静态库、动态库和头文件，C、C++、Swift、Kotlin（JNI）都能调用")}
              </MarkedItem>
              <MarkedItem marks={<GitHubIcon size={15} />} className="mt-2">
                <a href={FORMAT} target="_blank" rel="noreferrer">{t("模型文件格式规范")}</a>
                {t("：想用别的语言自己写加载器，只需要这一篇")}
              </MarkedItem>
            </ul>
            <p className="m-0 mt-3">
              {t("接入时，引擎要为每个候选回答两件事：它是否覆盖整段输入，它是不是引擎愿意采信的词典命中。这两点决定模型什么时候可以出手，库的 README 里写了理由和判断方法。权重训练自 C4 中文部分（ODC-BY）与 LCCC（MIT），语料署名写在权重文件里，再分发时要保留。")}
            </p>
          </NumberedSection>

          <Card as="section" tone="muted" className="mt-[clamp(28px,4vw,48px)] rounded-panel p-[clamp(24px,3.4vw,40px)]" aria-labelledby="model-source" data-reveal>
            <h2 id="model-source" className="m-0 font-heading text-[clamp(22px,2.4vw,26px)] leading-[1.4] font-bold text-ink">
              {t("源码与评测")}
            </h2>
            <p className="m-0 mt-3 max-w-[72ch] text-[15.5px] leading-[1.95] text-body">
              {t("语料、训练管线、评测集和参考实现都在 chinese-ime-lm 仓库里。评测集比任何一个模型都更值得先看：它把「这个改动好不好」从意见变成数字。")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AnchorButton href={REPO} size="md">
                <GitHubIcon size={16} />
                {t("chinese-ime-lm 仓库")}
              </AnchorButton>
              <AnchorButton href={MEASUREMENTS} variant="secondary" size="md">
                <GitHubIcon size={16} />
                {t("测量记录")}
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
