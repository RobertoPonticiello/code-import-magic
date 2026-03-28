import * as React from "react";

export interface Meeting {
  id: string;
  title: string;
  room: string;
  start: string;
  end: string;
  attendees: number;
}

export interface MeetingCalendarProps {
  meetings: Meeting[];
  onSelect: (meeting: Meeting) => void;
  selectedId?: string | null;
}

export declare const MeetingCalendar: React.FC<MeetingCalendarProps>;