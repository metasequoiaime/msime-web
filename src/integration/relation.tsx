import { InlineCode } from "../code";
import { LocaleLink } from "../locale-link";
import { Card } from "../ui";
import { useLocale } from "../use-locale";

const MODEL_RELEASE = "https://github.com/metasequoiaime/chinese-ime-lm/releases/tag/model-v1";
const MODEL_4M = "https://huggingface.co/metasequoiaime/pinyin-ime-reranker-4M";

/** The two halves of the comparison. The engine comes first, unlike in the sub-navigation, because the model only works on what the engine produces. */
const SIDES = [
  {
    to: "/engine/",
    name: "引擎库",
    package: "msime-engine",
    role: "把拼音变成候选：切分音节、查词库、用词网格组出整句。它是输入法的主体，单独就能用。",
    license: "代码 MPL-2.0",
  },
  {
    to: "/model/",
    name: "神经联想",
    package: "chinese-ime-lm",
    role: "不转换拼音，也不产生候选：只在引擎已经组出的几种整句读法里，参照前面已经上屏的文字重新挑一句。它是可选的附加件，不开时引擎照样组句。",
    license: "推理库和权重 Apache-2.0",
  },
] as const;

/**
 * 神经联想与引擎库是什么关系：/model/ 和 /engine/ 两页顶部共用这一段，两边的说法因此不会对不上。
 *
 * 事实出处（msime 的 develop 分支与 chinese-ime-lm 的 main 分支）：引擎的整句和 `SentenceAssociationOptions::neural_keyboard` 见 crates/engine/README.md 与 src/types.rs（模型挑中的整句作为一行排在词格最好的整句之后），模型文件名与位置见 src/assets.rs 和 docs/data-formats.md §1、§15、§19，数据包不含它见 crates/engine-capi/packaging/data-pack.py，C 接口不含神经重排见 crates/engine-capi/README.md，许可证见两个仓库的 README。
 */
export function ModelEngineRelation({ current }: { current: "/model/" | "/engine/" }) {
  const { t } = useLocale();
  return (
    <Card as="section" tone="muted" className="mt-[clamp(20px,3vw,32px)] mb-[clamp(8px,1.5vw,16px)] rounded-panel p-[clamp(20px,3vw,32px)]" aria-labelledby="model-engine-relation">
      <h2 id="model-engine-relation" className="m-0 font-heading text-[clamp(19px,2vw,22px)] leading-[1.4] font-bold text-ink">
        {t("神经联想和引擎库是什么关系")}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SIDES.map((side) => (
          <div key={side.to} className="min-w-0 rounded-field bg-panel p-4 shadow-hair">
            <p className="m-0 flex flex-wrap items-baseline gap-x-2 font-heading text-[17px] font-bold text-ink">
              {side.to === current ? t(side.name) : <LocaleLink to={side.to}>{t(side.name)}</LocaleLink>}
              <span className="font-code text-[13px] font-normal text-muted">{side.package}</span>
            </p>
            <p className="m-0 mt-2 text-[15px] leading-[1.85] text-body">{t(side.role)}</p>
            <p className="m-0 mt-2 text-[13.5px] text-muted">{t(side.license)}</p>
          </div>
        ))}
      </div>
      <ul className="m-0 mt-4 list-disc pl-5 text-[15px] leading-[1.9] text-body marker:text-accent-ink">
        <li>
          {t("Rust 库已经内置神经联想：打开 ")}
          <InlineCode>SentenceAssociationOptions::neural_keyboard</InlineCode>
          {t("，把模型文件 ")}
          <InlineCode>sentence-model.safetensors</InlineCode>
          {t(" 放在数据目录顶层，已上屏的文字经 ")}
          <InlineCode>Session::set_rescoring_context</InlineCode>
          {t(" 交给引擎；模型挑中的整句排在引擎自己最好的那句之后。数据包里没有这个模型，要从 chinese-ime-lm 的 ")}
          <a href={MODEL_RELEASE} target="_blank" rel="noreferrer">model-v1</a>
          {t(" 发布或 Hugging Face 的 ")}
          <a href={MODEL_4M} target="_blank" rel="noreferrer">pinyin-ime-reranker-4M</a>
          {t(" 下载。")}
        </li>
        <li className="mt-1.5">{t("C 接口（ABI 1.1）还没有开放神经联想。")}</li>
        <li className="mt-1.5">{t("不用水杉引擎的输入法，可以单独用 chinese-ime-lm 给自己的候选重排。")}</li>
      </ul>
    </Card>
  );
}
