import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { SqliteStorageService } from '../../core/services/sqlite-storage.service';


interface OpcionActividad {
  texto: string;
  audioKey: string;
}

interface PreguntaActividad {
  id: 'p1' | 'p2';
  campo: string;
  num: number;
  texto: string;
  opciones: OpcionActividad[];
}

@Component({
  selector: 'app-actividad-fisica',
  templateUrl: './actividad-fisica.page.html',
  styleUrls: ['./actividad-fisica.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class ActividadFisicaPage implements OnInit, OnDestroy {
  public respuestas = {
    p1_frecuencia_actividad: '',
    p2_tipo_ejercicio: '',
  };

  public opcionesFrecuencia: OpcionActividad[] = [
    { texto: 'Nunca', audioKey: 'spn_nunca' },
    { texto: '1-2 veces por semana', audioKey: 'spn_1_2_veces' },
    { texto: '3-4 veces por semana', audioKey: 'spn_3_4_veces' },
    { texto: '5 o más veces por semana', audioKey: 'spn_5_mas_veces' },
  ];

  public opcionesTipoEjercicio: OpcionActividad[] = [
    { texto: 'Individual', audioKey: 'spn_individual' },
    { texto: 'En equipo', audioKey: 'spn_en_equipo' },
  ];

  public intentoGuardar: boolean = false;
  public audioActivoKey: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private storageService: SqliteStorageService
  ) {}

  ngOnInit(): void {
    const folio = this.storageService.getFolioActivo();
    if (!folio) {
      console.warn('⚠️ No se detectó un folio activo. Redirigiendo a Datos Generales...');
      this.router.navigate(['/datos-generales']);
    }
  }

  ngOnDestroy(): void {
    this.detenerAudio();
  }

  public reproducirAudioPregunta(numPregunta: number): void {
    const key = `pregunta_${numPregunta}`;

    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const audioUrl = `assets/audio/actividad_fisica/spn_${numPregunta}_actividad_fisica.mp3`;
    this.iniciarAudio(audioUrl, key);
  }

  public reproducirAudioRespuesta(audioKey: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const key = `respuesta_${audioKey}`;

    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const audioUrl = `assets/audio/actividad_fisica/respuestas/${audioKey}.mp3`;
    this.iniciarAudio(audioUrl, key);
  }

  private iniciarAudio(url: string, key: string): void {
    try {
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.audioActivoKey = key;
      this.cdr.detectChanges();

      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.audioActivoKey = null;
          this.currentAudio = null;
          this.cdr.detectChanges();
        }
      };

      audio.onerror = () => {
        console.warn('Audio no disponible en:', url);
        if (this.currentAudio === audio) {
          this.audioActivoKey = null;
          this.currentAudio = null;
          this.cdr.detectChanges();
        }
      };

      audio.play().catch((err) => {
        console.warn('Error al reproducir audio:', err);
        if (this.currentAudio === audio) {
          this.audioActivoKey = null;
          this.currentAudio = null;
          this.cdr.detectChanges();
        }
      });
    } catch (e) {
      console.warn('Excepción al instanciar audio:', e);
      this.audioActivoKey = null;
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
    this.audioActivoKey = null;
    this.cdr.detectChanges();
  }

  public seleccionarFrecuencia(opcion: string): void {
    this.respuestas.p1_frecuencia_actividad = opcion;
    if (opcion === 'Nunca') {
      this.respuestas.p2_tipo_ejercicio = '';
    }
  }

  public esInvalida(pregunta: string): boolean {
    if (!this.intentoGuardar) return false;
    const r = this.respuestas;

    switch (pregunta) {
      case 'p1':
        return !r.p1_frecuencia_actividad;
      case 'p2':
        return r.p1_frecuencia_actividad !== 'Nunca' && !r.p2_tipo_ejercicio;
      default:
        return false;
    }
  }

  public async guardarYContinuar(): Promise<void> {
    this.intentoGuardar = true;

    if (this.esInvalida('p1') || this.esInvalida('p2')) {
      console.warn('Faltan campos obligatorios por completar en Actividad Física.');
      return;
    }

    this.detenerAudio();

    // Regla de consistencia: si nunca hace actividad, p2 queda explícito como 'No aplica'
    if (this.respuestas.p1_frecuencia_actividad === 'Nunca') {
      this.respuestas.p2_tipo_ejercicio = 'No aplica';
    }

    try {
      // 1. Obtener el folio activo de la sesión
      const encuestaId = this.storageService.getFolioActivo();
      if (!encuestaId) {
        console.error('No hay folio activo. Redirigiendo a Datos Generales...');
        this.router.navigate(['/datos-generales']);
        return;
      }

      // 2. Guardar respuestas en SQLite
      await this.storageService.guardarRespuestasCuestionario(
        encuestaId,
        'actividad_fisica',
        this.respuestas
      );

      console.log(`Actividad Física guardada con éxito para el folio: ${encuestaId}`);

      // 3. Imprimir tabla en consola para auditar los datos de este cuestionario
      await this.storageService.imprimirRespuestasEnConsola('actividad_fisica', encuestaId);

      // 4. Quitar foco para prevenir la advertencia aria-hidden y avanzar al GAD-7
      (document.activeElement as HTMLElement)?.blur();
      this.router.navigate(['/gad-7']);
    } catch (error) {
      console.error('Error al persistir actividad física localmente:', error);
    }
  }
}