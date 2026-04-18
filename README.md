# TONIQ — AI-Powered DeFi Agent on TON

> Your AI-powered DeFi agent on TON — portfolio tracking, swap quotes, staking yields, and smart strategies in one chat.

## 🚀 Live Demo
[toniq-ten.vercel.app](https://toniq-ten.vercel.app)

## 🎯 What is TONIQ?
TONIQ is a mobile-first AI agent that helps TON users navigate DeFi without complexity. It tracks token prices, calculates staking yields, simulates swaps, and answers any DeFi question in plain English.

## ✨ Features
- **AI Agent** — Powered by Claude AI, answers DeFi questions with real live data
- **Market Overview** — Real-time token prices from STON.fi API
- **Portfolio Tracker** — Connect wallet via TON Connect, see real balances
- **Staking Calculator** — Live APY from Tonstakers, calculate yearly yields
- **Swap Simulation** — Get swap quotes powered by STON.fi price data
- **Transaction History** — Last 10 transactions from connected wallet

## 🔧 Tech Stack
- React + TypeScript + Vite
- Tailwind CSS
- TON Connect (wallet integration)
- STON.fi API (token prices, pools)
- Tonstakers SDK (staking APY)
- TonAPI (wallet balances, transactions)
- Claude AI / Anthropic API (AI agent)

## 🏆 Hackathon
Built for **STON.fi Vibe Coding Hackathon** (April 16–20, 2026)
- STON.fi Track: STON.fi API + Omniston SDK
- Tonstakers Track: Tonstakers APY integration

## 🛠 Run Locally
```bash
npm install
npm run dev
```

Add `.env`:
```
VITE_ANTHROPIC_API_KEY=your_key
```

## 🤖 AI Tools Used
- Google AI Studio (Gemini) — UI scaffold generation
- Claude Code — integrations and debugging
- Cursor — code editing
