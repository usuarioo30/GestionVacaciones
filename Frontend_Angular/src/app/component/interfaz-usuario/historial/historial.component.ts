import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, inject, NgModule, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
import { SolicitudDescanso } from '../../../interfaces/solicitud-descanso';

@Component({
  selector: 'app-historial',
  imports: [NgIf, NgFor, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent implements OnInit{

  solicitudesService: SolicitudDescansoService = inject(SolicitudDescansoService)
  private router: Router = inject(Router)
  private auth: string = '';
  private userId: number = 0;
  requests: SolicitudDescanso[] = [];
  status: string = 'true';
  order: string = '#';


  ngOnInit() {

    const token = localStorage.getItem('access_token');

    if (token) {
      this.auth = token;
      const decodedToken = jwtDecode(this.auth);
      console.log("Estoy aquí")
      if(decodedToken.sub) {
        this.userId = Number.parseInt(decodedToken.sub);
        this.solicitudesService.getUsersSolicitudDescanso(this.userId, this.auth);
        this.solicitudesService.setFilter(this.status);
        
  

      }
    } else {
      this.router.navigate(['/login']);
    }

    
  }

  orderRequest(field: string) {
    this.solicitudesService.setOrder(field);
  }

  filterRequest(status?: string) {
    this.solicitudesService.setFilter(status);

  }

  


}
