import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

  obtenerTurnosPorDia(userId: number, mes: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuario/${userId}/turnos_dia/${mes}`);
  }

  /**
   * Obtiene los turnos semanales para todos los usuarios, tal como lo devuelve el backend actualizado.
   * La estructura es un diccionario por mes, luego por semana, luego los turnos por día.
   */
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

  obtenerTurnosDisponibles(fechaInicio: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/turnos_disponibles`, {
      params: {
        fecha_inicio: fechaInicio
      },
      headers: this.getAuthHeaders()
    });
  }

  actualizarTurnoDiario(data: { user_id: number, fecha: string, turno_id: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/actualizar_turno_diario`, data, {
      headers: this.getAuthHeaders()
    });
  }
}
