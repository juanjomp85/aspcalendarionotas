import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Mic,
  Trash2,
  LogOut,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';
import { useCalendarStore } from './store/calendar';
import { useAuthStore } from './store/auth';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { events, fetchEvents, addEvent, removeEvent } = useCalendarStore();
  const { user, setUser, signOut } = useAuthStore();
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    audioUrl: '',
  });
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  if (!user) {
    return <Auth />;
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: es });
  const calendarEnd = endOfWeek(monthEnd, { locale: es });

  const weeks = eachWeekOfInterval(
    { start: calendarStart, end: calendarEnd },
    { locale: es }
  );

  const days = weeks.map((week) =>
    eachDayOfInterval({
      start: startOfWeek(week, { locale: es }),
      end: endOfWeek(week, { locale: es }),
    })
  );

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const startRecording = async () => {
    try {
      if (isRecording) {
        console.warn("Ya se está grabando.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const fileName = `${Date.now()}-audio.webm`;

        try {
          const { error } = await supabase.storage
            .from("audio-files")
            .upload(fileName, audioBlob);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from("audio-files")
            .getPublicUrl(fileName);

          setNewEvent((prev) => ({ ...prev, audioUrl: publicUrl }));
          console.log("Audio subido con éxito:", publicUrl);
        } catch (uploadError) {
          console.error("Error subiendo el audio:", uploadError);
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      console.log("Grabación iniciada.");
    } catch (error) {
      console.error("Error al iniciar la grabación:", error);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== "recording") {
      console.warn("No hay ninguna grabación activa.");
      return;
    }

    mediaRecorder.stop();
    setIsRecording(false);
    console.log("Grabación detenida.");
  };

  const handleAddEvent = () => {
    if (newEvent.title.trim() === '') {
      alert('El título del evento es obligatorio');
      return;
    }
    if (selectedDate) {
      addEvent({ ...newEvent, date: selectedDate });
    }
    setNewEvent({ title: '', description: '', audioUrl: '' });
    setIsDialogOpen(false);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Calendario de Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-700">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => (
            <div
              key={day}
              className={`text-center font-semibold py-2 ${
                index >= 5 ? 'bg-blue-50 rounded-t-lg' : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
          {days.map((week, weekIndex) =>
            week.map((date, dayIndex) => {
              const dayEvents = getEventsForDate(date);
              return (
                <Dialog key={`${weekIndex}-${dayIndex}`}>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => setSelectedDate(date)}
                      className={`
                        min-h-[100px] p-2 rounded-lg border transition-colors
                        ${
                          isSameMonth(date, currentDate)
                            ? dayIndex >= 5
                              ? 'bg-blue-50 hover:bg-blue-100'
                              : 'bg-white hover:bg-gray-50'
                            : dayIndex >= 5
                            ? 'bg-blue-50/50 text-gray-400'
                            : 'bg-gray-50 text-gray-400'
                        }
                        ${
                          selectedDate && isSameDay(date, selectedDate)
                            ? 'border-blue-500'
                            : 'border-gray-200'
                        }
                      `}
                    >
                      <div className="text-right mb-2">
                        {format(date, 'd')}
                      </div>
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="text-left text-sm p-1 mb-1 bg-blue-100 rounded"
                        >
                          {event.title}
                          {event.audioUrl && (
                            <audio
                              controls
                              className="w-full mt-1"
                              src={event.audioUrl}
                            />
                          )}
                        </div>
                      ))}
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Eventos para {format(date, 'dd/MM/yyyy')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Título del evento"
                          className="w-full p-2 border rounded"
                          value={newEvent.title}
                          onChange={(e) =>
                            setNewEvent((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <textarea
                          placeholder="Descripción"
                          className="w-full p-2 border rounded"
                          value={newEvent.description}
                          onChange={(e) =>
                            setNewEvent((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`flex items-center gap-2 px-4 py-2 rounded ${
                            isRecording
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          <Mic className="h-4 w-4" />
                          {isRecording ? 'Detener Grabación' : 'Grabar Audio'}
                        </button>
                        {newEvent.audioUrl && (
                          <audio
                            controls
                            src={newEvent.audioUrl}
                            className="flex-1"
                          />
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleAddEvent}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          <Plus className="h-4 w-4" />
                          Añadir Evento
                        </button>
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-semibold mb-2">Eventos existentes:</h3>
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded mb-2"
                            >
                              <div>
                                <div className="font-medium">{event.title}</div>
                                {event.description && (
                                  <div className="text-sm text-gray-600">
                                    {event.description}
                                  </div>
                                )}
                                {event.audioUrl && (
                                  <audio
                                    controls
                                    src={event.audioUrl}
                                    className="mt-2"
                                  />
                                )}
                              </div>
                              <button
                                onClick={() => removeEvent(event.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
