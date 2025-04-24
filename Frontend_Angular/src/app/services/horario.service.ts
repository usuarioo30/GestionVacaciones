import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class HorarioService {

  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  obtenerTurnosSemanales(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/turnos_semanales`, {
      headers: this.getAuthHeaders()
    });
  }

  obtenerUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios_con_turnos`, {
      headers: this.getAuthHeaders()
    });
  }


  obtenerMesesPorUsuario(userId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/usuario/${userId}/meses_disponibles`, {
      headers: this.getAuthHeaders()
    });
  }

  generarPDF(userId: number, mes: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/generar_pdf/${userId}/${mes}`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }

}
