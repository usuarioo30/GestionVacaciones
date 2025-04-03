import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Usuario } from '../../../interfaces/usuario';
import { NgIf } from '@angular/common';
import Swal from 'sweetalert2';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-editprofile',
  imports: [ReactiveFormsModule, NgIf, RouterLink],
  templateUrl: './editprofile.component.html',
  styleUrl: './editprofile.component.css'
})
export class EditprofileComponent implements OnInit{

  //Token del usuario
  token!: string | null;

  //Datos del usuario
  user!: Usuario

  private fb: FormBuilder = inject(FormBuilder);
  private auth: AuthService = inject(AuthService);
  
  //Atributo usado para comprobar si el nuevo nombre de usuario elegido ya está ocupado
  validUsername!: any;

  //Formulario de edició de usuario
  editUser: FormGroup = this.fb.group({
    id: ['', []],
    email: ['', []],
    username: ['', [Validators.required]],
    password: ['', []],
    confirmPassword: ['', []]
  }, { validators: this.passwordsMatchValidator });

  async ngOnInit(): Promise<void> {
      this.token = localStorage.getItem("access_token");
      if (this.token) {
        const decodedToken = this.auth.decodeToken(this.token);
        console.log(decodedToken);

        this.user = await this.auth.getUserByMail(decodedToken.email);
        this.editUser.setValue({
          id: this.user.id,
          email: this.user.email,
          username: this.user.username,
          password: '',
          confirmPassword: ''
        })

      }

  }

  /**
   * Método para validar los campos del formulario
   * @param field Nombre del campo del formulario a validar
   * @returns True si el campo es inválido, false si es válido
   */
  inValidField(field: string): boolean {
    return this.editUser.controls[field]?.invalid && this.editUser.controls[field]?.touched;
  }

  /**
   * Validación personalizada para el formulario
   * @param group Formulario de editar usuario
   * @returns null si las contraseñas coinciden, error si no lo hacen
   */
  private passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password && confirmPassword && password !== confirmPassword
      ? { passNoCoinciden: true }
      : null;
  }

  /**
   * Método para comprobar la disponibilidad de un username
   * @param username Nombre de usuario nuevo
   * @returns True si está ocupado, false si está disponible
   */
  async checkTakenUser(username: string) {
    this.validUsername = await this.auth.getUserByUsername(username);
    return this.validUsername.username? true : false;
  }

  /**
   * Método para editar la información del perfil
   * 
   */
  async editUserSubmit() {
    if (this.editUser.valid) {
      const { id, username, password } = this.editUser.value;
  
      // Verificar si el nombre de usuario está disponible
      const usernameTaken = await this.checkTakenUser(username);
      if (usernameTaken) {
        this.validUsername = false;
        return; // Salimos si el nombre de usuario ya está tomado
      }
  
      try {
        // Editar el usuario dependiendo de si se pasa la contraseña
        const userUpdate = password 
          ? this.auth.editUser(id, username, password)
          : this.auth.editUser(id, username);
  
        await userUpdate;
  
        // Mostrar mensaje de éxito
        await Swal.fire({
          title: "Resultado",
          text: "Usuario editado con éxito",
          icon: "success",
          confirmButtonColor: "green",
          confirmButtonText: "Hecho",
        });
  
      } catch (error) {
        // Manejar error de forma adecuada
        console.error('Error al editar usuario:', error);
        await Swal.fire({
          title: "Error",
          text: "Hubo un error al editar el usuario. Inténtalo nuevamente.",
          icon: "error",
          confirmButtonText: "Cerrar",
        });
      }
    } else {
      this.validUsername = false;
      this.editUser.markAllAsTouched();
    }
  }
  
}


