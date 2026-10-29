import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { SqliteStorageService } from '../../core/services/sqlite-storage.service';


interface OpcionEscala {
  texto: string;
  puntos: number;
  audioKey: string;
}

interface PreguntaLikert {
  id: string;
  num: number;
  texto: string;
}

interface PreguntaSiNo {
  id: string;
  num: number;
  texto: string;
}

@Component({
  selector: 'app-phq-9',
  templateUrl: './phq-9.page.html',
  styleUrls: ['./phq-9.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class Phq9Page implements OnInit, OnDestroy {
  public respuestas: { [key: string]: any } = {
    p1: null,
    p2: null,
    p3: null,
    p4: null,
    p5: null,
    p6: null,
    p7: null,
    p8: null,
    p9: null,
    p10: '',
    p11: '',
  };

  public opcionesLikert: OpcionEscala[] = [
    { texto: 'Ningún día', puntos: 0, audioKey: 'spn_ningun_dia' },
    { texto: 'Varios días', puntos: 1, audioKey: 'spn_varios_dias' },
    { texto: 'Más de la mitad de los días', puntos: 2, audioKey: 'spn_mas_mitad_dias' },
    { texto: 'Casi todos los días', puntos: 3, audioKey: 'spn_casi_todos_dias' },
  ];

  public opcionesSiNo = [
    { texto: 'Sí', audioKey: 'spn_si' },
    { texto: 'No', audioKey: 'spn_no' },
  ];

  public preguntasLikert: PreguntaLikert[] = [
    { id: 'p1', num: 1, texto: 'Poco interés o placer en hacer cosas' },
    { id: 'p2', num: 2, texto: '¿Se ha sentido decaído(a), deprimido(a) o sin esperanzas?' },
    { id: 'p3', num: 3, texto: '¿Ha tenido dificultad para quedarse o permanecer dormido(a), o ha dormido demasiado?' },
    { id: 'p4', num: 4, texto: '¿Se ha sentido cansado(a) o con poca energía?' },
    { id: 'p5', num: 5, texto: '¿Se ha sentido sin apetito o ha comido en exceso?' },
    { id: 'p6', num: 6, texto: '¿Se ha sentido mal con usted mismo(a) - o que es un fracaso o que ha quedado mal con usted mismo(a) o con su familia?' },
    { id: 'p7', num: 7, texto: '¿Ha tenido dificultad para concentrarse en ciertas actividades, tales como leer el periódico o ver la televisión?' },
    { id: 'p8', num: 8, texto: '¿Se ha movido o hablado tan lento que otras personas podrían haberlo notado? o lo contrario - muy inquieto(a) o agitado(a) que ha estado moviéndose mucho más de lo normal' },
    { id: 'p9', num: 9, texto: 'Pensamientos de que estaría mejor muerto(a) o de lastimarse de alguna manera' },
  ];

  public preguntasAdicionales: PreguntaSiNo[] = [
    { id: 'p10', num: 10, texto: 'En el último mes, ¿Ha habido algún momento en el que has pensado seriamente terminar con tu vida?' },
    { id: 'p11', num: 11, texto: 'En algún momento ¿Ha intentado quitarse la vida?' },
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
    const audioUrl = `assets/audio/phq_9/spn_${numPregunta}_phq_9.mp3`;
    this.iniciarAudio(audioUrl, key);
  }

  public reproducirAudioRespuesta(audioKey: string, event?: Event): void {
    if (event) event.stopPropagation();

    const key = `respuesta_${audioKey}`;

    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const audioUrl = `assets/audio/phq_9/respuestas/${audioKey}.mp3`;
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

  public esInvalida(idCampo: string): boolean {
    if (!this.intentoGuardar) return false;
    return this.respuestas[idCampo] === null || this.respuestas[idCampo] === '';
  }

  public async guardarYContinuar(): Promise<void> {
    this.intentoGuardar = true;

    const obligatorias = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'];
    const hayIncompletas = obligatorias.some((campo) => this.esInvalida(campo));

    if (hayIncompletas) {
      console.warn('Faltan reactivos por completar en el PHQ-9.');
      return;
    }

    this.detenerAudio();

    // 1. Cálculo de puntaje acumulado (preguntas 1 a 9)
    const puntajeTotal =
      Number(this.respuestas['p1']) +
      Number(this.respuestas['p2']) +
      Number(this.respuestas['p3']) +
      Number(this.respuestas['p4']) +
      Number(this.respuestas['p5']) +
      Number(this.respuestas['p6']) +
      Number(this.respuestas['p7']) +
      Number(this.respuestas['p8']) +
      Number(this.respuestas['p9']);

    // 2. Criterios de evaluación idénticos al backend
    const esPositivoPorPuntaje = puntajeTotal >= 11;
    const esPositivoPorRespuestas =
      this.respuestas['p9'] > 0 ||
      this.respuestas['p10'] === 'Sí' ||
      this.respuestas['p11'] === 'Sí';

    const esDeteccionPositiva = esPositivoPorPuntaje || esPositivoPorRespuestas;

    // 3. Empaquetar respuestas junto con el score clínico calculado
    const payloadPhq9 = {
      ...this.respuestas,
      puntaje_total: puntajeTotal,
      deteccion: esDeteccionPositiva ? 'Positiva' : 'Negativa',
    };

    try {
      // 4. Obtener el folio activo de la sesión
      const encuestaId = this.storageService.getFolioActivo();
      if (!encuestaId) {
        console.error('No hay folio activo. Redirigiendo a Datos Generales...');
        this.router.navigate(['/datos-generales']);
        return;
      }

      // 5. Guardar en SQLite
      await this.storageService.guardarRespuestasCuestionario(
        encuestaId,
        'phq_9',
        payloadPhq9
      );

      console.log(`PHQ-9 guardado con éxito para el folio: ${encuestaId}`);

      // 6. Imprimir tabla en consola para auditar los reactivos y puntaje
      await this.storageService.imprimirRespuestasEnConsola('phq_9', encuestaId);

      // 7. Quitar foco para prevenir la advertencia aria-hidden y derivar según detección
      (document.activeElement as HTMLElement)?.blur();

      if (esDeteccionPositiva) {
        this.router.navigate(['/asq-modoris']);
      } else {
        this.router.navigate(['/reporte-condicion']);
      }
    } catch (error) {
      console.error('Error al persistir PHQ-9 localmente:', error);
    }
  }
}