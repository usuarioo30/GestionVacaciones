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

  // Cabecera con los días de la semana
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
      // Recargar el calendario en caso de que las solicitudes cambien.
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

        // Esperamos a que se carguen las solicitudes
        firstValueFrom(
          this.requestCalendar.getAcceptedRequest(this.auth)
        ).then(() => {
          this.loadCalendar();
        });

        this.authService.getUsers(token);
        this.users = computed(() => this.authService.allUsers());

      }
    }

  }

  isMonthRequested(): RequestResponse {
    // Si el array de solicitudes no está definido o está vacío, retorna false
    if (!this.solicitudes || this.solicitudes.length === 0) {
      return { estado: false, usuarioId: 0 };
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

        console.log("Hasta aquí llegue")
        if (laborablesSolicitados === totalLaborablesMes) {
          return { estado: true, usuarioId: solicitud.usuario_id }; // Al menos una solicitud cubre el mes completo
        }
      }
    }

    return { estado: false, usuarioId: 0 }; // Ninguna solicitud cubre el mes completo
  }

  isRequested(day: any): RequestResponse {
    // Convertimos el objeto "day" a Date
    const dayDate = new Date(day.year, day.monthIndex, day.number);
    // Verifica si el día está solicitado
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



  /**
   * Carga el calendario completo del mes actual,
   * completando con los días del mes anterior y siguiente para llenar las semanas.
   * Se asignan propiedades para determinar si un día está disponible para descanso y si ha sido solicitado.
   */
  loadCalendar() {
    // 1. Verificamos si el mes completo ha sido solicitado
    const solicitudCompleta: RequestResponse = this.isMonthRequested(); // <- usa tu objeto solicitud

    // 2. Días del mes actual
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




  getRandomColor(id: number): string {
    const colores = [
      '#A8D0E6', '#FFB6B9', '#C3FBD8', '#FFE6A7',
      '#B5EAD7', '#FFDAC1', '#E2F0CB', '#C7CEEA',
      '#F6D6AD', '#FFDEFA', '#D5AAFF', '#F0E6EF',
      '#F9F7D9', '#A0E7E5', '#B4F8C8', '#FFCBC1',
      '#FFD3B6', '#D0F4DE', '#E4C1F9', '#FAF3DD',
      '#F9C6C9', '#D8E2DC', '#FCD5CE', '#A3C4F3',
      '#D9D7F1', '#B8E0D2', '#FFEFBA', '#F0A6CA',
      '#EAD5DC', '#D2F6C5', '#FFF5BA', '#BFD7EA',
      '#FCE1E4', '#B5DAD2', '#F7D1CD', '#E3D4B9',
      '#F8ECD7', '#F6DFEB', '#C2ECEF', '#DFD3C3',
      '#F7FFE0', '#F3EAC2', '#FFDFD3', '#C9F2C7',
      '#EFD6FF', '#E3F9F0', '#F2C6DE', '#FFF3E6',
      '#FDDDE6', '#DAF4F0', '#FFEDDA', '#F1C6E7',
      '#D3F8E2', '#E4F9F5', '#FDD9E4', '#E2DBBE',
      '#F9D1D1', '#E8F6EF', '#D9F1F1', '#FFF1E6',
      '#C6F1E7', '#FFE6EB', '#FAF0E6', '#F7CFE6',
      '#F6F5F5', '#F2EBE9', '#FAF4C0', '#E3F6FF'
    ];


    const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];

    localStorage.setItem(`user-color-${id}`, colorAleatorio)
      ;

    return colorAleatorio;
  }

  getStoredColor(id: number): string {
    const storedColor = localStorage.getItem(`user-color-${id}`);

    return storedColor || this.getRandomColor(id);
  }

}
