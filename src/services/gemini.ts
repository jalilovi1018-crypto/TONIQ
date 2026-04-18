export async function askTONIQ(
  userMessage: string,
  context: {
    prices?: unknown[];
    walletBalance?: unknown;
    stakingAPY?: unknown;
    swapQuote?: unknown;
    walletAddress?: string;
  }
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  const systemPrompt = `You are TONIQ, an AI DeFi agent on the TON blockchain.
You help users understand their portfolio, token prices, and staking yields.
Be very concise — max 3-4 sentences per response. Always cite specific numbers from the context provided. Never say you don't have data if it exists in the context. If walletAddress is present in context, mention that you can see the user's connected wallet and reference it naturally.
Current live data: ${JSON.stringify(context)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Claude API error:', err);
    throw new Error('API failed');
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? 'No response';
}
