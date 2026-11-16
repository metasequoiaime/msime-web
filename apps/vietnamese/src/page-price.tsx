import priceSource from "./content/price.md?raw";
import { ContentPage } from "./page-content";

export function PricePage() {
  return (
    <ContentPage
      documentTitle="价格 | 水杉输入法"
      description="水杉输入法价格说明"
      kicker="价格"
      source={priceSource}
      contentId="price-content"
      contentClass="price-content"
      sectioned
    />
  );
}
