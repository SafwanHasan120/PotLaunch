# PotLaunch

**Invest in businesses. Share in their profits.**

PotLaunch is a Shariah-compliant, blockchain-backed investment platform built on the **Mudarabah** model — a form of Islamic profit-sharing finance. Founders raise capital from investors, and profits are distributed by mutual agreement with no interest or fixed returns.

🌐 **Live at:** [pot-launch.vercel.app](https://pot-launch.vercel.app)

---

## What is Mudarabah?

Mudarabah is an Islamic finance structure where one party provides capital (the investor) and another provides labor and management (the entrepreneur). Profits are shared according to a pre-agreed ratio, while losses are borne by the investor — no interest (Riba) is ever charged or paid.

PotLaunch automates this structure end-to-end using smart contracts and Stripe revenue oracles.

---

## How It Works

**1. Connect**
Founders list their business and connect a Stripe account. Revenue is tracked automatically through a Stripe oracle — no manual reporting required.

**2. Pitch**
Investors browse active campaigns and submit term proposals specifying their desired profit share. Founders review proposals and accept the terms that suit them. A smart contract is deployed on acceptance.

**3. Earn**
As the business generates revenue, the smart contract automatically calculates and distributes profit shares to investors — transparently, on-chain, with no intermediaries.

---

## Campaign Types

| Type | Description |
|---|---|
| **Local Business** | Restaurants, retail shops, and service businesses — community-rooted campaigns where you invest locally and share in neighbourhood success. |
| **Startup / Corporate** | Early-stage startups and established companies seeking scaled capital, with the same ethical profit-sharing structure. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js / TypeScript |
| **Styling** | CSS / Tailwind |
| **Database** | PostgreSQL (PL/pgSQL) |
| **Payments** | Stripe (revenue oracle) |
| **Smart Contracts** | Blockchain-based profit distribution |
| **Deployment** | Vercel |

---

## Project Structure

```
PotLaunch/
└── frontend/        # Next.js application (TypeScript)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase or PostgreSQL database
- Stripe account (for revenue tracking)

### Installation

```bash
# Clone the repository
git clone https://github.com/SafwanHasan120/PotLaunch.git
cd PotLaunch/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your database, Stripe, and blockchain credentials

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Core Features

- **Campaign creation** — Founders list businesses, set funding goals, and connect Stripe
- **Investor proposals** — Investors submit customized term proposals with their desired profit share
- **Smart contract deployment** — Contracts are auto-deployed when a founder accepts a proposal
- **Automated revenue distribution** — Stripe-integrated oracle pushes revenue data on-chain for transparent, automatic payouts
- **Two campaign categories** — Local business and startup/corporate
- **Shariah-compliant by design** — No fixed returns, no interest, profit-sharing only

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## License

This project is open source. See [LICENSE](LICENSE) for details.

---

*PotLaunch — Mudarabah-compliant · Blockchain-backed · Stripe-verified*
