import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

interface OpcionAlimentacion {
  texto: string;
  audioKey: string;
}

interface PreguntaAlimentacion {
  id: 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
  campo: string;
  num: number;
  texto: string;
  opciones: OpcionAlimentacion[];
}

@Component({
  selector: 'app-habitos-alimentacion',
  templateUrl: './habitos-alimentacion.page.html',
  styleUrls: ['./habitos-alimentacion.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class HabitosAlimentacionPage implements OnDestroy {
  public respuestas = {
    p1_emociones_alimentacion: '',
    p2_comido_mas: '',
    p3_perdido_apetito: '',
    p4_come_sin_hambre: '',
    p5_sentimiento_despues: '',
  };

  public opcionesSiNoNoAplica: OpcionAlimentacion[] = [
    { texto: 'Si', audioKey: 'spn_si' },
    { texto: 'No', audioKey: 'spn_no' },
    { texto: 'No Aplica', audioKey: 'spn_no_aplica' },
  ];

  public preguntas: PreguntaAlimentacion[] = [
    {
      id: 'p1',
      campo: 'p1_emociones_alimentacion',
      num: 1,
      texto: 'Cuando experimentas emociones intensas (estrés, ansiedad o tristeza), tu alimentación suele:',
      opciones: [
        { texto: 'Aumentar', audioKey: 'spn_aumentar' },
        { texto: 'Disminuir', audioKey: 'spn_disminuir' },
        { texto: 'No cambiar', audioKey: 'spn_no_cambiar' },
      ],
    },
    {
      id: 'p2',
      campo: 'p2_comido_mas',
      num: 2,
      texto: '¿En las últimas dos semanas has comido más de lo habitual debido a tu estado emocional?',
      opciones: this.opcionesSiNoNoAplica,
    },
    {
      id: 'p3',
      campo: 'p3_perdido_apetito',
      num: 3,
      texto: '¿En las últimas dos semanas has perdido el apetito debido a tu estado emocional?',
      opciones: this.opcionesSiNoNoAplica,
    },
    {
      id: 'p4',
      campo: 'p4_come_sin_hambre',
      num: 4,
      texto: 'Cuando te sientes ansioso(a), estresado(a) o triste, ¿comes aunque no tengas hambre física?',
      opciones: this.opcionesSiNoNoAplica,
    },
    {
      id: 'p5',
      campo: 'p5_sentimiento_despues',
      num: 5,
      texto: 'Después de comer por motivos emocionales, ¿cómo te sientes generalmente?',
      opciones: [
        { texto: 'Mejor', audioKey: 'spn_mejor' },
        { texto: 'Igual que antes', audioKey: 'spn_igual_que_antes' },
        { texto: 'Peor', audioKey: 'spn_peor' },
        { texto: 'Con culpa o malestar', audioKey: 'spn_con_culpa' },
      ],
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
    const audioUrl = `assets/audio/habitos_alimentacion/spn_${numPregunta}_habitos_alimentacion.mp3`;
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
    const audioUrl = `assets/audio/habitos_alimentacion/respuestas/${audioKey}.mp3`;
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
        return !r.p1_emociones_alimentacion;
      case 'p2':
        return !r.p2_comido_mas;
      case 'p3':
        return !r.p3_perdido_apetito;
      case 'p4':
        return !r.p4_come_sin_hambre;
      case 'p5':
        return !r.p5_sentimiento_despues;
      default:
        return false;
    }
  }

  public guardarYContinuar(): void {
    this.intentoGuardar = true;

    const obligatorias = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const hayError = obligatorias.some((p) => this.esInvalida(p));

    if (hayError) return;

    this.detenerAudio();
    console.log('Hábitos de Alimentación completados:', this.respuestas);
    this.router.navigate(['/habitos-sueno']);
  }
}