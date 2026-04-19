# TONIQ — AI-powered DeFi Agent on TON

> One AI agent for everything DeFi on TON — live prices, swap quotes, staking yields, portfolio tracking, and smart strategies in plain English.

## What is TONIQ

TON DeFi is fragmented across a dozen apps — you need one tab for prices, another for swaps, another for staking, and a spreadsheet to track your portfolio. TONIQ solves this by putting everything behind a single AI chat interface. Ask "swap 10 TON to USDT", "what's my staking yield?", or "give me a DeFi briefing" — the agent pulls live on-chain data and answers instantly, with one-tap execute buttons that route directly to STON.fi or Tonstakers.

## Features

- **🏠 Home** — Portfolio overview with live wallet balance and jetton holdings, DeFi Briefing shortcut, Share Portfolio, Active Price Alerts with progress bars, My Strategies
- **📈 Market** — Live token prices from STON.fi, Watchlist with star/unstar, Trending tokens, Gainers & Losers sections, full-text search
- **🤖 TONIQ Chat** — AI agent powered by Claude with live market data; handles swap quotes (routed via STON.fi), price alert creation, strategy builder, portfolio analysis, multi-chat history
- **💰 Earn** — Tonstakers staking APY (live), compound growth calculator (1/3/6/12 months), Liquidity Pools via STON.fi API

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS v4 |
| AI Agent | Claude Haiku (Anthropic API) |
| Token Prices & Pools | STON.fi API (`api.ston.fi/v1`) |
| Swap Routing | Omniston SDK |
| Staking | Tonstakers SDK |
| Wallet Auth | TON Connect UI React |
| On-chain Data | TonAPI v2 (balances, jettons, transactions) |
| Deployment | Vercel |
| PWA | Web App Manifest + Apple PWA meta tags |

## AI Tools Used

- **Claude (Anthropic)** — AI agent intelligence + coding assistant (Claude Code)
- **Google AI Studio (Gemini)** — initial UI scaffolding
- **Google Antigravity** — code editor

## Quick Start

```bash
git clone https://github.com/jalilovi1018-crypto/TONIQ
cd toniq
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev
```

## Environment Variables

```env
VITE_ANTHROPIC_API_KEY=      # Anthropic Claude API key
VITE_TONAPI_KEY=             # TonAPI key (optional — rate-limited without it)
```

## Live Demo

**[toniq-ten.vercel.app](https://toniq-ten.vercel.app)**

## Hackathon

Built for the **STON.fi Vibe Coding Hackathon**, April 16–20, 2026.
Submitted to both the **STON.fi track** (STON.fi API + Omniston SDK) and the **Tonstakers track** (live staking APY + compound calculator).
