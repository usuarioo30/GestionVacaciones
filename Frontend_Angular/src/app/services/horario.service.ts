import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { inject } from '@angular/core';
import { Turno } from '../interfaces/turno';
import { forkJoin, map, Observable, switchMap } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class HorarioService {

  private url: string = 'http://localhost:5000/'
  private http: HttpClient = inject(HttpClient);
  private turnosSignal = signal<Turno[]>([]);

  get Turnos() {
    return this.turnosSignal.asReadonly();
  }
  
  getTurnosFromAWeek(week: string) {
    const token = localStorage.getItem('access_token')!;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
    // 1) Primera petición: obtén el array de turnos
    this.http.get<Turno[]>(`${this.url}turnos?fecha=${week}`, { headers })
      .pipe(
        // 2) Cuando lleguen los turnos, por cada uno lanza getWorkedHours()
        switchMap(turnos => {
          const detalles$ = turnos.map(turno =>
            this.getWorkedHours(turno.id).pipe(
              // 3) añade la propiedad horasTrabajadas a cada turno
              map(horas => ({ ...turno, horasTrabajadas: horas.total_horas }))
            )
          );
          // 4) forkJoin espera a que TODOS los detalles terminen
          return forkJoin(detalles$);
        })
      )
      // 5) Aquí ya tienes el array completo de turnos con horas
      .subscribe({
        next: turnosConHoras => {
          this.turnosSignal.set(turnosConHoras);
          console.log('Turnos con horas trabajadas:', turnosConHoras);
        },
        error: err => console.error('Error en getTurnosFromAWeek:', err)
      });
  }

  getWorkedHours(schedule_id: number): Observable<{schedule_id: number, total_horas: number}> {
    return this.http.get<{schedule_id: number, total_horas: number}>(`${this.url}schedule/${schedule_id}/total_horas`);
  }


  
}
