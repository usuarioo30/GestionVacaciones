import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalHoliday } from '../interfaces/local-holiday';

@Injectable({
  providedIn: 'root'
})
export class NewHolidayService {

  private url: string = 'http://localhost:5000/api/'
  private http: HttpClient = inject(HttpClient);
  private localHolidaysSignal = signal<LocalHoliday[]>([]);
  token: string | null = localStorage.getItem('access_token')

  getAllHolidays() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    })
   this.http.get<LocalHoliday[]>(`${this.url}local-holiday/all`, { headers })
    .subscribe({
      next: response => this.localHolidaysSignal.set(response),
      error: err => {
        console.error('Error fetching local holidays:', err);
        this.localHolidaysSignal.set([]); // Set to empty array on error
      }
    })
  }

  addNewHoliday(date: string, name: string): Observable<{name: string, date: Date}> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    })
    return this.http.post<{name: string, date: Date}>(`${this.url}local-holiday/add`, {fecha: date, name}, { headers })
  }

  checkIfDateIsLocalHoliday(date: string): Observable<{isHoliday: boolean}> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    })
    return this.http.get<{isHoliday: boolean}>(`${this.url}local-holiday?date=${date}`, { headers });
  }

  get LocalHolidays(): Signal<LocalHoliday[]> {
    return this.localHolidaysSignal.asReadonly();
  }

}
