import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, Signal } from '@angular/core';
import { PublicHoliday } from '../interfaces/public-holiday';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HolidayserviceService {

  private url: string = 'https://date.nager.at/api/v3/';
  private http: HttpClient = inject(HttpClient);

  private holidaySignal = signal<PublicHoliday[]>([]);

  getPublicHolidays(year: number): Observable<PublicHoliday[]> {
    return this.http.get<PublicHoliday[]>(`${this.url}PublicHolidays/${year}/ES`);
  }

  getHolidaysFromAMonth(year: number, month: number): void {
    //alert("Año " +year+", mes "+(month+1))
    this.getPublicHolidays(year)
    .subscribe({
      next: data => {
        const andalusianHolidays = data.filter(holiday => {
          const mes = String(month + 1).padStart(2, '0');
          return (holiday.global || (holiday.counties && holiday.counties.includes('ES-AN'))) && holiday.date.split('-')[1] === mes;
        });

        this.holidaySignal.set(andalusianHolidays);
      }
    });

    
  }

  // holidaysFromAndalusia(year: number, month: number) {
  //   this.getPublicHolidays(year)
  //   .subscribe({
  //     next: data => this.holidaySignal.set(data),
  //     error: () => alert("Error")
  //   })
  // }

  monthHolidays(): Signal<PublicHoliday[]> {
    return this.holidaySignal.asReadonly();
  }
}
