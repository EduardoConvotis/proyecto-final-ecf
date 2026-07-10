import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

// US6: /login es público; el resto exige sesión (FR-028).
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent) },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/list/list.component').then((m) => m.OrdersListComponent),
  },
  {
    path: 'orders/:orderId/execution',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/execution/execution.component').then((m) => m.ExecutionComponent),
  },
  {
    path: 'orders/:orderId/review',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/review/review.component').then((m) => m.ReviewComponent),
  },
  {
    path: 'orders/:orderId/reassign',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/reassign/reassign.component').then((m) => m.ReassignComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
];
