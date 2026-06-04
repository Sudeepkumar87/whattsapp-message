-- Run this in your Supabase project: SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS whatsapp_appointments (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name    TEXT        NOT NULL,
  phone_number     TEXT        NOT NULL,
  appointment_time TIMESTAMPTZ NOT NULL,
  confirmation_sent BOOLEAN    DEFAULT false,
  reminder_sent    BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for demo (anon key has full access)
ALTER TABLE whatsapp_appointments DISABLE ROW LEVEL SECURITY;

-- Enable Supabase Realtime so the dashboard updates live
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_appointments;
