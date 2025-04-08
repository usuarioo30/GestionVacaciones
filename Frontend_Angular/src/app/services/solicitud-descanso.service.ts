import { computed, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SolicitudDescanso } from '../interfaces/solicitud-descanso';
import { jwtDecode } from 'jwt-decode';
import { Usuario } from '../interfaces/usuario';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SolicitudDescansoService {

  private urlApi = "http://localhost:5000/request";

  private solicitudesSignal = signal<SolicitudDescanso[]>([]);

  private filterSignal = signal<any>('');

  private orderSignal = signal<any>('');

  constructor(private http: HttpClient) { }

  setFilter(value: any) {
    this.filterSignal.set(value);
  }

  setOrder(field: any) {
    this.orderSignal.set(field);
  }

  filteredData = computed(() => {
    const statusMap: Record<string, any> = {
      "1": true,
      "0": false,
      "null": null
    }


    if (this.filterSignal() !== 'true') {

      const filteredStatus = statusMap[this.filterSignal() as keyof typeof statusMap];
      return this.orderData(this.solicitudesSignal().filter(request => request.estado == filteredStatus));
    }
    return this.orderData(this.solicitudesSignal());
  })

  orderData = (array: SolicitudDescanso[]) => {
    switch (this.orderSignal()) {
      case 'id_asc':
        return array.sort((r1, r2) => r1.id - r2.id);

      case 'id_desc':
        return array.sort((r1, r2) => r2.id - r1.id);

      case 'date_asc':

        return array.sort((r1, r2) => {

          return Date.parse(r1.fecha_inicio) - Date.parse(r2.fecha_inicio);
        });

      case 'date_desc':

        return array.sort((r1, r2) => {

          return Date.parse(r2.fecha_inicio) - Date.parse(r1.fecha_inicio);
        });


      default:
        return array.sort((r1, r2) => r1.id - r2.id);

    }
  }

  getAllSolicitudesDescansoAdmin(): Observable<SolicitudDescanso[]> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/list-admin`, { headers });
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
    return this.http.get<SolicitudDescanso[]>(`${this.urlApi}/${id}`, { headers })
      .subscribe({
        next: response => this.solicitudesSignal.set(response),
        error: err => console.log(err)
      })
  }

  getUserById(userId: number): Observable<Usuario> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<Usuario>(`http://localhost:5000/user/${userId}`, { headers });
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

  approveRequest(id: number, request: SolicitudDescanso) {

    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put(`${this.urlApi}/manage/${id}`, request,  {headers})
    .subscribe({
      next: () => Swal.fire({
        icon: 'success',
        title: 'Solicitud Aprobada',
        text: 'Tu solicitud ha sido aprobada exitosamente',
      }),
      error: (err) => {Swal.fire({
        icon: 'error',
        title: 'Error al aceptar tu solicitud',
        text: `${err.message}`,
      });
      console.log(err);
    }
    })
  }

}
