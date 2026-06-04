import { workflow, node, trigger, expr, newCredential } from '@n8n/workflow-sdk';

// Triggered by React app POST after saving appointment to Supabase.
// Sends a WhatsApp confirmation via Twilio, then marks confirmation_sent=true.

const webhookReceive = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Receive Appointment Booking',
    parameters: {
      httpMethod: 'POST',
      path: 'appointment-confirmation',
      responseMode: 'responseNode',
      options: { allowedOrigins: '*' },
    },
  },
  output: [{
    body: {
      appointment_id: 'uuid-example',
      customer_name: 'John Doe',
      phone_number: '+12125551234',
      appointment_time: '2024-06-01T14:00:00Z',
    },
  }],
});

const normalizeData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Booking Data',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'a1', name: 'appointment_id',  value: expr('{{ $json.body?.appointment_id ?? $json.appointment_id }}'),  type: 'string' },
          { id: 'a2', name: 'customer_name',   value: expr('{{ $json.body?.customer_name ?? $json.customer_name }}'),   type: 'string' },
          { id: 'a3', name: 'phone_number',    value: expr('{{ $json.body?.phone_number ?? $json.phone_number }}'),     type: 'string' },
          { id: 'a4', name: 'appointment_time',value: expr('{{ $json.body?.appointment_time ?? $json.appointment_time }}'), type: 'string' },
        ],
      },
    },
  },
  output: [{
    appointment_id: 'uuid-example',
    customer_name: 'John Doe',
    phone_number: '+12125551234',
    appointment_time: '2024-06-01T14:00:00Z',
  }],
});

const sendWhatsApp = node({
  type: 'n8n-nodes-base.twilio',
  version: 1,
  config: {
    name: 'Send WhatsApp Confirmation',
    parameters: {
      resource: 'sms',
      operation: 'send',
      from: 'whatsapp:+14155238886',
      to: expr('{{ $json.phone_number }}'),
      toWhatsapp: true,
      message: expr(
        'Hi {{ $json.customer_name }}! Your appointment is confirmed for ' +
        '{{ $json.appointment_time }}. We look forward to seeing you! ' +
        'Reply STOP to unsubscribe.'
      ),
    },
    credentials: { twilioApi: newCredential('Twilio') },
  },
  output: [{ sid: 'SMxxx', status: 'queued' }],
});

const markConfirmationSent = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Mark Confirmation Sent',
    parameters: {
      resource: 'row',
      operation: 'update',
      tableId: 'appointments',
      filterType: 'manual',
      matchType: 'allFilters',
      filters: {
        conditions: [{
          keyName: 'id',
          condition: 'eq',
          keyValue: expr('{{ $("Normalize Booking Data").item.json.appointment_id }}'),
        }],
      },
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [{ fieldId: 'confirmation_sent', fieldValue: 'true' }],
      },
    },
    credentials: { supabaseApi: newCredential('Supabase') },
  },
  output: [{ id: 'uuid-example', confirmation_sent: true }],
});

const respondOk = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond Success',
    parameters: {
      respondWith: 'json',
      responseBody: { success: true, message: 'WhatsApp confirmation sent' },
    },
  },
});

export default workflow('appt-confirmation-v1', 'Appointment Confirmation Sender')
  .add(webhookReceive)
  .to(normalizeData)
  .to(sendWhatsApp)
  .to(markConfirmationSent)
  .to(respondOk);
