import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { UsuarioService } from "../../../services/usuario.service";
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { jwtDecode } from "jwt-decode";
import { HttpErrorResponse } from "@angular/common/http";
import Swal from "sweetalert2";

@Component({
  selector: 'app-editprofile',
  imports: [ReactiveFormsModule, CommonModule, FormsModule, RouterLink],
  templateUrl: './editprofile.component.html',
  styleUrl: './editprofile.component.css'
})
export class EditprofileComponent implements OnInit {

  userForm!: FormGroup;
  loading: boolean = false;
  errorMessage: string = '';
  userId!: number;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
  }

  initializeForm() {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      nombreCompleto: ['', Validators.required],
      password: ['']
    });
  }

  loadUserData() {
    const usuario = this.usuarioService.getUsuarioActual();
    if (usuario) {
      this.userId = usuario.id;
      this.userForm.patchValue({
        username: usuario.username,
        email: usuario.email,
        nombreCompleto: usuario.nombreCompleto
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  editUser() {
    if (this.userForm.valid) {
      const updatedUser = {
        username: this.userForm.value.username,
        email: this.userForm.value.email,
        nombreCompleto: this.userForm.value.nombreCompleto,
        password: this.userForm.value.password || null
      };

      this.loading = true;

      this.usuarioService.editarUsuario(updatedUser).subscribe(
        (response: any) => {
          this.loading = false;

          if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
          }

          Swal.fire({
            icon: 'success',
            title: 'Perfil actualizado correctamente',
            text: 'Tu perfil ha sido actualizado exitosamente.',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            window.location.reload();
          });
        },
        (error: HttpErrorResponse) => {
          this.loading = false;
          if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Error al actualizar el perfil';
          }
        }
      );
    } else {
      this.errorMessage = 'Formulario inválido. Por favor revisa los campos.';
    }
  }

}
