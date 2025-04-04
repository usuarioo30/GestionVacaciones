import { Component, OnInit } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';

@Component({
  selector: 'app-list-solicitudes',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './list-solicitudes.component.html',
  styleUrl: './list-solicitudes.component.css'
})
export class ListSolicitudesComponent implements OnInit {
  solicitudesDescanso: SolicitudDescanso[] = [];
  formSolicitudDescanso!: FormGroup;
  mostrarModal: boolean = false;


  constructor(
    private solicitudDescansoService: SolicitudDescansoService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.formSolicitudDescanso = this.fb.group({
      usuario: [this.solicitudDescansoService.getUserNameFromToken(), [Validators.required]],
      fecha_inicio: ['', [Validators.required]],
      fecha_fin: ['', [Validators.required]],
      fecha_solicitada: ['', [Validators.required]]
    }
    )
  }

  ngOnInit(): void {
    const username = this.solicitudDescansoService.getUserNameFromToken();
    console.log('Username obtenido del token:', username);  // Verifica qué se obtiene aquí

    if (username) {
      this.formSolicitudDescanso.patchValue({ usuario: username });
    } else {
      console.error('No se pudo obtener el nombre del usuario desde el token');
    }

    this.findAllSolicitudesDescanso();
  }

  findAllSolicitudesDescanso() {
    this.solicitudDescansoService.getAllSolicitudesDescanso().subscribe(
      result => { this.solicitudesDescanso = result; },
      error => { console.log(error) }
    );
  }


  guardarSolicitud() {
    if (this.formSolicitudDescanso.valid) {
      const nuevaSolicitud: SolicitudDescanso = this.formSolicitudDescanso.value;
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
}
