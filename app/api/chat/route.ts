import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { message, worker_id, session_id, language = 'en' } = await request.json();

    if (!message || !worker_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check for rule-based match in chat_faqs
    const { data } = await supabase
      .from('chat_faqs')
      .select('question, answer, category')
      .eq('language', language)
      .eq('is_active', true)
      .ilike('question', `%${message}%`)
      .limit(1)
      .maybeSingle();

    const faqMatch = data as { question: string; answer: string; category: string } | null;

    let response: string;
    let queryType: 'rule' | 'ai';

    if (faqMatch) {
      // Rule-based response
      response = faqMatch.answer;
      queryType = 'rule';
    } else {
      // AI response using Gemini
      const context = await getPolicyContext(supabase, language);
      response = await generateAIResponse(message, context, language);
      queryType = 'ai';
    }

    // Log the interaction
    const { error: logError } = await supabase
      .from('chat_logs')
      .insert({
        worker_id,
        session_id: session_id || generateSessionId(),
        user_message: message,
        bot_response: response,
        query_type: queryType,
        language,
      } as any);

    if (logError) {
      console.error('Failed to log chat interaction:', logError);
    }

    return NextResponse.json({
      response,
      query_type: queryType,
      language,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getPolicyContext(supabase: any, language: string) {
  // Fetch key policy data for context
  const [plans, triggers] = await Promise.all([
    supabase.from('plan_tiers').select('*'),
    supabase.from('trigger_definitions').select('*'),
  ]);

  // Get English FAQs as base context, translate if needed
  const { data: faqs } = await supabase
    .from('chat_faqs')
    .select('question, answer')
    .eq('language', 'en')
    .eq('is_active', true);

  return {
    plans: plans.data,
    triggers: triggers.data,
    faqs: faqs,
  };
}

async function generateAIResponse(message: string, context: any, language: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
You are a helpful support chatbot for SwiftShield, an AI-powered income protection insurance for Q-commerce delivery workers.

Policy Context:
- Plans: ${JSON.stringify(context.plans)}
- Triggers: ${JSON.stringify(context.triggers)}
- FAQ Examples: ${JSON.stringify(context.faqs)}

User Query: "${message}"

Instructions:
- Answer in ${language === 'en' ? 'English' : 'the user\'s language (' + language + ')'}
- Keep responses precise, structured, and easy to understand
- Use bullet points for lists
- Avoid overwhelming the user with too much information
- If unsure, suggest contacting support
- Focus on insurance policy aspects only

Provide a structured response with:
- Brief summary
- Key details (if applicable)
- Next steps (if needed)
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Sorry, I\'m having trouble processing your request. Please try again or contact support.';
  }
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}