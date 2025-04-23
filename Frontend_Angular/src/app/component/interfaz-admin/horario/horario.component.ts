import { Component } from '@angular/core';
import { HorarioService } from '../../../services/horario.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TurnosSemanales } from '../../../interfaces/turnos-semanales';

@Component({
  selector: 'app-horario',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './horario.component.html',
  styleUrl: './horario.component.css'
})
export class HorarioComponent {
  turnosArray: { semana: string, usuarios: { nombre: string, horario: any }[] }[] = [];
  currentSemanaIndex: number = 0; // Índice para la semana actual
  mesActual: string = ''; // Guardamos el mes actual para mostrarlo en el HTML

  constructor(private horarioService: HorarioService) { }

  ngOnInit(): void {
    this.cargarTurnosSemanales();
  }

  cargarTurnosSemanales(): void {
    this.horarioService.obtenerTurnosSemanales().subscribe(
      (data: Record<string, any>) => {
        const agrupadoPorSemana: Record<string, { nombre: string, horario: any }[]> = {};
  
        Object.values(data).forEach((semanas: any[]) => {
          semanas.forEach((entrada) => {
            const semana = entrada.semana;
            const usuario = entrada.usuario;
            const horario = entrada.horario;
  
            if (!agrupadoPorSemana[semana]) {
              agrupadoPorSemana[semana] = [];
            }
  
            agrupadoPorSemana[semana].push({ nombre: usuario, horario });
          });
        });
  
        // Convierte el objeto agrupado en array ordenado por fecha de semana (ya vienen ordenadas del backend)
        this.turnosArray = Object.entries(agrupadoPorSemana).map(([semana, usuarios]) => ({
          semana,
          usuarios
        }));
  
        const primerTurno = this.turnosArray[0]?.usuarios[0]?.horario;
        if (primerTurno) {
          this.mesActual = primerTurno.mes;
        }
      },
      (error) => {
        console.error('Error al cargar los turnos', error);
      }
    );
  }
  
  
  
  


  obtenerNombreMes(mes: string): string {
    if (!mes) {
      return 'Mes no definido';
    }

    const [anio, mesNumero] = mes.split('-');
    const fecha = new Date(Number(anio), Number(mesNumero) - 1, 1);

    // Usamos Intl.DateTimeFormat para asegurar el idioma español
    const nombreMes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fecha);
    return nombreMes;
  }






  siguienteSemana(): void {
    if (this.currentSemanaIndex < this.turnosArray.length - 1) {
      this.currentSemanaIndex++;
    }
  }

  semanaAnterior(): void {
    if (this.currentSemanaIndex > 0) {
      this.currentSemanaIndex--;
    }
  }
}
