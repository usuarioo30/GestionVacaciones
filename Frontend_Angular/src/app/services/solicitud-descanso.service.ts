import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SolicitudDescanso } from '../interfaces/solicitud-descanso';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class SolicitudDescansoService {

  private urlApi = "http://localhost:5000";

  constructor(private http: HttpClient) { }

  getAllSolicitudesDescanso(): Observable<SolicitudDescanso[]> {
    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/requests`);
  }

  saveSolicitudDescanso(solicitudDescanso: SolicitudDescanso) {
    return this.http.post<void>(`${this.urlApi}/registerRequest`, solicitudDescanso);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getUserNameFromToken(): string {
    const token = this.getToken();
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        
        console.log('Token Decodificado:', decoded);
        
        return decoded.sub.username;
      } catch (error) {
        console.error('Error al decodificar el token', error);
        return " ";
      }
    }
    return " ";
  }
}
