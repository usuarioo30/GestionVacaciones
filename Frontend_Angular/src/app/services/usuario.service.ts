import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Observable } from 'rxjs';

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

  getUserData(): Observable<any> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return new Observable(observer => observer.error('No token found'));
    }

    try {
      const decodedToken: any = jwtDecode(token);
      const userId = decodedToken.id;

      // Llamamos al backend para obtener los datos del usuario
      return this.http.get(`${this.apiUrl}/profile/${userId}`, {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${token}`
        })
      });
    } catch (e) {
      console.error('Error al decodificar el token', e);
      return new Observable(observer => observer.error('Error al decodificar el token'));
    }
  }


  updateUser(userData: any): Observable<any> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Token no encontrado. El usuario no está autenticado.');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Decodificar el token
    const decodedToken: any = jwtDecode(token);
    const userId = decodedToken.id;

    if (!userId) {
      throw new Error('No se pudo obtener el ID del usuario.');
    }

    // Hacemos la solicitud PUT al backend para actualizar el usuario
    return this.http.put(`${this.apiUrl}/edit/${userId}`, userData, { headers });
  }



}
