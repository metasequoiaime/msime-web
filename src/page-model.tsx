import type { ReactNode } from "react";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { textareaClass } from "./feedback/styles";
import { AnchorButton, Card, Container, LinkButton } from "./ui";
import { useLocale } from "./use-locale";
import { useReveal } from "./use-reveal";

const REPO = "https://github.com/metasequoiaime/chinese-ime-lm";
const MEASUREMENTS = `${REPO}/blob/main/docs/measurements.md`;
const FORMAT = `${REPO}/blob/main/docs/format.md`;
const MODEL_4M = "https://huggingface.co/metasequoiaime/pinyin-ime-reranker-4M";
const MODEL_25M = "https://huggingface.co/metasequoiaime/pinyin-ime-reranker-25M";
const CRATE = "https://crates.io/crates/chinese-ime-lm";
const CRATE_FFI = "https://crates.io/crates/chinese-ime-lm-ffi";

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

/** 神经联想页：chinese-ime-lm 整句重排模型做什么、实测效果与代价、在水杉输入法里怎么打开，以及给其他输入法开发者的库和模型。 */
export function ModelPage() {
  const { t } = useLocale();
  usePageMeta();
  useReveal();

  return (
    <>
      <PageHero
        kicker="开源模型"
        title="神经联想"
        lead="打一整句拼音时，引擎会拼出好几种读法。神经联想用一个只有几 MB 的字级语言模型，看着前文在这些读法里挑出更通顺的那一个。模型、代码和评测都开源，别的输入法也能直接用。"
      />
      <main className="w-full">
        <Container className="pt-[clamp(28px,4vw,48px)]">
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
              {t("样本只有 60 句，两个模型之间、以及它们和开源通用大模型之间的名次差异都在统计噪声里，不能当成质量排名。能确定的是体积和速度：")}
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
                  <a href={model.href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[14.5px]">
                    {t("在 Hugging Face 查看")}
                  </a>
                </Card>
              ))}
            </div>
            <p className="m-0 mt-3 text-[14px] text-muted">
              {t("耗时在 Apple M4 Pro 上用参考实现测得。完整的测量方法、负结果和与通用模型的对比见")}{" "}
              <a href={MEASUREMENTS} target="_blank" rel="noreferrer">
                {t("测量记录")}
              </a>
              {t("。")}
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
              {t("神经联想在客户端里默认关闭，因为它要在打字或停顿时多做一次模型计算。需要时在设置里打开：")}
            </p>
            <ul className="m-0 mt-3 list-disc pl-5">
              <li>{t("Windows：设置的输入页里有「神经网络模型整句（速度优先）」和「神经网络模型整句（效果优先）」两项，效果优先要先下载模型。")}</li>
              <li className="mt-1">{t("macOS、Linux：设置的输入页「候选与联想」一组里打开「桌面神经联想」，打开时会下载约 25 MB 的模型。")}</li>
              <li className="mt-1">{t("Android、iOS、鸿蒙手机：在「表达」页把「整句联想」从「标准」改成「增强」。")}</li>
            </ul>
            <p className="m-0 mt-3 text-muted">
              {t("模型只用于拼音输入。五笔版和日文、越南文、藏文这些单一方案的版本不带手机上用的模型，「整句联想」也就没有「增强」这一档。")}
            </p>
          </NumberedSection>

          <NumberedSection index={5} title="给输入法开发者" id="model-developers">
            <p className="m-0">
              {t("推理代码和权重都以 Apache-2.0 授权，链接到 MIT、BSD、Apache 许可的输入法里不会带来传染性义务。")}
            </p>
            <ul className="m-0 mt-3 list-disc pl-5">
              <li>
                <a href={CRATE} target="_blank" rel="noreferrer" className="font-mono">chinese-ime-lm</a>
                {t("：Rust 写的引擎直接依赖，")}
                <code className="rounded-md bg-panel px-1.5 py-px font-mono text-[13px] text-ink">cargo add chinese-ime-lm</code>
              </li>
              <li className="mt-1">
                <a href={CRATE_FFI} target="_blank" rel="noreferrer" className="font-mono">chinese-ime-lm-ffi</a>
                {t("：C ABI，提供静态库、动态库和头文件，C、C++、Swift、Kotlin（JNI）都能调用")}
              </li>
              <li className="mt-1">
                <a href={FORMAT} target="_blank" rel="noreferrer">{t("模型文件格式规范")}</a>
                {t("：想用别的语言自己写加载器，只需要这一篇")}
              </li>
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
                {t("chinese-ime-lm 仓库")}
              </AnchorButton>
              <AnchorButton href={MEASUREMENTS} variant="secondary" size="md">
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
