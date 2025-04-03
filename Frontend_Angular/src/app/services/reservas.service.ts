import { Injectable } from '@angular/core';
import { Reserva } from '../interfaces/reserva';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Proyecto } from '../interfaces/proyecto';

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  //Url de la Api
  private apiUrl = 'http://localhost:5000/';

  constructor(private http: HttpClient) {}

  /**
   * Función encargada de obtener todas las reservas de la API
   * @returns Promise resuelta en formato json
   */
  async getReservas(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}reservas`);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error al obtener las reservas:', error);
      throw error;
    }
  }

  /**
   * Función encargada de obtener todos los datos de un proyecto dado su id
   * @param id Clave primaria de la Tabla proyecto
   * @returns Promise<Proyecto>
   */
  async getNombreProyecto(id: number): Promise<Proyecto> { 
    try {
      const response = await fetch(`${this.apiUrl}proyectos/${id}`); 
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      return await response.json(); 
    } catch (error) {
      console.error('Error al obtener el nombre del proyecto:', error);
      throw error;
    }
  }

  /**
   * Función encargada de añadir una nueva reserva a la base de datos
   * @param reserva La nueva reserva a añadir sin id
   * @returns Promise<void> Respuesta de la API en formato JSON
   */
  async addReserva(reserva: Omit<Reserva, "id">): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}registrarReserva`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Autorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(reserva),
      });
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al añadir la reserva:', error);
      throw error;
    }
  }

  /**
   * Función encargada de editar una reserva
   * @param reserva La nueva información que queremos persistir en una reserva existente
   * @returns Promise<void> Respuesta de la API en formato JSON
   */
  async editReserva(reserva: Reserva): Promise<void> { 
    try {

      const response = await fetch(`${this.apiUrl}editarReserva/${reserva.id}`, {
        method: 'PUT', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reserva)
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error al editar la reserva:', error);
      throw error;
    }
  }

  /**
   * 
   * @param id Identificador de la reserva que queremos eliminar
   * @returns Observable<any>
   */
  deleteReserva(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/eliminarReserva/${id}`);
  }
}