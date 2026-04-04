// Database helper functions for common operations
import { supabase, createServerClient } from './supabase';
import type {
  Worker,
  WorkerInsert,
  WorkerUpdate,
  Claim,
  ClaimInsert,
  InsuranceSubscription,
  InsuranceSubscriptionInsert,
  Payout,
  PayoutInsert,
  Disruption,
  DisruptionInsert,
  DeliveryZone,
  PlanTierConfig,
  TriggerDefinition,
  ClaimWithDetails,
  WorkerWithDetails,
} from './database.types';

// ============================================================================
// WORKERS
// ============================================================================

export async function getWorkerByPhone(phone: string): Promise<Worker | null> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error) {
    console.error('Error fetching worker:', error);
    return null;
  }
  return data;
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching worker:', error);
    return null;
  }
  return data;
}

export async function getWorkerWithDetails(id: string): Promise<WorkerWithDetails | null> {
  const { data, error } = await supabase
    .from('workers')
    .select(`
      *,
      vehicle:worker_vehicles(*),
      zone:delivery_zones(*),
      subscription:insurance_subscriptions(*)
    `)
    .eq('id', id)
    .eq('insurance_subscriptions.status', 'active')
    .single();

  if (error) {
    console.error('Error fetching worker details:', error);
    return null;
  }
  return data as WorkerWithDetails;
}

export async function createWorker(worker: WorkerInsert): Promise<Worker | null> {
  const { data, error } = await supabase
    .from('workers')
    .insert(worker)
    .select()
    .single();

  if (error) {
    console.error('Error creating worker:', error);
    return null;
  }
  return data;
}

export async function updateWorker(id: string, updates: WorkerUpdate): Promise<Worker | null> {
  const { data, error } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating worker:', error);
    return null;
  }
  return data;
}

export async function updateWorkerLocation(
  id: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const { error } = await supabase
    .from('workers')
    .update({
      current_lat: lat,
      current_lng: lng,
    })
    .eq('id', id);

  return !error;
}

// ============================================================================
// CLAIMS
// ============================================================================

export async function getWorkerClaims(
  workerId: string,
  limit = 10
): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching claims:', error);
    return [];
  }
  return data;
}

export async function getClaimWithDetails(id: string): Promise<ClaimWithDetails | null> {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      worker:workers(*),
      subscription:insurance_subscriptions(*),
      disruption:disruptions(*),
      zone:delivery_zones(*),
      verification:claim_verifications(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching claim details:', error);
    return null;
  }
  return data as ClaimWithDetails;
}

export async function createClaim(claim: ClaimInsert): Promise<Claim | null> {
  const { data, error } = await supabase
    .from('claims')
    .insert(claim)
    .select()
    .single();

  if (error) {
    console.error('Error creating claim:', error);
    return null;
  }
  return data;
}

export async function updateClaimStatus(
  id: string,
  status: Claim['status'],
  rejectionReason?: string
): Promise<Claim | null> {
  const updates: Partial<Claim> = { status };

  if (status === 'rejected' && rejectionReason) {
    updates.rejection_reason = rejectionReason;
  }
  if (status === 'approved') {
    updates.processed_at = new Date().toISOString();
  }
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating claim status:', error);
    return null;
  }
  return data;
}

export async function getWeeklyClaimTotal(workerId: string): Promise<number> {
  const weekStart = getWeekStartDate();

  const { data, error } = await supabase
    .from('claims')
    .select('amount')
    .eq('worker_id', workerId)
    .gte('claim_date', weekStart)
    .in('status', ['approved', 'paid']);

  if (error) {
    console.error('Error fetching weekly claim total:', error);
    return 0;
  }

  return data.reduce((sum, claim) => sum + Number(claim.amount), 0);
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export async function getActiveSubscription(
  workerId: string
): Promise<InsuranceSubscription | null> {
  const { data, error } = await supabase
    .from('insurance_subscriptions')
    .select('*')
    .eq('worker_id', workerId)
    .eq('status', 'active')
    .gte('valid_until', new Date().toISOString())
    .order('valid_until', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }
  return data;
}

export async function createSubscription(
  subscription: InsuranceSubscriptionInsert
): Promise<InsuranceSubscription | null> {
  const { data, error } = await supabase
    .from('insurance_subscriptions')
    .insert(subscription)
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    return null;
  }
  return data;
}

// ============================================================================
// DISRUPTIONS
// ============================================================================

export async function getActiveDisruptions(): Promise<Disruption[]> {
  const { data, error } = await supabase
    .from('disruptions')
    .select('*')
    .eq('is_active', true)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching disruptions:', error);
    return [];
  }
  return data;
}

export async function getDisruptionsForZone(zoneId: string): Promise<Disruption[]> {
  const { data, error } = await supabase
    .from('disruption_zones')
    .select('disruption:disruptions(*)')
    .eq('zone_id', zoneId)
    .eq('disruptions.is_active', true);

  if (error) {
    console.error('Error fetching zone disruptions:', error);
    return [];
  }

  return data
    .map((row) => (row as unknown as { disruption: Disruption }).disruption)
    .filter(Boolean);
}

export async function createDisruption(
  disruption: DisruptionInsert,
  zoneIds: string[]
): Promise<Disruption | null> {
  const { data, error } = await supabase
    .from('disruptions')
    .insert(disruption)
    .select()
    .single();

  if (error) {
    console.error('Error creating disruption:', error);
    return null;
  }

  // Link zones
  if (zoneIds.length > 0) {
    const zoneLinks = zoneIds.map((zone_id) => ({
      disruption_id: data.id,
      zone_id,
    }));

    await supabase.from('disruption_zones').insert(zoneLinks);
  }

  return data;
}

// ============================================================================
// PAYOUTS
// ============================================================================

export async function getWorkerPayouts(
  workerId: string,
  limit = 10
): Promise<Payout[]> {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching payouts:', error);
    return [];
  }
  return data;
}

export async function createPayout(payout: PayoutInsert): Promise<Payout | null> {
  const { data, error } = await supabase
    .from('payouts')
    .insert(payout)
    .select()
    .single();

  if (error) {
    console.error('Error creating payout:', error);
    return null;
  }
  return data;
}

// ============================================================================
// REFERENCE DATA
// ============================================================================

export async function getPlanTiers(): Promise<PlanTierConfig[]> {
  const { data, error } = await supabase
    .from('plan_tiers')
    .select('*')
    .order('weekly_premium', { ascending: true });

  if (error) {
    console.error('Error fetching plan tiers:', error);
    return [];
  }
  return data;
}

export async function getTriggerDefinitions(): Promise<TriggerDefinition[]> {
  const { data, error } = await supabase
    .from('trigger_definitions')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching trigger definitions:', error);
    return [];
  }
  return data;
}

export async function getDeliveryZones(city?: string): Promise<DeliveryZone[]> {
  let query = supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true);

  if (city) {
    query = query.eq('city', city);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching delivery zones:', error);
    return [];
  }
  return data;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

export async function isWorkerInCoolingPeriod(workerId: string): Promise<boolean> {
  const { data } = await supabase
    .from('workers')
    .select('cooling_period_until')
    .eq('id', workerId)
    .single();

  if (!data?.cooling_period_until) return false;

  return new Date(data.cooling_period_until) > new Date();
}

export async function setWorkerCoolingPeriod(
  workerId: string,
  hours = 48
): Promise<boolean> {
  const coolingUntil = new Date();
  coolingUntil.setHours(coolingUntil.getHours() + hours);

  const { error } = await supabase
    .from('workers')
    .update({ cooling_period_until: coolingUntil.toISOString() })
    .eq('id', workerId);

  return !error;
}
