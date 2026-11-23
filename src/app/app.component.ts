import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Device } from '@capacitor/device';
import { Platform } from '@ionic/angular';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { SqliteStorageService } from './core/services/sqlite-storage.service';

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
    private storageService: SqliteStorageService,
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
        console.log('Base de datos lista, cargando router-outlet.');
      } catch (error) {
        console.warn('Primer intento de BD falló, reintentando en 500ms...', error);
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          await this.storageService.inicializarBaseDatos();
          console.log('Base de datos lista en segundo intento.');
        } catch (err2) {
          console.error('Error crítico al inicializar la base de datos:', err2);
        }
      } finally {
        // Siempre habilita la interfaz para evitar pantalla negra
        this.load = true;
        this.cdRef.detectChanges();
      }
    });
  }
}