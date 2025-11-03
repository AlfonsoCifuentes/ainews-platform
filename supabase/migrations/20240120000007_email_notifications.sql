-- Add email notification preferences and email logs

-- Add email notification columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_frequency TEXT DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly', 'never'));

COMMENT ON COLUMN user_profiles.email_notifications IS 'Whether user wants to receive email notifications';
COMMENT ON COLUMN user_profiles.digest_frequency IS 'How often user wants to receive content digests: daily, weekly, or never';

-- Create email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('weekly_digest', 'daily_digest', 'notification', 'welcome', 'reset_password')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'complained')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert email logs
CREATE POLICY "Service role can insert email logs"
  ON email_logs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE email_logs IS 'Tracks all emails sent to users for debugging and compliance';
COMMENT ON COLUMN email_logs.email_type IS 'Type of email: weekly_digest, daily_digest, notification, welcome, reset_password';
COMMENT ON COLUMN email_logs.status IS 'Email delivery status: sent, failed, bounced, complained';
COMMENT ON COLUMN email_logs.metadata IS 'Additional email metadata (subject, template_version, etc.)';
