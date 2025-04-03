import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Usuario } from '../interfaces/usuario';
import { Proyecto } from '../interfaces/proyecto';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  //Url de la API
  private apiUrl = 'http://localhost:5000';

  constructor(private router: Router, private http: HttpClient) { }

  /**
   * Método de iniciar sesión, es llamado cuando el formulario es válido
   * @param username Nombre del usuario
   * @param password Contraseña del usuario
   * @returns El token de inicio de sesión
   */
  async logIn(username: string, password: string) {

    //Llamada a la api para iniciar sesión
    const response = await fetch(`${this.apiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: username, password: password })
    });

    return response

  }

  /**
   * Método para obtener el nombre de usuario desde el token
   * @returns El email del usuario
   */
  getEmail(): string | null {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Decodificar el token JWT
        const decoded: any = jwtDecode(token);

        // Retornar el nombre de usuario desde el payload del token
        return decoded.email || null;
      } catch (error) {
        console.error('Error al decodificar el token', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Método para obtener a un usuario dado su email
   * @param email Correo electrónico del usuario
   * @returns Promise<Usuario> El usuario registrado con ese correo
   */
  async getUserByMail(email: string): Promise<Usuario> {
    const response = await fetch(`${this.apiUrl}/usuarios/email/${email}`)

    if (!response.ok) {
      throw new Error('Error al obtener el usuario');
    }

    const json = await response.json();

    return await json;

  }

  /**
   * Método para obtener un usuario dado su nombre de usuario
   * @param username El nombre de usuario del usuario
   * @returns El usuario al que pertenece ese username
   */
  async getUserByUsername(username:string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/usuarios/username/${username}`);
    if (response.status === 404) {
      return true;
    }

    if (!response.ok) {
      throw new Error('Error al obtener el usuario');
    }

    const json = await response.json();
    return json;
  }

  /**
   * Método para obtener a todos los usuarios existentes
   * @returns Lista de usuarios existentes
   */
  async getUsers(): Promise<Usuario[]> {
    try {
      return await firstValueFrom(this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`));
    } catch (error) {
      console.error('Error al obtener los usuarios:', error);
      return [];
    }
  }

  /**
   * Método para obtener a un usuario dado su id
   * @param id del usuario
   * @returns El usuario al que pertenece ese id
   */
  async getUser(id: number) {
    const response = await fetch(`${this.apiUrl}/usuarios/${id}`)

    if (!response.ok) {
      throw new Error('Error al obtener el usuario');
    }

    return response.json();

  }

  /**
   * Método para obtener el rol del usuario logueado mediante su token almacenado localmente
   * @returns El rol del usuario
   */
  async getRole() {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Decodificar el token
        const decodedToken: any = jwtDecode(token);
        console.log('Decoded Token:', decodedToken);

        // Verifica que el rol esté presente en el token
        return decodedToken?.rol || (await this.getUserByMail(decodedToken.email)).roles;
      } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Método para iniciar sesión con google
   * @param response 
   * @returns El email obtenido al decodificar el token de google
   */
  async loginWithGoogle(response: string) {
    const decodedToken = this.decodeJwtResponse(response);
    console.log("Decoded token", decodedToken);
    const fetchResponse = await fetch(`${this.apiUrl}/api/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: decodedToken.email })
    });

    return fetchResponse.json();
  }

  /**
   * Método para registrar un usuario
   * @param user El usuario a registrar sin id asignado
   * @returns Promise<Usuario> El usuario con un id ya asignado
   */
  async registerUser(user: Omit<Usuario, "id">): Promise<Usuario> {
    const response = await fetch(`${this.apiUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    return await response.json();

  }

  /**
   * Método para crear un usuario
   * @param id Clave del usuario a editar
   * @param username Nuevo nombre de usuario (opcional)
   * @param password Nueva contraseña (opcional)
   * @returns El usuario editado
   */
  async editUser(id: number, username?: string, password?: string) {
    try {
      const body = { username, password };

      const response = await fetch(`${this.apiUrl}/usuarios/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Suponiendo que el backend responde con un mensaje de error si el username ya existe
        if (errorData.message === 'Username already exists') {
          throw new Error('username already exists');
        }

        throw new Error('Error al editar el usuario');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 
   * @param id Clave del usuario a eliminar
   * @returns Mensaje de éxito al borrar o borrado fallido
   */
  deleteUser(id: number) {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`).toPromise();
  }

  async registerProject(project: Omit<Proyecto, "id">): Promise<Proyecto> {
    console.log("He entrado aquí con", project);
    const response = await fetch(`${this.apiUrl}/registrarProyecto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      throw new Error('Error al registrar el proyecto');
    }

    return await response.json();

  }

  /**
   * Método para cerrar sesión y redirigir al login
   */
  logout(): void {
    localStorage.removeItem('access_token');

    this.router.navigate(['/login']);
  }

  /**
   *
   * @param token El token JWT
   * @returns el payload del token decodificado
   */
  decodeJwtResponse(token: string) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  }

  
  /**
   * Método para decodificar el token JWT
   * @param token El token de inicio de sesión
   * @returns El token de inicio de sesión decodificado
   */
  decodeToken(token: string): any {
    return jwtDecode(token);
  }
}
