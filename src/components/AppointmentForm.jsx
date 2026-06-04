import { useState } from 'react'
import { supabase } from '../lib/supabase'

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL

export default function AppointmentForm({ onSuccess }) {
  const [form, setForm] = useState({ customer_name: '', phone_number: '', appointment_time: '' })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const { data, error } = await supabase
        .from('whatsapp_appointments')
        .insert([{
          customer_name: form.customer_name,
          phone_number: form.phone_number,
          appointment_time: new Date(form.appointment_time).toISOString(),
        }])
        .select()
        .single()

      if (error) throw new Error(error.message)

      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: data.id,
          customer_name: data.customer_name,
          phone_number: data.phone_number,
          appointment_time: data.appointment_time,
        }),
      })

      if (res.ok) {
        setStatus({ type: 'success', message: 'Appointment booked! WhatsApp confirmation sent.' })
      } else {
        setStatus({ type: 'warning', message: 'Appointment saved. WhatsApp may not have sent — check n8n.' })
      }

      setForm({ customer_name: '', phone_number: '', appointment_time: '' })
      onSuccess?.()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Card header */}
      <div className="px-6 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">New Appointment</h2>
            <p className="text-xs text-slate-400">Fill in the details below</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Customer Name
          </label>
          <input
            type="text"
            name="customer_name"
            value={form.customer_name}
            onChange={handleChange}
            required
            placeholder="e.g. John Smith"
            className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            WhatsApp Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <input
              type="tel"
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              required
              placeholder="+12125551234"
              pattern="\+[1-9]\d{6,14}"
              title="E.164 format: +[country code][number]"
              className="w-full h-10 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
          <p className="text-xs text-slate-400">Include country code, e.g. +91 for India</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Appointment Date & Time
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="datetime-local"
              name="appointment_time"
              value={form.appointment_time}
              onChange={handleChange}
              required
              min={new Date().toISOString().slice(0, 16)}
              className="w-full h-10 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Status message */}
        {status.message && (
          <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border ${
            status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            status.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="mt-0.5 shrink-0 text-base leading-none">
              {status.type === 'success' ? '✓' : status.type === 'warning' ? '⚠' : '✕'}
            </span>
            <span>{status.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Book & Send WhatsApp
            </>
          )}
        </button>

      </form>
    </div>
  )
}
