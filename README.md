🛡️ SwiftShield
AI-Powered Income Protection for Q-Commerce Delivery Workers

Parametric micro-insurance for Zepto, Blinkit & Swiggy Instamart delivery partners. Instant payouts. Zero paperwork. Built for India's gig workforce.

Next.js Supabase Python Razorpay

⚡ Instant Payouts 	🤖 AI Fraud Detection 	📍 Zone-Based Triggers 	📱 No App Install
UPI in 30 minutes 	Isolation Forest ML 	Real-time IMD + flood data 	PWA web app

📋 Table of Contents

    Problem Addressed
    How It Works — Ramesh's Story
    Platform Choice
    Insurance Policy
        Coverage Scope
        Weekly Plan Tiers
        Parametric Triggers
        Payout Calculation
        Eligibility & Exclusions
        Claim Process & Limits
        Pause + Credit Wallet
    Fraud Detection Framework
    Anti-Spoofing Defense
    Features
        AI Risk Assessment
        Parametric Automation
        Analytics Dashboard
    Admin Roles
    Onboarding Flow
    End-to-End Claim Flow
    Tech Stack
    Integration Adapters
    Development Plan
    Demo Routes
    Privacy & Compliance
    Getting Started

🎯 Problem Addressed

Q-commerce delivery workers (Zepto, Blinkit, Swiggy Instamart) operate on 10-minute delivery SLAs across India's metro cities. A single weather disruption or curfew can collapse an entire work slot — with no safety net.

Existing insurance products are too slow, too complex, and too expensive for daily-wage gig workers.

Workers lose ₹200–500 per disruption event with zero recourse.

SwiftShield solves this with automated parametric income protection: when a trigger event is detected in a worker's zone, the system validates, approves, and pays out — in minutes, not days — with no manual claim filing.

    Target Persona: Zepto, Blinkit, and Swiggy Instamart delivery partners in Mumbai, Delhi NCR, Bengaluru, and Hyderabad earning ₹400–800/day.

🧑💼 How It Works — Ramesh's Story

    Ramesh is a Blinkit delivery partner in Bengaluru's Koramangala zone. He earns ~₹600/day and has the Shield plan active (₹59/week).

8:40 PM, Tuesday. Heavy rainfall crosses 15 mm/hr in his zone.

Trigger detected  →  Pre-filled claim drafted  →  Confirmation prompt shown

Ramesh sees on his dashboard:

    "We detected a heavy rain alert in your zone. Confirm impact to receive payout."

He taps confirm. In the background:
✅ Check 	Result
GPS zone match 	Pass
Blinkit session proof (active before trigger) 	Pass
48-hour cooling window 	Clear
ML anomaly score 	Low risk

Within 30 minutes — ₹85 credited to his UPI account. SMS confirmed.

    💡 Ramesh did not file a claim. He did not read a policy document. He did not call anyone. The system did it for him.

🌐 Platform Choice: Web App

SwiftShield is built as a Next.js web application — not a native mobile app. This is deliberate.
Reason 	Benefit
No install required 	Any device, any browser
Rapid iteration 	No native build overhead
PWA support 	Near-native mobile feel
Admin dashboard 	Better suited to web
📄 Insurance Policy
1. Coverage Scope

SwiftShield provides AI-powered parametric income protection for Q-commerce delivery workers.

✅  COVERED     →  Income loss due to verified external disruptions
❌  NOT COVERED →  Health · Accidents · Life · Vehicle damage · Personal negligence

2. Weekly Plan Tiers
	🟢 Starter 	🔵 Shield 	🟣 Pro
Weekly Premium 	₹29 	₹59 	₹99
Income Coverage 	50% 	70% 	90%
Daily Cap 	₹500 	₹1,200 	₹2,000
Weekly Max 	₹1,500 	₹3,600 	₹6,000
Triggers 	Rain · Heat 	Weather · Curfew 	All + Platform Outage
Claim Wait 	2 hrs 	1 hr 	30 min
3. Parametric Triggers
ID 	Trigger 	Condition 	Data Source 	Payout
T1 	🌧️ Heavy Rainfall 	Rainfall > 15 mm/hr 	IMD API 	₹85/hr
T2 	🌡️ Extreme Heat 	Temp > 42°C for 3+ hrs 	OpenWeatherMap 	₹70/hr
T3 	🌊 Flash Flood 	Flood sensor + GPS zone match 	Flood sensor feed 	₹100/hr
T4 	🌫️ Cold / Dense Fog 	Visibility < 50m or temp < 5°C 	OpenWeatherMap 	₹70/hr
T5 	🚧 Curfew / Strike 	Govt. advisory + GPS zone blockage 	Govt. advisory + platform APIs 	₹90/hr
T6 	💻 Platform Outage ⚠️ Pro only 	Platform down > 30 min 	Platform status APIs 	₹90/hr

    ⚠️ Note on T6 (Pro Only): In the demo, T6 uses simulated platform status logs. In production, validation uses public status pages (e.g., status.blinkit.com), order API failure rate monitoring, and cross-worker signal correlation — if >30% of active workers in a zone stop receiving orders simultaneously, that constitutes evidence of a platform disruption.

4. Payout Calculation

Payout amounts are dynamically calculated using AI inputs:

    📊 Worker earnings history
    🕐 Time slot demand — breakfast / lunch / dinner
    📍 Location-based order density
    📱 Platform activity at time of disruption

5. Eligibility & Exclusions

To receive a payout, the worker must:

    ✅ Be active (logged into platform) at the time of disruption
    ✅ Be present in the affected zone
    ✅ Be available for orders
    ✅ Pass all fraud validation checks

Claims will be rejected if:

    ❌ Worker was not active during the disruption
    ❌ Location mismatch is detected
    ❌ Fraud signals are triggered
    ❌ Duplicate claim is submitted for the same event

Not covered under any plan: War · Terrorism · Pandemic · Health · Accidents · Vehicle repairs
6. Claim Process & Limits

Trigger Detected  →  AI Validation  →  Instant UPI Payout  →  SMS Confirmation

    Fully automated — no manual filing required
    Daily payout capped per plan
    Weekly max payout = 3× daily cap

7. Pause + Credit Wallet

SwiftShield offers a flexible wallet system for gig workers:

    ⏸️ Pause anytime — except during an active claim window or disruption
    💳 Unused premium → converted to wallet credit automatically
    🔒 Wallet balance usable for future premiums only — non-withdrawable

Example walkthrough:

Week 1 premium:    ₹100
Days used:         3 of 7
Unused days:       4
Wallet credited:   ₹60 (pro-rated)

Week 2 premium:    ₹90
Wallet applied:   -₹60
You pay:           ₹30  ✅

🔐 Fraud Detection & Validation Framework

SwiftShield uses a multi-layer intelligent fraud detection system — payouts are only made to genuine, active workers.
4-Layer Claim Approval System

    Every claim must pass all four layers before auto-approval.

┌─────────────────────────────────────────────────────────────────┐
│  Layer 1 │ GPS zone polygon match                               │
│          │ Worker must be within 500m of disruption zone        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2 │ Platform activity validation                         │
│          │ Zepto / Blinkit / Instamart API confirms active      │
│          │ session existed BEFORE trigger fired                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3 │ Presence before disruption                           │
│          │ Worker must have been in zone before the alert       │
│          │ Prevents zone entry post-trigger                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4 │ ML anomaly score                                     │
│          │ Claim frequency vs pin-code peer group               │
│          │ Model: Isolation Forest                              │
└─────────────────────────────────────────────────────────────────┘

Detection Signal Comparison
Signal 	✅ Genuine Worker 	🚨 Suspicious Behavior
Movement 	Continuous, realistic 	Static or impossible speed jumps
Activity 	Active orders 	No real order activity
Timing 	Present before event 	Appears only after trigger
Claim frequency 	Normal for zone 	Burst claims or repeated max claims
Fraud Ring Detection

Coordinated attacks are flagged by:

    Multiple workers filing near-identical claims (same zone, time window, duration)
    Sudden zone-wide claim spikes
    Cluster analysis on behavioral features

    ⚡ Liquidity Circuit Breaker: During a burst, payouts are queued — not rejected — while fraud analysis runs. Genuine workers' claims are preserved and paid after validation.

Fairness for Honest Workers

Medium-risk claim detected
        │
        ├─→  Soft-hold (NOT outright rejection)
        │
        ├─→  Step-up verification requested:
        │       • Keep location active for 5–10 min
        │       • OR tap one-tap live check-in
        │
        └─→  Claim released after verification passes ✅

🛡️ Advanced Anti-Spoofing & Adversarial Defense

SwiftShield defends against sophisticated attacks — GPS spoofing and coordinated ring attacks — that single-signal systems cannot catch.
Multi-Dimensional Signal Validation
Signal Category 	What's Checked
Movement trajectory 	Anti-teleport check · Impossible speed detection · GPS jitter analysis
Network corroboration 	IP geolocation vs. declared zone · ASN & carrier consistency · Latency heuristics
Device integrity 	Mock-location flag · Emulator / rooted device detection · Device fingerprint consistency
Platform activity proofs 	On-duty status from platform API · Last delivery timestamp · Heartbeat continuity pre-event

    A fraudster who spoofs GPS still needs to pass network, device, and platform checks — all independently.

Duplicate Claim Prevention
Mechanism 	How It Works
Idempotency key 	De-duplication by (workerId, triggerType, disruptionId) — same event can't yield two payouts
48-hr cooling window 	No new claim within 48 hours of last payout
Ring detection 	Near-identical claims across many workers in same window triggers fraud alert
AI-Driven Anomaly Detection
Model 	Purpose
Isolation Forest 	Detects individual behavioral anomalies — no labelled fraud data required
Clustering 	Identifies coordinated fraud groups
Dynamic thresholds 	Tighten during spikes; calibrated per pin-code peer group — not globally
Liquidity Protection Mechanism

Ring burst detected in Zone X
         │
    ┌────▼────────────────────────────────┐
    │  Payouts QUEUED (not rejected)      │
    │  Fraud analysis runs across claims  │
    └────┬────────────────────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │  Genuine workers  →  Paid in full   │
    │  Fraudulent claims → Rejected +     │
    │  reason logged for audit            │
    └─────────────────────────────────────┘

✨ Features
1. AI-Powered Risk Assessment
Dynamic Weekly Premium Engine

Premiums recalculate every Sunday using a Gradient Boosting (XGBoost) model.

Model Inputs:
Input 	Description
Zone flood & heat history 	Historical disruption frequency
7-day forecast risk 	OpenWeatherMap upcoming data
Worker earnings average 	4-week rolling baseline
Pin-code claim rate 	Historical claims in the area
Seasonal event frequency 	Strike/curfew patterns by city
City-tier risk factor 	Metro vs tier-2 weighting
Vehicle & platform profile 	2-wheeler / e-bike + platform risk

Model Outputs:

    weeklyPremium (₹)
    Top 3 plain-language explanations of pricing factors
    Week-on-week delta with fairness cap (no sudden spikes)

    Cold start: New workers fall back to a pin-code peer group prior — updated as the worker builds 4 weeks of history.

Persona-Based Weekly Risk Score

Each worker receives a weeklyRiskScore (0–100):
Component 	Source
🌧️ Weather exposure risk 	Assigned zone + current season
🚦 Traffic risk 	Zone congestion + typical shift timing
📦 Behavior risk 	Activity patterns, active hours, delivery volume
🔍 Fraud risk 	Claim frequency vs peer group + anomaly flags
2. Parametric Automation
Real-Time Trigger Monitoring

The trigger engine polls all data sources every 10 minutes.

Data sources:

    IMD API / OpenWeatherMap — rainfall, temperature, visibility, fog
    Flood sensor feed — waterlogging + GPS zone cross-match
    Government advisory API — curfew and civil strike alerts

Each zone carries an active disruption state:

Zone Status: { start_time, severity: green | amber | red, end_time }

Automatic Claim Initiation

When a red-alert disruption is detected, the system automatically:

    Identifies all active policyholders in that zone on-duty during the trigger window
    Generates a pre-filled draft claim (trigger type, time window, estimated lost hours)
    Surfaces a one-tap confirmation prompt on the worker's dashboard

Payout State Machine

pending ──► approved ──► processing ──► paid ✅
                              │
                              └──► rejected ❌  (fraud detected)

    Auto-approved claims: UPI payout via Razorpay sandbox within minutes
    Dashboard + SMS updated on confirmation
    Rejected claims: reason shown with option to appeal

3. Analytics Dashboard

👤 Worker View

    Total income protected this week (₹)
    Active plan and weekly premium paid
    Weekly risk score with top 3 plain-language drivers
    Claim history — trigger type · payout · status · timestamp

	

🏢 Admin / Insurer View

    Zone-level disruption heatmap + claim density
    Loss ratio per zone (payouts ÷ premiums)
    Fraud queue with anomaly scores + flagged signals
    Predictive claim volume (weather-driven)
    Liquidity pool health — burn rate vs pool balance
    Ring detection alerts for manual review

👥 Admin Roles & Responsibilities

SwiftShield operates a two-tier admin model. Zonal Admins manage operations within their zone; Control Admins have platform-wide authority.
🗺️ Zonal Admin

Zone-scoped operations

📍 Claim Management

    Review auto-triggered claims within assigned zone
    Approve, reject, or flag claims based on validation checks
    Ensure payouts align with actual income loss

🧠 Fraud Monitoring

    Investigate AI-flagged suspicious claims
    Detect GPS spoofing, duplicate claims, abnormal patterns
    Mark users as high-risk when warranted

⚠️ Escalation Handling

    Escalate complex fraud cases to Control Admin
    Freeze or hold payouts for suspicious claims
    Initiate manual verification when required

📊 Zone Analytics

    Track claim frequency and fraud rate within zone
    Monitor loss ratios
    Identify high-risk areas and patterns

🔐 Access

Zone-specific data only
Cannot modify policies or pricing

	
⚙️ Control Admin

Platform-wide authority

🧾 Policy Management

    Create and update T&C, Privacy Policy, coverage rules
    Define eligibility criteria and claim conditions

💰 Pricing & Risk Strategy

    Set and update weekly premium rates
    Adjust payout limits and coverage tiers
    Override AI-based pricing decisions

🧠 AI & Fraud Governance

    Configure fraud detection rules and thresholds
    Manage risk scoring models
    Deploy and update anti-spoofing strategies

🚨 Crisis & System Control

    Handle large-scale fraud attacks
    Apply emergency rules (strict validation, payout delay)
    Control system-wide claim processing

📊 Global Analytics

    Monitor total claims, fraud trends, revenue vs. payouts
    Predict future risks and disruptions

🔐 Access

Full access — all zones and data
Override claim decisions
Block users or entire regions
Modify system-wide configurations

🚀 Onboarding Flow

    Designed to take under 2 minutes on a mobile browser. Zero document uploads.

Step 1 ──► Platform Selection
           Choose Zepto · Blinkit · Swiggy Instamart
           (determines which partner API adapter is used)
           │
Step 2 ──► Phone OTP Login
           6-digit OTP · No password · No email
           │
Step 3 ──► Zone & Vehicle
           Delivery pin code + vehicle type (2-wheeler / e-bike)
           (feeds directly into premium calculation model)
           │
Step 4 ──► Plan Selection
           Personalised weekly premium per tier shown
           Top 3 risk drivers explained in plain language
           │
Step 5 ──► UPI Linking
           Only financial detail collected
           │
Step 6 ──► Activation ✅
           First week's premium deducted
           Coverage begins immediately

🔄 End-to-End Claim Flow

IMD / OpenWeather       Flood Sensor Feed       Govt. Advisory API
  (rain, temp, fog)     (waterlogging + GPS)    (curfew / strike)
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   Real-time Trigger    │
                    │   Engine (polls 10min) │
                    └───────────┬────────────┘
                                │ Disruption event raised
                    ┌───────────▼────────────┐
                    │   Fraud Detection      │
                    │   4-layer check        │
                    │   (all 4 must pass)    │
                    └──────┬─────────┬───────┘
                         Pass      Flag
                  ┌───────▼───┐  ┌──▼──────────────┐
                  │  Auto-    │  │  Manual Review  │
                  │  Approved │  │  Queue (admin)  │
                  └───────┬───┘  └─────────────────┘
                          │
                  ┌───────▼────────────┐
                  │  Instant Payout    │
                  │  UPI / Razorpay    │
                  │  Dashboard + SMS   │
                  └───────┬────────────┘
                          │
                  ┌───────▼────────────┐
                  │  Analytics         │
                  │  Worker: earnings  │
                  │  Admin: heatmaps   │
                  └────────────────────┘

🛠️ Tech Stack
Layer 	Technology
Frontend 	Next.js + Tailwind CSS
Backend 	Node.js / Next.js API Routes
Database 	Supabase (PostgreSQL)
AI / ML 	Python + FastAPI
ML Libraries 	Scikit-learn · XGBoost · Isolation Forest
Maps 	Mapbox / Google Maps
Payments 	Razorpay Test / Sandbox
Auth 	Supabase Auth
Hosting 	Vercel (frontend) + Render (ML service)
🔌 Integration Adapters

    All integrations follow an adapter pattern — mock providers are used in demo; real providers swap in without changing application logic.

Integration 	🧪 Demo Provider 	🚀 Production Provider
Weather data 	Mock + OpenWeatherMap free tier 	IMD API · OpenWeatherMap paid
Flood / waterlogging 	Mock sensor feed 	Municipal flood sensor networks
Curfew / civil strike 	Mock advisory feed 	Government advisory APIs
Platform session proof 	Simulated adapter 	Zepto · Blinkit · Swiggy Instamart Partner APIs
Payments 	Razorpay sandbox 	Razorpay live · UPI rails
Auth 	Supabase Auth + OTP simulation 	Supabase Auth + real SMS OTP
📅 Development Plan
Week 	Theme 	Focus Areas 	Key Deliverable
W1 Mar 4–10 	🏗️ Foundation 	DB schema · Supabase auth · OTP login · zone/platform model 	Working /login route · schema committed
W2 Mar 11–20 	💡 Ideation 	Premium engine (mock ML) · trigger skeleton · dashboard wireframes 	README + prototype video by Mar 20
W3 Mar 21–27 	⚙️ Automation 	Trigger polling · mock API adapters · claim state machine 	Live trigger → claim flow demo
W4 Mar 28–Apr 4 	🛡️ Protection 	Dynamic premium ML (XGBoost) · risk score · Razorpay payout 	End-to-end claim → payout demo
W5 Apr 5–11 	🛡️ Scale 	Isolation Forest · GPS validation · ring detection · circuit breaker 	Fraud detection demo with spoofing scenario
W6 Apr 12–17 	✨ Polish 	Admin dashboard · analytics heatmaps · pitch deck · demo video 	Final submission package
🗺️ Demo Routes
Route 	Description
/login 	Platform selection (Zepto / Blinkit / Swiggy Instamart) + OTP login simulation
/dashboard 	Worker view — active plan · premium · risk score · claim history · payouts
/simulate 	Trigger zone disruptions · submit claims · view fraud validation outcome
🔒 Privacy & Compliance

Data Collected

    GPS location
    IP address
    Work activity (orders, login time)
    Earnings history
    Device metadata

Data Usage

    Risk scoring
    Claim validation
    Fraud detection
    Premium calculation

	

Data Sharing

Shared with:

    Insurance providers
    Platform partners (Blinkit · Zepto · Instamart)
    Fraud detection systems

    ❌ Personal data is never sold

User Rights

    Request data deletion at any time
    Opt out (policy becomes inactive)

Data Security: Encrypted storage · Secure APIs · Role-based access control

### 📦 3. Database (Supabase)

See `SETUP.md` for full Supabase setup instructions. Run the migrations in order:

1. `supabase/migrations/001_initial_schema.sql` — Core tables + RLS
2. `supabase/migrations/004_ml_service_extensions.sql` — ML-specific columns