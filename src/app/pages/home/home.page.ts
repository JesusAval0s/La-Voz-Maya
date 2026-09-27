import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline } from 'ionicons/icons';
import { StorageService } from '../../core/services/storage.service'; // Asegúrate de importar tu servicio de almacenamiento

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class HomePage implements OnInit {
  public pendingCount: number = 0; // Conteo real basado en archivos locales

  constructor(
    private router: Router,
    private storageService: StorageService
  ) {
    addIcons({ cloudUploadOutline });
  }

  async ngOnInit() {
    await this.cargarConteoPendientes();
  }

  // Carga los elementos reales que están guardados localmente
  public async ionViewWillEnter() {
    await this.cargarConteoPendientes();
  }

  private async cargarConteoPendientes() {
    try {
      const registros = await this.storageService.obtenerCuestionariosLocales();
      // Cuenta solo los que están pendientes o con error localmente
      this.pendingCount = registros.filter(
        (r) => r.estadoSincronizacion === 'local' || r.estadoSincronizacion === 'error'
      ).length;
    } catch (e) {
      this.pendingCount = 0; // Si está limpio, inicia en 0 por defecto
    }
  }

  // Redirige a la ventana de gestión de la nube que diseñamos
  public abrirGestionNube(): void {
    this.router.navigate(['/gestion-nube']);
  }

  public startSurvey(): void {
    this.router.navigate(['/consentimiento']);
  }
}