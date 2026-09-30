import privacySource from "./content/privacy.md?raw";
import { ContentPage } from "./page-content";

export function PrivacyPage() {
  return (
    <ContentPage
      documentTitle="隐私说明 | 水杉输入法"
      description="水杉输入法隐私说明：哪些功能会联网、默认状态、如何全部关闭"
      kicker="隐私与数据"
      source={privacySource}
      contentId="privacy-content"
      contentClass="privacy-content"
      sectioned
    />
  );
}
