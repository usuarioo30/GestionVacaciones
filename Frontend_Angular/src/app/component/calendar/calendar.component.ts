import { Component, inject, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CreateCalendarService } from '../../services/createcalendar.service';
import { Day } from '../../interfaces/day';
import { NgFor } from '@angular/common';
import { Week } from '../../interfaces/week';

@Component({
  selector: 'app-calendar',
  imports: [NgFor],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {

  monthDays!: Day[];

  monthNumber!: number;
  year!: number;

  weeksDaysName: string[] = [];

  showCalendar: any[][] = [];

  calendar: CreateCalendarService = inject(CreateCalendarService);

  ngOnInit(): void {
    this.setMonthDays(this.calendar.getCurrentMonth());

    this.weeksDaysName.push('L');
    this.weeksDaysName.push('M');  
    this.weeksDaysName.push('X');
    this.weeksDaysName.push('J');
    this.weeksDaysName.push('V');
    this.weeksDaysName.push('S');
    this.weeksDaysName.push('D');

    this.showCalendar = [[...this.weeksDaysName], [...this.monthDays]];
    console.log(this.showCalendar);

    const firstWeek = this.monthDays.filter((day) => {
      if (this.monthDays[0].weekDayNumber !== 0) {
        return day.weekNumber === this.monthDays[0].weekNumber && day.weekDayNumber !== 0;
      } else {
        return day.weekNumber === this.monthDays[0].weekNumber;

      }
    });
    const lastWeek = this.monthDays.filter((day) => day.weekNumber === this.monthDays[this.monthDays.length - 1].weekNumber);
    console.log(firstWeek);
    console.log(lastWeek);

  }

  onNextMonth(): void {

    this.monthNumber++;
    if (this.monthNumber === 12) {
      this.monthNumber = 0;
      this.year++;
    }

  }

  onPreviousMonth(): void {

    this.monthNumber--;
    if (this.monthNumber === -1) {
      this.monthNumber = 11;
      this.year--;
    }
    


  }

  private setMonthDays(days: Day[]): void {
    this.monthDays = days;
    this.monthNumber = days[0].monthIndex;
    this.year = days[0].year;
    console.log(this.year);
  }

}
