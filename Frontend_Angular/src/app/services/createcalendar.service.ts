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
    day.year = this.currentYear;

    const date = new Date(year, monthIndex, number-1);

    day.weekNumber = this.getWeekNumber(date);

    day.weekDayNumber = date.getDay();
    day.weekDayName = this.getDayWeekName(day.weekDayNumber);

    return day;
  }

}
