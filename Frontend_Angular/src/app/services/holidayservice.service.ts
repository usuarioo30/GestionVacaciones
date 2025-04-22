import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PublicHoliday } from '../interfaces/public-holiday';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HolidayserviceService {

  private url: string = 'https://date.nager.at/api/v3/';
  private http: HttpClient = inject(HttpClient);

  getPublicHolidays(year: number): Observable<PublicHoliday[]> {
    return this.http.get<PublicHoliday[]>(`${this.url}PublicHolidays/${year}/ES`);
  }
}
