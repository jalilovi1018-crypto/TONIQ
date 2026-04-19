import axios from 'axios';
import { fetchTopTokens } from './stonfi';

if (!import.meta.env.VITE_TONAPI_KEY) {
  console.warn(
    'TonAPI key not set — add VITE_TONAPI_KEY to .env for better rate limits. ' +
    'Get a free key at https://tonapi.io',
  );
}

const TONAPI_BASE_URL = 'https://tonapi.io/v2';
const NANO_TO_TON = 1e9;

function authHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_TONAPI_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

type JsonRecord = Record<string, unknown>;

interface TonApiAccountResponse {
  balance?: string | number;
  balance_usd?: string | number;
  usd_value?: string | number;
}

interface TonApiEventAction extends JsonRecord {
  type?: string;
}

interface TonApiEvent {
  event_id?: string;
  timestamp?: number | string;
  actions?: TonApiEventAction[];
}

interface TonApiEventsResponse {
  events?: TonApiEvent[];
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function extractActionAmount(action?: TonApiEventAction): number | null {
  if (!action) {
    return null;
  }

  const candidates: unknown[] = [];

  if ('amount' in action) {
    candidates.push(action.amount);
  }

  for (const value of Object.values(action)) {
    if (value && typeof value === 'object' && 'amount' in value) {
      candidates.push((value as { amount?: unknown }).amount);
    }
  }

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) {
      continue;
    }

    const parsed = toNumber(candidate);
    if (parsed !== 0 || candidate === 0 || candidate === '0') {
      return parsed;
    }
  }

  return null;
}

export async function fetchWalletBalance(address: string) {
  const response = await axios.get<TonApiAccountResponse>(
    `${TONAPI_BASE_URL}/accounts/${address}`,
    { headers: authHeaders() },
  );

  return {
    balance: toNumber(response.data.balance) / NANO_TO_TON,
    usd_value: toNumber(response.data.balance_usd ?? response.data.usd_value),
  };
}

// ── Jetton balances ───────────────────────────────────────────────────────────

interface TonApiJettonMeta {
  address?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  image?: string;
}

interface TonApiJettonBalanceItem {
  balance?: string | number;
  price?: { prices?: Record<string, number> };
  jetton?: TonApiJettonMeta;
}

interface TonApiJettonsResponse {
  balances?: TonApiJettonBalanceItem[];
}

export interface JettonBalance {
  symbol: string;
  name: string;
  balance: number;
  price_usd: number;
  image_url: string;
  usd_value: number;
}

export async function fetchJettonBalances(address: string): Promise<JettonBalance[]> {
  // Build STON.fi fallback price map (ignore errors — TonAPI prices are primary)
  const stonfiMap: Record<string, number> = {};
  try {
    const tokens = await fetchTopTokens();
    tokens.forEach(t => {
      const p = parseFloat(t.dex_price_usd);
      if (Number.isFinite(p)) stonfiMap[t.symbol.toUpperCase()] = p;
    });
  } catch { /* proceed without fallback */ }

  const response = await axios.get<TonApiJettonsResponse>(
    `${TONAPI_BASE_URL}/accounts/${address}/jettons`,
    { headers: authHeaders() },
  );

  return (response.data.balances ?? [])
    .map(item => {
      const meta     = item.jetton ?? {};
      const symbol   = String(meta.symbol ?? '');
      const name     = String(meta.name ?? symbol);
      const decimals = typeof meta.decimals === 'number' ? meta.decimals : 9;
      const balance  = toNumber(item.balance) / Math.pow(10, decimals);
      const apiPrice = item.price?.prices?.['USD'] ?? null;
      const price_usd = apiPrice ?? stonfiMap[symbol.toUpperCase()] ?? 0;
      return {
        symbol,
        name,
        balance,
        price_usd,
        image_url: String(meta.image ?? ''),
        usd_value: balance * price_usd,
      };
    })
    .filter(t => t.symbol !== '' && t.balance > 0)
    .sort((a, b) => b.usd_value - a.usd_value)
    .slice(0, 5);
}

export async function fetchTransactions(address: string) {
  const response = await axios.get<TonApiEventsResponse>(
    `${TONAPI_BASE_URL}/accounts/${address}/events`,
    {
      params: { limit: 10 },
      headers: authHeaders(),
    },
  );

  return (response.data.events ?? []).map((event) => {
    const firstAction = event.actions?.[0];

    return {
      event_id: event.event_id ?? '',
      timestamp: toNumber(event.timestamp),
      actions: {
        type: firstAction?.type ?? 'unknown',
        amount: extractActionAmount(firstAction),
      },
    };
  });
}
