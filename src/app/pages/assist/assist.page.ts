import { Component, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

interface SustanciaItem {
  id: string;
  nombre: string;
  audioKey: string;
}

interface OpcionRespuesta {
  texto: string;
  audioKey: string;
}

@Component({
  selector: 'app-assist',
  templateUrl: './assist.page.html',
  styleUrls: ['./assist.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class AssistPage implements OnDestroy {
  @ViewChild('tableWrapper') tableWrapperRef!: ElementRef<HTMLDivElement>;

  public sustancias: SustanciaItem[] = [
    { id: 'tabaco', nombre: 'Tabaco', audioKey: 'spn_tabaco' },
    { id: 'alcohol', nombre: 'Bebidas alcohólicas', audioKey: 'spn_alcohol' },
    { id: 'cannabis', nombre: 'Cannabis', audioKey: 'spn_cannabis' },
    { id: 'cocaina', nombre: 'Cocaína', audioKey: 'spn_cocaina' },
    { id: 'estimulantes', nombre: 'Estimulantes (Anfetaminas)', audioKey: 'spn_anfetaminas' },
    { id: 'inhalantes', nombre: 'Inhalantes', audioKey: 'spn_inhalantes' },
    { id: 'sedantes', nombre: 'Sedantes o pastillas para dormir', audioKey: 'spn_sedantes' },
    { id: 'alucinogenos', nombre: 'Alucinógenos', audioKey: 'spn_alucinogenos' },
    { id: 'opiaceos', nombre: 'Opiáceos', audioKey: 'spn_opiaceos' },
  ];

  public opcionesQ1: OpcionRespuesta[] = [
    { texto: 'No', audioKey: 'spn_no' },
    { texto: 'Sí', audioKey: 'spn_si' },
  ];

  public opcionesQ2: OpcionRespuesta[] = [
    { texto: 'Nunca', audioKey: 'spn_nunca' },
    { texto: '1 o 2 veces', audioKey: 'spn_1_2_veces' },
    { texto: 'Mensualmente', audioKey: 'spn_mensualmente' },
    { texto: 'Semanalmente', audioKey: 'spn_semanalmente' },
    { texto: 'Diario o casi siempre', audioKey: 'spn_diario_casi' },
  ];

  public opcionesQ3Q4Q5: OpcionRespuesta[] = [
    { texto: 'Nunca', audioKey: 'spn_nunca' },
    { texto: '1 o 2 veces', audioKey: 'spn_1_2_veces' },
    { texto: 'Mensualmente', audioKey: 'spn_mensualmente' },
    { texto: 'Semanalmente', audioKey: 'spn_semanalmente' },
    { texto: 'Diario', audioKey: 'spn_diario' },
  ];

  public opcionesQ6Q7: OpcionRespuesta[] = [
    { texto: 'Nunca', audioKey: 'spn_nunca' },
    { texto: 'Sí, en los últimos 3 meses', audioKey: 'spn_ultimos_3_meses' },
    { texto: 'Sí, pero no en los últimos 3 meses', audioKey: 'spn_no_ultimos_3_meses' },
  ];

  public opcionesQ8: OpcionRespuesta[] = [
    { texto: 'Nunca', audioKey: 'spn_nunca' },
    { texto: 'Sí, en los últimos tres meses', audioKey: 'spn_ultimos_3_meses' },
    { texto: 'Sí, pero no en los últimos tres meses', audioKey: 'spn_no_ultimos_3_meses' },
  ];

  public respuestas = {
    p1: {} as { [key: string]: string },
    p2: {} as { [key: string]: string },
    p3: {} as { [key: string]: string },
    p4: {} as { [key: string]: string },
    p5: {} as { [key: string]: string },
    p6: {} as { [key: string]: string },
    p7: {} as { [key: string]: string },
    p8: 'Nunca',
  };

  public intentoGuardar: boolean = false;
  public audioActivoKey: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.inicializarRespuestas();
  }

  ngOnDestroy(): void {
    this.detenerAudio();
  }

  private inicializarRespuestas(): void {
    for (const s of this.sustancias) {
      this.respuestas.p1[s.id] = 'No';
      this.respuestas.p2[s.id] = '';
      this.respuestas.p3[s.id] = 'Nunca';
      this.respuestas.p4[s.id] = 'Nunca';
      this.respuestas.p5[s.id] = 'Nunca';
      this.respuestas.p6[s.id] = 'Nunca';
      this.respuestas.p7[s.id] = 'Nunca';
    }
  }

  public onChangeQ1(sustanciaId: string): void {
    if (this.respuestas.p1[sustanciaId] === 'Sí') {
      if (!this.respuestas.p2[sustanciaId]) {
        this.respuestas.p2[sustanciaId] = 'Nunca';
      }
      this.respuestas.p6[sustanciaId] = 'Nunca';
      this.respuestas.p7[sustanciaId] = 'Nunca';

      setTimeout(() => {
        if (this.tableWrapperRef?.nativeElement) {
          this.tableWrapperRef.nativeElement.scrollTo({
            left: 140,
            behavior: 'smooth',
          });
        }
      }, 100);
    } else {
      this.respuestas.p2[sustanciaId] = '';
      this.respuestas.p3[sustanciaId] = 'Nunca';
      this.respuestas.p4[sustanciaId] = 'Nunca';
      this.respuestas.p5[sustanciaId] = 'Nunca';
      this.respuestas.p6[sustanciaId] = 'Nunca';
      this.respuestas.p7[sustanciaId] = 'Nunca';
    }
  }

  public get sustanciasConsumoVida(): SustanciaItem[] {
    return this.sustancias.filter((s) => this.respuestas.p1[s.id] === 'Sí');
  }

  public get sustanciasConsumoReciente(): SustanciaItem[] {
    return this.sustancias.filter(
      (s) => this.respuestas.p1[s.id] === 'Sí' && this.respuestas.p2[s.id] && this.respuestas.p2[s.id] !== 'Nunca'
    );
  }

  public get sustanciasConsumoRecienteSinTabaco(): SustanciaItem[] {
    return this.sustanciasConsumoReciente.filter((s) => s.id !== 'tabaco');
  }

  // Métodos de resolución de audio para cada grupo de preguntas
  public getAudioKeyQ2(valor: string): string {
    const item = this.opcionesQ2.find((o) => o.texto === valor);
    return item ? item.audioKey : '';
  }

  public getAudioKeyQ3Q4Q5(valor: string): string {
    const item = this.opcionesQ3Q4Q5.find((o) => o.texto === valor);
    return item ? item.audioKey : '';
  }

  public getAudioKeyQ6Q7(valor: string): string {
    const item = this.opcionesQ6Q7.find((o) => o.texto === valor);
    return item ? item.audioKey : '';
  }

  public getAudioKeyQ8(valor: string): string {
    const item = this.opcionesQ8.find((o) => o.texto === valor);
    return item ? item.audioKey : '';
  }

  public reproducirAudio(identificador: string | number): void {
    const key = identificador.toString().startsWith('spn_')
      ? identificador.toString()
      : `spn_${identificador}_assist`;

    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const audioUrl = `assets/audio/assist/${key}.mp3`;
    this.iniciarAudio(audioUrl, key);
  }

  public reproducirAudioRespuesta(audioKey: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!audioKey) return;

    const key = `respuesta_${audioKey}`;
    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const audioUrl = `assets/audio/assist/respuestas/${audioKey}.mp3`;
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

  public esInvalida(preguntaId: string): boolean {
    if (!this.intentoGuardar) return false;

    if (preguntaId === 'p1_p2') {
      return this.sustancias.some(
        (s) => !this.respuestas.p1[s.id] || (this.respuestas.p1[s.id] === 'Sí' && !this.respuestas.p2[s.id])
      );
    }
    if (preguntaId === 'p3') {
      return this.sustanciasConsumoReciente.some((s) => !this.respuestas.p3[s.id]);
    }
    if (preguntaId === 'p4') {
      return this.sustanciasConsumoReciente.some((s) => !this.respuestas.p4[s.id]);
    }
    if (preguntaId === 'p5') {
      return this.sustanciasConsumoRecienteSinTabaco.some((s) => !this.respuestas.p5[s.id]);
    }
    if (preguntaId === 'p6') {
      return this.sustanciasConsumoVida.some((s) => !this.respuestas.p6[s.id]);
    }
    if (preguntaId === 'p7') {
      return this.sustanciasConsumoVida.some((s) => !this.respuestas.p7[s.id]);
    }
    if (preguntaId === 'p8') {
      return this.sustanciasConsumoVida.length > 0 && !this.respuestas.p8;
    }

    return false;
  }

  public guardarYContinuar(): void {
    this.intentoGuardar = true;

    if (
      this.esInvalida('p1_p2') ||
      this.esInvalida('p3') ||
      this.esInvalida('p4') ||
      this.esInvalida('p5') ||
      this.esInvalida('p6') ||
      this.esInvalida('p7') ||
      this.esInvalida('p8')
    ) {
      return;
    }

    this.detenerAudio();
    console.log('Resultados ASSIST v3.1 completados:', this.respuestas);
    this.router.navigate(['/phq-9']);
  }
}