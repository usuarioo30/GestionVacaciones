import { Component, OnInit } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';
import Swal from 'sweetalert2';
import { Token } from '@angular/compiler';

@Component({
  selector: 'app-list-solicitudes',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './list-solicitudes.component.html',
  styleUrl: './list-solicitudes.component.css'
})
export class ListSolicitudesComponent implements OnInit {
  solicitudesDescanso: SolicitudDescanso[] = [];
  formSolicitudDescanso!: FormGroup;
  mostrarModal: boolean = false;
  username: string | null = null;
  nombreCompleto: string | null = null;
  usuario_id: number | null = null;


  constructor(
    private solicitudDescansoService: SolicitudDescansoService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
  }

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.router.navigateByUrl('/login');
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
      fecha_solicitada: [{ value: this.getFechaActual(), disabled: true }, [Validators.required]],
      motivo: ['', [Validators.required]],
    }
    )
  }

  findAllSolicitudesDescanso() {
    this.solicitudDescansoService.getAllSolicitudesDescanso().subscribe(
      result => { this.solicitudesDescanso = result; },
      error => { console.log(error) }
    );
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
        fecha_solicitada: this.getFechaActual()
      };

      console.log(nuevaSolicitud);

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
        // Si el usuario confirma, eliminar la solicitud
        this.solicitudDescansoService.deleteSolicitudDescanso(id).subscribe(
          (response) => {
            console.log('Solicitud eliminada', response);

            // Mostrar mensaje de éxito
            Swal.fire(
              'Eliminado',
              'La solicitud ha sido eliminada.',
              'success'
            );

            // Refrescar la lista de solicitudes
            this.findAllSolicitudesDescanso();
          },
          (error) => {
            console.error('Error al eliminar la solicitud', error);

            // Mostrar mensaje de error
            Swal.fire(
              'Error',
              'Hubo un problema al eliminar la solicitud.',
              'error'
            );
          }
        );
      } else {
        // Si el usuario cancela, no hacer nada
        console.log('Eliminación cancelada');
      }
    });
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
}
