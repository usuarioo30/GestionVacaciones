import { Component } from '@angular/core';
import { HorarioService } from '../../../services/horario.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TurnosSemanales } from '../../../interfaces/turnos-semanales';

@Component({
  selector: 'app-horario',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './horario.component.html',
  styleUrl: './horario.component.css'
})
export class HorarioComponent {

  turnoForm!: FormGroup;

  turnosArray: {
    semana: string,
    semanaTexto: string,
    usuarios: {
      id: number,
      nombre: string,
      horario: any
    }[]
  }[] = [];

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
    private fb: FormBuilder,
    private horarioService: HorarioService,
    private http: HttpClient
  ) {
    this.turnoForm = this.fb.group({
      usuario: [null, Validators.required],
      turno: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarTurnosSemanales();
  }

  cargarMesesDelUsuario(): void {
    this.horarioService.obtenerMesesPorUsuario(this.usuarioSeleccionado).subscribe(
      (meses) => this.mesesUsuario = meses,
      (err) => console.error('Error cargando meses:', err)
    );
  }

  cargarTurnosSemanales(): void {
    this.isCargando = true;

    this.horarioService.obtenerTurnosSemanales().subscribe(
      (data: TurnosSemanales) => {
        const agrupadoPorSemana: { [semana: string]: { nombre: string, horario: any[] }[] } = {};
        const usuariosSet: { [id: string]: { id: number, nombreCompleto: string } } = {};

        for (let mes in data) {
          const semanasObj = data[mes].semanas;
          semanasObj.forEach((entrada: any) => {
            const { semana, usuario, horario, id_usuario } = entrada;

            if (!agrupadoPorSemana[semana]) {
              agrupadoPorSemana[semana] = [];
            }

            agrupadoPorSemana[semana].push({ nombre: usuario, horario });

            if (!usuariosSet[id_usuario]) {
              usuariosSet[id_usuario] = {
                id: id_usuario,
                nombreCompleto: usuario
              };
            }
          });
        }

        this.usuarios = Object.values(usuariosSet);

        const semanasMap: {
          [semana: string]: {
            semana: string,
            semanaTexto: string,
            usuarios: {
              id: number,
              nombre: string,
              horario: any
            }[]
          }
        } = {};

        Object.entries(data).forEach(([mes, semanasData]: any) => {
          semanasData.semanas.forEach((entrada: any) => {
            const claveSemana = entrada.semana;

            if (!semanasMap[claveSemana]) {
              semanasMap[claveSemana] = {
                semana: claveSemana,
                semanaTexto: entrada.semana_texto,
                usuarios: []
              };
            }

            semanasMap[claveSemana].usuarios.push({
              id: entrada.id_usuario,
              nombre: entrada.usuario,
              horario: entrada.horario
            });
          });
        });

        this.turnosArray = Object.values(semanasMap);


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

  get nombreUsuarioSeleccionado(): string {
    const usuario = this.usuarios.find(u => u.id === this.usuarioSeleccionado);
    return usuario?.nombreCompleto ?? '';
  }

  get idUsuarioSeleccionado(): number {
    const usuario = this.usuarios.find(u => u.id === this.usuarioSeleccionado);
    return usuario?.id ?? 0;
  }

  getTurnoSeleccionadoDelDia(): string {
    const usuario = this.usuarios.find(us => us.id === this.usuarioSeleccionado);
    if (!usuario) return '-';

    const usuarioSemana = this.turnosArray[this.currentSemanaIndex]?.usuarios.find(u => u.nombre === usuario.nombreCompleto);
    if (!usuarioSemana) return '-';

    return this.obtenerTurnoDelDia(usuarioSemana.horario || [], this.diaSeleccionado);
  }

  generarFechaDesdeSemanaYDia(semana: string, dia: string): string | null {
    const diasSemana: { [key: string]: number } = {
      'domingo': 0,
      'lunes': 1,
      'martes': 2,
      'miercoles': 3,
      'miércoles': 3,
      'jueves': 4,
      'viernes': 5,
      'sabado': 6,
      'sábado': 6,
    };

    const diaNumero = diasSemana[dia.toLowerCase()];
    if (diaNumero === undefined || !semana) return null;

    const [inicioStr] = semana.split(' a ');
    const fechaInicio = new Date(inicioStr);

    const fechaTurno = new Date(fechaInicio);
    for (let i = 0; i < 7; i++) {
      if (fechaTurno.getDay() === diaNumero) {
        const yyyy = fechaTurno.getFullYear();
        const mm = (fechaTurno.getMonth() + 1).toString().padStart(2, '0');
        const dd = fechaTurno.getDate().toString().padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      fechaTurno.setDate(fechaTurno.getDate() + 1);
    }

    return null;
  }

  actualizarTurno(): void {
    if (this.turnoForm.invalid) {
      console.log('Formulario inválido');
      return;
    }

    const { usuario, turno } = this.turnoForm.value;

    if (!usuario || !turno || !this.diaSeleccionado) {
      console.log('Faltan datos para actualizar el turno');
      return;
    }

    const fecha = this.generarFechaDesdeSemanaYDia(this.turnosArray[this.currentSemanaIndex].semana, this.diaSeleccionado);
    if (!fecha) {
      console.log('No se pudo generar la fecha válida');
      return;
    }

    const payload = {
      user_id: usuario,
      fecha: fecha,
      turno_id: turno
    };

    this.horarioService.actualizarTurnoDiario(payload).subscribe({
      next: (res) => {
        console.log('Turno actualizado correctamente', res);
        this.cargarTurnosSemanales();
      },
      error: (err) => {
        console.error('Error al actualizar el turno:', err);
      }
    });
  }

  editarTurno(usuarioId: number, dia: string): void {
    this.usuarioSeleccionado = usuarioId;
    this.diaSeleccionado = dia;

    const usuario = this.usuarios.find(u => u.id === usuarioId);

    const turnoActual = this.turnosArray[this.currentSemanaIndex].usuarios
      .find(u => u.id === usuario?.id)?.horario
      .find((h: { dia: string, turno: string }) => h.dia === dia);

    this.turnoForm.patchValue({
      usuario: usuarioId,
      turno: turnoActual ? turnoActual.turno : null
    });

    const semanaActual = this.turnosArray[this.currentSemanaIndex]?.semana;
    if (semanaActual) {
      const fechaInicio = semanaActual.split(' a ')[0];
      this.mesSeleccionado = fechaInicio.slice(0, 7);
    }

    const fechaInicioMes = this.obtenerPrimerDiaDelMes(this.mesSeleccionado);

    this.horarioService.obtenerTurnosDisponibles(fechaInicioMes).subscribe({
      next: (data) => {
        const turnosUsuario = data.find((u: any) => u.usuario === usuario?.nombreCompleto);

        if (turnosUsuario && turnosUsuario.turnos_disponibles[this.diaSeleccionado.toLowerCase()]) {
          this.turnosDisponibles = turnosUsuario.turnos_disponibles[this.diaSeleccionado.toLowerCase()];
        } else {
          this.turnosDisponibles = [];
          console.log('No se encontraron turnos disponibles para el día:', this.diaSeleccionado);
        }
      },
      error: (err) => {
        console.error('Error al obtener turnos disponibles:', err);
        this.turnosDisponibles = [];
      }
    });
  }

  obtenerPrimerDiaDelMes(fecha: string): string {
    const [anio, mes] = fecha.split('-');
    return `${anio}-${mes}-01`;
  }
}
