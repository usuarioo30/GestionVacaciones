import { Routes } from '@angular/router';
import { LoginComponent } from './component/auth/login/login.component';
import { CrearUsuarioComponent } from './component/interfaz-admin/crear-usuario/crear-usuario.component';
import { ListUsuariosComponent } from './component/interfaz-admin/list-usuarios/list-usuarios.component';
import { EditprofileComponent } from './component/interfaz-usuario/editprofile/editprofile.component';

import { CalendarComponent } from './component/calendar/calendar.component';

import { ListSolicitudesComponent } from './component/interfaz-usuario/list-solicitudes/list-solicitudes.component';
import { HistorialComponent } from './component/interfaz-usuario/historial/historial.component';
import { ListSolicitudesAdminComponent } from './component/interfaz-admin/list-solicitudes-admin/list-solicitudes-admin.component';


export const appRoutes: Routes = [


  // Login
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redirige a la página de login por defecto
  { path: 'login', component: LoginComponent }, // Ruta para el login

  // Admin
  { path: 'listusers', component: ListUsuariosComponent },
  { path: 'crearUsuario', component: CrearUsuarioComponent },
  { path: 'solicitudes-admin', component: ListSolicitudesAdminComponent },
  { path: 'usuarios', component: ListUsuariosComponent },

  //Usuario
  { path: 'solicitudes', component: ListSolicitudesComponent },
  { path: 'editarUsuario', component: EditprofileComponent },

  //Calendario
  { path: 'calendario', component: CalendarComponent },

  //Historial
  { path: 'historial', component: HistorialComponent },

  { path: '**', redirectTo: '/login' }, // Redirige a login si la ruta no existe
];
