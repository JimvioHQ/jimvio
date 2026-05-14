"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, MapPin, Users, Loader2, Search, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  attendee_count?: number;
  is_going?: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        loadEvents(user.id);
      }
    }
    getUser();
  }, []);

  async function loadEvents(userId: string) {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // For now, we'll create mock events since there's no community_events table
      const mockEvents: Event[] = [
        {
          id: "1",
          title: "Community Kickoff Meetup",
          description: "Join us for an exciting kickoff event where we'll meet fellow members and discuss the community roadmap.",
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: null,
          location: "Virtual - Zoom",
          image_url: null,
          attendee_count: 24,
          is_going: false,
        },
        {
          id: "2",
          title: "Live Q&A Session",
          description: "Get answers to your questions directly from the community leaders.",
          start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: null,
          location: "Virtual - YouTube Live",
          image_url: null,
          attendee_count: 156,
          is_going: true,
        },
        {
          id: "3",
          title: "Networking Breakfast",
          description: "Connect with other community members over breakfast. Perfect for making new friends and collaborating.",
          start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: null,
          location: "Downtown Coffee House",
          image_url: null,
          attendee_count: 18,
          is_going: false,
        },
        {
          id: "4",
          title: "Workshop: Getting Started",
          description: "Learn the fundamentals and best practices from experienced community members.",
          start_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: null,
          location: "Virtual - Zoom",
          image_url: null,
          attendee_count: 89,
          is_going: false,
        },
      ];

      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = events
    .filter(event => {
      const now = new Date();
      const eventDate = new Date(event.start_date);
      const matchesFilter = filter === "upcoming" ? eventDate > now : eventDate <= now;
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           event.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  async function toggleAttendance(eventId: string) {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, is_going: !event.is_going, attendee_count: (event.attendee_count || 0) + (event.is_going ? -1 : 1) }
        : event
    ));
  }

  if (!currentUserId) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Calendar className="w-6 h-6" />
            Events
          </h1>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-surface"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("upcoming")}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  filter === "upcoming"
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border hover:bg-surface/80"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilter("past")}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  filter === "past"
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border hover:bg-surface/80"
                }`}
              >
                Past
              </button>
            </div>
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No events found</h2>
            <p className="text-text-muted">
              {filter === "upcoming"
                ? "No upcoming events at the moment. Check back soon!"
                : "No past events to show."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const eventDate = new Date(event.start_date);
              const isUpcoming = eventDate > new Date();

              return (
                <div
                  key={event.id}
                  className="bg-surface rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {/* Image Placeholder */}
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full sm:w-48 h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full sm:w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-text-muted" />
                      </div>
                    )}

                    {/* Event Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                        {event.description && (
                          <p className="text-text-muted text-sm mb-4 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        {/* Event Meta */}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-text-muted">
                            <Calendar className="w-4 h-4" />
                            {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-text-muted">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </div>
                          )}
                          {event.attendee_count !== undefined && (
                            <div className="flex items-center gap-2 text-text-muted">
                              <Users className="w-4 h-4" />
                              {event.attendee_count} attending
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {isUpcoming && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => toggleAttendance(event.id)}
                            className={`flex-1 px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                              event.is_going
                                ? "bg-green-600/20 text-green-600 border-green-600/30 hover:bg-green-600/30"
                                : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                            }`}
                          >
                            {event.is_going ? "✓ Going" : "Interested"}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}