import { Injectable, signal } from '@angular/core';
import { Observable, pipe, tap } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SolicitudDescanso } from '../interfaces/solicitud-descanso';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class SolicitudDescansoService {

  private urlApi = "http://localhost:5000";

  private solicitudesSignal= signal<SolicitudDescanso[]>([])

  constructor(private http: HttpClient) { }

  //Getter de la signal
  get solicitudes() {
    return this.solicitudesSignal;
  }

  getAllSolicitudesDescanso(): Observable<SolicitudDescanso[]> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/requests`, { headers });
  }

  getUsersSolicitudDescanso(id: number, token: string): any {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/request/${id}`, {headers})
    .subscribe({
      next: response => this.solicitudesSignal.set(response),
      error: err => console.log(err)
    })
  }

  saveSolicitudDescanso(solicitudDescanso: SolicitudDescanso) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);


    return this.http.post<void>(`${this.urlApi}/registerRequest`, solicitudDescanso, { headers });
  }

  deleteSolicitudDescanso(id: number) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.delete<void>(`${this.urlApi}/deleteRequest/${id}`, { headers });
  }

  getUsernameToken(): string {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Decodificar el token para obtener los claims
      interface DecodedToken {
        username: string;
        exp: number;
        iat: number;
      }
      const decodedToken = jwtDecode<DecodedToken>(token);

      return decodedToken.username;
    }
    return "No hay token";
  }

  getNombreCompletoToken(): string {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Decodificar el token para obtener los claims
      interface DecodedToken {
        nombreCompleto: string;
        exp: number;
        iat: number;
      }
      const decodedToken = jwtDecode<DecodedToken>(token);

      return decodedToken.nombreCompleto;
    }
    return "No hay token";
  }

  getUsuarioIdToken(): number | null {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Decodificar el token con jwt-decode
        const decodedToken: any = jwtDecode(token);
        return decodedToken.sub ? Number(decodedToken.sub) : null;  // Retorna el ID del usuario desde 'sub'
      } catch (error) {
        console.error('Error decodificando el token', error);
        return null;
      }
    }
    return null;
  }

}
