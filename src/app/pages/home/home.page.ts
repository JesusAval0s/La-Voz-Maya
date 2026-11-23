import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SqliteStorageService } from '../../core/services/sqlite-storage.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class HomePage implements OnInit, OnDestroy {
  public pendingCount: number = 0;
  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private storageService: SqliteStorageService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarConteoPendientes();

    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(async () => {
        if (this.router.url.includes('/home')) {
          await this.cargarConteoPendientes();
        }
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  public async ionViewWillEnter() {
    await this.cargarConteoPendientes();
  }

  private async cargarConteoPendientes() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const registros = await this.storageService.obtenerCuestionariosLocales();
      this.pendingCount = registros.filter(
        (r) => r.estadoSincronizacion === 'local' || r.estadoSincronizacion === 'error'
      ).length;
    } catch (e) {
      this.pendingCount = 0;
    } finally {
      this.cdr.detectChanges();
    }
  }

  public abrirGestionNube(): void {
    this.router.navigate(['/gestion-nube']);
  }

  public startSurvey(): void {
    this.router.navigate(['/consentimiento']);
  }
}