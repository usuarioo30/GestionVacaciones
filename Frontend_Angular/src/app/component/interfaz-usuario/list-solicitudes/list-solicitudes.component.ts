import { Component, OnInit } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-list-solicitudes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './list-solicitudes.component.html',
  styleUrls: ['./list-solicitudes.component.css']
})
export class ListSolicitudesComponent implements OnInit {
  solicitudesDescanso: SolicitudDescanso[] = [];
  formSolicitudDescanso!: FormGroup;
  mostrarModal: boolean = false;
  username: string | null = null;
  nombreCompleto: string | null = null;
  usuario_id: number | null = null;
  solicitudAEditar: SolicitudDescanso | null = null;
  fechaMinima: string = this.getFechaActual();
  esUsuario: boolean = false;


  constructor(
    private solicitudDescansoService: SolicitudDescansoService,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
  }

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.router.navigateByUrl('/login');
    }

    this.esUsuario = this.authService.getUserRole() === 'user';

    if (this.esUsuario) {
      this.findAllSolicitudesDescanso();
    }
    this.findAllSolicitudesDescanso();

    this.username = this.solicitudDescansoService.getUsernameToken();
    this.nombreCompleto = this.solicitudDescansoService.getNombreCompletoToken();
    this.usuario_id = this.solicitudDescansoService.getUsuarioIdToken()

    this.formSolicitudDescanso = this.fb.group({
        usuario: [{ value: this.username, disabled: true }, [Validators.required]],
        usuario_id: [{ value: this.usuario_id, disabled: true }, [Validators.required]],
        fecha_inicio: ['', [Validators.required]],
        fecha_fin: ['', [Validators.required]],
        fecha_solicitud: [{ value: this.getFechaActual(), disabled: true }, [Validators.required]],
        motivo: ['', [Validators.required]],
      }
    )

    this.formSolicitudDescanso.get('fecha_inicio')?.valueChanges.subscribe(fechaInicio => {
      if (fechaInicio) {
        this.formSolicitudDescanso.get('fecha_fin')?.setValidators([
          Validators.required,
          (control) => this.fechaFinValidator(control, fechaInicio)
        ]);
        this.formSolicitudDescanso.get('fecha_fin')?.updateValueAndValidity();
      }
    });

  }

  fechaFinValidator(control: any, fechaInicio: string) {
    const fechaFin = control.value;
    if (fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
      return { 'fechaFinInvalid': true };
    }
    return null;
  }

  getFechaActual(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm: string | number = today.getMonth() + 1;
    let dd: string | number = today.getDate();
    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;
    return yyyy + '-' + mm + '-' + dd;
  }

  abrirModalCrear() {
    this.mostrarModal = true;
  }

  findAllSolicitudesDescanso() {
    this.solicitudDescansoService.getAllSolicitudesDescanso().subscribe({
      next: result => { this.solicitudesDescanso = result; },
      error: error => { console.log(error) }
    });
  }


  guardarSolicitud() {
    if (this.formSolicitudDescanso.valid) {
      if (this.usuario_id === null) {
        console.error('El usuario_id es nulo');
        return;
      }
      const nuevaSolicitud: SolicitudDescanso = {
        ...this.formSolicitudDescanso.value,
        usuario_id: this.usuario_id,
        fecha_solicitud: this.getFechaActual()
      };

      this.solicitudDescansoService.checkIfDateHasBeenUsed(nuevaSolicitud.fecha_inicio, nuevaSolicitud.fecha_fin)
      .subscribe({
        next: isBusy => { //Si es true, las fechas ya han sido utilizadas
          if (!isBusy) {
            this.solicitudDescansoService.saveSolicitudDescanso(nuevaSolicitud).subscribe(
            (response) => {
              console.log('Solicitud guardada', response);

              // Mostrar la alerta de éxito
              Swal.fire({
                icon: 'success',
                title: '¡Solicitud registrada!',
                text: 'Tu solicitud de descanso ha sido registrada con éxito.',
                confirmButtonText: 'Aceptar'
              }).then(() => {
                // Solo resetear los campos que quieres actualizar
                this.formSolicitudDescanso.patchValue({
                  fecha_inicio: '',
                  fecha_fin: '',
                  motivo: ''
                });

                this.formSolicitudDescanso.reset({
                  fecha_solicitud: this.getFechaActual(),
                  usuario: this.username,
                  usuario_id: this.usuario_id,
                });
                
                // Refrescar la lista de solicitudes
                this.findAllSolicitudesDescanso();
              });
            },
            (error) => {
              console.error('Error al guardar la solicitud', error);

              // Mostrar una alerta de error
              Swal.fire({
                icon: 'error',
                title: '¡Error!',
                text: 'Hubo un error al registrar tu solicitud. Por favor, inténtalo nuevamente.',
                confirmButtonText: 'Aceptar'
              });
            }
              );
          } else {
            Swal.fire({
              icon: 'error',
              title: '¡Error!',
              text: 'Esasas fechas ya han sido utilizadas. Por favor, selecciona otras fechas.',
              confirmButtonText: 'Aceptar'
            });
          }
        },
        error: error => console.log("Ha ocurrido un error inesperado: ", error)
      })


      
    }
  }

  eliminarSolicitud(id: number) {
    // Mostrar la alerta de confirmación antes de eliminar
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true // Para invertir los botones
    }).then((result) => {
      if (result.isConfirmed) {
        this.solicitudDescansoService.deleteSolicitudDescanso(id).subscribe(
          (response) => {
            console.log('Solicitud eliminada', response);

            Swal.fire(
              'Eliminado',
              'La solicitud ha sido eliminada.',
              'success'
            );

            this.findAllSolicitudesDescanso();
          },
          (error) => {
            console.error('Error al eliminar la solicitud', error);

            Swal.fire(
              'Error',
              'Hubo un problema al eliminar la solicitud.',
              'error'
            );
          }
        );
      }
    });
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    let month: string | number = d.getMonth() + 1;
    let day: string | number = d.getDate();

    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;

    return `${year}-${month}-${day}`;
  }

  editarSolicitud(solicitud: SolicitudDescanso) {
    this.solicitudAEditar = solicitud;

    this.formSolicitudDescanso.patchValue({
      fecha_inicio: this.formatDate(solicitud.fecha_inicio),
      fecha_fin: this.formatDate(solicitud.fecha_fin),
      motivo: solicitud.motivo,
    });
  }

  guardarEdicion() {
    if (this.formSolicitudDescanso.valid && this.solicitudAEditar) {
      const solicitudEditada: SolicitudDescanso = {
        ...this.solicitudAEditar,
        ...this.formSolicitudDescanso.value
      };

      this.solicitudDescansoService.editSolicitudDescanso(solicitudEditada).subscribe(
        (response) => {
          Swal.fire({
            icon: 'success',
            title: '¡Solicitud editada!',
            text: 'Tu solicitud de descanso ha sido actualizada con éxito.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            // Cerrar el modal y actualizar la lista de solicitudes
            this.mostrarModal = false;
            this.findAllSolicitudesDescanso();
          });
        },
        (error) => {
          console.error('Error al editar la solicitud', error);
          Swal.fire({
            icon: 'error',
            title: '¡Error!',
            text: 'Hubo un error al editar la solicitud. Intenta de nuevo.',
            confirmButtonText: 'Aceptar'
          });
        }
      );
    }
  }
}
