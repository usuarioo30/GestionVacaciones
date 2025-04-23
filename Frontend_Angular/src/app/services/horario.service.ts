import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HorarioService {
  private apiUrl = 'http://localhost:5000/api/admin/turnos_semanales';

  constructor(private http: HttpClient) { }

  obtenerTurnosSemanales(): Observable<any> {
    const token = localStorage.getItem('access_token');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(this.apiUrl, { headers: headers });
  }
}
