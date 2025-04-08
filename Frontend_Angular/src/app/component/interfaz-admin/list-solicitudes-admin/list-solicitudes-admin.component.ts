import { Component, OnInit } from '@angular/core';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Usuario } from '../../../interfaces/usuario';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-solicitudes-admin',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './list-solicitudes-admin.component.html',
  styleUrl: './list-solicitudes-admin.component.css'
})
export class ListSolicitudesAdminComponent implements OnInit {

  solicitudes: SolicitudDescanso[] = [];
  isLoading: boolean = true;
  usuarios: { [key: number]: Usuario } = {};
  isAdmin: boolean = false;

  constructor(
    private solicitudService: SolicitudDescansoService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const token = localStorage.getItem("access_token");

    if (!token) {
      this.router.navigateByUrl("/login");
    } else {
      // Verificar el rol del usuario
      const userRole = this.authService.getUserRole();
      if (userRole !== 'admin') {
        this.isAdmin = false;
        // Mostrar la alerta si no es admin
        Swal.fire({
          icon: 'warning',
          title: 'Acceso Denegado',
          text: 'Solo los administradores pueden ver esta lista de solicitudes.',
          confirmButtonText: 'Cerrar'
        }).then(() => {
          this.router.navigateByUrl('/home'); // Redirigir a otra página si no es admin
        });
      } else {
        this.isAdmin = true;
        this.solicitudService.getAllSolicitudesDescansoAdmin().subscribe({
          next: (solicitudes) => {
            this.solicitudes = solicitudes;
            this.isLoading = false;

            solicitudes.forEach(solicitud => {
              this.solicitudService.getUserById(solicitud.usuario_id).subscribe({
                next: (usuario) => {
                  this.usuarios[solicitud.usuario_id] = usuario;
                },
                error: (err) => {
                  console.error('Error al obtener el usuario', err);
                }
              });
            });
          },
          error: (err) => {
            console.error('Error al obtener las solicitudes', err);
            this.isLoading = false;
          }
        });
      }
    }
  }

  handleRequest(request: SolicitudDescanso, isApprove: boolean) {
    request.estado = isApprove;

    console.log('Manejando solicitud:', request);

    this.solicitudService.approveOrRejectRequest(request.id, request, isApprove);

    this.solicitudService.getAllSolicitudesDescansoAdmin().subscribe({
      next: (solicitudes) => {
        this.solicitudes = solicitudes;
        this.isLoading = false;

        solicitudes.forEach(solicitud => {
          this.solicitudService.getUserById(solicitud.usuario_id).subscribe({
            next: (usuario) => {
              this.usuarios[solicitud.usuario_id] = usuario;
            },
            error: (err) => {
              console.error('Error al obtener el usuario', err);
            }
          });
        });

        window.location.reload();
      },
      error: (err) => {
        console.error('Error al obtener las solicitudes', err);
        this.isLoading = false;
      }
    });
  }

}
