# SwiftShield — AI-Powered Income Protection for Q-Commerce Delivery Workers

> Parametric micro-insurance for Zepto, Blinkit & Swiggy Instamart delivery partners. Instant payouts. Zero paperwork. Built for India's gig workforce.

---

## Problem Addressed

Q-commerce delivery workers (Zepto, Blinkit, Swiggy Instamart) operate on 10-minute delivery SLAs across India's metro cities. A single weather disruption or curfew can collapse an entire work slot — with no safety net.

Existing insurance products are too slow, too complex, and too expensive for daily-wage gig workers. Workers lose ₹200–500 per disruption event with zero recourse. SwiftShield solves this with automated, **parametric income protection**: when a trigger event is detected in a worker's zone, the system validates, approves, and pays out — in minutes, not days, and without any manual claim filing.

**Target persona:** Zepto, Blinkit, and Swiggy Instamart delivery partners, primarily in metro cities (Mumbai, Delhi NCR, Bengaluru, Hyderabad), earning ₹400–800/day.

---

## Persona Scenario — A Day in Ramesh's Life

Ramesh is a Blinkit delivery partner in Bengaluru's Koramangala zone. He earns around ₹600/day on a good shift and has the Shield plan active for the week (₹59 premium).

At 8:40 PM on a Tuesday, heavy rainfall crosses the 15 mm/hr threshold in his zone. SwiftShield's trigger engine detects the alert within 10 minutes. Because Ramesh was already on-duty, the system automatically generates a pre-filled claim draft and surfaces a single confirmation prompt:

> *"We detected a heavy rain alert in your zone. Confirm impact to receive payout."*

Ramesh taps confirm. The 4-layer fraud check runs in the background — GPS zone match passes, Blinkit session proof confirms he was active before the trigger, no cooling window violation, and his ML anomaly score is low. The claim is auto-approved. Within 30 minutes, ₹85 is credited to his UPI-linked account and he receives an SMS confirmation.

**Ramesh did not file a claim. He did not read a policy document. He did not call anyone. The system did it for him.**

---

## Platform Choice: Web App

SwiftShield is built as a **web application** (Next.js) rather than a native mobile app. This choice is deliberate:

- Workers access the dashboard from any device (smartphone browser, shared device) without requiring an app install
- Web allows rapid iteration without native build overhead
- Progressive Web App (PWA) capabilities give a near-native mobile feel
- Admin/insurer dashboard is better suited to a web interface

---

## Insurance Policy

### 1. Coverage Scope

SwiftShield provides **AI-powered parametric income protection** for Q-commerce delivery workers (Blinkit, Zepto, Instamart).

✔ Covers: Income loss due to external disruptions
❌ Does NOT cover: Health, accidents, life insurance, vehicle damage, or personal negligence

---

### 2. Weekly Plan Tiers

| Plan | Premium | Coverage | Daily Cap | Triggers | Claim Wait |
|------|---------|----------|-----------|----------|------------|
| **Starter** | ₹29/week | 50% income loss | ₹500 | Rain, Heat | 2 hrs |
| **Shield** | ₹59/week | 70% income loss | ₹1,200 | Weather + Curfew | 1 hr |
| **Pro** | ₹99/week | 90% income loss | ₹2,000 | All + Platform Outage | 30 min |

---

### 3. Parametric Triggers

| ID | Trigger | Condition | Data Source | Payout |
|----|---------|-----------|-------------|--------|
| T1 | Heavy Rainfall | Rainfall > 15 mm/hr | IMD API | ₹85/hr lost |
| T2 | Extreme Heat | Temp > 42°C for 3+ consecutive hours | OpenWeatherMap | ₹70/hr lost |
| T3 | Flash Flood / Waterlogging | Flood sensor + GPS zone match | Flood sensor feed | ₹100/hr lost |
| T4 | Severe Cold / Dense Fog | Visibility < 50m or temp < 5°C | OpenWeatherMap | ₹70/hr lost |
| T5 | Curfew / Civil Strike | Govt. advisory API + GPS zone blockage confirmed by platform APIs | Govt. advisory + platform APIs | ₹90/hr lost |
| T6 | Platform Outage *(Pro only)* | Delivery platform unavailable > 30 mins (order API failure rate > threshold) | Platform status APIs / simulated logs | ₹90/hr lost |

> **Note on T6 (Pro Only):** In the demo, T6 uses simulated platform status logs and synthetic order API failure rate data. In production, this would be validated through public platform status pages (e.g., status.blinkit.com), order API failure rate monitoring, and cross-worker signal correlation — if >30% of active workers in a zone stop receiving orders simultaneously, that constitutes evidence of a platform disruption.

---

### 4. Payout Calculation

Payout amounts are dynamically calculated using the following AI inputs:

- Worker earnings history
- Time slot demand (breakfast / lunch / dinner)
- Location-based order density
- Platform activity at the time of disruption

---

### 5. Eligibility Criteria

To receive a payout, the worker must:

- Be **active** (logged into platform) at the time of disruption
- Be **present in the affected zone**
- Be **available for orders**
- Pass all **fraud validation checks**

---

### 6. Standard Exclusions

The following are **not covered**: war, terrorism, pandemic, intentional misuse, and personal unavailability.

---

### 7. Claim Process

- Fully **automated** — no manual filing required
- Flow: Trigger detected → AI validation → Instant UPI payout
- Worker receives SMS confirmation on payout

---

### 8. Claim Rejection Conditions

Claims will be rejected if:

- Worker was not active during the disruption
- Location mismatch is detected
- Fraud signals are triggered
- Duplicate claim is submitted for the same event

---

### 9. Coverage Limits

- Daily payout is capped per plan (see plan tiers above)
- Weekly max payout = 3× the daily cap

---

### 10. Pause + Credit Wallet

SwiftShield offers a flexible wallet system tailored for gig workers:

- Workers can **pause their policy anytime** (except during an active claim window or disruption)
- **Unused premium** is converted into wallet credit
- Wallet balance can be used toward **future premium payments only** (non-withdrawable)

**Example:**
- Weekly premium: ₹100 | Used for 3 days → 4 days unused
- ₹60 credited to wallet
- Next week's premium: ₹90 → worker pays only ₹30 from wallet

---

## Fraud Detection & Validation Framework

SwiftShield uses a **multi-layer intelligent fraud detection system** to ensure payouts are made only to genuine, active workers.

### 4-Layer Claim Approval System

Every claim must pass all four layers before auto-approval:

| Layer | Validation |
|-------|-----------|
| **Layer 1** | GPS zone polygon match — worker within 500m of disruption zone boundary |
| **Layer 2** | Platform activity validation — Zepto, Blinkit, or Swiggy Instamart APIs must confirm an active session existed before the trigger fired |
| **Layer 3** | Presence before disruption — worker must have been in the zone before the alert, preventing entry after trigger |
| **Layer 4** | ML anomaly score — claim frequency vs. pin-code peer group (Isolation Forest model) |

### Detection Capabilities

| Signal | Genuine Worker | Suspicious Behavior |
|--------|---------------|---------------------|
| Movement | Continuous, realistic | Static or impossible speed jumps |
| Activity | Active orders | No real order activity |
| Timing | Present before event | Appears only after trigger |
| Claim frequency | Normal for zone | Burst claims or repeated max claims |

### Fraud Ring Detection

Coordinated attacks are identified by:

- Multiple workers filing near-identical claims (same zone, time window, duration)
- Sudden claim spikes across a zone
- Cluster analysis on behavioral features

**Liquidity circuit breaker:** During a detected burst, payouts in the affected zone are temporarily queued (not rejected) while fraud analysis runs. Genuine workers' claims are preserved and paid after validation.

### Fairness for Honest Workers

- **Medium-risk claims** → soft-hold (not outright rejection)
- **Step-up verification**: worker keeps location active for 5–10 minutes, or taps a one-tap live check-in
- Claims released after verification passes

---

## Advanced Anti-Spoofing & Adversarial Defense

SwiftShield is designed to handle sophisticated fraud attempts such as **GPS spoofing and coordinated ring attacks** that standard single-signal systems cannot catch.

### Multi-Dimensional Signal Validation

Fraud defense goes well beyond GPS. Every claim is evaluated across multiple independent data dimensions:

| Signal Category | What's Checked |
|----------------|----------------|
| **Movement trajectory** | Anti-teleport check, impossible speed detection, jitter profile analysis |
| **Network corroboration** | Coarse IP geolocation vs. declared zone/city, ASN and carrier consistency, latency heuristics |
| **Device integrity** | Mock-location and developer mode flag detection, emulator / rooted device indicators, device fingerprint consistency across claims |
| **Platform activity proofs** | On-duty status from Zepto / Blinkit / Instamart API, last delivery timestamp, heartbeat continuity leading up to the event |

A fraudster who successfully spoofs GPS still needs to pass network, device, and platform checks — all independently.

### GPS Spoofing Defense Strategy

A coordinated fraud ring can spoof GPS locations to mass-drain the liquidity pool. SwiftShield counters this by requiring **all 4 fraud layers to pass** before any auto-approval is issued:

| Layer | Check |
|-------|-------|
| **Layer 1** | GPS zone polygon match — worker within 500m of disruption zone boundary |
| **Layer 2** | Multi-platform session validation — Zepto, Blinkit, and/or Swiggy Instamart APIs must confirm an active session existed *before* the trigger fired |
| **Layer 3** | 48-hour cooling window — no repeat claims within 48 hrs of last payout |
| **Layer 4** | ML anomaly score — claim frequency vs. pin-code peer group (Isolation Forest) |

### Duplicate Claim Prevention

- **Idempotency key:** De-duplication by `(workerId, triggerType, disruptionId/time-window)` — the same event cannot generate two payouts for the same worker
- **48-hour cooling window:** No new claim accepted for 48 hours after any payout to the same worker ID
- **Cross-worker ring detection:** Many workers filing near-identical claims (same time window, duration, zone) triggers a coordinated fraud alert

### AI-Driven Anomaly Detection

- **Isolation Forest** → detects individual behavioral anomalies without requiring labelled fraud data
- **Clustering techniques** → identify coordinated fraud groups
- **Dynamic thresholds** → tighten automatically during suspicious claim spikes in a zone; calibrated per pin-code peer group, not globally, to avoid penalising workers in genuinely high-disruption zones

### Liquidity Protection Mechanism

During a detected ring burst:

1. Payouts for the affected zone are **temporarily queued** (not rejected)
2. Fraud analysis runs across all queued claims
3. Genuine workers are paid in full once the burst is resolved
4. Fraudulent claims are rejected with reason logged

This ensures honest workers are never permanently penalised by the actions of bad actors in their zone.

---

## Features

### 1. AI-Powered Risk Assessment

#### Dynamic Weekly Premium Engine

Premiums recalculate every Sunday using a **Gradient Boosting (XGBoost)** model.

**Inputs:**
- Zone flood and heat history
- 7-day weather forecast risk (OpenWeatherMap)
- Worker's 4-week earnings average
- Historical claim rate by pin code
- Seasonal strike/curfew frequency
- City-tier risk factor (metro vs. tier-2)
- Vehicle type and platform risk profile

**Outputs:**
- `weeklyPremium` (₹)
- Human-readable explanation of the top 3 pricing factors
- Week-on-week premium delta (fairness cap applied to prevent sudden spikes)

**Cold start:** For new workers with no claim history, the model falls back to a pin-code peer group prior — the average premium and risk profile of workers in the same zone and platform. This prior updates over the worker's first 4 weeks.

#### Persona-Based Weekly Risk Score

Each worker receives a `weeklyRiskScore` (0–100) with a plain-language breakdown:

| Component | Source |
|-----------|--------|
| Weather exposure risk | Assigned zone + current season |
| Traffic risk | Zone congestion patterns + typical shift timing |
| Behavior risk | Delivery activity patterns, active hours, volume |
| Fraud risk | Claim frequency vs. pin-code peer group, past anomaly flags |

---

### 2. Parametric Automation

#### Real-Time Trigger Monitoring

The trigger engine polls all data sources **every 10 minutes** and evaluates threshold rules per delivery zone.

**Data sources polled:**
- IMD API / OpenWeatherMap — rainfall rate, temperature, visibility, fog
- Flood sensor feed — waterlogging + GPS zone cross-match
- Government advisory API — curfew and civil strike alerts

Each zone carries an active disruption state: `start_time`, `severity` (green / amber / red), `end_time`.

#### Automatic Claim Initiation

When a red-alert disruption is detected, the system automatically:
1. Identifies all active policyholders in that zone who were on-duty during the trigger window
2. Generates a pre-filled draft claim (trigger type, time window, estimated lost hours)
3. Surfaces a confirmation prompt on the worker's dashboard

#### Payout State Machine

```
pending → approved → processing → paid
                           ↓
                        rejected (fraud)
```

- Auto-approved claims: UPI payout initiated via Razorpay sandbox within minutes
- Dashboard and SMS updated on confirmation
- Rejected claims: reason displayed with option to appeal

---

### 3. Analytics Dashboard

#### Worker View
- Total income protected this week (₹ amount covered by active claims)
- Active plan and weekly premium paid
- Weekly risk score with top 3 plain-language drivers
- Claim history — trigger type, payout amount, status, timestamp

#### Admin / Insurer View
- Zone-level heatmap of active disruptions and claim density
- Loss ratio per zone (total payouts / total premiums collected)
- Fraud queue — soft-hold claims with anomaly scores and flagged signals
- Predictive analytics: next week's projected claim volume by zone (weather-forecast-driven)
- Liquidity pool health — daily payout burn rate vs. pool balance
- Ring detection alerts — coordinated claim bursts flagged for manual review

---

## Onboarding Flow

Designed to take **under 2 minutes on a mobile browser**, with zero document uploads.

| Step | Action |
|------|--------|
| 1 | **Platform selection** — choose Zepto, Blinkit, or Swiggy Instamart |
| 2 | **Phone OTP login** — 6-digit OTP, no password or email required |
| 3 | **Zone & vehicle** — enter delivery pin code and vehicle type (2-wheeler / e-bike) |
| 4 | **Plan selection** — view personalised weekly premium per tier with top 3 risk drivers explained |
| 5 | **UPI linking** — link UPI ID for payouts (only financial detail collected) |
| 6 | **Activation** — confirm plan; first week's premium deducted and coverage begins immediately |

---

## End-to-End Claim Flow

```
IMD / OpenWeather          Flood Sensor Feed          Govt. Advisory API
   (rain, temp, fog)        (waterlogging + GPS)       (curfew / strike)
         │                         │                          │
         └─────────────────────────┴──────────────────────────┘
                                   │
                       ┌───────────▼────────────┐
                       │   Real-time Trigger    │
                       │   Engine (polls 10 min)│
                       └───────────┬────────────┘
                                   │ Disruption event raised
                       ┌───────────▼────────────┐
                       │   Fraud Detection      │
                       │   4-layer check        │
                       │   (all 4 must pass)    │
                       └──────┬────────┬────────┘
                           Pass       Flag
                    ┌────────▼──┐  ┌───▼──────────────┐
                    │  Auto-    │  │  Manual Review   │
                    │  Approved │  │  Queue (admin)   │
                    └────────┬──┘  └──────────────────┘
                             │
                    ┌────────▼──────────┐
                    │  Instant Payout   │
                    │  UPI / Razorpay   │
                    │  Dashboard + SMS  │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │  Analytics        │
                    │  Worker: earnings │
                    │  Admin: heatmaps  │
                    └───────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js + Tailwind CSS |
| **Backend** | Node.js / Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **AI / ML** | Python + FastAPI |
| **ML Libraries** | Scikit-learn (XGBoost for pricing, Isolation Forest for fraud/risk) |
| **Maps** | Mapbox / Google Maps |
| **Payments** | Razorpay Test / Sandbox |
| **Auth** | Supabase Auth |
| **Hosting** | Vercel (frontend) + Render (Python ML service) |

---

## Integration Adapters

All integrations follow an **adapter pattern** — mock providers are used in the demo, and real providers can be swapped in without changing application logic.

| Integration | Demo Provider | Production Provider |
|-------------|--------------|---------------------|
| Weather data | Mock + OpenWeatherMap free tier | IMD API, OpenWeatherMap paid |
| Flood / waterlogging | Mock sensor feed | Municipal flood sensor networks |
| Curfew / civil strike | Mock advisory feed | Government advisory APIs |
| Platform session proof | Simulated adapter | Zepto, Blinkit, Swiggy Instamart Partner APIs |
| Payments | Razorpay sandbox | Razorpay live, UPI rails |
| Auth | Supabase Auth + OTP simulation | Supabase Auth + real SMS OTP |

---

## Development Plan

| Week | Theme | Focus | Key Deliverable |
|------|-------|-------|-----------------|
| W1 (Mar 4–10) | Foundation | DB schema, Supabase auth, OTP login, zone/platform data model | Working `/login` route, schema committed |
| W2 (Mar 11–20) | Ideation | Premium engine (mock ML), trigger engine skeleton, dashboard wireframes | README + prototype video by Mar 20 |
| W3 (Mar 21–27) | Automation | Trigger polling, mock API adapters, claim state machine | Live trigger → claim flow demo |
| W4 (Mar 28–Apr 4) | Protection | Dynamic premium ML (XGBoost), risk score, Razorpay sandbox payout | End-to-end claim → payout demo |
| W5 (Apr 5–11) | Scale | Isolation Forest fraud model, GPS validation, ring detection, circuit breaker | Fraud detection demo with spoofing scenario |
| W6 (Apr 12–17) | Polish | Admin dashboard, analytics heatmaps, final pitch deck, 5-min demo video | Final submission package |

---

## Demo Routes

| Route | Description |
|-------|-------------|
| `/login` | Platform selection (Zepto / Blinkit / Swiggy Instamart) + OTP login simulation |
| `/dashboard` | Worker view — active plan, weekly premium, risk score + drivers, claim history, payouts |
| `/simulate` | Trigger zone disruptions, submit claims, and view fraud validation outcome |

---

## Privacy & Compliance

### Data Collected
GPS location, IP address, work activity (orders, login time), earnings history, device metadata.

### Data Usage
Risk scoring, claim validation, fraud detection, and premium calculation.

### Data Sharing
Data may be shared with insurance providers, platform partners (Blinkit, Zepto, Instamart), and fraud detection systems. **Personal data is never sold.**

### Data Security
Encrypted storage, secure APIs, and role-based access control.

### User Rights
Users can request data deletion or opt out (policy becomes inactive on opt-out).

### Compliance Model
SwiftShield operates as a fully parametric insurance model with no manual claims, transparent payout logic, and weekly pricing aligned with the gig economy.

---

## Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.