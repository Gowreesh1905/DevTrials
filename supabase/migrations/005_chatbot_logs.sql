-- Add Chatbot Conversation Logging
-- Migration: 005_chatbot_logs.sql
-- Creates table for storing chat history and conversation logs

-- ============================================================================
-- CHATBOT LOGS TABLE
-- ============================================================================

-- Chat conversation history for monitoring and analytics
CREATE TABLE chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,  -- Session identifier for grouping related messages
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    query_type VARCHAR(20) NOT NULL,  -- 'faq' or 'ai'
    language VARCHAR(10) DEFAULT 'en',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for efficient retrieval of chat logs by worker and session
CREATE INDEX idx_chat_logs_worker_session ON chat_logs(worker_id, session_id);

-- Index for querying by timestamp (useful for analytics)
CREATE INDEX idx_chat_logs_timestamp ON chat_logs(timestamp DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on chat_logs
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Workers can only read their own chat logs
CREATE POLICY "Workers can read own chat logs" ON chat_logs
    FOR SELECT USING (auth.uid() = worker_id);

-- Policy: API can insert chat logs (via service role)
CREATE POLICY "API can insert chat logs" ON chat_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');