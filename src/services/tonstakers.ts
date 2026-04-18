import axios from 'axios';

const TONSTAKERS_RATES_URL = 'https://api.tonstakers.com/v1/rates';
const TONAPI_JETTON_URL =
  'https://tonapi.io/v2/jettons/0:b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe';

type JsonRecord = Record<string, unknown>;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getNestedNumber(source: unknown, path: string[]): number | null {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = (current as JsonRecord)[key];
  }

  return toNumber(current);
}

export async function fetchStakingAPY() {
  try {
    const response = await axios.get<JsonRecord>(TONSTAKERS_RATES_URL);
    console.log('tonstakers /v1/rates response:', response.data);

    return {
      apy:
        getNestedNumber(response.data, ['apy']) ??
        getNestedNumber(response.data, ['annual_percentage_yield']) ??
        4.8,
      tston_rate:
        getNestedNumber(response.data, ['tston_rate']) ??
        getNestedNumber(response.data, ['rate']) ??
        1.05,
    };
  } catch (err1) {
    console.error('tonstakers /v1/rates failed:', err1);

    try {
      const response = await axios.get<JsonRecord>(TONAPI_JETTON_URL);
      console.log('tonapi jetton response:', response.data);

      return {
        apy: 4.8,
        tston_rate:
          getNestedNumber(response.data, ['metadata', 'decimals']) ??
          getNestedNumber(response.data, ['total_supply']) ??
          1.05,
      };
    } catch (err2) {
      console.error('tonapi jetton fetch failed:', err2);
      return { apy: 4.8, tston_rate: 1.05 };
    }
  }
}
