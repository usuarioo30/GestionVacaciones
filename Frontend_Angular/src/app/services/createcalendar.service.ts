import { Injectable } from '@angular/core';
import { Day } from '../interfaces/day';

@Injectable({
  providedIn: 'root'
})
export class CreateCalendarService {

  private currentYear: number;
  private currentMonthIndex: number;

  constructor() {
    let date = new Date();
    this.currentYear = date.getFullYear();
    this.currentMonthIndex = date.getMonth();
  }

  getCurrentMonth(): Day[] {
    return this.getMonth(this.currentMonthIndex, this.currentYear);
  }

  getMonth(monthIndex: number, year: number): Day[] {
    let days: Day[] = [];

    let firstDay = this.createDay(1, monthIndex, year);

    //Crear días vacíos
    // for (let i = 1; i < firstDay.weekDayNumber; i++) {
    //   days.push({
    //     weekDayNumber: i,
    //     monthIndex: monthIndex,
    //     year: year,
    //   } as Day);
    // }

    days.push(firstDay);
    console.log(days);
    let countDaysInMonth = new Date(year, monthIndex + 1, 0).getDate(); // 0 es el último día del mes anterior

    for (let index = 2; index < countDaysInMonth + 1; index++) {
      days.push(this.createDay(index, monthIndex, year));

    }
    return days;
  }

  getMonthName(monthIndex: number): string {
    switch (monthIndex) {
      case 0:
        return 'Enero';
      case 1:
        return 'Febrero';
      case 2:
        return 'Marzo';
      case 3:
        return 'Abril';
      case 4:
        return 'Mayo';
      case 5:
        return 'Junio';
      case 6:
        return 'Julio';
      case 7:
        return 'Agosto';
      case 8:
        return 'Septiembre';
      case 9:
        return 'Octubre';
      case 10:
        return 'Noviembre';
      case 11:
        return 'Diciembre';
      default:
        throw new Error('Invalid month index');
    }
  }

  getDayWeekName(weekDayIndex: number): string {
    switch (weekDayIndex) {
      case 0:
        return 'Lunes';
      case 1:
        return 'Martes';
      case 2:
        return 'Miercoles';
      case 3:
        return 'Jueves';
      case 4:
        return 'Viernes';
      case 5:
        return 'Sabado';
      case 6:
        return 'Domingo';
      default:
        throw new Error('Invalid week day index');
    }
  }

  getWeekNumber(date: Date): number {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }


  private createDay(number: number, monthIndex: number, year: number): Day {

    let day = {} as Day;
    day.monthIndex = monthIndex;
    day.month = this.getMonthName(monthIndex);

    day.number = number;
    day.year = year;
    day.isHoliday = false;

    const date = new Date(year, monthIndex, number);

    day.weekNumber = this.getWeekNumber(date);

    day.weekDayNumber = (date.getDay() + 6) % 7; // Transformar 0 (domingo) a 6, 1 (lunes) a 0, etc.
    day.weekDayName = this.getDayWeekName(day.weekDayNumber);

    return day;
  }

  /**
   * Determina si un día está disponible para solicitar descanso o vacaciones.
   * En esta regla de ejemplo se considera disponible si es de lunes a viernes.
   */
  isDayAvailable(day: Day): boolean {
    return day.weekDayNumber < 5; // lunes (0) a viernes (4) son considerados disponibles.
  }

  // Función auxiliar para comparar si dos fechas corresponden al mismo día
  public isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }

  // Función para convertir una fecha en formato 'YYYY-MM-DD HH:MM:SS' a un objeto Date
  convertToDate(fecha: string): Date {
    const [datePart, timePart] = fecha.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    // JavaScript usa un índice de mes basado en 0 (enero = 0, diciembre = 11)
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  // Función para comparar solo el día, mes y año sin tener en cuenta la hora, minutos o segundos
  isSameDayIgnoringTime(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
      date1.getUTCMonth() === date2.getUTCMonth() &&
      date1.getUTCDate() === date2.getUTCDate();
  }
}
