import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap, throwError } from 'rxjs';
import { Usuario } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = 'http://localhost:5000/user';

  constructor(private http: HttpClient) { }

  createUser(userData: any): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.apiUrl}/create`, userData, { headers });
  }

  private isAdmin(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return false;
    }

    try {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.rol === 'admin';
    } catch (e) {
      console.error('Error al decodificar el token', e);
      return false;
    }
  }

  getUsersList(): Observable<any> {
    if (!this.isAdmin()) {
      throw new Error('Acceso denegado: Solo los administradores pueden ver la lista de usuarios');
    }

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/list`, { headers });
  }

  getUsuarioActual(): any {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }

    try {
      const decodedToken: any = jwtDecode(token);
      return decodedToken;
    } catch (e) {
      console.error('Error al decodificar el token', e);
      return null;
    }
  }

  deleteUser(userId: number): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete(`${this.apiUrl}/delete/${userId}`, { headers });
  }

  getUsuarioById(userId: number): Observable<Usuario> {
    const token = localStorage.getItem('access_token');
    return this.http.get<Usuario>(`${this.apiUrl}/${userId}`, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
    });
  }

  editarUsuario(userData: any): Observable<any> {
    const token = localStorage.getItem('access_token');
  
    // Verificar si el token existe y extraer el ID del usuario
    if (!token) {
      return throwError('Token no encontrado');
    }
  
    try {
      const decodedToken: any = jwtDecode(token);
      const userId = decodedToken.sub; // Suponiendo que el ID del usuario esté en el token
  
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
  
      // Llamada PUT al backend para editar el usuario
      return this.http.put(`${this.apiUrl}/edit/${userId}`, userData, { headers }).pipe(
        // Aquí actualizamos el token si el backend lo devuelve
        tap((response: any) => {
          // Si el backend devuelve un nuevo token, actualizamos el almacenamiento
          if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
          }
        })
      );
    } catch (e) {
      console.error('Error al decodificar el token', e);
      return throwError('Error al decodificar el token');
    }
  }

}
