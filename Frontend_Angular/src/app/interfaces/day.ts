export interface Day {
  isToday: boolean;
  isCurrentMonth: boolean;
  number: number;
  year: number;

  month: string;
  monthIndex: number;

  weekDayName: string;
  weekDayNumber: number;

  weekNumber: number;

  available: boolean; // true: día disponible para descanso/vacaciones; false: no disponible
  requested: boolean; // true: el usuario solicitó (y se aprobó) descanso en ese día
}
