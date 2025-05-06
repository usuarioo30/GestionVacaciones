import { Component } from '@angular/core';
import { HorarioService } from '../../../services/horario.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TurnosSemanales } from '../../../interfaces/turnos-semanales';
import bootstrap from 'bootstrap';
import { Turno } from '../../../interfaces/turno';

@Component({
  selector: 'app-horario',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './horario.component.html',
  styleUrl: './horario.component.css'
})
export class HorarioComponent {
  turnosArray: { semana: string, semanaTexto: string, usuarios: { nombre: string, horario: any }[] }[] = [];
  currentSemanaIndex: number = 0;
  mesActual: string = '';
  mesesDisponibles: string[] = [];

  usuarios: any[] = [];
  usuarioSeleccionado: number = 0;
  mesesUsuario: string[] = [];
  mesSeleccionado: string = '';

  semanaSeleccionada: number = 0;
  nuevoTurnoSeleccionado: number = 0;
  isCargando: boolean = true;

  turnosDisponibles: any[] = [];
  diaSeleccionado: string = '';

  usuarioDeshabilitado: boolean = false;
  mesDeshabilitado: boolean = false;
  diaDeshabilitado: boolean = false;

  constructor(
    private horarioService: HorarioService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.cargarTurnosSemanales();
  }

  cargarTurnosDisponibles(mes: string, semana: number): void {
    // Validar que mes y semana estén definidos y sean correctos
    if (!mes || !semana) {
      console.log('Mes y semana son requeridos para cargar los turnos disponibles');
      return;
    }

    // Verificar que el mes esté en el formato 'YYYY-MM'
    const mesRegex = /^\d{4}-\d{2}$/;
    if (!mesRegex.test(mes)) {
      console.log('El mes debe estar en el formato "YYYY-MM".');
      return;
    }

    // Validar que la semana sea un número entero positivo
    if (semana <= 0 || !Number.isInteger(semana)) {
      console.log('La semana debe ser un número entero positivo.');
      return;
    }

    console.log(`Cargando turnos para el mes ${mes} y semana ${semana}`);

    // Realizar la llamada al servicio para obtener los turnos disponibles
    this.horarioService.obtenerTurnosDisponibles(mes, semana).subscribe(
      (res) => {
        // Asignar los turnos disponibles a la variable
        this.turnosDisponibles = res;
      },
      (err) => {
        // Manejar errores y limpiar los turnos disponibles
        console.error('Error cargando turnos disponibles:', err);
        this.turnosDisponibles = []; // Limpiar si no hay turnos disponibles
      }
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
      (data: TurnosSemanales) => {
        const agrupadoPorSemana: { [semana: string]: { nombre: string, horario: any[] }[] } = {};
        const usuariosSet: { [id: string]: { id: number, nombreCompleto: string } } = {};

        Object.entries(data).forEach(([mes, semanasObj]) => {
          // Iterar sobre cada semana en el mes
          semanasObj.semanas.forEach((entrada: any) => {
            const { semana, usuario, horario, horas_trabajadas, semana_num } = entrada;

            // Agrupar turnos por semana
            if (!agrupadoPorSemana[semana]) {
              agrupadoPorSemana[semana] = [];
            }

            agrupadoPorSemana[semana].push({ nombre: usuario, horario });

            // Generar ID falso desde el nombre (mismo enfoque de antes)
            const idUsuario = this.generarIdDesdeNombre(usuario);
            if (!usuariosSet[idUsuario]) {
              usuariosSet[idUsuario] = {
                id: idUsuario,
                nombreCompleto: usuario
              };
            }
          });
        });

        // Guardar usuarios únicos
        this.usuarios = Object.values(usuariosSet);

        // Mapear los datos para ser utilizados en el componente
        this.turnosArray = Object.entries(data).flatMap(([mes, semanasData]) => {
          return semanasData.semanas.map((entrada: any) => ({
            semana: entrada.semana,
            semanaTexto: entrada.semana_texto,
            usuarios: [{
              nombre: entrada.usuario,
              horario: entrada.horario
            }]
          }));
        });
        this.isCargando = false;
      },
      (error) => {
        console.error('Error al cargar los turnos', error);
        this.isCargando = false;
      }
    );
  }

  obtenerTurnoDelDia(horario: any[], dia: string): string {
    const diaTurno = horario.find(d => d.dia === dia);
    return diaTurno ? diaTurno.turno : '-';
  }

  generarIdDesdeNombre(nombre: string): number {
    // Generar ID hash simple desde el nombre
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
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
    const mesRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!mesRegex.test(mes)) {
      console.warn('El formato del mes es inválido:', mes);
      return 'Mes inválido';
    }

    const [anio, mesNumero] = mes.split('-').map(Number);
    const fecha = new Date(anio, mesNumero - 1);
    return fecha.toLocaleString('es-ES', { month: 'long' }).charAt(0).toUpperCase() +
      fecha.toLocaleString('es-ES', { month: 'long' }).slice(1);
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

  // Actualización en la función `actualizarTurno`:
  actualizarTurno(): void {
    if (!this.usuarioSeleccionado || !this.mesSeleccionado || !this.diaSeleccionado || !this.nuevoTurnoSeleccionado) {
      alert('Complete todos los campos');
      return;
    }

    // Generar la fecha completa en formato YYYY-MM-DD
    const fecha = this.generarFechaDesdeMesYDia(this.mesSeleccionado, this.diaSeleccionado);
    if (!fecha) {
      alert('No se pudo generar la fecha correctamente.');
      return;
    }

    // Llamar al servicio para actualizar el turno
    this.horarioService.actualizarTurnoDiario(
      this.usuarioSeleccionado,
      fecha, // Asegúrate de enviar el formato correcto de la fecha
      this.nuevoTurnoSeleccionado
    ).subscribe({
      next: () => {
        this.usuarioSeleccionado = 0;
        this.mesSeleccionado = '';
        this.diaSeleccionado = '';
        this.nuevoTurnoSeleccionado = 0;
        this.usuarioDeshabilitado = false;
        this.mesDeshabilitado = false;
        this.diaDeshabilitado = false;

        alert('Turno actualizado correctamente');
        this.cargarTurnosSemanales(); // Recarga los turnos después de la actualización
      },
      error: err => {
        console.error('Error al actualizar el turno', err);
        alert('No se pudo actualizar el turno');
      }
    });
  }



  get nombreUsuarioSeleccionado(): string {
    const usuario = this.usuarios.find(u => u.id === this.usuarioSeleccionado);
    return usuario?.nombreCompleto ?? '';
  }

  getTurnoSeleccionadoDelDia(): string {
    const usuario = this.usuarios.find(us => us.id === this.usuarioSeleccionado);
    if (!usuario) return '-';

    const usuarioSemana = this.turnosArray[this.currentSemanaIndex]?.usuarios.find(u => u.nombre === usuario.nombreCompleto);
    if (!usuarioSemana) return '-';

    return this.obtenerTurnoDelDia(usuarioSemana.horario || [], this.diaSeleccionado);
  }


  generarFechaDesdeMesYDia(mes: string, dia: string): string | null {
    const diasSemana: { [key: string]: number } = {
      'lunes': 1,
      'martes': 2,
      'miercoles': 3,
      'jueves': 4,
      'viernes': 5,
      'sabado': 6,
      'domingo': 0
    };

    const [anio, mesNumero] = mes.split('-').map(Number);
    const semana = this.turnosArray[this.currentSemanaIndex]?.semana;

    if (!semana) return null;

    const fechaInicioStr = semana.split(' al ')[0];
    const fechaInicio = new Date(fechaInicioStr);

    // Buscar la fecha correspondiente al día
    const diaNumero = diasSemana[dia.toLowerCase()];
    if (diaNumero === undefined) return null;

    const fechaTurno = new Date(fechaInicio);
    while (fechaTurno.getDay() !== diaNumero) {
      fechaTurno.setDate(fechaTurno.getDate() + 1);
    }

    const yyyy = fechaTurno.getFullYear();
    const mm = (fechaTurno.getMonth() + 1).toString().padStart(2, '0');
    const dd = fechaTurno.getDate().toString().padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  setDiaTurno(usuario: any, dia: string): void {
    this.usuarioSeleccionado = this.usuarios.find(u => u.nombreCompleto === usuario.nombre)?.id || 0;
    this.diaSeleccionado = dia;

    console.log('Usuario seleccionado:', this.diaSeleccionado);

    const semanaActual = this.turnosArray[this.currentSemanaIndex].semana; // Ej: "2025-03-31 a 2025-04-06"
    const fechaInicioStr = semanaActual.split(' a ')[0]; // "2025-03-31"
    const fechaInicio = new Date(fechaInicioStr);

    // Obtener el número del día de la semana (lunes = 1 ... domingo = 0 en JS)
    const diasMap: { [key: string]: number } = {
      'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3,
      'jueves': 4, 'viernes': 5, 'sabado': 6
    };

    const diaNumero = diasMap[dia.toLowerCase()];
    if (diaNumero === undefined) {
      console.error('Día inválido:', dia);
      return;
    }

    const fechaSeleccionada = new Date(fechaInicio);
    const diaInicio = fechaInicio.getDay() === 0 ? 7 : fechaInicio.getDay(); // Domingo = 7

    // Diferencia entre el día deseado y el inicio de semana
    const diff = diaNumero - diaInicio;
    fechaSeleccionada.setDate(fechaInicio.getDate() + diff);

    const yyyy = fechaSeleccionada.getFullYear();
    const mm = (fechaSeleccionada.getMonth() + 1).toString().padStart(2, '0');
    this.mesSeleccionado = `${yyyy}-${mm}`;

    console.log('Mes seleccionado:', this.mesSeleccionado);

    // Validar formato del mes
    const mesRegex = /^\d{4}-\d{2}$/;
    if (!mesRegex.test(this.mesSeleccionado)) {
      console.error('El formato del mes es inválido:', this.mesSeleccionado);
      return;
    }

    this.cargarTurnosDisponibles(this.mesSeleccionado, this.currentSemanaIndex + 1);
  }

}
