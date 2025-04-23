import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { HorarioService } from '../../../services/horario.service';
import { Turno } from '../../../interfaces/turno';
import { CommonModule, NgFor } from '@angular/common';



@Component({
  selector: 'app-horario-admin',
  imports: [NgFor, CommonModule],
  templateUrl: './horario-admin.component.html',
  styleUrl: './horario-admin.component.css'
})

export class HorarioAdminComponent implements OnInit{

 horarioService: HorarioService = inject(HorarioService);
 turnos!: Turno[]

  ngOnInit(): void {
    const fecha = new Date(Date.now()).toISOString().split('T')[0];
    this.horarioService.getTurnosFromAWeek(fecha);
  }

}
