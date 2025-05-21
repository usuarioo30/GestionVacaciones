import { Routes } from '@angular/router';
import { LoginComponent } from './component/auth/login/login.component';
import { CrearUsuarioComponent } from './component/interfaz-admin/crear-usuario/crear-usuario.component';
import { ListUsuariosComponent } from './component/interfaz-admin/list-usuarios/list-usuarios.component';
import { EditprofileComponent } from './component/interfaz-usuario/editprofile/editprofile.component';

import { CalendarComponent } from './component/calendar/calendar.component';

import { ListSolicitudesComponent } from './component/interfaz-usuario/list-solicitudes/list-solicitudes.component';
import { HistorialComponent } from './component/interfaz-usuario/historial/historial.component';
import { ListSolicitudesAdminComponent } from './component/interfaz-admin/list-solicitudes-admin/list-solicitudes-admin.component';
import { HistorialAdminComponent } from './component/interfaz-admin/historial-admin/historial-admin.component';
import { CalendarioAdminComponent } from './component/interfaz-admin/calendario-admin/calendario-admin.component';

import { HorarioComponent } from './component/interfaz-admin/horario/horario.component';



export const appRoutes: Routes = [


  // Login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Admin
  { path: 'listusers', component: ListUsuariosComponent },
  { path: 'crearUsuario', component: CrearUsuarioComponent },
  { path: 'solicitudes-admin', component: ListSolicitudesAdminComponent },
  { path: 'historial-admin', component: HistorialAdminComponent},
  { path: 'usuarios', component: ListUsuariosComponent },
  {path: 'calendario-admin', component: CalendarioAdminComponent},

  //Usuario
  { path: 'solicitudes', component: ListSolicitudesComponent },
  { path: 'editarUsuario', component: EditprofileComponent },
  { path: 'horario', component: HorarioComponent },

  //Calendario
  { path: 'calendario', component: CalendarComponent },

  //Historial
  { path: 'historial', component: HistorialComponent },

  //{path: 'horario-admin', component: HorarioAdminComponent},

  { path: '**', redirectTo: '/login' },
];
