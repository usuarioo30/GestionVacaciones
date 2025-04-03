import { Routes } from '@angular/router';
import { LoginComponent } from './component/auth/login/login.component';
import { ListReservasComponent } from './component/interfaz-usuario/list-reservas/list-reservas.component';
import { CrearUsuarioComponent } from './component/interfaz-admin/crear-usuario/crear-usuario.component';
import { ListProyectosComponent } from './component/interfaz-admin/list-proyectos/list-proyectos.component';
import { ListUsuariosComponent } from './component/interfaz-admin/list-usuarios/list-usuarios.component';
import { EditprofileComponent } from './component/interfaz-usuario/editprofile/editprofile.component';


export const appRoutes: Routes = [
  // Reservas
  { path: 'reservas', component: ListReservasComponent },

  // Proyectos
  {path: 'proyectos', component: ListProyectosComponent},

  // Login
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redirige a la página de login por defecto
  { path: 'login', component: LoginComponent }, // Ruta para el login

  // Admin
  {path: 'createuser', component: CrearUsuarioComponent},
  {path: 'listusers', component: ListUsuariosComponent},

  //Usuario
  {path: 'profile', component: EditprofileComponent},

  { path: '**', redirectTo: '/login' }, // Redirige a login si la ruta no existe
];
