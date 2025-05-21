import { Component, OnInit } from '@angular/core';
import { Usuario } from '../../../interfaces/usuario';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../../services/usuario.service';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-usuarios',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './list-usuarios.component.html',
  styleUrl: './list-usuarios.component.css'
})
export class ListUsuariosComponent implements OnInit {

  usuarios: any[] = [];
  isLoading: boolean = true;
  usuario_actual: any;

  constructor(
    private usuarioService: UsuarioService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.usuario_actual = this.usuarioService.getUsuarioActual();
    this.listaUsuario();
  }

  listaUsuario() {
    this.usuarioService.getUsersList().subscribe({
      next: (response) => {
        this.usuarios = response.users || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al obtener los usuarios', err);
        this.isLoading = false;
      }
    });
  }

  deleteUser(userId: number) {
    // Mostrar alerta de confirmación de eliminación
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Si el usuario confirma la eliminación, proceder
        this.usuarioService.deleteUser(userId).subscribe(
          response => {
            console.log('Usuario eliminado con éxito:', response);

            // Eliminar el usuario de la lista directamente (sin recargar la página)
            this.usuarios = this.usuarios.filter(user => user.id !== userId);

            // Mostrar alerta de éxito
            Swal.fire({
              title: 'Eliminado',
              text: 'El usuario ha sido eliminado con éxito',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
          },
          error => {
            console.error('Error al eliminar el usuario:', error);

            // Mostrar alerta de error si algo sale mal
            Swal.fire({
              title: 'Error',
              text: 'Hubo un problema al eliminar el usuario',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        );
      }
    });
  }
}
