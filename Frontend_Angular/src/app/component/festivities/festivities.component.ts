import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { HolidayserviceService } from '../../services/holidayservice.service';
import { NgFor, NgIf } from '@angular/common';
import { NewHolidayService } from '../../services/new-holiday.service';
import { LocalHoliday } from '../../interfaces/local-holiday';

@Component({
  selector: 'app-festivities',
  imports: [NgFor, NgIf],
  templateUrl: './festivities.component.html'
})
export class FestivitiesComponent implements OnInit, OnChanges {

  @Input() year!: number;
  @Input() monthNumber!: number;

  localHolidays: LocalHoliday[] = [];

  holidayService: HolidayserviceService = inject(HolidayserviceService);
  localHolidayService: NewHolidayService = inject(NewHolidayService);

  ngOnInit(): void {
    this.holidayService.getHolidaysFromAMonth(this.year, this.monthNumber);
    const formatedDate = `${this.year}-${String(this.monthNumber + 1).padStart(2, '0')}`

    this.localHolidayService.checkIfDateIsLocalHoliday(formatedDate)
      .subscribe({
        next: response => this.localHolidays = response,
        error: () => {
          alert('Error fetching local holidays:');
          this.localHolidays = []; // Set to empty array on error
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] || changes['monthNumber']) { //Si cambia el año o mes pido los festivos de ese mes

      this.holidayService.getHolidaysFromAMonth(this.year, this.monthNumber);

      const formatedDate = `${this.year}-${String(this.monthNumber + 1).padStart(2, '0')}`
      this.localHolidayService.checkIfDateIsLocalHoliday(formatedDate)
        .subscribe({
          next: response => this.localHolidays = response,
          error: err => {
            console.error('Error fetching local holidays:', err);
            this.localHolidays = []; // Set to empty array on error
          }
        });
    }
  }

  formatDateString(dateString: string): string {
    const date = new Date(dateString);
    const statusMap: Record<number, string> = {
      0: 'Dom',
      1: 'Lun',
      2: 'Mar',
      3: 'Mié',
      4: 'Jue',
      5: 'Vie',
      6: 'Sáb'
    }

    return statusMap[date.getUTCDay()] + ', ' + dateString.split('-')[2];
  }

}
