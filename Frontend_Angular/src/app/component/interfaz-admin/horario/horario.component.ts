import { Component } from '@angular/core';
import { HorarioService } from '../../../services/horario.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TurnosSemanales } from '../../../interfaces/turnos-semanales';
import bootstrap from 'bootstrap';

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
  mesesDisponibles: string[] = [];

  usuarios: any[] = [];
  usuarioSeleccionado: number = 0;
  mesesUsuario: string[] = [];
  mesSeleccionado: string = '';

  isCargando: boolean = true;


  constructor(
    private horarioService: HorarioService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.cargarTurnosSemanales();
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.horarioService.obtenerUsuarios().subscribe(
      (res) => this.usuarios = res,
      (err) => console.error('Error cargando usuarios:', err)
    );
  }

  cargarMesesDelUsuario(): void {
    this.horarioService.obtenerMesesPorUsuario(this.usuarioSeleccionado).subscribe(
      (meses) => this.mesesUsuario = meses,
      (err) => console.error('Error cargando meses:', err)
    );
  }

  descargarPDF(): void {
    const usuarioId = Number(this.usuarioSeleccionado);
    const usuario = this.usuarios.find(u => Number(u.id) === usuarioId);

    if (!usuario) {
      console.error('Usuario no encontrado');
      alert("No se pudo encontrar el usuario seleccionado.");
      return;
    }

    // Obtener el nombre del mes y el año
    const [anio, mes] = this.mesSeleccionado.split('-');
    const nombreMes = this.obtenerNombreMes(this.mesSeleccionado);

    // Usamos el nombre (o nombreCompleto, si prefieres) del usuario
    const nombreUsuario = usuario.nombre || usuario.nombreCompleto || 'usuario';

    // Formatear el nombre del archivo
    const nombreArchivo = `horario_${nombreUsuario.toLowerCase()}_${nombreMes.toLowerCase()}_${anio}.pdf`;

    // Llamar al servicio para generar el PDF
    this.horarioService.generarPDF(this.usuarioSeleccionado, this.mesSeleccionado).subscribe(
      (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);

        // Limpiar el formulario
        this.usuarioSeleccionado = 0;
        this.mesSeleccionado = '';

        // Aquí ya no es necesario manipular el modal, Angular se encarga de ello
        // El modal se cerrará automáticamente porque ya estamos limpiando los valores del formulario.
      },
      (err) => {
        console.error('Error generando el PDF:', err);
        alert("No se pudo generar el PDF.");
      }
    );
  }

  cargarTurnosSemanales(): void {
    this.isCargando = true;
  
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
  
        this.turnosArray = Object.entries(agrupadoPorSemana).map(([semana, usuarios]) => ({
          semana,
          usuarios
        }));
  
        const mesesSet = new Set<string>();
        this.turnosArray.forEach(turno => {
          const mes = turno.usuarios[0]?.horario?.mes;
          if (mes) {
            mesesSet.add(mes);
          }
        });
  
        this.mesesDisponibles = Array.from(mesesSet);
        this.isCargando = false;
      },
      (error) => {
        console.error('Error al cargar los turnos', error);
        this.isCargando = false;
      }
    );
  }

  irAlMesSeleccionado(mes: string): void {
    const index = this.turnosArray.findIndex(turno =>
      turno.usuarios.some(usuario => usuario.horario?.mes === mes)
    );

    if (index !== -1) {
      this.currentSemanaIndex = index;
    }
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
