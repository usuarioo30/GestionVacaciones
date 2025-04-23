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
    this.fechaAnterior = new Date(new Date(this.fecha).setDate(new Date(this.fecha).getDate() - 7)).toISOString().split('T')[0];
    this.fechaSiguiente = new Date(new Date(this.fecha).setDate(new Date(this.fecha).getDate() + 7)).toISOString().split('T')[0];
    console.log(this.fechaAnterior);
    this.horarioService.getTurnosFromAWeek(this.fecha);
  }

  turnoSiguiente() {
    this.fecha = this.fechaSiguiente;
    this.fechaSiguiente = new Date(new Date(this.fecha).setDate(new Date(this.fecha).getDate() + 7)).toISOString().split('T')[0];
    this.fechaAnterior = new Date(new Date(this.fecha).setDate(new Date(this.fecha).getDate() - 7)).toISOString().split('T')[0];
    this.horarioService.getTurnosFromAWeek(this.fecha);
    console.log(this.fechaSiguiente);
  }

}
