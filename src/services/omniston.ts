export async function getSwapQuote(fromSymbol: string, toSymbol: string, amount: number) {
  try {
    const res = await fetch('https://api.ston.fi/v1/assets?limit=100');
    const data = await res.json();
    const assets = data.asset_list || [];

    const fromToken = assets.find((a: { symbol?: string }) =>
      a.symbol?.toUpperCase() === fromSymbol.toUpperCase()
    );
    const toToken = assets.find((a: { symbol?: string }) =>
      a.symbol?.toUpperCase() === toSymbol.toUpperCase()
    );

    if (!fromToken || !toToken) return null;

    const fromPrice = parseFloat(fromToken.dex_price_usd || '0');
    const toPrice = parseFloat(toToken.dex_price_usd || '0');

    if (!fromPrice || !toPrice) return null;

    const outputAmount = (amount * fromPrice) / toPrice;
    const priceImpact = 0.1;

    return {
      fromSymbol,
      toSymbol,
      amount,
      outputAmount: outputAmount.toFixed(4),
      priceImpact: priceImpact.toFixed(2),
      fromPrice: fromPrice.toFixed(4),
      toPrice: toPrice.toFixed(4),
      route: `${fromSymbol} → ${toSymbol} via STON.fi`,
    };
  } catch (e) {
    console.error('Swap quote error:', e);
    return null;
  }
}
