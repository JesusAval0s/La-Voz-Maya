import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-reporte-condicion',
  templateUrl: './reporte-condicion.page.html',
  styleUrls: ['./reporte-condicion.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class ReporteCondicionPage implements OnInit, OnDestroy {
  public deteccionDepresion: 'POSITIVA' | 'NEGATIVA' = 'NEGATIVA';
  public deteccionAnsiedad: 'POSITIVA' | 'NEGATIVA' = 'NEGATIVA';
  public valoracionGeneral: 'RANGOS ACEPTABLES' | 'REQUIERE ATENCIÓN' = 'RANGOS ACEPTABLES';

  public fechaReporte: string = '';

  // Control de Audio
  public reproduciendo: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.evaluarCondicionGeneral();
    const hoy = new Date();
    this.fechaReporte = hoy.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  ngOnDestroy(): void {
    this.detenerAudio();
  }

  private evaluarCondicionGeneral(): void {
    if (this.deteccionDepresion === 'POSITIVA' || this.deteccionAnsiedad === 'POSITIVA') {
      this.valoracionGeneral = 'REQUIERE ATENCIÓN';
    } else {
      this.valoracionGeneral = 'RANGOS ACEPTABLES';
    }
  }

  private obtenerNombreArchivoAudio(): string {
    const dep = this.deteccionDepresion === 'POSITIVA' ? 'pos' : 'neg';
    const ans = this.deteccionAnsiedad === 'POSITIVA' ? 'pos' : 'neg';
    return `spn_reporte_${dep}_${ans}.mp3`;
  }

  public toggleAudioReporte(): void {
    if (this.reproduciendo) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const archivo = this.obtenerNombreArchivoAudio();
    const url = `assets/audio/reporte_condicion/${archivo}`;

    try {
      this.currentAudio = new Audio(url);
      this.reproduciendo = true;
      this.cdr.detectChanges();

      this.currentAudio.onended = () => {
        this.reproduciendo = false;
        this.currentAudio = null;
        this.cdr.detectChanges();
      };

      this.currentAudio.onerror = () => {
        console.warn('No se encontró el audio:', url);
        this.reproduciendo = false;
        this.currentAudio = null;
        this.cdr.detectChanges();
      };

      this.currentAudio.play().catch((err) => {
        console.warn('Error al reproducir:', err);
        this.reproduciendo = false;
        this.currentAudio = null;
        this.cdr.detectChanges();
      });
    } catch {
      this.reproduciendo = false;
      this.currentAudio = null;
      this.cdr.detectChanges();
    }
  }

  private detenerAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.reproduciendo = false;
    this.cdr.detectChanges();
  }

  public descargarPdf(): void {
    this.detenerAudio();
    window.print();
  }

  public continuar(): void {
    this.detenerAudio();
    this.router.navigate(['/contacto-seguimiento']);
  }
}