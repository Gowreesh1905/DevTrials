# SwiftShield — AI-Powered Income Protection for Q-Commerce Delivery Workers

> Parametric micro-insurance for Zepto, Blinkit & Swiggy Instamart delivery partners. Instant payouts. Zero paperwork. Built for India's gig workforce.

---

## Problem Addressed

Q-commerce delivery workers (Zepto, Blinkit, Swiggy Instamart) operate on 10-minute delivery SLAs across India's metro cities. A single weather disruption or curfew can collapse an entire work slot — and there is no safety net.

Existing insurance products are too slow, too complex, and too expensive for daily-wage gig workers. Workers lose ₹200–500 per disruption event with zero recourse. SwiftShield solves this with automated, parametric income protection: when a trigger event is detected in a worker's zone, the system validates, approves, and pays out — in minutes, not days, and without any manual claim filing.

**Target persona:** Zepto, Blinkit, and Swiggy Instamart delivery partners, primarily in metro cities (Mumbai, Delhi NCR, Bengaluru, Hyderabad), earning ₹400–800/day, working across all hours including late nights.

---

## Platform Choice: Web App

SwiftShield is built as a **web application** (Next.js) rather than a mobile app. This choice is deliberate:

- Workers access the dashboard from any device (smartphone browser, shared device) without requiring an app install
- Web allows rapid iteration during the hackathon without native build overhead
- Progressive Web App (PWA) capabilities give a near-native feel on mobile
- Admin/insurer dashboard is better suited to a web interface

---

## Insurance Policy

### Coverage Scope

SwiftShield protects **income lost during qualifying external disruptions only.**
It does not cover health, life, accidents, or vehicle repair. Zero ambiguity.

### Weekly Plan Tiers

| Plan | Premium | Weekly Cap | Triggers Covered | Payout Rate | Claim Wait |
|---|---|---|---|---|---|
| **Starter** | ₹29 / week | ₹500 | Heavy rain + flood only | ₹70/hr, max 4 hrs/day | 2 hrs post-trigger |
| **Shield** | ₹59 / week | ₹1,200 | All 4 weather + curfew | ₹85/hr, max 6 hrs/day | 1 hr post-trigger |
| **Pro** | ₹99 / week | ₹2,000 | All 4 weather + curfew | ₹100/hr, max 8 hrs/day | 30 min post-trigger |

All tiers are priced below a worker's daily tip income to maximise adoption. Premiums recalculate every Sunday.

### Parametric Triggers — 6 Defined Events

| Trigger | Condition | Data Source | Payout | Access |
|---|---|---|---|---|
| **T1 · Heavy Rainfall** | Rainfall > 15 mm/hr | IMD API | ₹85/hr lost | Standard |
| **T2 · Extreme Heat** | Temp > 42°C for 3+ consecutive hours | OpenWeatherMap API | ₹70/hr lost | Standard |
| **T3 · Flash Flood / Waterlogging** | Flood sensor + GPS zone match | Flood sensor feed | ₹100/hr lost | Standard |
| **T4 · Severe Cold / Dense Fog** | Visibility < 50m or temp < 5°C | OpenWeatherMap API | ₹70/hr lost | Standard |
| **T5 · Curfew / Civil Strike** | Govt. advisory API + GPS zone blockage confirmed by Zepto, Blinkit & Swiggy Instamart APIs | Govt. advisory API + multi-platform APIs | ₹100/hr lost | Standard |
| **T6 · Platform Outage / App Downtime** | Delivery platform services unavailable > 30 mins (order API failure rate > threshold) | Platform status APIs / simulated logs | ₹90/hr lost | **Pro Plan Only** |

> **Note on T6 (Pro Only):** In the demo, T6 uses simulated platform status logs and synthetic order API failure rate data. In production, this trigger would be validated through public platform status pages (e.g., status.blinkit.com), order API failure rate monitoring as a proxy, and cross-worker signal correlation — if >30% of active workers in a zone stop receiving orders simultaneously, that constitutes evidence of a platform disruption independent of any partner API access.
---

**Payout formula:** `payout = hourly_rate × eligible_hours` subject to waiting period, daily hour cap, and weekly coverage cap.


## Features

### 1. AI-Powered Risk Assessment

#### 1.1 Dynamic Weekly Premium Engine

Premiums are not static — they recalculate every Sunday using an ML model.

**Inputs to the pricing engine:**
- Worker's operating zone flood and heat history
- Upcoming 7-day weather forecast risk (from OpenWeatherMap)
- Worker's 4-week earnings average (baseline)
- Historical claim rate in the worker's pin code
- Seasonal strike/curfew frequency for the city
- City-tier risk factor (metro vs tier-2)
- Vehicle type and platform (Zepto / Blinkit / Swiggy Instamart) risk profile

**Outputs:**
- `weeklyPremium` (₹) — the amount charged for the coming week
- Human-readable explanation of the top 3 factors that drove the premium
- Premium change delta from previous week (with fairness cap on sudden spikes)

**Fairness constraints:**
- Hard floor and ceiling on weekly premium per tier
- Week-on-week change is capped to prevent sudden premium spikes
- All factors and reasoning are shown transparently on the worker dashboard

#### 1.2 Persona-Based Predictive Risk Score

Each worker receives a `weeklyRiskScore` (0–100) with a breakdown of what's driving it.

**Score components:**
- **Weather exposure risk** — based on assigned zone + current season
- **Traffic risk** — based on zone congestion patterns + typical shift timing
- **Behavior risk** — delivery activity patterns, active hours, delivery volume
- **Fraud risk** — claim frequency relative to pin-code peer group, past anomaly flags

**Dashboard display:** Top 3 risk drivers are shown to the worker in plain language (e.g., "Your zone has high monsoon flood risk this week"). This drives transparency and encourages plan upgrades when risk is elevated.

---

### 2. Intelligent Fraud Detection

SwiftShield assumes GPS verification alone is insufficient. Fraud defense is multi-signal, ring-aware, and designed to be fair to honest workers.

#### 2.1 Claim Anomaly Scoring

Every claim is scored by an ML model (`claimRiskScore`, 0–100) before a payout decision is made.

**Anomaly signals evaluated:**
- Burst claims in a short time window (frequency spike)
- Repeated "max duration" claims (always claiming the maximum eligible hours)
- Claiming immediately after every trigger fires (pattern inconsistency)
- Claim duration inconsistent with actual disruption timeline
- Payout request unusually high relative to the worker's earnings baseline
- Claim frequency more than 2σ above pin-code peer group

**Adaptive thresholds:** During mass fraud bursts (ring activity), thresholds tighten automatically across the affected zone.

**Decision outcomes:**
- ✅ **Auto-approve** — low risk score, instant payout
- ⏳ **Soft-hold / Pending** — medium risk or missing telemetry; step-up verification requested
- ❌ **Reject** — multiple independent signals indicate spoofing or ring behavior

#### 2.2 Location & Activity Validation (Multi-Signal, Beyond GPS)

**Location integrity checks:**
- Trajectory plausibility — anti-teleport check, impossible speed detection
- GPS accuracy and jitter profile analysis
- "Presence before disruption" — worker must have been in the zone before the alert, not appearing instantly after it fired

**Network corroboration (mocked for demo):**
- Coarse IP geolocation vs declared zone/city
- ASN and carrier consistency checks
- Latency heuristics as rough proximity indicator

**Device/app integrity (simulated):**
- Mock-location and developer mode flag detection
- Emulator, rooted, or jailbroken device indicators
- Device fingerprint consistency across claims

**Platform activity proofs (simulated):**
- On-duty / online status from Zepto, Blinkit, or Swiggy Instamart platform API
- Last delivery/order timestamp
- Heartbeat continuity — not just claim-time location, but activity leading up to the event

#### 2.3 Duplicate Claim Prevention

- **Idempotency key:** De-duplication by `(workerId, triggerType, disruptionId/time-window)` — the same event cannot generate two payouts
- **48-hour cooling window:** No new claim accepted for 48 hours after any payout to the same worker ID
- **Cross-worker ring detection:** Many workers filing near-identical claims (same time window, same duration, same zone) triggers coordinated fraud alerts

#### 2.4 Adversarial Defense — GPS Spoofing Strategy

A coordinated fraud ring can GPS-spoof their way into a red-alert zone and mass-drain the liquidity pool. SwiftShield defends against this by requiring **all 4 fraud layers to pass** before auto-approval:

| Layer | Check |
|---|---|
| **Layer 1** | GPS zone polygon match — worker within 500m of disruption zone boundary |
| **Layer 2** | Multi-platform session validation — Zepto, Blinkit, and/or Swiggy Instamart APIs must confirm an active worker session existed before the trigger fired |
| **Layer 3** | 48-hour cooling window — no repeat claims within 48 hrs of last payout |
| **Layer 4** | ML anomaly score — claim frequency vs pin-code peer group (flags if > 2σ above baseline) |

**Liquidity circuit breaker:** During ring burst detection, payouts for the affected zone are temporarily queued (not rejected) while the fraud investigation runs. Honest workers' claims are preserved and paid once the burst is resolved.

**Fair step-up UX for borderline cases:**
- Soft-hold (not reject) — avoid punishing honest workers during real network outages
- "Keep location sharing on for 5–10 minutes" (passive verification)
- One-tap live check-in for medium-risk claims
- Selfie/video prompt only for repeat or high-value cases

---

### 3. Parametric Automation

#### 3.1 Real-Time Trigger Monitoring

The trigger engine polls all data sources every 10 minutes and evaluates threshold rules per zone.

**Data sources polled:**
- IMD API / OpenWeatherMap — rainfall rate, temperature, visibility, fog
- Flood sensor feed — waterlogging + GPS zone cross-match
- Government advisory API — curfew and civil strike alerts

**Zone disruption states:**
- Each delivery zone carries an active disruption status: `start_time`, `severity` (green / amber / red), `end_time`
- Workers assigned to a zone in red status are eligible for claim initiation

#### 3.2 Automatic Claim Initiation

When a red-alert disruption is detected in a zone, the system automatically:
1. Identifies all active policyholders in that zone who were on-duty during the trigger window
2. Generates a pre-filled draft claim (trigger type, time window, estimated lost hours)
3. Surfaces a confirmation prompt on the worker's dashboard: *"We detected a red alert in your zone. Confirm impact to receive payout."*

This eliminates the need for workers to understand claim processes — the system does it for them.

#### 3.3 Instant Payout Processing

**Payout state machine:** `pending → approved → processing → paid` (or `rejected` for fraud)

- Auto-approved claims: UPI payout initiated via Razorpay sandbox within minutes
- Worker sees payout reflected on web dashboard immediately
- SMS notification sent on payout confirmation
- Rejected claims: reason displayed on dashboard with option to appeal

**Liquidity pool tracking:** Ledger tracks total payouts per zone per day with rate limits to prevent liquidity drain. Circuit breaker pauses zone payouts during ring activity.

---

### 4. Integration Capabilities

All integrations follow an **adapter pattern** — mock providers are used for the demo, and real providers can be swapped in without changing application logic.

| Integration | Provider (Demo) | Real Provider (Production) |
|---|---|---|
| Weather data | Mock + OpenWeatherMap free tier | IMD API, OpenWeatherMap paid |
| Flood/waterlogging | Mock sensor feed | Municipal flood sensor networks |
| Curfew/civil strike | Mock advisory feed | Government advisory APIs |
| Platform session proof | Simulated Zepto/Blinkit/Instamart adapter | Zepto Partner API, Blinkit Partner API, Swiggy Instamart Partner API |
| Payments | Razorpay test/sandbox | Razorpay live, UPI rails |
| Auth | Supabase Auth + OTP simulation | Supabase Auth + real SMS OTP |

---

## Workflow — End-to-End Claim Flow

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
|---|---|
| **Frontend** | Next.js + Tailwind CSS |
| **Backend** | Node.js / Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **AI / ML** | Python + FastAPI |
| **ML Libraries** | Scikit-learn |
| **Maps** | Mapbox / Google Maps |
| **Payments** | Razorpay Test / Sandbox |
| **Auth** | Supabase Auth |
| **Hosting** | Vercel (frontend) + Render (Python ML service) |

---

## Demo Routes

| Route | Description |
|---|---|
| `/login` | Platform selection (Zepto / Blinkit / Swiggy Instamart) + OTP login simulation |
| `/dashboard` | Worker view — active plan, weekly premium, risk score + drivers, claims, payouts |
| `/simulate` | Trigger zone disruptions, submit claims, and view fraud validation outcome |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** This is a hackathon prototype. All third-party integrations (weather, flood sensors, platform APIs, payments) are mocked and designed for real-provider substitution via the adapter layer.
