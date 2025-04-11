import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2 } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { SolicitudDescansoService } from '../../services/solicitud-descanso.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  mostrarNavbar: boolean = false;
  isDarkTheme = false;
  mostrarMisSolicitudes: boolean = false;
  mostrarCrearUsuario: boolean = true;
  username: string | null = null;
  rol: string | null = null;
  isAdmin: boolean = false;
  constructor(
    private authService: AuthService,
    private renderer: Renderer2,
    private router: Router,
    private solicitudDescansoService: SolicitudDescansoService
  ) { }

  ngOnInit(): void {
    this.updateNavbarVisibility();
    this.applySavedTheme();
  }

  private updateNavbarVisibility(): void {
    // Comprobamos si el usuario está autenticado
    this.mostrarNavbar = this.authService.isAuthenticated();
    this.username = this.solicitudDescansoService.getUsernameToken();
    this.rol = this.authService.getUserRole();
    this.isAdmin = this.rol === 'admin' ? true : false;

    this.mostrarNavbar = this.authService.isAuthenticated();
    this.applySavedTheme();
    this.mostrarMisSolicitudes = this.authService.getUserRole() === 'user';
    this.mostrarCrearUsuario = this.authService.getUserRole() === 'admin';
  }

  private applySavedTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkTheme = true;
      this.renderer.addClass(document.body, 'dark-theme');
    }
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.isDarkTheme
      ? this.renderer.addClass(document.body, 'dark-theme')
      : this.renderer.removeClass(document.body, 'dark-theme');
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.updateNavbarVisibility();

    this.router.navigateByUrl("/login");
  }
}
