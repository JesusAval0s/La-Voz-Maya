import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { SqliteStorageService } from '../../core/services/sqlite-storage.service';

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
    private cdr: ChangeDetectorRef,
    private storageService: SqliteStorageService
  ) {}

  async ngOnInit(): Promise<void> {
    const hoy = new Date();
    this.fechaReporte = hoy.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const folio = this.storageService.getFolioActivo();
    if (!folio) {
      console.warn('⚠️ No se detectó un folio activo. Redirigiendo a Datos Generales...');
      this.router.navigate(['/datos-generales']);
      return;
    }

    await this.cargarYCalcularResultados(folio);
  }

  ngOnDestroy(): void {
    this.detenerAudio();
  }

  private async cargarYCalcularResultados(folio: string): Promise<void> {
    try {
      // 1. Cargar las respuestas previas de GAD-7 y PHQ-9 desde SQLite
      const respuestasGad7 = await this.storageService.obtenerRespuestasCuestionario(folio, 'gad_7');
      const respuestasPhq9 = await this.storageService.obtenerRespuestasCuestionario(folio, 'phq_9');

      // 2. Evaluar Ansiedad con GAD-7 (Puntajes clínicos: corte >= 10)
      if (respuestasGad7) {
        const valoresGad7: { [key: string]: number } = {
          'No': 0,
          'Algunos días': 1,
          'Más de la mitad de los días': 2,
          'Casi todos los días': 3
        };

        const llavesGad7 = [
          'p1_nervioso',
          'p2_controlar_preocupacion',
          'p3_preocuparse_demasiado',
          'p4_problemas_relajarse',
          'p5_dificil_permanecer_sentado',
          'p6_irritarse_facilidad',
          'p7_miedo_algo_terrible'
        ];

        let puntajeGad7 = 0;
        for (const key of llavesGad7) {
          const respuestaTexto = respuestasGad7[key];
          if (respuestaTexto && valoresGad7[respuestaTexto] !== undefined) {
            puntajeGad7 += valoresGad7[respuestaTexto];
          }
        }

        this.deteccionAnsiedad = puntajeGad7 >= 10 ? 'POSITIVA' : 'NEGATIVA';
        console.log(`[Reporte Condición] Score GAD-7 calculado: ${puntajeGad7} -> ${this.deteccionAnsiedad}`);
      }

      // 3. Evaluar Depresión con PHQ-9
      if (respuestasPhq9) {
        if (respuestasPhq9.deteccion) {
          this.deteccionDepresion = respuestasPhq9.deteccion.toUpperCase() === 'POSITIVA' ? 'POSITIVA' : 'NEGATIVA';
        } else {
          const puntajePhq9 = Number(respuestasPhq9.puntaje_total ?? 0);
          const esPositivo = puntajePhq9 >= 11 ||
            Number(respuestasPhq9.p9) > 0 ||
            respuestasPhq9.p10 === 'Sí' ||
            respuestasPhq9.p11 === 'Sí';
          this.deteccionDepresion = esPositivo ? 'POSITIVA' : 'NEGATIVA';
        }
        console.log(`[Reporte Condición] Detección PHQ-9: ${this.deteccionDepresion}`);
      }

      // 4. Evaluar condición general combinada
      this.evaluarCondicionGeneral();

      // 5. Persistir el resumen del reporte en SQLite
      const payloadReporte = {
        fecha: this.fechaReporte,
        deteccion_depresion: this.deteccionDepresion,
        deteccion_ansiedad: this.deteccionAnsiedad,
        valoracion_general: this.valoracionGeneral
      };

      await this.storageService.guardarRespuestasCuestionario(folio, 'reporte_condicion', payloadReporte);
      await this.storageService.imprimirRespuestasEnConsola('reporte_condicion', folio);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al calcular o guardar el reporte de condición:', error);
    }
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
    (document.activeElement as HTMLElement)?.blur();
    this.router.navigate(['/contacto-seguimiento']);
  }
}