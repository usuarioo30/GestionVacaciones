import { Component, inject, OnInit, SimpleChanges } from '@angular/core';
import { CreateCalendarService } from '../../services/createcalendar.service';
import { Day } from '../../interfaces/day';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SolicitudDescanso } from '../../interfaces/solicitud-descanso';
import { SolicitudDescansoService } from '../../services/solicitud-descanso.service';
import { firstValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { CalendarRequestService } from '../../services/calendar-request.service';
import { UsuarioService } from '../../services/usuario.service';
import { HolidayserviceService } from '../../services/holidayservice.service';
import { PublicHoliday } from '../../interfaces/public-holiday';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {

  solicitud!: SolicitudDescanso;
  monthDays!: Day[];
  day!: Day;
  fullCalendarWeeks!: Day[][];
  solicitudes: SolicitudDescanso[] = [];
  monthNumber!: number;
  year!: number;
  auth: string = '';
  status: string = 'true';
  usuarios: any[] = [];
  loggedInUserId: number = -1;
  holidays!: PublicHoliday[];

  // Cabecera con los días de la semana
  weeksDaysName: string[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  calendar: CreateCalendarService = inject(CreateCalendarService);
  solicitudSrvc: SolicitudDescansoService = inject(SolicitudDescansoService);
  requestCalendar: CalendarRequestService = inject(CalendarRequestService);
  holidayService: HolidayserviceService = inject(HolidayserviceService);

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
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
      return;
    }
  
    // 1) Primero obtén mes/año inicial:
    const [current] = this.calendar.getCurrentMonth();
    this.monthNumber = current.monthIndex;
    this.year        = current.year;
  
    // 2) Ahora que this.year está inicializado, haz la petición de festivos:
    this.holidayService.getPublicHolidays(this.year).subscribe({
      next: (response) => {
        // filtramos los de Andalucía
        this.holidays = response.filter(h =>
          h.global || (h.counties ?? []).includes('ES-AN')
        );
        
  
        // 3) Con los festivos ya cargados, generamos el calendario
        this.loadCalendar();
      },
      error: (err) => console.error('No se pudieron cargar festivos:', err)
    });
  
    // 4) Si luego necesitas la lógica de solicitudes de usuario:
    const decoded: any = jwtDecode(token);
    if (decoded.sub) {
      this.loggedInUserId = decoded.sub;
      firstValueFrom(
        this.requestCalendar.getAcceptedUsersSolicitudDescanso(this.loggedInUserId, token)
      ).then(() => {
        // Si tu loadCalendar vuelve a pintar, podrías simplemente llamarlo otra vez aquí
        this.loadCalendar();
      });
    }
  
    this.loadUsers();
  }
  

  loadUsers(): void {
    this.usuarioService.getAllUsers().subscribe(
      (response) => {
        this.usuarios = response.users;
  
        this.usuarios = this.usuarios.sort((a, b) => {
          if (a.id === this.loggedInUserId) return -1;
          if (b.id === this.loggedInUserId) return 1;
          return 0;
        });
      },
      (error) => {
        console.error('Error al cargar los usuarios:', error);
      }
    );
  }


  isMonthRequested(): boolean {
    if (!this.solicitudes || this.solicitudes.length === 0) {
      return false;
    }

    for (const solicitud of this.solicitudes) {
      if (!solicitud) {
        continue;
      }

      if (!solicitud.fecha_inicio || !solicitud.fecha_fin) {
        continue;
      }

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
          return true;
        }
      }
    }

    return false;
  }

  isRequested(day: any): boolean {
    const dayDate = new Date(day.year, day.monthIndex, day.number);
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
    const solicitudCompleta: boolean = this.isMonthRequested();

    // 2. Días del mes actual
    const currentDays = this.calendar.getMonth(this.monthNumber, this.year);
    currentDays.forEach(day => {
      day.isCurrentMonth = true;
      day.available = this.calendar.isDayAvailable(day);
      day.isHoliday = this.isHoliday(day);
      const solicitudParcial: boolean = this.isRequested(day);
      if (solicitudCompleta) {
        day.requested = true;
      } else if (solicitudParcial) {
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
        day.requested = false;
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
        day.requested = false;
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

  private isHoliday(day: Day): boolean {
    return this.holidays.some(h => {
      // h.date viene como "YYYY-MM-DD"
      const [y, m, d] = h.date.split('-').map(Number);
      // m es 1–12 en la cadena, monthIndex es 0–11
      return y === day.year && (m - 1) === day.monthIndex && d === day.number;
    });
  }
}
