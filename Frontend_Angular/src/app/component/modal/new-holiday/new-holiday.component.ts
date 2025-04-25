import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Day } from '../../../interfaces/day';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-new-holiday',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './new-holiday.component.html',
  styleUrl: './new-holiday.component.css'
})
export class NewHolidayComponent {

  @Input() day!: Day
  @Output() closeModal: EventEmitter<boolean> = new EventEmitter<boolean>();

  private fb: FormBuilder = inject(FormBuilder);
  newHolidayForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(5)]]
  })

  inValidField(field: string): boolean {
    return this.newHolidayForm.controls[field]?.invalid && this.newHolidayForm.controls[field]?.touched;
  }

  submit() {
    if (this.newHolidayForm.valid) {
      const name = this.newHolidayForm.get('name')?.value;
      const startDate = this.day.year + '-' + this.day.monthIndex + '-' + this.day.number;
      alert(name+" "+startDate);
    } else {
      this.newHolidayForm.markAllAsTouched();
    }
  }

  close() {
    this.closeModal.emit(false);
    
  }

}
