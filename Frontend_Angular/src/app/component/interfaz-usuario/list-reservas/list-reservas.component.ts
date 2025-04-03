import { Component, Input, OnChanges, SimpleChanges, OnInit, inject, Renderer2 } from '@angular/core';
import { ReservasService } from '../../../services/reservas.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Reserva } from '../../../interfaces/reserva';
import { jwtDecode } from 'jwt-decode';
import { Showreserva } from '../../../interfaces/showreserva';
import { ProyectoService } from '../../../services/proyecto.service';
import { Proyecto } from '../../../interfaces/proyecto';
import { Usuario } from '../../../interfaces/usuario';
import Swal from 'sweetalert2';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { firstValueFrom } from 'rxjs';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule,
    SweetAlert2Module],
  selector: 'app-list-reservas',
  templateUrl: './list-reservas.component.html',
  styleUrls: ['./list-reservas.component.css']
})
export class ListReservasComponent implements OnInit, OnChanges {

  //Listado de reservas existentes filtradas
  reservas: Showreserva[] = [];

  //Listado de reservas existente sin filtrar
  showReservas: Showreserva[] = [];

  //Booleano que indica si el tema es claro u oscuro
  isDarkTheme = false;

  //Nombre del proyecto existente por el que filtrar las reservas
  nombreProyecto: string = '';

  //Nombre del usuario existente por el que filtrar las reservas
  nombreUsuario: string = '';

  //Sala en la que se encuentran las habitaciones reservadas
  @Input() sala?: string;

  //Correo electrónico del usuario
  email: string | null = null;

  //Id del usuario
  id!: number | undefined;

  //Rol del usuario
  role: string | null = null;

  //Fecha mínima de reserva
  minDateTime: string = '';

  //Fecha actual
  dateActual: string = '';

  //Proyectos existentes
  proyectos!: Proyecto[];

  //Usuarios existentes
  usuarios!: Usuario[];
  
  //Boleano que indica si el sidebar está desplegado o no
  isSidebarOpen: boolean = false;

  constructor(private reservasService: ReservasService,
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2
  ) {

    let token = localStorage.getItem('access_token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      console.log(decodedToken);
      this.waitFetch(decodedToken.email);

    }

  }

  private fb: FormBuilder = inject(FormBuilder);
  private proyectoService = inject(ProyectoService);

  //Formulario de creación de reservas
  reservation: FormGroup = this.fb.group({
    email: [''],
    fechaHoraInicio: ['', [Validators.required]],
    duracion: ['', [Validators.required, Validators.min(1)]],
    proyectoAsociado: ['', [Validators.required, Validators.nullValidator]],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(140)]],
    idUsario: [this.id]
  });

  //Formulario de edición de reservas
  editReservation: FormGroup = this.fb.group({
    id: [''],
    email: [''],
    fechaHoraInicio: ['', [Validators.required]],
    duracion: ['', [Validators.required, Validators.min(1)]],
    proyectoAsociado: ['', [Validators.required, Validators.nullValidator]],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(140)]],
    idUsario: [this.id]
  });

  //Estado inicial del componente, refactorizado para que sea más rápido
  async ngOnInit(): Promise<void> {
    const token = localStorage.getItem('access_token');
    
    // Primero, actualizar el minDateTime y verificar el tema guardado
    this.updateMinDateTime();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkTheme = true;
      this.renderer.addClass(document.body, 'dark-theme');
    }

    // Ejecutar las solicitudes en paralelo usando Promise.all
    const [proyectos, usuarios, email] = await Promise.all([
      this.proyectoService.getProyectos(),
      this.authService.getUsers(),
      Promise.resolve(this.authService.getEmail())
    ]);

    this.proyectos = proyectos;
    this.usuarios = usuarios.filter(user => user.roles === "user");
    const now = new Date();
    this.minDateTime = now.toISOString().slice(0, 16);

    this.email = email;

    // Si hay email, esperar el rol y cargar reservas
    if (this.email) {
      await this.waitFetch(this.email);
      this.role = await this.getRole(this.id!);
    }

    if (!token) {
      this.router.navigate(['/login']);
    }

    // Cargar las reservas
    await this.loadReservas();

    // Filtrar las reservas
    this.filterReservas(this.nombreProyecto);
  }


  //Método para abrir y cerrar el sidebar
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Método para actualizar la fecha y hora mínima
  updateMinDateTime(): void {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    this.minDateTime = localDateTime;
    this.dateActual = localDateTime.slice(0, 10);
  }

  // Método para verificar si la fecha seleccionada es hoy
  isToday(selectedDate: string): boolean {
    return selectedDate === this.dateActual;
  }

  // Método para manejar cambios en la fecha seleccionada
  onDateTimeChange(event: any): void {
    const selectedDateTime = event.target.value;
    const selectedDate = selectedDateTime.slice(0, 10);

    // Crear objetos de fecha a partir de la fecha seleccionada y la fecha actual
    const minDateTimeToDate = new Date(this.minDateTime);
    const selectedDateTimeToDate = new Date(selectedDateTime);

    // Comprobar si la fecha seleccionada es anterior a la actual
    if (selectedDateTimeToDate < minDateTimeToDate) {
      alert('La fecha y hora seleccionada no puede ser anterior a la fecha y hora actual');
      event.target.value = this.minDateTime;
    } else {
      if (this.isToday(selectedDate)) {
        this.updateMinDateTime();
      } else {
        this.minDateTime = `${selectedDate}T00:00`;
      }
    }
  }


  ngOnChanges(changes: SimpleChanges): void {
    // Detecta cambios en el valor de @Input() sala
    if (changes['sala'] && !changes['sala'].isFirstChange()) {
      this.filterReservas(this.nombreProyecto);
    }
  }

  /**
   * Método para obtener el rol de un usuario dado su id
   * @param id 
   * @returns Rol del usuario
   */
  async getRole(id: number) {
    const response = await this.authService.getUser(id);

    return response.roles;
  }


  /**
   * Método para esperar a que se resuelva la petición del getUserByMail
   * @param email Del usuario que queremos obtener
   */
  async waitFetch(email: string): Promise<any> {
    try {
      const user = await this.authService.getUserByMail(email);
      console.log(user);
      this.id = user.id;
    } catch (error) {
      console.error('Error al obtener el usuario por email:', error);
      throw error;
    }
  }

  /**
   * Método para cargar la nueva información de las reservas
   */
  async loadReservas(): Promise<void> {
    try {
      let reservas = await this.reservasService.getReservas();

      this.showReservas = await Promise.all(
        reservas.map(async reserva => {
          let response = await this.authService.getUser(reserva.idUsuario);
          let nombreProyecto = await this.reservasService.getNombreProyecto(reserva.proyectoAsociado);
          reserva.owner = response.username;
          reserva.email = response.email;
          reserva.proyectoAsociado = nombreProyecto.nombre;
          return reserva;
        })
      );
    } catch (error) {
      console.error('Error al cargar las reservas:', error);
    }
  }

  /**
   * Método para filtrar reservas (Refactorizado de 50 líneas a 15)
   * @param nombreproyecto 
   * @param nombreusuario 
   */
  filterReservas(nombreproyecto: string, nombreusuario?: string): void {
    //Creamos un mapa para convertir upper/lower en arriba/abajo
    const salaMap: Record<string, string> = {
        upper: 'arriba',
        lower: 'abajo'
    };

    //Convertimos el valor de sala
    const salaFiltrada = salaMap[this.sala as keyof typeof salaMap]; 
    
    //filtramos las reservas y devolvemos los elementos que cumplan las condiciones
    this.reservas = this.showReservas.filter(reserva => {
        const coincideSala = salaFiltrada ? reserva.sala === salaFiltrada : true;
        const coincideProyecto = nombreproyecto ? reserva.proyectoAsociado.toLowerCase().includes(nombreproyecto.toLowerCase().trim()) : true;
        const coincideUsuario = nombreusuario ? reserva.owner.toLowerCase().includes(nombreusuario.toLowerCase().trim()) : true;
        
        return coincideSala && coincideProyecto && coincideUsuario;
    });
  }

  /**
   * Método para validar los campos del formulario de creación de reservas
   * @param field Nombre del campo a validar
   * @returns True si es inválido, false si es válido
   */
  inValidField(field: string): boolean {
    return this.reservation?.controls[field]?.invalid && this.reservation?.controls[field]?.touched;
  }

    /**
   * Método para validar los campos del formulario de edición de reservas
   * @param field Nombre del campo a validar
   * @returns True si es inválido, false si es válido
   */
  inValidFieldEdit(field: string): boolean {
    return this.editReservation?.controls[field]?.invalid;
  }

  //Método para formatear la fecha
  private formatearFecha = (fecha: string): string => {
    return fecha.replace("T", " ") + ":00";
  };

  //Método para añadir la reserva si todos sus campos son válidos
  async submitReservation() {

    if (this.reservation.valid && this.id) {
      const reserva: Omit<Reserva, "id"> = {
        sala: this.sala === "upper" ? "arriba" : "abajo",
        fechaHoraInicio: this.formatearFecha(this.reservation.value.fechaHoraInicio),
        duracion: this.reservation.value.duracion,
        proyectoAsociado: this.reservation.value.proyectoAsociado,
        descripcion: this.reservation.value.descripcion,
        idUsuario: this.id
      };

      await this.reservasService.addReserva(reserva);

      Swal.fire('Éxito', 'Reserva realizada con éxito', 'success');

      await this.loadReservas();
      this.filterReservas(this.nombreProyecto);

      this.reservation.reset({
        email: this.email
      });

    } else {
      this.reservation.markAllAsTouched();
    }
  }

  //Método para cerrar sesión
  onLogout(): void {
    this.authService.logout();
  }

  //Método para añadir al formulario de edición los valores de la reserva a editar
  editReserva(id: number): void {
    const reserva = this.reservas.find(res => res.id === id);
  
    if (!reserva) {
      Swal.fire('Error', `No se encontró la reserva con ID ${id}`, 'error');
      return; // Salir temprano si no se encuentra la reserva
    }
  
    // Asignar los valores de la reserva al formulario en una sola operación
    const fields: (keyof Showreserva)[] = [ //keyof me permite asignar elementos como índices siempre y cuando compartan el mismo nombre
      'id', 'email', 'fechaHoraInicio', 'duracion', 
      'proyectoAsociado', 'descripcion', 'idUsuario'
    ];
  
    fields.forEach(field => {
      this.editReservation.controls[field].setValue(reserva[field]);
    });
  }

  //Método para editar una reserva cuando sus valores sean válidos
  async editReservaSubmit() {
    if (this.editReservation.valid) {
      const reserva: Partial<Reserva> = {};

      // Lista de campos que queremos copiar del formulario
      const fields: (keyof Reserva)[] = [
        'id', 'sala', 'fechaHoraInicio', 'duracion', 
        'proyectoAsociado', 'descripcion', 'idUsuario'
      ];

      // Asignar valores al objeto reserva
      fields.forEach(field => {
        reserva[field] = field === 'sala' 
          ? this.sala === 'upper' ? 'arriba' : 'abajo' 
          : this.editReservation.value[field];
      });

      await this.reservasService.editReserva(reserva as Reserva);
      Swal.fire('Éxito', 'Reserva editada con éxito', 'success');
      await this.loadReservas();
      this.filterReservas(this.nombreProyecto, this.nombreUsuario);
    } else {
      Swal.fire('Error', 'El formulario de edición no es válido', 'error');
      this.editReservation.markAllAsTouched();
    }
  }

  //Método para eliminar la reserva
  deleteReserva(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await firstValueFrom(this.reservasService.deleteReserva(id)); // Esperamos la respuesta de la eliminación
          this.reservas = this.reservas.filter(reserva => reserva.id !== id);
          await Swal.fire('Eliminado', 'Reserva eliminada con éxito', 'success');
          await this.loadReservas();
          this.filterReservas(this.nombreProyecto, this.nombreUsuario);
        } catch (error) {
          Swal.fire('Error', 'Error al eliminar la reserva', 'error');
        }
      }
    });
  }

  // Método para alternar el tema
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;

    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');

    if (this.isDarkTheme) {
      this.renderer.addClass(document.body, 'dark-theme');
    } else {
      this.renderer.removeClass(document.body, 'dark-theme');
    }
  }


}
