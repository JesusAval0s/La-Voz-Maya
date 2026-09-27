import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full',
  },
  {
    path: 'splash',
    loadComponent: () =>
      import('./pages/splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'consentimiento',
    loadComponent: () =>
      import('./pages/consentimiento/consentimiento.page').then((m) => m.ConsentimientoPage),
  },
  {
    path: 'datos-generales',
    loadComponent: () =>
      import('./pages/datos-generales/datos-generales.page').then((m) => m.DatosGeneralesPage),
  },
  {
    path: 'informacion-adicional',
    loadComponent: () =>
      import('./pages/informacion-adicional/informacion-adicional.page').then((m) => m.InformacionAdicionalPage),
  },
  {
    path: 'habitos-alimentacion',
    loadComponent: () =>
      import('./pages/habitos-alimentacion/habitos-alimentacion.page').then((m) => m.HabitosAlimentacionPage),
  },
  {
    path: 'habitos-sueno',
    loadComponent: () =>
      import('./pages/habitos-sueno/habitos-sueno.page').then((m) => m.HabitosSuenoPage),
  },
  {
    path: 'actividad-fisica',
    loadComponent: () =>
      import('./pages/actividad-fisica/actividad-fisica.page').then((m) => m.ActividadFisicaPage),
  },
  {
    path: 'gad-7',
    loadComponent: () =>
      import('./pages/gad-7/gad-7.page').then((m) => m.Gad7Page),
  },
  {
    path: 'assist',
    loadComponent: () =>
      import('./pages/assist/assist.page').then((m) => m.AssistPage),
  },
  {
    path: 'phq-9',
    loadComponent: () =>
      import('./pages/phq-9/phq-9.page').then((m) => m.Phq9Page),
  },
  {
    path: 'asq-modoris',
    loadComponent: () =>
      import('./pages/asq-modoris/asq-modoris.page').then((m) => m.AsqModorisPage),
  },
  {
    path: 'reporte-condicion',
    loadComponent: () =>
      import('./pages/reporte-condicion/reporte-condicion.page').then((m) => m.ReporteCondicionPage),
  },
  {
    path: 'contacto-seguimiento',
    loadComponent: () =>
      import('./pages/contacto-seguimiento/contacto-seguimiento.page').then((m) => m.ContactoSeguimientoPage),
  },
  {
    path: 'gestion-nube',
    loadComponent: () => import('./pages/gestion-nube/gestion-nube.page').then( m => m.GestionNubePage)
  },
];