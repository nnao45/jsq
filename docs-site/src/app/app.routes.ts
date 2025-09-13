import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  // {
  //   path: 'repl',
  //   loadComponent: () => import('./pages/repl/repl.component').then(m => m.ReplComponent)
  // },
  {
    path: 'getting-started',
    loadComponent: () => import('./pages/getting-started/getting-started.component').then(m => m.GettingStartedComponent)
  },
  {
    path: 'smart-dollar-methods',
    loadComponent: () => import('./pages/smart-dollar-methods/smart-dollar-methods.component').then(m => m.SmartDollarMethodsComponent)
  },
  {
    path: 'lodash-methods',
    loadComponent: () => import('./pages/lodash-methods/lodash-methods.component').then(m => m.LodashMethodsComponent)
  },
  {
    path: 'js-operations',
    loadComponent: () => import('./pages/js-operations/js-operations.component').then(m => m.JsOperationsComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];