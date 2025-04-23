import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
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
  
    this.http.get<Turno[]>(`${this.url}turnos?fecha=${week}`, { headers })
    .subscribe({
      next: (data) => {
        
        this.turnosSignal.set(data);
      },
      error: (error) => {
        console.error('Error al obtener los turnos:', error);
      }
    })

  }

  getWorkedHours(schedule_id: number): Observable<{schedule_id: number, total_horas: number}> {
    return this.http.get<{schedule_id: number, total_horas: number}>(`${this.url}schedule/${schedule_id}/total_horas`);
  }


  
}
