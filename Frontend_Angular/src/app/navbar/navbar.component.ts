import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  mostrarNavbar: boolean = false;
  mostrarMisSolicitudes: boolean = false;
  mostrarCrearUsuario: boolean = true;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.mostrarNavbar = this.authService.isAuthenticated();
    this.mostrarMisSolicitudes = this.authService.getUserRole() === 'user';
    this.mostrarCrearUsuario = this.authService.getUserRole() === 'admin';
  }
}
