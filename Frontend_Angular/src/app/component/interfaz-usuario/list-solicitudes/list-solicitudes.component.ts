import { Component, OnInit } from '@angular/core';
import { SolicitudDescansoService } from '../../../services/solicitud-descanso.service';
import { SolicitudDescanso } from '../../../model/SolicitudDescanso';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-solicitudes',
  imports: [CommonModule],
  templateUrl: './list-solicitudes.component.html',
  styleUrl: './list-solicitudes.component.css'
})
export class ListSolicitudesComponent implements OnInit{
  public solicitudesDescanso: SolicitudDescanso[] = [];

  constructor(
    private solicitudDescansoService: SolicitudDescansoService

  ) { }

  ngOnInit(): void {
    this.findAllSolicitudesDescanso();
  }

  findAllSolicitudesDescanso() {
    this.solicitudDescansoService.getAllSolicitudesDescanso().subscribe(
      result => { this.solicitudesDescanso = result; },
      error => { console.log(error) }
    );
  }

}
