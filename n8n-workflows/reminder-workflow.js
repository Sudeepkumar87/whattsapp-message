import { workflow, node, trigger, expr, newCredential, splitInBatches, nextBatch } from '@n8n/workflow-sdk';

// BONUS: Runs every 15 minutes. Finds appointments within the next hour
// that have not yet had a reminder sent, sends WhatsApp reminder, marks reminder_sent=true.

const everyFifteenMinutes = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Every 15 Minutes',
    parameters: {
      rule: {
        interval: [{ field: 'minutes', minutesInterval: 15 }],
      },
    },
  },
});

const fetchUpcomingAppointments = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Fetch Upcoming Appointments',
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: 'appointments',
      returnAll: true,
      filterType: 'string',
      filterString: expr(
        'reminder_sent=eq.false' +
        '&appointment_time=gte.{{ $now.toISO() }}' +
        '&appointment_time=lte.{{ $now.plus({ hours: 1 }).toISO() }}'
      ),
    },
    credentials: { supabaseApi: newCredential('Supabase') },
  },
  output: [{
    id: 'uuid-example',
    customer_name: 'John Doe',
    phone_number: '+12125551234',
    appointment_time: '2024-06-01T14:00:00Z',
    reminder_sent: false,
  }],
});

const sendReminder = node({
  type: 'n8n-nodes-base.twilio',
  version: 1,
  config: {
    name: 'Send WhatsApp Reminder',
    parameters: {
      resource: 'sms',
      operation: 'send',
      from: 'whatsapp:+14155238886',
      to: expr('{{ $json.phone_number }}'),
      toWhatsapp: true,
      message: expr(
        'Reminder: Hi {{ $json.customer_name }}, your appointment is in less than 1 hour ' +
        '({{ $json.appointment_time }}). See you soon!'
      ),
    },
    credentials: { twilioApi: newCredential('Twilio') },
  },
  output: [{ sid: 'SMxxx', status: 'queued' }],
});

const markReminderSent = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Mark Reminder Sent',
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
          keyValue: expr('{{ $("Fetch Upcoming Appointments").item.json.id }}'),
        }],
      },
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [{ fieldId: 'reminder_sent', fieldValue: 'true' }],
      },
    },
    credentials: { supabaseApi: newCredential('Supabase') },
  },
  output: [{ id: 'uuid-example', reminder_sent: true }],
});

const batchLoop = splitInBatches({
  version: 3,
  config: {
    name: 'Process Each Appointment',
    parameters: { batchSize: 1 },
  },
});

export default workflow('appt-reminder-v1', 'Appointment Reminder Checker')
  .add(everyFifteenMinutes)
  .to(fetchUpcomingAppointments)
  .to(batchLoop
    .onEachBatch(sendReminder.to(markReminderSent).to(nextBatch(batchLoop)))
  );
