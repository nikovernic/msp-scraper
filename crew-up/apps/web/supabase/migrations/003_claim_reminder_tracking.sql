-- Crew Up Database Schema
-- Migration: 003_claim_reminder_tracking
-- Description: Add reminder tracking columns to profiles table for claim reminder emails

-- Add reminder tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reminder_sent_at_7days TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_sent_at_14days TIMESTAMPTZ;

-- Add indexes for reminder queries (filtering by token expiration and reminder status)
CREATE INDEX IF NOT EXISTS idx_profiles_claim_token_expires ON public.profiles(claim_token_expires_at) 
    WHERE claim_token_expires_at IS NOT NULL AND is_claimed = FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_reminder_7days ON public.profiles(reminder_sent_at_7days) 
    WHERE reminder_sent_at_7days IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_reminder_14days ON public.profiles(reminder_sent_at_14days) 
    WHERE reminder_sent_at_14days IS NOT NULL;

