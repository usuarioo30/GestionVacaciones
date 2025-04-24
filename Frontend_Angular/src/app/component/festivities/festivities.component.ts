import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { HolidayserviceService } from '../../services/holidayservice.service';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-festivities',
  imports: [NgFor, NgIf],
  templateUrl: './festivities.component.html'
})
export class FestivitiesComponent implements OnInit, OnChanges{

  @Input() year!: number;
  @Input() monthNumber!: number;
  

  holidayService: HolidayserviceService = inject(HolidayserviceService);
  
  ngOnInit(): void {
    this.holidayService.getHolidaysFromAMonth(this.year, this.monthNumber);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] || changes['monthNumber']) { //Si cambia el año o mes pido los festivos de ese mes
      this.holidayService.getHolidaysFromAMonth(this.year, this.monthNumber);
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

    return statusMap[date.getUTCDay()] + ', '+dateString.split('-')[2];
  }

}
