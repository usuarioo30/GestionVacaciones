import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SolicitudDescanso } from '../model/SolicitudDescanso';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SolicitudDescansoService {

  private urlApi = "http://localhost:5000/requests";

  constructor(private http: HttpClient) { }

  getAllSolicitudesDescanso(): Observable<SolicitudDescanso[]> {
    return this.http.get<SolicitudDescanso[]>(this.urlApi);
  }
}
