import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

interface OpcionSueno {
  texto: string;
  audioKey: string;
}

interface PreguntaSueno {
  id: 'p1' | 'p2' | 'p3' | 'p4';
  campo: string;
  num: number;
  texto: string;
  opciones: OpcionSueno[];
}

@Component({
  selector: 'app-habitos-sueno',
  templateUrl: './habitos-sueno.page.html',
  styleUrls: ['./habitos-sueno.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class HabitosSuenoPage implements OnDestroy {
  public respuestas = {
    p1_horas_dormidas: '',
    p2_trastornos_sueno: '',
    p3_medicamento_dormir: '',
    p4_despertares_nocturnos: '',
  };

  public opcionesSiNo: OpcionSueno[] = [
    { texto: 'Sí', audioKey: 'spn_si' },
    { texto: 'No', audioKey: 'spn_no' },
  ];

  public preguntas: PreguntaSueno[] = [
    {
      id: 'p1',
      campo: 'p1_horas_dormidas',
      num: 1,
      texto: 'En las últimas dos semanas ¿Cuántas horas ha dormido por día?',
      opciones: [
        { texto: 'Menos de 4 horas', audioKey: 'spn_menos_4_horas' },
        { texto: 'Entre 4 y 6 horas', audioKey: 'spn_entre_4_6_horas' },
        { texto: 'Entre 6 y 8 horas', audioKey: 'spn_entre_6_8_horas' },
        { texto: 'Más de 8 horas', audioKey: 'spn_mas_8_horas' },
      ],
    },
    {
      id: 'p2',
      campo: 'p2_trastornos_sueno',
      num: 2,
      texto: 'En las últimas dos semanas ¿ha tenido pesadillas, terrores nocturnos, dolor en la mandíbula (bruxismo) y/o parálisis del sueño?',
      opciones: this.opcionesSiNo,
    },
    {
      id: 'p3',
      campo: 'p3_medicamento_dormir',
      num: 3,
      texto: 'En las últimas dos semanas ¿Ha consumido algún medicamento para poder dormir?',
      opciones: this.opcionesSiNo,
    },
    {
      id: 'p4',
      campo: 'p4_despertares_nocturnos',
      num: 4,
      texto: 'Durante su jornada de sueño ¿suele despertarse en una o varias ocasiones?',
      opciones: this.opcionesSiNo,
    },
  ];

  public intentoGuardar: boolean = false;
  public audioActivoKey: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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
    const audioUrl = `assets/audio/habitos_sueno/spn_${numPregunta}_habitos_sueno.mp3`;
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
    const audioUrl = `assets/audio/habitos_sueno/respuestas/${audioKey}.mp3`;
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

  public esInvalida(pregunta: string): boolean {
    if (!this.intentoGuardar) return false;
    const r = this.respuestas;

    switch (pregunta) {
      case 'p1':
        return !r.p1_horas_dormidas;
      case 'p2':
        return !r.p2_trastornos_sueno;
      case 'p3':
        return !r.p3_medicamento_dormir;
      case 'p4':
        return !r.p4_despertares_nocturnos;
      default:
        return false;
    }
  }

  public guardarYContinuar(): void {
    this.intentoGuardar = true;

    const obligatorias = ['p1', 'p2', 'p3', 'p4'];
    const hayError = obligatorias.some((p) => this.esInvalida(p));

    if (hayError) return;

    this.detenerAudio();
    console.log('Hábitos de Sueño completados:', this.respuestas);
    this.router.navigate(['/actividad-fisica']);
  }
}