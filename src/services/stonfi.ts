import axios from 'axios';

const STONFI_ASSETS_URL = 'https://api.ston.fi/v1/assets';

export interface Token {
  symbol: string;
  display_name: string;
  dex_price_usd: string;
  image_url: string;
}

interface StonFiAsset extends Partial<Token> {
  dex_price_usd?: string | null;
}

interface StonFiAssetsResponse {
  asset_list?: StonFiAsset[];
}

export async function fetchTopTokens(): Promise<Token[]> {
  const response = await axios.get<StonFiAssetsResponse>(STONFI_ASSETS_URL, {
    params: { limit: 20 },
  });

  return (response.data.asset_list ?? [])
    .filter(
      (asset): asset is StonFiAsset & { dex_price_usd: string } =>
        asset.dex_price_usd !== null &&
        asset.dex_price_usd !== undefined &&
        asset.dex_price_usd !== '',
    )
    .map((asset) => ({
      symbol: asset.symbol ?? '',
      display_name: asset.display_name ?? asset.symbol ?? '',
      dex_price_usd: asset.dex_price_usd,
      image_url: asset.image_url ?? '',
    }));
}
