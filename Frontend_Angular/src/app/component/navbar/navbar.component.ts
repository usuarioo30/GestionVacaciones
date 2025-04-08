import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2 } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink, RouterModule } from '@angular/router';

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

  constructor(
    private authService: AuthService,
    private renderer: Renderer2,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.checkAuthentication();
    this.applySavedTheme();
    this.mostrarMisSolicitudes = this.authService.getUserRole() === 'user';
    this.mostrarCrearUsuario = this.authService.getUserRole() === 'admin';
  }

  checkAuthentication(): void {
    this.mostrarNavbar = this.authService.isAuthenticated();
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

    this.router.navigateByUrl("/login");
  }
}
