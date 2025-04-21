import { computed, Injectable, Signal, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SolicitudDescanso } from '../interfaces/solicitud-descanso';
import { jwtDecode } from 'jwt-decode';
import { Usuario } from '../interfaces/usuario';
import Swal from 'sweetalert2';
import { AdminRequest } from '../interfaces/admin-request';

@Injectable({
  providedIn: 'root'
})
export class SolicitudDescansoService {

  private urlApi = "http://localhost:5000/request";

  private solicitudesSignal = signal<SolicitudDescanso[] | AdminRequest[]>([]);

  private filterSignal = signal<any>('');

  private orderSignal = signal<any>('');

  constructor(private http: HttpClient) { }

  setFilter(value: any) {
    this.filterSignal.set(value);
  }

  setOrder(field: any) {
    this.orderSignal.set(field);
  }

  filteredData(isAdmin?: boolean): Signal<AdminRequest[]>
  filteredData(): Signal<SolicitudDescanso[]> {
    return computed(() => {
      const statusMap: Record<string, any> = {
        "1": true,
        "0": false
      }
  
  
      if (this.filterSignal() !== 'true') {
  
        const filteredStatus = statusMap[this.filterSignal() as keyof typeof statusMap];
        return this.orderData(this.solicitudesSignal().filter(request => request.estado == filteredStatus));
      }
      return this.orderData(this.solicitudesSignal());
    })
  }

  orderData = (array: SolicitudDescanso[] | AdminRequest[]) => {

    const isAdminRequest = (item: any): item is AdminRequest => {
      return 'nombreCompleto' in item && typeof item.nombreCompleto === 'string';
    };
    
    const allAdmins = array.every(isAdminRequest);

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

      case 'user_asc':
          if (allAdmins) {
            return (array as AdminRequest[]).sort((r1, r2) =>
              r1.nombreCompleto.toLowerCase().trim().localeCompare(
                r2.nombreCompleto.toLowerCase().trim(),
                'es'
              )
            );
          } else {
            return array.sort((r1, r2) => r1.id - r2.id);
          }
    
      case 'user_desc':
          if (allAdmins) {
            return(array as AdminRequest[]).sort((r1, r2) =>
              r2.nombreCompleto.toLowerCase().trim().localeCompare(
                r1.nombreCompleto.toLowerCase().trim(),
                'es'
              )
            );
          } else {
            return array.sort((r1, r2) => r1.id - r2.id);
          }
          


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

  getAdminSolicitudDescanso(token: string): any {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.get<AdminRequest[]>(`${this.urlApi}/list-admin/all`, { headers })
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

  saveSolicitudDescanso(solicitudDescanso: SolicitudDescanso): Observable<void> {
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

    return this.http.put<any>(`${this.urlApi}/edit/${solicitud.id}`, solicitud, { headers });
  }

  getUsernameToken(): string {
    const token = localStorage.getItem('access_token');
    if (token) {
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
        return decodedToken.sub ? Number(decodedToken.sub) : null;
      } catch (error) {
        console.error('Error decodificando el token', error);
        return null;
      }
    }
    return null;
  }

  approveOrRejectRequest(id: number, request: SolicitudDescanso, isApprove: boolean) {
    const token = localStorage.getItem('access_token');

    if (!token) {
      throw new Error('Token no encontrado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    request.estado = isApprove;

    this.http.put(`${this.urlApi}/manage/${id}`, request, { headers })
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: isApprove ? 'Solicitud Aprobada' : 'Solicitud Rechazada',
            text: isApprove ? 'Tu solicitud ha sido aprobada exitosamente' : 'Tu solicitud ha sido rechazada exitosamente',
          });
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error al manejar la solicitud',
            text: `${err.message}`,
          });
          console.log(err);
        }
      });
  }

  checkIfDateHasBeenUsed(fecha_inicio: string, fecha_fin: string): Observable<boolean> {

    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Token no encontrado');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = {"fecha_inicio": fecha_inicio, "fecha_fin": fecha_fin}
    return this.http.post<SolicitudDescanso[]>(`${this.urlApi}/compare`, body, { headers })
    .pipe(
      map((response) => response.length > 0)
    )
  }

}
