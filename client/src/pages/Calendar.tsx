'use client'

import { useState, useEffect, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventClickArg } from '@fullcalendar/core'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pqlbnvefkqbfwinfszbf.supabase.co'
const CAROLA_KEY = '917fb39b079411c7629d620ef46797dd9f3f37c96801bd6f90f9fab35ed2c97e'

export interface ScentsyEvent {
  id: string
  event_type: 'party' | 'market' | 'booth' | 'follow_up' | 'delivery'
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  location: string | null
  host_name: string | null
  host_contact: string | null
  revenue: number | null
  status: string | null
  notes: string | null
  user_id: string
  created_at: string
}

const eventTypeConfig = {
  party: { 
    label: 'Party', 
    emoji: '🎉', 
    color: '#ec4899',
    bgColor: 'bg-pink-500',
    lightBg: 'bg-pink-100',
    borderColor: 'border-pink-500'
  },
  market: { 
    label: 'Market', 
    emoji: '🏪', 
    color: '#22c55e',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-100',
    borderColor: 'border-green-500'
  },
  booth: { 
    label: 'Booth', 
    emoji: '🟦', 
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-100',
    borderColor: 'border-blue-500'
  },
  follow_up: { 
    label: 'Follow Up', 
    emoji: '📞', 
    color: '#eab308',
    bgColor: 'bg-yellow-500',
    lightBg: 'bg-yellow-100',
    borderColor: 'border-yellow-500'
  },
  delivery: { 
    label: 'Delivery', 
    emoji: '📦', 
    color: '#a855f7',
    bgColor: 'bg-purple-500',
    lightBg: 'bg-purple-100',
    borderColor: 'border-purple-500'
  },
}

type EventType = keyof typeof eventTypeConfig

export default function Calendar() {
  const [apiKey, setApiKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [events, setEvents] = useState<ScentsyEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ScentsyEvent | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(
    new Set(['party', 'market', 'booth', 'follow_up', 'delivery'])
  )

  useEffect(() => {
    const storedKey = localStorage.getItem('scentsy_api_key')
    if (storedKey) {
      setApiKey(storedKey)
      authenticate(storedKey, false)
    }
  }, [])

  const authenticate = async (key: string, saveToStorage = true) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient(SUPABASE_URL, key)
      
      const { data, error } = await supabase
        .from('scentsy_events')
        .select('*')
        .limit(1)

      if (error) {
        throw new Error(error.message)
      }

      const userId = KNOWN_KEYS[key] || 'user'
      setUserName(userId)
      setIsAuthenticated(true)
      
      if (saveToStorage) {
        localStorage.setItem('scentsy_api_key', key)
      }

      await fetchEvents(supabase, userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setIsAuthenticated(false)
      setUserName(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async (supabase: SupabaseClient, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('scentsy_events')
        .select('*')
        .order('start_time', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      setEvents(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKey.trim()) {
      authenticate(apiKey.trim())
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('scentsy_api_key')
    setApiKey('')
    setIsAuthenticated(false)
    setUserName(null)
    setEvents([])
    setError(null)
  }

  const toggleEventType = (type: EventType) => {
    const newSet = new Set(selectedTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    setSelectedTypes(newSet)
  }

  const filteredEvents = useMemo(() => {
    return events.filter(event => selectedTypes.has(event.event_type as EventType))
  }, [events, selectedTypes])

  const calendarEvents = useMemo(() => {
    return filteredEvents.map(event => {
      const config = eventTypeConfig[event.event_type as EventType] || eventTypeConfig.party
      return {
        id: event.id,
        title: `${config.emoji} ${event.title}`,
        start: event.start_time,
        end: event.end_time || undefined,
        backgroundColor: config.color,
        borderColor: config.color,
        extendedProps: {
          event,
        },
      }
    })
  }, [filteredEvents])

  const handleEventClick = (clickInfo: EventClickArg) => {
    clickInfo.jsEvent.preventDefault()
    const event = clickInfo.event.extendedProps.event as ScentsyEvent
    setSelectedEvent(event)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              📅 Scentsy Calendar
            </h1>
            <p className="text-muted-foreground">
              View your Scentsy events and schedule
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-muted-foreground mb-1">
                  Enter your MCP Access Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your access key"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition bg-background text-foreground"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Connecting...' : 'Access Calendar'}
              </button>
            </form>

            <p className="mt-4 text-xs text-muted-foreground text-center">
              Your key is stored locally and only used to access your events.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">Scentsy Calendar</h1>
              <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-accent transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {events.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No Events Found</h2>
            <p className="text-muted-foreground">
              You don&apos;t have any scheduled events yet. Add some events to see them here!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(eventTypeConfig) as EventType[]).map((type) => {
                const config = eventTypeConfig[type]
                const isSelected = selectedTypes.has(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleEventType(type)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? `${config.bgColor} text-white shadow-md`
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {config.emoji} {config.label}
                  </button>
                )
              })}
            </div>

            {/* Calendar */}
            <div className="bg-card border border-border rounded-xl p-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                height="auto"
                eventDisplay="block"
                dayMaxEvents={true}
                buttonText={{
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day'
                }}
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short'
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>Scentsy Calendar • {events.length} event{events.length !== 1 ? 's' : ''}</p>
      </footer>
    </div>
  )
}

interface EventModalProps {
  event: ScentsyEvent | null
  onClose: () => void
}

function EventModal({ event, onClose }: EventModalProps) {
  if (!event) return null

  const config = eventTypeConfig[event.event_type as EventType] || eventTypeConfig.party

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${config.bgColor} text-white p-4 rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">{config.emoji}</span>
              {event.title}
            </h2>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`${config.lightBg} ${config.borderColor} border px-2 py-1 rounded-full`}>
              {config.emoji} {config.label}
            </span>
            {event.status && (
              <span className="bg-muted px-2 py-1 rounded-full capitalize">
                {event.status}
              </span>
            )}
          </div>

          {event.start_time && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">When</h3>
              <p className="text-foreground">
                {new Date(event.start_time).toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
              {event.end_time && (
                <p className="text-muted-foreground text-sm">
                  to {new Date(event.end_time).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          )}

          {event.location && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Where</h3>
              <p className="text-foreground">{event.location}</p>
            </div>
          )}

          {event.host_name && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Host</h3>
              <p className="text-foreground">{event.host_name}</p>
              {event.host_contact && (
                <p className="text-muted-foreground text-sm">{event.host_contact}</p>
              )}
            </div>
          )}

          {event.revenue !== null && event.revenue !== undefined && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Revenue</h3>
              <p className="text-green-600 font-bold text-lg">${Number(event.revenue).toFixed(2)}</p>
            </div>
          )}

          {event.description && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Description</h3>
              <p className="text-foreground">{event.description}</p>
            </div>
          )}

          {event.notes && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Notes</h3>
              <p className="text-foreground">{event.notes}</p>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <button
              onClick={onClose}
              className={`w-full ${config.bgColor} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
