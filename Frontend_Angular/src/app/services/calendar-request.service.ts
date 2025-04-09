import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal, Signal } from '@angular/core';
import { SolicitudDescanso } from '../interfaces/solicitud-descanso';

@Injectable({
  providedIn: 'root'
})
export class CalendarRequestService {

  private urlApi = "http://localhost:5000/request";

  private requestCalendarSignal = signal<SolicitudDescanso[]>([]);

  private http: HttpClient = inject(HttpClient);

  getAcceptedUsersSolicitudDescanso(id: number, token: string): any {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/accepted/${id}`, { headers })
      .subscribe({
        next: response => this.requestCalendarSignal.set(response.filter(status => status.estado === true)),
        error: err => console.log(err)
      })
  }

  get requests(): Signal<SolicitudDescanso[]> {
    return this.requestCalendarSignal;
  }

}
