import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Proyecto } from '../interfaces/proyecto';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  //Url de la API
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  /**
   * Función encargada de obtener y devolver los proyectos existentes
   * @returns Observable<Proyecto>
   */
  getProyectos1(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.apiUrl}/proyectos`);
  }

  /**
   * Función encargada de editar un proyecto
   * @param id Clave del proyecto a editar
   * @param proyecto Nueva información del proyecto
   * @returns Observable<any>
   */
  editProyecto(id: number, proyecto: Proyecto): Observable<any> {
    return this.http.put(`${this.apiUrl}/editarProyecto/${id}`, proyecto);
  }

  /**
   * Función encargada de eliminar un proyecto
   * @param id Clave del proyecto a eliminar
   * @returns Observable<any>
   */
  deleteProyecto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/eliminarProyecto/${id}`);
  }

  /**
   * Función encargada de añadir un proyecto
   * @param proyecto Información del proyecto sin id
   * @returns Observable<any>
   */
  addProyecto(proyecto: Omit<Proyecto, 'id'>): Observable<any> {
    return this.http.post(`${this.apiUrl}/registrarProyecto`, proyecto);
  }

  /**
   * Función usada en ListReservasComponent para obtener los proyectos sin necesidad de suscribirse al observable
   * @returns Promise<Proyecto[]> la lista de proyectos existentes
   */
  async getProyectos(): Promise<Proyecto[]> {
    try {
      return await firstValueFrom(this.http.get<Proyecto[]>(`${this.apiUrl}/proyectos`));
    } catch (error) {
      console.error('Error al obtener los proyectos:', error);
      return [];
    }
  }
}
