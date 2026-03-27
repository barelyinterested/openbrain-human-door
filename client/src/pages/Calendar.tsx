'use client'

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'wouter'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventClickArg } from '@fullcalendar/core'
import { Sun, Moon } from 'lucide-react'

const MCP_ENDPOINT = 'https://pqlbnvefkqbfwinfszbf.supabase.co/functions/v1/scentsy-crm-mcp'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScentsyEvent | null>(null)
  const [theme, setTheme] = useState<'light'|'dark'>('light')

  useEffect(() => {
    // Fetch Carola's events via MCP endpoint - no login required
    fetch(`${MCP_ENDPOINT}?key=${CAROLA_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_events',
          arguments: { limit: 100 }
        }
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error.message || 'MCP call failed')
        }
        if (data.result?.content?.[0]?.text) {
          const parsed = JSON.parse(data.result.content[0].text)
          setEvents(Array.isArray(parsed) ? parsed : [])
        } else {
          setEvents([])
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch events')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('calendar-theme') as 'light'|'dark'
    if (stored) setTheme(stored)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('calendar-theme', newTheme)
  }

  const handleSaveEvent = async (eventData: Partial<ScentsyEvent>) => {
    const method = editingEvent ? 'update_event' : 'add_event'
    const argumentsData = editingEvent 
      ? { ...eventData, id: editingEvent.id }
      : eventData

    try {
      const response = await fetch(`${MCP_ENDPOINT}?key=${CAROLA_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: method,
            arguments: argumentsData
          }
        })
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error.message || 'Failed to save event')
      }
      // Reload events after save
      window.location.reload()
    } catch (err) {
      console.error('Failed to save event:', err)
      alert('Failed to save event. Please try again.')
    }
  }

  const handleEditEvent = (event: ScentsyEvent) => {
    setEditingEvent(event)
    setSelectedEvent(null)
    setShowEditModal(true)
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
    return events.filter(event => 
      selectedTypes.has(event.event_type as EventType) &&
      (!searchQuery || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.host_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }, [events, selectedTypes, searchQuery])

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
      <header className={`border-b sticky top-0 z-40 ${theme === 'dark' ? 'bg-card' : 'bg-card'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <h1 className="text-xl font-bold text-foreground">Carola's Scentsy Calendar</h1>
                <p className="text-sm text-muted-foreground">{filteredEvents.length} events scheduled</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Back to OpenBrain link */}
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← OpenBrain
            </Link>
            
            {/* Search box */}
            <input
              type="search"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md bg-background"
            />
            
            {/* Theme toggle */}
            <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-accent">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            {/* Add event button */}
            <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md">
              Add Event
            </button>
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
              You don't have any scheduled events yet. Add some events via Hermes or the MCP tools!
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditEvent(selectedEvent)}
                  className="text-primary hover:text-primary/80 transition text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  ✕
                </button>
              </div>
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

      {/* Add Event Modal */}
      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveEvent}
        />
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => {
            setShowEditModal(false)
            setEditingEvent(null)
          }}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  )
}

function AddEventModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<ScentsyEvent>) => void }) {
  const [formData, setFormData] = useState<Partial<ScentsyEvent>>({
    event_type: 'party',
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    host_name: '',
    host_contact: '',
    revenue: 0,
    status: 'scheduled',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Add New Event</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Event Type</label>
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value as ScentsyEvent['event_type'] })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              required
            >
              <option value="party">🎉 Party</option>
              <option value="market">🏪 Market</option>
              <option value="booth">🟦 Booth</option>
              <option value="follow_up">📞 Follow Up</option>
              <option value="delivery">📦 Delivery</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
              <input
                type="datetime-local"
                value={formData.end_time || ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Location</label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Host Name</label>
              <input
                type="text"
                value={formData.host_name || ''}
                onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Host Contact</label>
              <input
                type="text"
                value={formData.host_contact || ''}
                onChange={(e) => setFormData({ ...formData, host_contact: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Revenue ($)</label>
              <input
                type="number"
                value={formData.revenue || 0}
                onChange={(e) => setFormData({ ...formData, revenue: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status || 'scheduled'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditEventModal({ event, onClose, onSave }: { event: ScentsyEvent; onClose: () => void; onSave: (data: Partial<ScentsyEvent>) => void }) {
  const [formData, setFormData] = useState<Partial<ScentsyEvent>>({
    event_type: event.event_type,
    title: event.title,
    description: event.description || '',
    start_time: event.start_time,
    end_time: event.end_time || '',
    location: event.location || '',
    host_name: event.host_name || '',
    host_contact: event.host_contact || '',
    revenue: event.revenue || 0,
    status: event.status || 'scheduled',
    notes: event.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Edit Event</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Event Type</label>
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value as ScentsyEvent['event_type'] })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              required
            >
              <option value="party">🎉 Party</option>
              <option value="market">🏪 Market</option>
              <option value="booth">🟦 Booth</option>
              <option value="follow_up">📞 Follow Up</option>
              <option value="delivery">📦 Delivery</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
              <input
                type="datetime-local"
                value={formData.end_time || ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Location</label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Host Name</label>
              <input
                type="text"
                value={formData.host_name || ''}
                onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Host Contact</label>
              <input
                type="text"
                value={formData.host_contact || ''}
                onChange={(e) => setFormData({ ...formData, host_contact: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Revenue ($)</label>
              <input
                type="number"
                value={formData.revenue || 0}
                onChange={(e) => setFormData({ ...formData, revenue: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status || 'scheduled'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Update Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
