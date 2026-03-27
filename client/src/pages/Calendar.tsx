'use client'

import { useState, useEffect, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventClickArg } from '@fullcalendar/core'
import { createClient } from '@supabase/supabase-js'

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
  const [events, setEvents] = useState<ScentsyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ScentsyEvent | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(
    new Set(['party', 'market', 'booth', 'follow_up', 'delivery'])
  )

  useEffect(() => {
    // Fetch Carola's events on page load - no login required
    const supabase = createClient(SUPABASE_URL, CAROLA_KEY)
    
    supabase
      .from('scentsy_events')
      .select('*')
      .order('start_time', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else {
          setEvents(data || [])
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch events')
        setLoading(false)
      })
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Loading Carola's Scentsy Calendar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6 rounded-xl border bg-card">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Error Loading Calendar</h2>
          <p className="text-sm mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b sticky top-0 z-40 bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">Carola's Scentsy Calendar</h1>
              <p className="text-sm text-muted-foreground">{events.length} events scheduled</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {events.length === 0 ? (
          <div className="rounded-xl p-8 text-center border bg-card">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">No Events Found</h2>
            <p className="text-muted-foreground">
              You don't have any scheduled events yet. Add some events to see them here!
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
            <div className="rounded-xl p-4 border bg-card">
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
                firstDay={1}
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
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-card rounded-xl max-w-lg w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">
                  {eventTypeConfig[selectedEvent.event_type as EventType]?.emoji || '📅'}
                </span>
                <h2 className="text-xl font-bold text-foreground">{selectedEvent.title}</h2>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {selectedEvent.description && (
                <div>
                  <span className="font-medium text-foreground">Description:</span>
                  <p className="text-muted-foreground mt-1">{selectedEvent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectedEvent.start_time && (
                  <div>
                    <span className="font-medium text-foreground">Start:</span>
                    <p className="text-muted-foreground mt-1">
                      {new Date(selectedEvent.start_time).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedEvent.end_time && (
                  <div>
                    <span className="font-medium text-foreground">End:</span>
                    <p className="text-muted-foreground mt-1">
                      {new Date(selectedEvent.end_time).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedEvent.location && (
                <div>
                  <span className="font-medium text-foreground">Location:</span>
                  <p className="text-muted-foreground mt-1">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.host_name && (
                <div>
                  <span className="font-medium text-foreground">Host:</span>
                  <p className="text-muted-foreground mt-1">{selectedEvent.host_name}</p>
                </div>
              )}

              {selectedEvent.host_contact && (
                <div>
                  <span className="font-medium text-foreground">Contact:</span>
                  <p className="text-muted-foreground mt-1">{selectedEvent.host_contact}</p>
                </div>
              )}

              {selectedEvent.revenue !== null && selectedEvent.revenue !== undefined && (
                <div>
                  <span className="font-medium text-foreground">Revenue:</span>
                  <p className="text-muted-foreground mt-1">${selectedEvent.revenue.toFixed(2)}</p>
                </div>
              )}

              {selectedEvent.status && (
                <div>
                  <span className="font-medium text-foreground">Status:</span>
                  <p className="text-muted-foreground mt-1 capitalize">{selectedEvent.status}</p>
                </div>
              )}

              {selectedEvent.notes && (
                <div>
                  <span className="font-medium text-foreground">Notes:</span>
                  <p className="text-muted-foreground mt-1">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
