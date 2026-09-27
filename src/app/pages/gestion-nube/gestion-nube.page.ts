import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { StorageService, CuestionarioRegistro } from '../../core/services/storage.service';

@Component({
  selector: 'app-gestion-nube',
  templateUrl: './gestion-nube.page.html',
  styleUrls: ['./gestion-nube.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class GestionNubePage implements OnInit {
  public cuestionarios: CuestionarioRegistro[] = [];

  constructor(
    private router: Router,
    private storageService: StorageService
  ) {}

  async ngOnInit() {
    await this.cargarRegistros();
  }

  public async cargarRegistros() {
    this.cuestionarios = await this.storageService.obtenerCuestionariosLocales();
  }

  // Acción del botón superior "Sincronizar todo"
  public async sincronizarTodo() {
    for (let item of this.cuestionarios) {
      if (item.estadoSincronizacion === 'local' || item.estadoSincronizacion === 'error') {
        await this.storageService.actualizarEstado(item.id, 'subiendo');
      }
    }
    await this.cargarRegistros();

    // Simulación de respuesta de red hacia la base de datos en línea
    setTimeout(async () => {
      for (let item of this.cuestionarios) {
        if (item.estadoSincronizacion === 'subiendo') {
          await this.storageService.actualizarEstado(item.id, 'sincronizado');
        }
      }
      await this.cargarRegistros();
    }, 2000);
  }

  // Sincronizar un elemento individual al hacer clic en su tarjeta
  public async sincronizarItem(item: CuestionarioRegistro) {
    if (item.estadoSincronizacion === 'sincronizado' || item.estadoSincronizacion === 'subiendo') return;

    await this.storageService.actualizarEstado(item.id, 'subiendo');
    await this.cargarRegistros();

    setTimeout(async () => {
      await this.storageService.actualizarEstado(item.id, 'sincronizado');
      await this.cargarRegistros();
    }, 1500);
  }

  public irAInicio() {
    this.router.navigate(['/home']);
  }
}