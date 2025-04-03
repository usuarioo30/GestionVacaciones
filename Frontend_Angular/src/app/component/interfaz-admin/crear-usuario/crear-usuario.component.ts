import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-crear-usuario',
  imports: [RouterLink, ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './crear-usuario.component.html',
  styleUrls: ['./crear-usuario.component.css'] // Asegúrate de usar "styleUrls"
})
export class CrearUsuarioComponent {
  private fb: FormBuilder = inject(FormBuilder);
  private auth: AuthService = inject(AuthService);
  private router: Router = inject(Router);

  emailExistsError: string | null = null;
  usernameExistsError: string | null = null;

  newuser: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@apeiroo\.com$/)]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    confirmpassword: ['', [Validators.required]],
    roles: ['', [Validators.required]]
  });

  isInvalid(controlName: string) {
    const control = this.newuser.controls[controlName];
    return control.invalid && control.touched;
  }

  passwordsMatch() {
    return this.newuser.value.password === this.newuser.value.confirmpassword;
  }

  async submitForm(): Promise<void> {
    if (this.newuser.invalid) {
      this.newuser.markAllAsTouched();
      return;
    }

    console.log("Usuario Valido")
    const { email, username, password, roles } = this.newuser.value;
    const user = { email, username, password, roles };

    try {
      await this.auth.registerUser(user);
      Swal.fire("Usuario creado con éxito");
      this.newuser.reset();
      this.router.navigate(['/reservas']);
    } catch (error: any) {
      if (error?.message === 'El correo ya está registrado') {
        this.emailExistsError = 'El correo ya está registrado';
      }
      if (error?.message === 'El nombre de usuario ya está registrado') {
        this.usernameExistsError = 'El nombre de usuario ya está registrado';
      }
    }
  }
}
