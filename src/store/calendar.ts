import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: Date;
  audioUrl?: string;
  description?: string;
}

interface CalendarStore {
  events: CalendarEvent[];
  loading: boolean;
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'user_id'>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  loading: false,
  fetchEvents: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      set({
        events: data.map(event => ({
          ...event,
          date: new Date(event.date),
          audioUrl: event.audio_url,
        })),
      });
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      set({ loading: false });
    }
  },
  addEvent: async (event) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: event.title,
          description: event.description,
          date: event.date.toISOString(),
          audio_url: event.audioUrl,
        });

      if (error) throw error;

      await get().fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  },
  removeEvent: async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        events: state.events.filter(event => event.id !== id),
      }));
    } catch (error) {
      console.error('Error removing event:', error);
    }
  },
}));