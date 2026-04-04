interface SmsResult {
  sent: boolean;
  reason?: string;
}

/**
 * Development stub - OTP is displayed on the login page instead of sending SMS.
 * In production, replace this with actual SMS integration.
 */
export async function sendRegistrationOtpSms(phone: string, otp: string): Promise<SmsResult> {
  // Log OTP for development debugging
  console.log(`[DEV] OTP for ${phone}: ${otp}`);
  
  // Return success - OTP will be displayed on the frontend
  return {
    sent: false,
    reason: "Development mode: OTP displayed on screen",
  };
}
