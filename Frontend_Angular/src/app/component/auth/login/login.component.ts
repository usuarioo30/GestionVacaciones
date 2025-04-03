import { Component, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { loadGapiInsideDOM, gapi } from 'gapi-script';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isDarkTheme = false;

  constructor(
      private fb: FormBuilder,
      private authService: AuthService,
      private router: Router,
      private renderer: Renderer2
  ) {
    this.initLoginForm();
  }

  ngOnInit(): void {
    this.redirectIfAuthenticated();
    this.applySavedTheme();
    this.loadGoogleAuthScript();
    (window as any).handleCredentialResponse = this.handleCredentialResponse.bind(this);
  }

  private initLoginForm(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  private redirectIfAuthenticated(): void {
    if (localStorage.getItem('access_token')) {
      this.router.navigate(['/reservas']);
    }
  }

  private applySavedTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkTheme = true;
      this.renderer.addClass(document.body, 'dark-theme');
    }
  }

  private loadGoogleAuthScript(): void {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.value;
    try {
      const response = await this.authService.logIn(username, password);
      if (!response.ok) throw new Error('Credenciales incorrectas');

      const { access_token } = await response.json();
      localStorage.setItem('access_token', JSON.stringify(access_token));
      Swal.fire('Éxito', 'Sesión iniciada con éxito. Redirigiendo...', 'success');

      setTimeout(() => this.router.navigate(['/reservas']), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      Swal.fire('Error', message, 'error');
    }
  }

  handleCredentialResponse(response: any): void {
    this.authService.loginWithGoogle(response.credential)
        .then(() => {
          Swal.fire('Éxito', 'Inicio de sesión con Google exitoso', 'success');
          localStorage.setItem('access_token', JSON.stringify(response.credential));
          this.router.navigate(['/reservas']);
        })
        .catch(err => {
          console.error('Error al iniciar sesión con Google:', err);
        });
  }

  private initializeGoogleAuth(): void {
    loadGapiInsideDOM().then(() => {
      gapi.load('auth2', () => {
        gapi.auth2.init({ client_id: '2.apps.googleusercontent.com' });
      });
    });
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.isDarkTheme
        ? this.renderer.addClass(document.body, 'dark-theme')
        : this.renderer.removeClass(document.body, 'dark-theme');
  }
}
