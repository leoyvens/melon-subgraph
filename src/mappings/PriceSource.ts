import {
  PriceUpdate,
} from "../types/PriceSourceDataSource/PriceSourceContract";
import {
  Asset,
  AssetPriceUpdate,
} from "../types/schema";

function updateAssetPrices(event: PriceUpdate): void {
  let prices = event.params.price;
  let tokens = event.params.token;

  for (let i: i32 = 0; i < prices.length; i++) {
    let asset = Asset.load(tokens[i].toHex());
    if (!asset) {
      continue;
    }

    let id = event.transaction.hash.toHex() + "/" + asset.id;
    let price = new AssetPriceUpdate(id);
    price.asset = asset.id;
    price.price = prices[i];
    price.timestamp = event.block.timestamp;
    price.save();

    asset.lastPriceUpdate = event.block.timestamp;
    asset.save();
  }
}

export function handlePriceUpdate(event: PriceUpdate): void {
  updateAssetPrices(event);
}
