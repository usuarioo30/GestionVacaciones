import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Component, OnInit, Renderer2} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit{
  mostrarNavbar: boolean = false;
  isDarkTheme = false;
  constructor(private authService: AuthService,
              private renderer: Renderer2) { }

  ngOnInit(): void {
    this.mostrarNavbar = this.authService.isAuthenticated();
    this.applySavedTheme();
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
}
