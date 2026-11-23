import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { IonContent, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SqliteStorageService, CuestionarioRegistro } from '../../core/services/sqlite-storage.service';

@Component({
  selector: 'app-gestion-nube',
  templateUrl: './gestion-nube.page.html',
  styleUrls: ['./gestion-nube.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class GestionNubePage implements OnInit, OnDestroy {
  public cuestionarios: CuestionarioRegistro[] = [];
  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private storageService: SqliteStorageService,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarRegistros();

    // Escucha cada navegación hacia esta ruta, incluso si la página estaba en caché
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(async () => {
        if (this.router.url.includes('gestion-nube') || this.router.url.includes('sincroniz')) {
          await this.cargarRegistros();
        }
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  public async cargarRegistros() {
    // Pequeña pausa de 150ms para asegurar que cualquier saveToStore() previo haya finalizado
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.cuestionarios = await this.storageService.obtenerCuestionariosLocales();
    this.cdr.detectChanges();
  }

  public hayPendientes(): boolean {
    return this.cuestionarios.some(
      (c) => c.estadoSincronizacion === 'local' || c.estadoSincronizacion === 'error'
    );
  }

  public haySincronizados(): boolean {
    return this.cuestionarios.some((c) => c.estadoSincronizacion === 'sincronizado');
  }

  // Acción del botón superior "Sincronizar todo"
  public async sincronizarTodo() {
    const pendientes = this.cuestionarios.filter(
      (item) => item.estadoSincronizacion === 'local' || item.estadoSincronizacion === 'error'
    );

    if (pendientes.length === 0) return;

    for (const item of pendientes) {
      await this.sincronizarItem(item);
    }
  }

  // Sincronizar un elemento individual
  public async sincronizarItem(item: CuestionarioRegistro) {
    if (item.estadoSincronizacion === 'sincronizado' || item.estadoSincronizacion === 'subiendo') {
      return;
    }

    await this.storageService.actualizarEstado(item.id, 'subiendo');
    await this.cargarRegistros();

    try {
      await this.storageService.sincronizarEncuestaCompleta(item.id);
    } catch (error) {
      console.error(`Error al sincronizar folio ${item.id}:`, error);
      await this.storageService.actualizarEstado(item.id, 'error');
    } finally {
      await this.cargarRegistros();
    }
  }

  public async sincronizarTodos() {
    const pendientes = this.cuestionarios.filter(
      (c) => c.estadoSincronizacion === 'local' || c.estadoSincronizacion === 'error'
    );

    for (const item of pendientes) {
      await this.sincronizarItem(item);
    }
  }

  // Acción del botón superior "Eliminar sincronizados"
  public async eliminarSincronizados() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar sincronizados',
      message: '¿Deseas borrar del dispositivo todos los cuestionarios que ya fueron subidos a la nube?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.storageService.eliminarCuestionariosSincronizados();
            await this.cargarRegistros();
          },
        },
      ],
    });
    await alert.present();
  }

  // Eliminar un cuestionario individual
  public async eliminarItem(item: CuestionarioRegistro) {
    const folioLimpio = (item.folio || item.id).toString().replace('FOLIO_', '');
    const advertencia =
      item.estadoSincronizacion === 'sincronizado'
        ? `¿Eliminar el Folio ${folioLimpio} del dispositivo? (Ya está respaldado en la nube).`
        : ` El Folio ${folioLimpio} AÚN NO se ha sincronizado. Si lo eliminas se perderán sus respuestas y audios.`;

    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: advertencia,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.storageService.eliminarCuestionarioPorId(item.id);
            await this.cargarRegistros();
          },
        },
      ],
    });
    await alert.present();
  }

  public irAInicio() {
    this.router.navigate(['/home']);
  }
}