import React from "react";

export interface Meeting {
  id: string;
  title: string;
  room: string;
  start: string; // ISO string
  end: string;   // ISO string
  attendees: number;
}

interface MeetingCalendarProps {
  meetings: Meeting[];
  onSelect: (meeting: Meeting) => void;
  selectedId?: string | null;
}

export const MeetingCalendar: React.FC<MeetingCalendarProps> = ({ meetings, onSelect, selectedId }) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span role="img" aria-label="calendar">📅</span> Calendario Riunioni
      </h3>
      <ul className="space-y-3">
        {meetings.map((meeting) => (
          <li
            key={meeting.id}
            className={`p-3 rounded cursor-pointer border transition-colors ${selectedId === meeting.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
            onClick={() => onSelect(meeting)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">{meeting.title}</div>
                <div className="text-xs text-muted-foreground">
                  {meeting.room} • {new Date(meeting.start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.end).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{meeting.attendees} partecipanti</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
