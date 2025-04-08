import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { UsuarioService } from "../../../services/usuario.service";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { Usuario } from "../../../interfaces/usuario";
import { HttpErrorResponse } from "@angular/common/http";

@Component({
  selector: 'app-editprofile',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './editprofile.component.html',
  styleUrl: './editprofile.component.css'
})
export class EditprofileComponent implements OnInit {
  editForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit(): void {
    // Llamamos a getUsuarioData() para obtener los datos del usuario
    this.usuarioService.getUserData().subscribe(
      (user: Usuario) => {
        this.editForm.patchValue({
          nombreCompleto: user.nombreCompleto,
          email: user.email,
          username: user.username
        });
      },
      (error) => {
        console.error('Error al obtener los datos del usuario', error);
      }
    );

    // Inicializamos el formulario
    this.editForm = this.fb.group({
      nombreCompleto: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required]],
      password: ['', [Validators.minLength(6)]]  // Contraseña opcional
    });
  }


  // Enviar el formulario
  onSubmit(): void {
    if (this.editForm.invalid) {
      return;
    }

    console.log('Formulario enviado', this.editForm.value);
    // Aquí enviaríamos la actualización al backend si fuera necesario
  }
}


