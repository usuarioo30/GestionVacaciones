import { Component, inject, OnInit } from '@angular/core';
import { CreateCalendarService } from '../../services/createcalendar.service';
import { Day } from '../../interfaces/day';
import {CommonModule, NgFor, NgStyle} from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-calendar',
  imports: [NgFor, CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {

  monthDays!: Day[];            // Array completo de días (incluyendo relleno)
  fullCalendarWeeks!: Day[][];  // Días agrupados en semanas (cada semana es un array de 7 días)
  monthNumber!: number;
  year!: number;

  // Cabecera con los días de la semana
  weeksDaysName: string[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  calendar: CreateCalendarService = inject(CreateCalendarService);

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem("access_token");

    if(!token) {
      this.router.navigateByUrl("/login");
    }

    // Se obtiene el mes actual para inicializar monthNumber y year.
    const currentMonthData = this.calendar.getCurrentMonth();
    this.monthNumber = currentMonthData[0].monthIndex;
    this.year = currentMonthData[0].year;
    this.loadCalendar();
  }

  /**
   * Carga el calendario completo del mes actual,
   * completando con los días del mes anterior y siguiente para llenar las semanas.
   */
  loadCalendar(): void {
    // Días del mes actual y se marca como pertenecientes al mes (isCurrentMonth = true)
    const currentDays = this.calendar.getMonth(this.monthNumber, this.year);
    currentDays.forEach(day => day.isCurrentMonth = true);

    // Obtener datos del mes anterior
    let prevMonth: number, prevYear: number;
    if (this.monthNumber === 0) {
      prevMonth = 11;
      prevYear = this.year - 1;
    } else {
      prevMonth = this.monthNumber - 1;
      prevYear = this.year;
    }
    const previousMonthDays = this.calendar.getMonth(prevMonth, prevYear);

    // Calcular cuántos días faltan al inicio de la primera semana
    // Se asume que currentDays[0].weekDayNumber indica el índice del día (0 = Lunes)
    const numMissing = currentDays[0].weekDayNumber;
    let daysToPrepend: Day[] = [];
    if (numMissing > 0) {
      // Se toman los últimos 'numMissing' días del mes anterior
      daysToPrepend = previousMonthDays.slice(-numMissing);
      daysToPrepend.forEach(day => day.isCurrentMonth = false);
    }

    // Se combinan los días del mes anterior (relleno) y los días del mes actual
    let fullDays = [...daysToPrepend, ...currentDays];

    // Comprobar si la última semana está incompleta y completarla con días del mes siguiente
    const remainder = fullDays.length % 7;
    if (remainder !== 0) {
      let nextMonth: number, nextYear: number;
      if (this.monthNumber === 11) {
        nextMonth = 0;
        nextYear = this.year + 1;
      } else {
        nextMonth = this.monthNumber + 1;
        nextYear = this.year;
      }
      const nextMonthDays = this.calendar.getMonth(nextMonth, nextYear);
      const missing = 7 - remainder;
      const daysToAppend = nextMonthDays.slice(0, missing);
      daysToAppend.forEach(day => day.isCurrentMonth = false);
      fullDays = fullDays.concat(daysToAppend);
    }

    // Agrupar los días en semanas (cada semana es un array de 7 días)
    const weeks: Day[][] = [];
    for (let i = 0; i < fullDays.length; i += 7) {
      weeks.push(fullDays.slice(i, i + 7));
    }
    this.monthDays = fullDays;
    this.fullCalendarWeeks = weeks;
  }

  // Navegación del calendario

  onNextMonth(): void {
    if (this.monthNumber === 11) {
      this.monthNumber = 0;
      this.year++;
    } else {
      this.monthNumber++;
    }
    this.loadCalendar();
  }

  onPreviousMonth(): void {
    if (this.monthNumber === 0) {
      this.monthNumber = 11;
      this.year--;
    } else {
      this.monthNumber--;
    }
    this.loadCalendar();
  }
}
