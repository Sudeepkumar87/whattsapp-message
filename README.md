# WhatsApp Appointment Reminder

A WhatsApp appointment reminder system built for Better Call Centers / El Paso Water Quality LLC.

## Stack

- **Frontend**: React + Vite + Tailwind CSS — appointment booking form + live dashboard
- **Database**: Supabase (Postgres + Realtime)
- **Automation**: n8n Cloud — webhook handler + WhatsApp messaging via Twilio
- **Messaging**: Twilio WhatsApp — sends confirmation and reminder messages

## How It Works

1. Customer fills out the appointment form
2. App inserts the record into Supabase and fires an n8n webhook
3. n8n sends a WhatsApp confirmation via Twilio and marks `confirmation_sent = true`
4. A scheduled n8n workflow runs every 15 minutes and sends a reminder 1 hour before each appointment

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase URL/key and n8n webhook URL
2. Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor
3. Assign Supabase + Twilio credentials to the n8n workflows and publish them
4. `npm install && npm run dev`
