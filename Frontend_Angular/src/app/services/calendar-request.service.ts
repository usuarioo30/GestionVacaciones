import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal, Signal } from '@angular/core';
import { SolicitudDescanso } from '../interfaces/solicitud-descanso';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CalendarRequestService {

  private urlApi = "http://localhost:5000/request";

  private requestCalendarSignal = signal<SolicitudDescanso[]>([]);

  private http: HttpClient = inject(HttpClient);

  getAcceptedUsersSolicitudDescanso(id: number, token: string): Observable<SolicitudDescanso[]> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/accepted/${id}`, { headers }).pipe(
      tap(response => {
        this.requestCalendarSignal.set(response);
      })
    );
  }

  getAcceptedRequest(token: string): Observable<SolicitudDescanso[]> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/accepted`, { headers }).pipe(
      tap(response => {

        this.requestCalendarSignal.set(response);
      })
    );
  }

  get requests(): Signal<SolicitudDescanso[]> {
    return this.requestCalendarSignal;
  }

}
