import { NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';


@Component({
  selector: 'app-historial',
  imports: [],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent implements OnInit{

  solicitudesService: SolicitudDescansoService = inject(SolicitudDescansoService)
  private router: Router = inject(Router)
  private auth: string = '';
  private userId: number = 0;


  ngOnInit(): void {

    const token = localStorage.getItem('access_token');

    if (token) {
      this.auth = token;
      const decodedToken = jwtDecode(this.auth);
      console.log("Estoy aquí")
      if(decodedToken.sub) {
        this.userId = Number.parseInt(decodedToken.sub);
        this.solicitudesService.getUsersSolicitudDescanso(this.userId, this.auth);
      }
    } else {
      this.router.navigate(['/login']);
    }

    this.solicitudesService.getUsersSolicitudDescanso
  }

  get authorization() {
    return jwtDecode(this.auth);
  }

}
