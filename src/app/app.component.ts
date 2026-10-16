import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Device } from '@capacitor/device';
import { Platform } from '@ionic/angular';
// Importación correcta para Standalone:
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { StorageService } from './core/services/storage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  public isWeb: boolean = false;
  public load: boolean = false;

  constructor(
    private platform: Platform,
    private storageService: StorageService,
    private cdRef: ChangeDetectorRef
  ) {
    this.initApp();
  }

  initApp() {
    this.platform.ready().then(async () => {
      const info = await Device.getInfo();
      this.isWeb = info.platform === 'web';

      try {
        await this.storageService.inicializarBaseDatos();
        this.load = true;
        console.log('Base de datos lista, cargando router-outlet.');
        
        // Forzar a Angular a pintar el router-outlet de inmediato
        this.cdRef.detectChanges();
      } catch (error) {
        console.error('Error crítico al inicializar la base de datos:', error);
      }
    });
  }
}