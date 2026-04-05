// Database Types for SwiftShield
// Auto-generated from Supabase schema

// ============================================================================
// ENUMS
// ============================================================================

export type Platform = 'blinkit' | 'zepto' | 'instamart';
export type PlanTier = 'starter' | 'shield' | 'pro';
export type TriggerType = 'rainfall' | 'extreme_heat' | 'flood' | 'cold_fog' | 'civil_unrest' | 'accident';
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type PayoutStatus = 'processing' | 'completed' | 'failed';
export type PayoutType = 'claim' | 'bonus' | 'refund' | 'wallet_credit';
export type VehicleType = 'bike' | 'scooter' | 'bicycle';
export type SubscriptionStatus = 'active' | 'expired' | 'pending' | 'paused';
export type DisruptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'worker' | 'zonal_admin' | 'control_admin';

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export interface User {
  id: string;
  name: string | null;
  phone: string;
  role: UserRole;
  created_at: string;
}

export interface Worker {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  platform: Platform;
  city: string | null;
  upi_id: string | null;
  assigned_zone_id: string | null;
  current_lat: number | null;
  current_lng: number | null;
  is_logged_in: boolean;
  fraud_score: number;
  cooling_period_until: string | null;
  created_at: string;
}

export interface WorkerVehicle {
  id: string;
  worker_id: string;
  vehicle_type: VehicleType;
  registration_number: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface WorkerWeeklyStats {
  id: string;
  worker_id: string;
  week_start_date: string;
  total_deliveries: number;
  total_earnings: number;
  active_hours: number;
  avg_rating: number;
  total_claims: number;
  total_claim_amount: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerGlobalStats {
  total_workers: number;
  total_claims: number;
  total_payouts: number;
  active_subscriptions: number;
  avg_fraud_score: number;
}

export interface PlanTierConfig {
  id: PlanTier;
  name: string;
  weekly_premium: number;
  weekly_cap: number;
  hourly_payout: number;
  max_hours_per_day: number;
  waiting_period_minutes: number;
  triggers: TriggerType[];
  created_at: string;
  updated_at: string;
}

export interface TriggerDefinition {
  id: string;
  trigger_type: TriggerType;
  name: string;
  description: string | null;
  threshold_description: string | null;
  base_hourly_rate: number;
  icon: string | null;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  is_active: boolean;
  risk_score: number;
  created_at: string;
  updated_at: string;
}

export interface InsuranceSubscription {
  id: string;
  worker_id: string;
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  valid_from: string;
  valid_until: string;
  auto_renewal: boolean;
  week_start_date: string;
  weekly_claim_total: number;
  premium_paid: number;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface Disruption {
  id: string;
  trigger_type: TriggerType;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  severity: DisruptionSeverity;
  description: string | null;
  weather_data: WeatherData;
  data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeatherData {
  rainfall_mm?: number;
  temperature_c?: number;
  visibility_m?: number;
  official_notice?: boolean;
}

export interface Claim {
  id: string;
  worker_id: string;
  subscription_id: string;
  disruption_id: string | null;
  trigger_type: TriggerType;
  claim_date: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  amount: number;
  status: ClaimStatus;
  rejection_reason: string | null;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  zone_id: string | null;
  created_at: string;
  processed_at: string | null;
  paid_at: string | null;
}

export interface ClaimVerification {
  id: string;
  claim_id: string;
  gps_valid: boolean | null;
  gps_distance_km: number | null;
  platform_session_valid: boolean | null;
  platform_session_data: Record<string, unknown> | null;
  cooling_period_clear: boolean | null;
  last_claim_hours_ago: number | null;
  ml_anomaly_score: number | null;
  ml_model_version: string | null;
  ml_features: Record<string, unknown> | null;
  weather_data_match: boolean | null;
  weather_source: string | null;
  overall_valid: boolean;
  verification_notes: string | null;
  verified_at: string;
}

export interface Payout {
  id: string;
  worker_id: string;
  claim_id: string | null;
  amount: number;
  payout_type: PayoutType;
  status: PayoutStatus;
  description: string | null;
  upi_id: string | null;
  razorpay_transfer_id: string | null;
  razorpay_payout_id: string | null;
  created_at: string;
  processed_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
}

export interface WalletTransaction {
  id: string;
  worker_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface ZoneRiskHistory {
  id: string;
  zone_id: string;
  record_date: string;
  risk_score: number;
  claim_count: number;
  disruption_hours: number;
  avg_claim_amount: number | null;
  weather_summary: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkerRiskScore {
  id: string;
  worker_id: string;
  score_date: string;
  overall_risk_score: number;
  claim_frequency_score: number | null;
  location_anomaly_score: number | null;
  timing_anomaly_score: number | null;
  model_version: string | null;
  features_used: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_type: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ChatFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatLog {
  id: string;
  worker_id: string;
  session_id: string;
  user_message: string;
  bot_response: string | null;
  query_type: string;
  language: string;
  timestamp: string;
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type UserInsert = Omit<User, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>>;

export type WorkerInsert = Omit<Worker, 'id' | 'created_at' | 'is_logged_in' | 'fraud_score'> & {
  id?: string;
  created_at?: string;
  is_logged_in?: boolean;
  fraud_score?: number;
};

export type ClaimInsert = Omit<Claim, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type InsuranceSubscriptionInsert = Omit<InsuranceSubscription, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PayoutInsert = Omit<Payout, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type DisruptionInsert = Omit<Disruption, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ============================================================================
// UPDATE TYPES (for updating records)
// ============================================================================

export type WorkerUpdate = Partial<Omit<Worker, 'id' | 'created_at'>>;
export type ClaimUpdate = Partial<Omit<Claim, 'id' | 'created_at'>>;
export type InsuranceSubscriptionUpdate = Partial<Omit<InsuranceSubscription, 'id' | 'created_at'>>;
export type PayoutUpdate = Partial<Omit<Payout, 'id' | 'created_at'>>;
export type DisruptionUpdate = Partial<Omit<Disruption, 'id' | 'created_at'>>;

// ============================================================================
// JOINED TYPES (for queries with relations)
// ============================================================================

export interface WorkerWithDetails extends Worker {
  vehicle?: WorkerVehicle;
  subscription?: InsuranceSubscription;
  zone?: DeliveryZone;
}

export interface ClaimWithDetails extends Claim {
  worker?: Worker;
  subscription?: InsuranceSubscription;
  disruption?: Disruption;
  zone?: DeliveryZone;
  verification?: ClaimVerification;
}

export interface PayoutWithClaim extends Payout {
  claim?: Claim;
  worker?: Worker;
}

export interface DisruptionWithZones extends Disruption {
  zones?: DeliveryZone[];
}

// ============================================================================
// DATABASE SCHEMA TYPE (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      workers: {
        Row: Worker;
        Insert: WorkerInsert;
        Update: WorkerUpdate;
      };
      worker_vehicles: {
        Row: WorkerVehicle;
        Insert: Omit<WorkerVehicle, 'id' | 'created_at'>;
        Update: Partial<Omit<WorkerVehicle, 'id' | 'created_at'>>;
      };
      worker_weekly_stats: {
        Row: WorkerWeeklyStats;
        Insert: Omit<WorkerWeeklyStats, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkerWeeklyStats, 'id' | 'created_at'>>;
      };
      plan_tiers: {
        Row: PlanTierConfig;
        Insert: Omit<PlanTierConfig, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PlanTierConfig, 'id' | 'created_at'>>;
      };
      trigger_definitions: {
        Row: TriggerDefinition;
        Insert: Omit<TriggerDefinition, 'created_at'>;
        Update: Partial<Omit<TriggerDefinition, 'id' | 'created_at'>>;
      };
      delivery_zones: {
        Row: DeliveryZone;
        Insert: Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeliveryZone, 'id' | 'created_at'>>;
      };
      insurance_subscriptions: {
        Row: InsuranceSubscription;
        Insert: InsuranceSubscriptionInsert;
        Update: InsuranceSubscriptionUpdate;
      };
      disruptions: {
        Row: Disruption;
        Insert: DisruptionInsert;
        Update: DisruptionUpdate;
      };
      disruption_zones: {
        Row: { disruption_id: string; zone_id: string };
        Insert: { disruption_id: string; zone_id: string };
        Update: never;
      };
      claims: {
        Row: Claim;
        Insert: ClaimInsert;
        Update: ClaimUpdate;
      };
      claim_verifications: {
        Row: ClaimVerification;
        Insert: Omit<ClaimVerification, 'id' | 'verified_at'>;
        Update: Partial<Omit<ClaimVerification, 'id'>>;
      };
      payouts: {
        Row: Payout;
        Insert: PayoutInsert;
        Update: PayoutUpdate;
      };
      wallet_transactions: {
        Row: WalletTransaction;
        Insert: Omit<WalletTransaction, 'id' | 'created_at'>;
        Update: never;
      };
      zone_risk_history: {
        Row: ZoneRiskHistory;
        Insert: Omit<ZoneRiskHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<ZoneRiskHistory, 'id' | 'created_at'>>;
      };
      worker_risk_scores: {
        Row: WorkerRiskScore;
        Insert: Omit<WorkerRiskScore, 'id' | 'created_at'>;
        Update: Partial<Omit<WorkerRiskScore, 'id' | 'created_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never;
      };
    };
    Enums: {
      platform_type: Platform;
      plan_tier: PlanTier;
      trigger_type: TriggerType;
      claim_status: ClaimStatus;
      payout_status: PayoutStatus;
      payout_type: PayoutType;
      vehicle_type: VehicleType;
      subscription_status: SubscriptionStatus;
      disruption_severity: DisruptionSeverity;
    };
  };
}
