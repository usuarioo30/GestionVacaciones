import { Component, OnInit } from '@angular/core';
import { ProyectoService } from '../../../services/proyecto.service';
import { Proyecto } from '../../../interfaces/proyecto';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-proyectos',
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './list-proyectos.component.html',
  styleUrls: ['./list-proyectos.component.css'],
})
export class ListProyectosComponent implements OnInit {
  proyectos: Proyecto[] = [];
  proyectoSeleccionado: Proyecto = { id: 0, nombre: '' };
  crearProyectoForm: FormGroup;
  tieneAcceso: boolean = true;

  constructor(
    private authService: AuthService,
    private proyectoService: ProyectoService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.crearProyectoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  async ngOnInit() {
    const role = await this.authService.getRole();
    console.log('User Role:', role);

    if (role !== 'admin') {
      this.tieneAcceso = false;
    } else {
      this.cargarProyectos();
    }
  }

  // Cargar todos los proyectos
  cargarProyectos(): void {
    this.proyectoService.getProyectos1().subscribe(
      (proyectos) => {
        this.proyectos = proyectos;
      },
      (error: any) => {
        console.error('Error al cargar los proyectos:', error);
      }
    );
  }

  // Abrir el modal para editar un proyecto
  abrirModalEditar(proyecto: Proyecto): void {
    this.proyectoSeleccionado = { ...proyecto };
  }

  // Guardar los cambios del proyecto
  guardarCambios(): void {
    if (this.proyectoSeleccionado.id) {
      const proyectoEditado: Proyecto = {
        id: this.proyectoSeleccionado.id,
        nombre: this.proyectoSeleccionado.nombre.trim(),
      };

      this.proyectoService.editProyecto(proyectoEditado.id, proyectoEditado).subscribe(
        () => {
          Swal.fire('Éxito', 'Proyecto actualizado con éxito', 'success');
          this.cargarProyectos();
        },
        (error: any) => {
          console.error('Error al actualizar el proyecto:', error);
          Swal.fire('Error', 'Hubo un error al actualizar el proyecto', 'error');
        }
      );
    }
  }

  // Crear un nuevo proyecto
  crearProyecto(): void {
    if (this.crearProyectoForm.valid) {
      const nuevoProyecto: Omit<Proyecto, 'id'> = {
        nombre: this.crearProyectoForm.value.nombre.trim(),
      };

      this.proyectoService.addProyecto(nuevoProyecto).subscribe(
        () => {
          Swal.fire('Éxito', 'Proyecto creado con éxito', 'success');
          this.cargarProyectos();
          this.crearProyectoForm.reset();
        },
        (error: any) => {
          console.error('Error al crear el proyecto:', error);
          Swal.fire('Error', 'Hubo un error al crear el proyecto', 'error');
        }
      );
    } else {
      this.crearProyectoForm.markAllAsTouched();
    }
  }

  // Eliminar un proyecto
  eliminarProyecto(id: number): void {
    Swal.fire({
      title: "¿Estás seguro de eliminar este proyecto?",
      text: "No podrás revertir esta acción.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.proyectoService.deleteProyecto(id).subscribe(
          () => {
            Swal.fire('Éxito', 'Proyecto eliminado con éxito', 'success');
            this.cargarProyectos();
          },
          (error: any) => {
            console.error('Error al eliminar el proyecto:', error);
            Swal.fire('Error', 'Hubo un error al eliminar el proyecto', 'error');
          }
        );
      } else {
        console.log("Eliminación cancelada");
      }
    }).catch((error) => {
      console.error("Error al mostrar el cuadro de confirmación", error);
    });
  }

  //Método para redirigir al usuario
  volverAReservas(): void {
    this.router.navigate(['/reservas']);
  }
}
