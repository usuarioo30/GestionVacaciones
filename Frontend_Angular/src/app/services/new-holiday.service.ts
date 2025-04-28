import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NewHolidayService {

  private url: string = 'http://localhost:5000/api/'
  private http: HttpClient = inject(HttpClient);

  token: string | null = localStorage.getItem('access_token')

  addNewHoliday(date: string, name: string): Observable<{name: string, date: Date}> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}`
    })
    return this.http.post<{name: string, date: Date}>(`${this.url}local-holiday/add`, {fecha: date, name}, { headers })
  }


  checkIfDateIsLocalHoliday(date: string) {
    return this.http.get<{isHoliday: boolean}>(`${this.url}local-holiday?date=${date}`);
  }

}
