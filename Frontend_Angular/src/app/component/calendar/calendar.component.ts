import {Component, inject, Input, OnInit, SimpleChanges} from '@angular/core';
import { CreateCalendarService } from '../../services/createcalendar.service';
import { Day } from '../../interfaces/day';
import {CommonModule, DatePipe} from '@angular/common';
import { Router } from '@angular/router';
import {SolicitudDescanso} from '../../interfaces/solicitud-descanso';
import {SolicitudDescansoService} from '../../services/solicitud-descanso.service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { CalendarRequestService } from '../../services/calendar-request.service';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {

  solicitud!: SolicitudDescanso;
  monthDays!: Day[];            // Array completo de días (incluyendo relleno)
  day!: Day;
  fullCalendarWeeks!: Day[][];  // Días agrupados en semanas (cada semana es un array de 7 días)
  solicitudes: SolicitudDescanso[] = [];
  monthNumber!: number;
  year!: number;
  auth: string = '';
  status: string = 'true';

  // Cabecera con los días de la semana
  weeksDaysName: string[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  calendar: CreateCalendarService = inject(CreateCalendarService);
  solicitudSrvc: SolicitudDescansoService = inject(SolicitudDescansoService);
  requestCalendar: CalendarRequestService = inject(CalendarRequestService);

  constructor(
    private router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['solicitudes'] && this.monthNumber !== undefined && this.year !== undefined) {
      console.log('Las solicitudes han cambiado:', changes['solicitudes']);
      // Recargar el calendario en caso de que las solicitudes cambien.
      this.loadCalendar();
    }
  }

  ngOnInit() {
    const token = localStorage.getItem("access_token");

    if(!token) {
      this.router.navigateByUrl("/login");
    } else {
      // Se obtiene el mes actual para inicializar monthNumber y year.
      const currentMonthData = this.calendar.getCurrentMonth();
      this.monthNumber = currentMonthData[0].monthIndex;
      this.year = currentMonthData[0].year;
      this.auth = token;
      const decodedToken = jwtDecode(token);
        if (decodedToken.sub) {
          const userId = Number.parseInt(decodedToken.sub);
          this.requestCalendar.getAcceptedUsersSolicitudDescanso(userId, this.auth);

        }
  
      //await this.loadSolicitudes();
      this.loadCalendar();

    }

  }

  isMonthRequested(): boolean {
    // Si el array de solicitudes no está definido o está vacío, retorna false
    if (!this.solicitudes || this.solicitudes.length === 0) {
      return false;
    }

    for (const solicitud of this.solicitudes) {
      // Si por alguna razón algún elemento es undefined, lo saltamos
      if (!solicitud) {
        continue;
      }

      // Asegúrate de que fecha_inicio y fecha_fin existen en la solicitud.
      if (!solicitud.fecha_inicio || !solicitud.fecha_fin) {
        continue;
      }

      const fecha_inicio = new Date(solicitud.fecha_inicio);
      const fecha_fin = new Date(solicitud.fecha_fin);

      // Solo consideramos solicitudes que están en el mes actual
      if (
        fecha_inicio.getFullYear() === this.year &&
        fecha_inicio.getMonth() === this.monthNumber &&
        fecha_fin.getFullYear() === this.year &&
        fecha_fin.getMonth() === this.monthNumber
      ) {
        const anio = fecha_inicio.getFullYear();
        const mes = fecha_inicio.getMonth();

        // Días laborables del mes completo
        const diasEnMes = new Date(anio, mes + 1, 0).getDate();
        let totalLaborablesMes = 0;
        for (let dia = 1; dia <= diasEnMes; dia++) {
          const fecha = new Date(anio, mes, dia);
          const diaSemana = fecha.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) totalLaborablesMes++;
        }

        // Días laborables de la solicitud
        let laborablesSolicitados = 0;
        const fechaActual = new Date(fecha_inicio);
        while (fechaActual <= fecha_fin) {
          const diaSemana = fechaActual.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) laborablesSolicitados++;
          fechaActual.setDate(fechaActual.getDate() + 1);
        }

        if (laborablesSolicitados === totalLaborablesMes) {
          return true; // Al menos una solicitud cubre el mes completo
        }
      }
    }

    return false; // Ninguna solicitud cubre el mes completo
  }

  isRequested(day: any): boolean {
    // Convertimos el objeto "day" a Date
    const dayDate = new Date(day.year, day.monthIndex, day.number);
    // Verifica si el día está solicitado
    if (!this.requestCalendar.requests() || this.requestCalendar.requests().length === 0) {
      return false;
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
          return true;
        }
      }
    }
    return false;
  }



  /**
   * Carga el calendario completo del mes actual,
   * completando con los días del mes anterior y siguiente para llenar las semanas.
   * Se asignan propiedades para determinar si un día está disponible para descanso y si ha sido solicitado.
   */
  loadCalendar() {
    // 1. Verificamos si el mes completo ha sido solicitado
    const solicitudCompleta: boolean = this.isMonthRequested(); // <- usa tu objeto solicitud

    // 2. Días del mes actual
    const currentDays = this.calendar.getMonth(this.monthNumber, this.year);
    currentDays.forEach(day => {
      day.isCurrentMonth = true;
      day.available = this.calendar.isDayAvailable(day);

      const solicitudParcial: boolean = this.isRequested(day);
      // Si el mes fue solicitado completamente, todos los días laborables se marcan como requested
      if (solicitudCompleta && day.weekDayNumber < 5) {
        day.requested = true;
      }else if (solicitudParcial && day.weekDayNumber < 5) {
        day.requested = true;
      } else {
        day.requested = false;
      }
    });

    // 3. Días del mes anterior (relleno al inicio)
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
        day.requested = false; // Días de otro mes no se consideran solicitados aquí
      });
    }

    // 4. Días del mes siguiente (relleno al final)
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
        day.requested = false; // No se consideran solicitados
      });

      fullDays = fullDays.concat(daysToAppend);
    }

    // 5. Agrupar los días en semanas
    const weeks: Day[][] = [];
    for (let i = 0; i < fullDays.length; i += 7) {
      weeks.push(fullDays.slice(i, i + 7));
    }

    // 6. Guardamos los resultados
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
