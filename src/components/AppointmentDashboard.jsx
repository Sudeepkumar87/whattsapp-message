import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const formatDate = iso => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = iso => {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const initials = name =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

const avatarColor = name => {
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const isUpcoming = iso => {
  const diff = new Date(iso) - Date.now()
  return diff > 0 && diff <= 3_600_000
}

const isPast = iso => new Date(iso) < Date.now()

export default function AppointmentDashboard({ refreshKey }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('whatsapp_appointments')
      .select('*')
      .order('appointment_time', { ascending: true })
    if (error) setError(error.message)
    else { setAppointments(data ?? []); setError('') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  useEffect(() => {
    const channel = supabase
      .channel('appt-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_appointments' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  const confirmed = appointments.filter(a => a.confirmation_sent).length
  const pending = appointments.filter(a => !a.confirmation_sent).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">All Appointments</h2>
              <p className="text-xs text-slate-400">{appointments.length} total</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats row */}
        {appointments.length > 0 && (
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs text-slate-500">{confirmed} confirmed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-xs text-slate-500">{pending} pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* List */}
      {loading && appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <svg className="animate-spin w-6 h-6 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">No appointments yet</p>
          <p className="text-xs text-slate-400 mt-1">Book one using the form on the left.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
          {appointments.map(appt => {
            const upcoming = isUpcoming(appt.appointment_time)
            const past = isPast(appt.appointment_time)
            const color = avatarColor(appt.customer_name)
            return (
              <div
                key={appt.id}
                className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${past ? 'opacity-60' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}>
                  {initials(appt.customer_name)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{appt.customer_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{appt.phone_number}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        appt.confirmation_sent
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {appt.confirmation_sent ? (
                          <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Confirmed</>
                        ) : (
                          <>Pending</>
                        )}
                      </span>
                      {appt.reminder_sent && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Reminded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-500">
                      {formatDate(appt.appointment_time)} at {formatTime(appt.appointment_time)}
                    </span>
                    {upcoming && (
                      <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full ml-1">
                        Soon
                      </span>
                    )}
                    {past && (
                      <span className="text-xs text-slate-400 ml-1">· Past</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {appointments.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 text-center">Updates live via Supabase Realtime</p>
        </div>
      )}

    </div>
  )
}
