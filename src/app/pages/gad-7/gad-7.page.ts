import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

interface OpcionGad7 {
  texto: string;
  audioKey: string;
}

interface PreguntaGad7 {
  id: string;
  num: number;
  texto: string;
}

@Component({
  selector: 'app-gad-7',
  templateUrl: './gad-7.page.html',
  styleUrls: ['./gad-7.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class Gad7Page implements OnDestroy {
  public respuestas: { [key: string]: string } = {
    p1_nervioso: '',
    p2_controlar_preocupacion: '',
    p3_preocuparse_demasiado: '',
    p4_problemas_relajarse: '',
    p5_dificil_permanecer_sentado: '',
    p6_irritarse_facilidad: '',
    p7_miedo_algo_terrible: '',
  };

  public opcionesRespuesta: OpcionGad7[] = [
    { texto: 'No', audioKey: 'spn_no' },
    { texto: 'Algunos días', audioKey: 'spn_algunos_dias' },
    { texto: 'Más de la mitad de los días', audioKey: 'spn_mas_mitad_dias' },
    { texto: 'Casi todos los días', audioKey: 'spn_casi_todos_dias' },
  ];

  public listaPreguntas: PreguntaGad7[] = [
    { id: 'p1_nervioso', num: 1, texto: 'Sentirse nervioso/a, angustiado/a o muy tenso/a' },
    { id: 'p2_controlar_preocupacion', num: 2, texto: 'Ser incapaz de dejar de preocuparse o de controlar la preocupación' },
    { id: 'p3_preocuparse_demasiado', num: 3, texto: 'Preocuparse demasiado por diferentes cuestiones' },
    { id: 'p4_problemas_relajarse', num: 4, texto: 'Tener problemas para relajarse' },
    { id: 'p5_dificil_permanecer_sentado', num: 5, texto: 'Estar tan inquieto/a que le resulta difícil permanecer sentado/a' },
    { id: 'p6_irritarse_facilidad', num: 6, texto: 'Enfadarse o irritarse con facilidad' },
    { id: 'p7_miedo_algo_terrible', num: 7, texto: 'Sentir miedo de que algo terrible pueda ocurrir' },
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
    const audioUrl = `assets/audio/gad_7/spn_${numPregunta}_gad_7.mp3`;
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
    const audioUrl = `assets/audio/gad_7/respuestas/${audioKey}.mp3`;
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
    return !this.respuestas[idCampo];
  }

  public guardarYContinuar(): void {
    this.intentoGuardar = true;

    const hayIncompletas = this.listaPreguntas.some((p) => this.esInvalida(p.id));
    if (hayIncompletas) {
      return;
    }

    this.detenerAudio();
    console.log('Resultados GAD-7 completados:', this.respuestas);
    this.router.navigate(['/assist']);
  }
}