import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-historial-admin',
  imports: [NgIf, NgFor, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './historial-admin.component.html',
  styleUrl: './historial-admin.component.css'
})
export class HistorialAdminComponent implements OnInit {

  solicitudesDescanso: SolicitudDescanso[] = [];
  solicitudesService: SolicitudDescansoService = inject(SolicitudDescansoService);
  private router: Router = inject(Router);
  private authService: AuthService = inject(AuthService);
  private auth: string = '';
  private userId: number = 0;
  isAdmin: boolean = false;
  status: string = 'true';
  order: string = '#';


  ngOnInit() {

    const token = localStorage.getItem('access_token');

    if (token) {
      this.auth = token;
      const decodedToken = jwtDecode(this.auth);

      const userRole = this.authService.getUserRole();

      if (userRole !== 'admin') {
        Swal.fire({
          icon: 'warning',
          title: 'Acceso Denegado',
          text: 'Solo los administradores pueden ver esta lista de solicitudes.',
          confirmButtonText: 'Cerrar'
        }).then(() => {
          this.router.navigateByUrl('/home'); // Redirigir a otra página si no es admin
        });
      }

      if (decodedToken.sub) {
        this.isAdmin = true;
        this.userId = Number.parseInt(decodedToken.sub);
        this.solicitudesService.getAdminSolicitudDescanso(this.auth);
        this.solicitudesService.setFilter(this.status);
      }
    } else {
      this.router.navigate(['/login']);
    }


  }

  orderRequest(field: string) {
    this.solicitudesService.setOrder(field);
  }

  filterRequest(status?: string) {
    this.solicitudesService.setFilter(status);

  }

  findAllSolicitudesDescanso() {
    this.solicitudesService.getAllSolicitudesDescanso().subscribe({
      next: result => { this.solicitudesDescanso = result; },
      error: error => { console.log(error) }
    });
  }

  eliminarSolicitud(id: number) {
    Swal.fire({
      title: '¿Estás seguro, esta solicitud se eliminará del interfaz del usuario también?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.solicitudesService.deleteSolicitudDescanso(id).subscribe(
          (response) => {
            console.log('Solicitud eliminada', response);

            Swal.fire(
              'Eliminado',
              'La solicitud ha sido eliminada.',
              'success'
            );

            window.location.reload();
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

}
