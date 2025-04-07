import { computed, Injectable, signal } from '@angular/core';
import { Observable, pipe, tap } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SolicitudDescanso } from '../interfaces/solicitud-descanso';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class SolicitudDescansoService {

  private urlApi = "http://localhost:5000/request";

  private solicitudesSignal= signal<SolicitudDescanso[]>([])

  private filterSignal = signal<any>('');

  constructor(private http: HttpClient) { }


  setFilter(value: any) {
    this.filterSignal.set(value);
  }

  filteredData = computed(() => {
    const statusMap: Record<string, any> = {
      "1": true,
      "0": false,
      "null": null
    }

    
    if (this.filterSignal() !== 'true') {
      
      const filteredStatus = statusMap[this.filterSignal() as keyof typeof statusMap];
      return this.solicitudesSignal().filter(request => request.estado == filteredStatus);
    }
    return this.solicitudesSignal();
  })

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

    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/list`, { headers });
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


    return this.http.post<void>(`${this.urlApi}/register`, solicitudDescanso, { headers });
  }

  deleteSolicitudDescanso(id: number) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.delete<void>(`${this.urlApi}/delete/${id}`, { headers });
  }

  editSolicitudDescanso(solicitud: SolicitudDescanso): Observable<any> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Aquí enviamos el objeto completo (con los datos de la solicitud) al backend
    return this.http.put<any>(`${this.urlApi}/edit/${solicitud.id}`, solicitud, { headers });
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
