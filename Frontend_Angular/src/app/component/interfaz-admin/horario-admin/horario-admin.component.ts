import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { HorarioService } from '../../../services/horario.service';
import { Turno } from '../../../interfaces/turno';
import { CommonModule, NgFor, NgIf } from '@angular/common';



@Component({
  selector: 'app-horario-admin',
  imports: [NgFor, CommonModule, NgIf],
  templateUrl: './horario-admin.component.html',
  styleUrl: './horario-admin.component.css'
})

export class HorarioAdminComponent implements OnInit{

 horarioService: HorarioService = inject(HorarioService);
 turnos!: Turno[]
 fecha!: string
 fechaAnterior!: string;
 fechaSiguiente!: string;

  ngOnInit(): void {
    this.fecha = new Date(Date.now()).toISOString().split('T')[0];
    this.fechaAnterior = new Date(new Date(this.fecha).setDate(new Date(this.fecha).getDate() - 7)).toISOString().split('T')[0];
    this.fechaSiguiente = new Date(new Date(this.fecha).setDate(new Date(this.fecha).getDate() + 7)).toISOString().split('T')[0];
    this.horarioService.getTurnosFromAWeek(this.fecha);
  }

  turnoAnterior() {
    this.fecha = this.fechaAnterior;
    this.actualizarRangos();
    this.horarioService.getTurnosFromAWeek(this.fecha);
    this.horarioService.Turnos()
      ? console.log('Turnos actuales:', this.horarioService.Turnos())
      : console.log('Cargando…');
  }
  
  turnoSiguiente() {
    this.fecha = this.fechaSiguiente;
    this.actualizarRangos();
    this.horarioService.getTurnosFromAWeek(this.fecha);
    console.log('Nueva fecha:', this.fecha);
  }
  
  // helper para recalcular anteriores y siguientes
  private actualizarRangos() {
    const d = (d0: string, offset: number) =>
      new Date(new Date(d0).setDate(new Date(d0).getDate() + offset))
        .toISOString().split('T')[0];
  
    this.fechaAnterior = d(this.fecha, -7);
    this.fechaSiguiente = d(this.fecha, +7);
  }
  

}
