import { Component, computed, inject, Input, OnInit, Signal, SimpleChanges } from '@angular/core';
import { CalendarRequestService } from '../../../services/calendar-request.service';
import { Day } from '../../../interfaces/day';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { firstValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { CreateCalendarService } from '../../../services/createcalendar.service';
import { RequestResponse } from '../../../interfaces/request-response';
import { Color } from '../../../interfaces/color';
import { AuthService } from '../../../services/auth.service';
import { Usuariomin } from '../../../interfaces/usuariomin';



@Component({
  selector: 'app-calendario-admin',
  imports: [CommonModule],
  templateUrl: './calendario-admin.component.html',
  styleUrl: './calendario-admin.component.css'
})
export class CalendarioAdminComponent {
  solicitud!: SolicitudDescanso;
  monthDays!: Day[];
  day!: Day;
  fullCalendarWeeks!: Day[][];
  solicitudes: SolicitudDescanso[] = [];
  monthNumber!: number;
  year!: number;
  auth: string = '';
  status: string = 'true';
  color: Color[] = []
  users!: Signal<Usuariomin[]>;
  selectedUserId: number | null = null;

  weeksDaysName: string[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  calendar: CreateCalendarService = inject(CreateCalendarService);
  solicitudSrvc: SolicitudDescansoService = inject(SolicitudDescansoService);
  requestCalendar: CalendarRequestService = inject(CalendarRequestService);
  authService: AuthService = inject(AuthService);

  constructor(
    private router: Router
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['solicitudes'] && this.monthNumber !== undefined && this.year !== undefined) {
      console.log('Las solicitudes han cambiado:', changes['solicitudes']);
      this.loadCalendar();
    }
  }

  ngOnInit() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      this.router.navigateByUrl("/login");
    } else {
      const currentMonthData = this.calendar.getCurrentMonth();
      this.monthNumber = currentMonthData[0].monthIndex;
      this.year = currentMonthData[0].year;
      this.auth = token;

      const decodedToken = jwtDecode(token);
      if (decodedToken.sub) {
        const userId = Number.parseInt(decodedToken.sub);

        firstValueFrom(this.requestCalendar.getAcceptedRequest(this.auth))
          .then(() => {
            this.loadCalendar();
          });

        this.authService.getUsers(token);
        this.users = computed(() => this.authService.allUsers());
      }
    }
  }

  isMonthRequested(): RequestResponse {
    if (!this.solicitudes || this.solicitudes.length === 0) {
      return { estado: false, usuarioId: 0 };
    }

    for (const solicitud of this.solicitudes) {
      if (!solicitud || !solicitud.fecha_inicio || !solicitud.fecha_fin) continue;

      const fecha_inicio = new Date(solicitud.fecha_inicio);
      const fecha_fin = new Date(solicitud.fecha_fin);

      if (
        fecha_inicio.getFullYear() === this.year &&
        fecha_inicio.getMonth() === this.monthNumber &&
        fecha_fin.getFullYear() === this.year &&
        fecha_fin.getMonth() === this.monthNumber
      ) {
        const anio = fecha_inicio.getFullYear();
        const mes = fecha_inicio.getMonth();
        const diasEnMes = new Date(anio, mes + 1, 0).getDate();
        let totalLaborablesMes = 0;
        for (let dia = 1; dia <= diasEnMes; dia++) {
          const fecha = new Date(anio, mes, dia);
          const diaSemana = fecha.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) totalLaborablesMes++;
        }

        let laborablesSolicitados = 0;
        const fechaActual = new Date(fecha_inicio);
        while (fechaActual <= fecha_fin) {
          const diaSemana = fechaActual.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) laborablesSolicitados++;
          fechaActual.setDate(fechaActual.getDate() + 1);
        }

        if (laborablesSolicitados === totalLaborablesMes) {
          return { estado: true, usuarioId: solicitud.usuario_id };
        }
      }
    }

    return { estado: false, usuarioId: 0 };
  }

  isRequested(day: any): RequestResponse {
    const dayDate = new Date(day.year, day.monthIndex, day.number);
    if (!this.requestCalendar.requests() || this.requestCalendar.requests().length === 0) {
      return { estado: false, usuarioId: 0 };
    }

    for (const solicitud of this.requestCalendar.requests()) {
      const fecha_inicio = new Date(solicitud.fecha_inicio);
      const fecha_fin = new Date(solicitud.fecha_fin);

      if (
        fecha_inicio.getFullYear() === day.year &&
        fecha_inicio.getMonth() === day.monthIndex &&
        fecha_fin.getFullYear() === day.year &&
        fecha_fin.getMonth() === day.monthIndex
      ) {
        if (fecha_inicio <= dayDate && dayDate <= fecha_fin) {
          return { estado: true, usuarioId: solicitud.usuario_id };
        }
      }
    }
    return { estado: false, usuarioId: 0 };
  }

  loadCalendar() {
    const solicitudCompleta: RequestResponse = this.isMonthRequested();
    const currentDays = this.calendar.getMonth(this.monthNumber, this.year);
    currentDays.forEach(day => {
      day.isCurrentMonth = true;
      day.available = this.calendar.isDayAvailable(day);

      const solicitudParcial: RequestResponse = !solicitudCompleta.estado ? this.isRequested(day) : { estado: false, usuarioId: 0 };
      const shouldRender =
        this.selectedUserId === null ||
        solicitudParcial.usuarioId === this.selectedUserId ||
        solicitudCompleta.usuarioId === this.selectedUserId;

      if (solicitudCompleta.estado && day.weekDayNumber < 5 && shouldRender) {
        day.requested = true;
        day.id = solicitudCompleta.usuarioId;
      } else if (solicitudParcial.estado && day.weekDayNumber < 5 && shouldRender) {
        day.requested = true;
        day.id = solicitudParcial.usuarioId;
      } else {
        day.requested = false;
      }
    });

    let prevMonth: number, prevYear: number;
    if (this.monthNumber === 0) {
      prevMonth = 11;
      prevYear = this.year - 1;
    } else {
      prevMonth = this.monthNumber - 1;
      prevYear = this.year;
    }
    const previousMonthDays = this.calendar.getMonth(prevMonth, prevYear);
    const numMissing = currentDays[0].weekDayNumber;
    let daysToPrepend: Day[] = [];

    if (numMissing > 0) {
      daysToPrepend = previousMonthDays.slice(-numMissing);
      daysToPrepend.forEach(day => {
        day.isCurrentMonth = false;
        day.available = this.calendar.isDayAvailable(day);
        day.requested = false;
      });
    }

    let fullDays = [...daysToPrepend, ...currentDays];
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
      daysToAppend.forEach(day => {
        day.isCurrentMonth = false;
        day.available = this.calendar.isDayAvailable(day);
        day.requested = false;
      });

      fullDays = fullDays.concat(daysToAppend);
    }

    const weeks: Day[][] = [];
    for (let i = 0; i < fullDays.length; i += 7) {
      weeks.push(fullDays.slice(i, i + 7));
    }

    this.monthDays = fullDays;
    this.fullCalendarWeeks = weeks;
  }

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

  // Array para almacenar los colores pasteles
  getRandomColor(id: number): string {
    const colores = [
      '#A8D0E6', '#FFB6B9', '#C3FBD8', '#FFE6A7', '#B5EAD7', '#FFDAC1', '#E2F0CB', '#C7CEEA', '#F6D6AD',
      '#FFDEFA', '#D5AAFF', '#F0E6EF', '#F9F7D9', '#A0E7E5', '#B4F8C8', '#FFCBC1', '#FFD3B6', '#D0F4DE',
      '#E4C1F9', '#FAF3DD', '#F9C6C9', '#D8E2DC', '#FCD5CE', '#A3C4F3', '#D9D7F1', '#B8E0D2', '#FFEFBA',
      '#F0A6CA', '#EAD5DC', '#D2F6C5', '#FFF5BA', '#BFD7EA', '#FCE1E4', '#B5DAD2', '#F7D1CD', '#E3D4B9',
      '#F8ECD7', '#F6DFEB', '#C2ECEF', '#DFD3C3', '#F7FFE0', '#F3EAC2', '#FFDFD3', '#C9F2C7', '#EFD6FF',
      '#E3F9F0', '#F2C6DE', '#FFF3E6', '#FDDDE6', '#DAF4F0', '#FFEDDA', '#F1C6E7', '#D3F8E2', '#E4F9F5',
      '#FDD9E4', '#E2DBBE', '#F9D1D1', '#E8F6EF', '#D9F1F1', '#FFF1E6', '#C6F1E7', '#FFE6EB', '#FAF0E6',
      '#F7CFE6', '#F6F5F5', '#F2EBE9', '#FAF4C0', '#E3F6FF'
    ];

    const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];
    localStorage.setItem(`user-color-${id}`, colorAleatorio);

    return colorAleatorio;
  }

  getStoredColor(id: number): string {
    let color: string | null = localStorage.getItem(`user-color-${id}`);
    if (color === null) {
      color = this.getRandomColor(id);
    }
    return color;
  }

  getDayBackgroundColor(day: Day): string {
    // if (day.weekDayNumber === 5 || day.weekDayNumber === 6) {
    //   return '#EEEEEE';
    // }

    if (day.requested) {
      return this.getStoredColor(day.id);
    }

    
    return '';
  }

}
