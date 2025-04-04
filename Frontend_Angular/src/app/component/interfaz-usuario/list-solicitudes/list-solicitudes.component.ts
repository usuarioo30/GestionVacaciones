import { Component, OnInit } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';

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
    this.findAllSolicitudesDescanso();

    this.username = this.solicitudDescansoService.getUsernameToken();
    console.log(this.username);
    this.nombreCompleto = this.solicitudDescansoService.getNombreCompletoToken();
    this.usuario_id = this.solicitudDescansoService.getUsuarioIdToken()

    this.formSolicitudDescanso = this.fb.group({
      usuario: [{value: this.username, disabled: true}, [Validators.required]],
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
        return; // O puedes mostrar una notificación o mensaje de error aquí
      }

      // Crear la nueva solicitud asegurándonos de que usuario_id es un número válido
      const nuevaSolicitud: SolicitudDescanso = {
        ...this.formSolicitudDescanso.value,
        usuario_id: this.usuario_id,  // Aseguramos que el usuario_id se añada correctamente
        fecha_solicitada: this.getFechaActual()  // También nos aseguramos de añadir la fecha solicitada
      };

      console.log(nuevaSolicitud);

      this.solicitudDescansoService.saveSolicitudDescanso(nuevaSolicitud).subscribe(
        (response) => {
          console.log('Solicitud guardada', response);
          this.findAllSolicitudesDescanso();
        },
        (error) => {
          console.error('Error al guardar la solicitud', error);
        }
      );
    }
  }

  eliminarSolicitud(id: number) {
    this.solicitudDescansoService.deleteSolicitudDescanso(id).subscribe(
      (response) => {
        console.log('Solicitud eliminada', response);
        this.findAllSolicitudesDescanso();
      },
      (error) => {
        console.error('Error al eliminar la solicitud', error);
      }
    );
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
