# WhatsApp Appointment Reminder — Project Context

Read this file at the start of every session before making any changes.

## What This Project Is

A WhatsApp appointment reminder system built as a practical test for Better Call Centers / El Paso Water Quality LLC. Customers can book appointments via a React web form; a WhatsApp confirmation is automatically sent via Twilio through n8n; a scheduled n8n workflow sends a reminder 1 hour before the appointment.

## Tech Stack

| Layer       | Tool                        | Purpose                                  |
|-------------|------------------------------|------------------------------------------|
| Frontend    | React + Vite + Tailwind CSS  | Appointment form + live dashboard        |
| Database    | Supabase (Postgres)          | Store appointments, realtime updates     |
| Automation  | n8n Cloud                    | Webhook handler + WhatsApp via Twilio    |
| Messaging   | Twilio WhatsApp              | Send confirmation + reminder messages    |

## Credentials & Endpoints

### Supabase
- **Project URL**: `https://nrbrmtvivpyqnsmfdhhr.supabase.co`
- **Anon Key**: in `.env` as `VITE_SUPABASE_ANON_KEY`
- **Table**: `appointments` (see `supabase-schema.sql`)

### n8n Cloud
- **Instance**: `https://sudeepkumar233.app.n8n.cloud`
- **Confirmation workflow**: `https://sudeepkumar233.app.n8n.cloud/workflow/D4c1pHBwvpw0M3nA`
- **Reminder workflow**: `https://sudeepkumar233.app.n8n.cloud/workflow/MUuU9Z7shvWtlkxS`
- **Production webhook**: `https://sudeepkumar233.app.n8n.cloud/webhook/appointment-confirmation`

### Twilio (user must configure)
- Sandbox number for WhatsApp: `whatsapp:+14155238886` (update once live account is set up)
- Credential type in n8n: `twilioApi`

## Project File Structure

```
whatsapp folder/
├── CLAUDE.md                      ← you are here
├── package.json                   ← Vite + React + Supabase deps
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env                           ← Supabase URL + key + n8n webhook URL
├── .env.example                   ← template for new environments
├── .gitignore
├── supabase-schema.sql            ← run once in Supabase SQL editor
├── src/
│   ├── main.jsx                   ← React root
│   ├── App.jsx                    ← layout: form (left) + dashboard (right)
│   ├── index.css                  ← Tailwind directives
│   ├── lib/
│   │   └── supabase.js            ← Supabase client (reads from .env)
│   └── components/
│       ├── AppointmentForm.jsx    ← form → Supabase insert → n8n webhook
│       └── AppointmentDashboard.jsx ← live table via Supabase Realtime
└── n8n-workflows/
    ├── confirmation-workflow.js   ← n8n SDK source for confirmation sender
    └── reminder-workflow.js       ← n8n SDK source for reminder checker
```

## Data Flow

```
User fills form
  → AppointmentForm.jsx
      → INSERT into Supabase appointments table  (gets back id)
      → POST https://.../webhook/appointment-confirmation
            { appointment_id, customer_name, phone_number, appointment_time }
  → n8n "Appointment Confirmation Sender"
      → Normalize webhook body
      → Twilio sends WhatsApp confirmation message
      → Supabase UPDATE appointments SET confirmation_sent=true WHERE id=...
      → Respond 200 { success: true }
  → Dashboard auto-refreshes via Supabase Realtime subscription

Every 15 minutes:
  → n8n "Appointment Reminder Checker"
      → Supabase: fetch rows WHERE reminder_sent=false
          AND appointment_time BETWEEN now AND now+1h
      → For each: Twilio sends WhatsApp reminder
      → Supabase UPDATE appointments SET reminder_sent=true WHERE id=...
```

## Supabase Table Schema

```sql
appointments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid()
  customer_name    TEXT        NOT NULL
  phone_number     TEXT        NOT NULL        -- E.164 format e.g. +12125551234
  appointment_time TIMESTAMPTZ NOT NULL
  confirmation_sent BOOLEAN    DEFAULT false
  reminder_sent    BOOLEAN     DEFAULT false
  created_at       TIMESTAMPTZ DEFAULT NOW()
)
```

## One-Time Setup Steps (for new environments)

1. **Supabase table**: Go to Supabase → SQL Editor → paste `supabase-schema.sql` → Run
2. **n8n Supabase credential**: n8n → Credentials → New → Supabase → enter project URL + anon key
3. **n8n Twilio credential**: n8n → Credentials → New → Twilio → enter Account SID + Auth Token
4. **Assign credentials in n8n workflows**: Open each workflow, click each Supabase/Twilio node, select the credential you created
5. **Publish workflows**: Click "Publish" on both workflows in n8n
6. **Twilio WhatsApp sandbox**: Join sandbox by sending "join <your-sandbox-word>" to +14155238886 from each test phone
7. **Run React app**: `npm install` then `npm run dev` → open http://localhost:5173

## n8n Workflows — Status

| Workflow | ID | URL | Status |
|---|---|---|---|
| Appointment Confirmation Sender | `D4c1pHBwvpw0M3nA` | [link](https://sudeepkumar233.app.n8n.cloud/workflow/D4c1pHBwvpw0M3nA) | Saved — needs Twilio + Supabase credentials assigned, then publish |
| Appointment Reminder Checker | `MUuU9Z7shvWtlkxS` | [link](https://sudeepkumar233.app.n8n.cloud/workflow/MUuU9Z7shvWtlkxS) | Saved — needs Twilio + Supabase credentials assigned, then publish |

## Key Decisions & Why

- **React writes to Supabase directly** (not via n8n) — faster response, single source of truth; n8n only handles messaging
- **n8n Supabase node** marks `confirmation_sent=true` after WhatsApp sends — dashboard stays accurate even if the user closes the browser
- **Supabase Realtime** subscription in dashboard — truly live, no polling
- **splitInBatches(batchSize:1)** in reminder workflow — processes each appointment independently so one Twilio failure doesn't block others
- **filterType: 'string'** with PostgREST syntax for reminder query — supports multiple conditions on the same column (appointment_time gte AND lte), which the UI filter builder doesn't support

## Common Tasks

### Add a field to the form
1. Add column to Supabase: `ALTER TABLE appointments ADD COLUMN field_name TEXT`
2. Add to `AppointmentForm.jsx` form state + JSX input
3. Add to the `insert` call in `handleSubmit`
4. Add to the dashboard display in `AppointmentDashboard.jsx`

### Change reminder window (e.g. 2 hours instead of 1)
- Edit `n8n-workflows/reminder-workflow.js`: change `{ hours: 1 }` to `{ hours: 2 }`
- Re-run: validate → `mcp__n8n-mcp__update_workflow` or recreate → publish

### Change Twilio WhatsApp number
- Update `from: 'whatsapp:+14155238886'` in both n8n workflow files
- Update workflows in n8n

### Test without real Twilio
- In n8n, disable the Twilio node (right-click → Disable) — the workflow will skip it
- Or check n8n execution logs to verify the message payload is correct

## User Preferences (remembered from session)

- Prefers building with n8n + Supabase + React (Vite)
- Uses n8n Cloud at `https://sudeepkumar233.app.n8n.cloud`
- Assignment context: practical test for AI automation developer role
- AI coding tools (Claude Code) are allowed and encouraged per the assignment
