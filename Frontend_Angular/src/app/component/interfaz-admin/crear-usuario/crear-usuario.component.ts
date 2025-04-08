import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../../services/usuario.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-crear-usuario',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './crear-usuario.component.html',
  styleUrls: ['./crear-usuario.component.css']
})
export class CrearUsuarioComponent implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private router: Router = inject(Router);

  // Variable para controlar si el formulario está en proceso de envío
  isSubmitting: boolean = false;
  isAdmin: boolean = false;
  isAuthenticated: boolean = false;

  constructor(
    private usuarioService: UsuarioService,
    private authService: AuthService
  ) { }

  // Form group con validaciones
  newuser: FormGroup = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@apeiroo\.com$/)
      ]
    ],
    nombreCompleto: ['', [Validators.required]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(3)]],
    confirmpassword: ['', [Validators.required]],
    rol: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.log("No se encuentra el token");
      this.router.navigate(['/login']);
      return;
    }

    // Obtener el rol del usuario actual
    const rol = this.authService.getUserRole();

    if (rol === 'admin') {
      this.isAdmin = true;
    } else {
      this.isAdmin = false;
      this.router.navigate(['/']);
    }
  }

  // Verifica si las contraseñas coinciden
  passwordsMatch() {
    return this.newuser.value.password === this.newuser.value.confirmpassword;
  }

  submitForm(): void {
    if (this.newuser.invalid || !this.passwordsMatch() || this.isSubmitting) {
      this.newuser.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const { email, nombreCompleto, username, password, rol } = this.newuser.value;
    const user = { email, nombreCompleto, username, password, rol };

    // Llamada al servicio para crear el usuario
    this.usuarioService.createUser(user).subscribe({
      next: (response) => {
        Swal.fire('Usuario creado con éxito');
        this.newuser.reset();
        this.router.navigate(['/usuarios']);
      },
      error: (error: any) => {
        const backendError = error?.error?.message || error?.message;

        if (backendError === 'El correo ya está registrado') {
          Swal.fire('Error', 'El correo ya está registrado', 'error');
        } else if (backendError === 'El nombre de usuario ya está registrado') {
          Swal.fire('Error', 'El nombre de usuario ya está registrado', 'error');
        } else {
          Swal.fire('Error al crear el usuario', backendError, 'error');
        }
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
