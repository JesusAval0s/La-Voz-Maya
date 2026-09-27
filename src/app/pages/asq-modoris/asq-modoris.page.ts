import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

interface OpcionASQ {
  texto: string;
  audioKey: string;
}

@Component({
  selector: 'app-asq-modoris',
  templateUrl: './asq-modoris.page.html',
  styleUrls: ['./asq-modoris.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class AsqModorisPage implements OnDestroy {
  public respuestas = {
    p1_deseado_muerto: '',
    p2_familia_mejor_muerto: '',
    p3_pensado_suicidarse: '',
    p4_intentado_suicidarse: '',
    p4_1_como_lo_hizo: '',
    p4_2_cuando_ocurrio: '',
    p5_pensando_suicidarse_ahora: '',
    p5_1_describa_pensamientos: '',
  };

  public opcionesSiNo: OpcionASQ[] = [
    { texto: 'Sí', audioKey: 'spn_si' },
    { texto: 'No', audioKey: 'spn_no' },
  ];

  public intentoGuardar: boolean = false;
  public audioActivoKey: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  // Grabador directo WAV
  public grabadorActivo: string | null = null;
  public audiosGrabados: { [key: string]: string } = {};
  public audiosBlob: { [key: string]: Blob } = {};
  public reproduciendoGrabacion: string | null = null;
  private audioPlaybackInstance: HTMLAudioElement | null = null;

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioInput: MediaStreamAudioSourceNode | null = null;
  private pcmBuffers: Float32Array[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.detenerAudio();
    this.detenerGrabacionSiExiste();
    this.detenerPlaybackGrabado();
  }

  public reproducirAudioPregunta(numPregunta: string | number): void {
    const key = `pregunta_${numPregunta}`;

    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    this.detenerPlaybackGrabado();

    const audioUrl = `assets/audio/asq_modoris/spn_${numPregunta}_asq_modoris.mp3`;
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
    this.detenerPlaybackGrabado();

    const audioUrl = `assets/audio/asq_modoris/respuestas/${audioKey}.mp3`;
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

  // GRABADOR DIRECTO WAV
  public async toggleGrabarAudio(claveCampo: string): Promise<void> {
    if (this.grabadorActivo === claveCampo) {
      this.finalizarGrabacionWav(claveCampo);
      return;
    }

    this.detenerAudio();
    this.detenerPlaybackGrabado();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.audioInput = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.pcmBuffers = [];

      this.scriptProcessor.onaudioprocess = (e) => {
        const canal = e.inputBuffer.getChannelData(0);
        this.pcmBuffers.push(new Float32Array(canal));
      };

      this.audioInput.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.grabadorActivo = claveCampo;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('No se pudo iniciar grabación:', err);
      this.detenerGrabacionSiExiste();
      this.cdr.detectChanges();
    }
  }

  private finalizarGrabacionWav(claveCampo: string): void {
    if (!this.audioContext) return;

    const sampleRate = this.audioContext.sampleRate;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }
    if (this.audioInput) {
      this.audioInput.disconnect();
      this.audioInput = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.audioContext.close();
    this.audioContext = null;

    let total = 0;
    for (const b of this.pcmBuffers) {
      total += b.length;
    }

    if (total === 0) {
      console.warn('No se recibieron datos de audio');
      this.grabadorActivo = null;
      this.cdr.detectChanges();
      return;
    }

    const merged = new Float32Array(total);
    let offset = 0;
    for (const b of this.pcmBuffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    const wavBlob = this.generarWav(merged, sampleRate);
    this.audiosBlob[claveCampo] = wavBlob;
    this.audiosGrabados[claveCampo] = URL.createObjectURL(wavBlob);

    this.grabadorActivo = null;
    this.cdr.detectChanges();
  }

  private generarWav(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');

    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let index = 44;
    for (let i = 0; i < samples.length; i++, index += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  public escucharGrabacion(claveCampo: string): void {
    if (this.reproduciendoGrabacion === claveCampo) {
      this.detenerPlaybackGrabado();
      return;
    }

    this.detenerPlaybackGrabado();
    this.detenerAudio();

    const url = this.audiosGrabados[claveCampo];
    if (!url) return;

    this.audioPlaybackInstance = new Audio(url);
    this.reproduciendoGrabacion = claveCampo;

    this.audioPlaybackInstance.onended = () => {
      this.reproduciendoGrabacion = null;
      this.cdr.detectChanges();
    };

    this.audioPlaybackInstance.onerror = () => {
      this.reproduciendoGrabacion = null;
      this.cdr.detectChanges();
    };

    this.audioPlaybackInstance.play().catch(() => {
      this.reproduciendoGrabacion = null;
      this.cdr.detectChanges();
    });
  }

  public detenerPlaybackGrabado(): void {
    if (this.audioPlaybackInstance) {
      this.audioPlaybackInstance.pause();
      this.audioPlaybackInstance.currentTime = 0;
      this.audioPlaybackInstance = null;
    }
    this.reproduciendoGrabacion = null;
  }

  public eliminarAudio(claveCampo: string): void {
    if (this.reproduciendoGrabacion === claveCampo) {
      this.detenerPlaybackGrabado();
    }
    if (this.audiosGrabados[claveCampo]) {
      delete this.audiosGrabados[claveCampo];
      delete this.audiosBlob[claveCampo];
    }
  }

  private detenerGrabacionSiExiste(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }
    if (this.audioInput) {
      this.audioInput.disconnect();
      this.audioInput = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.grabadorActivo = null;
  }

  public esInvalida(campo: string): boolean {
    if (!this.intentoGuardar) return false;
    const r = this.respuestas;

    switch (campo) {
      case 'p1':
        return !r.p1_deseado_muerto;
      case 'p2':
        return !r.p2_familia_mejor_muerto;
      case 'p3':
        return !r.p3_pensado_suicidarse;
      case 'p4':
        return !r.p4_intentado_suicidarse;
      case 'p4_1':
        return (
          r.p4_intentado_suicidarse === 'Sí' &&
          !r.p4_1_como_lo_hizo.trim() &&
          !this.audiosGrabados['p4_1']
        );
      case 'p4_2':
        return (
          r.p4_intentado_suicidarse === 'Sí' &&
          !r.p4_2_cuando_ocurrio.trim() &&
          !this.audiosGrabados['p4_2']
        );
      case 'p5':
        return !r.p5_pensando_suicidarse_ahora;
      case 'p5_1':
        return (
          r.p5_pensando_suicidarse_ahora === 'Sí' &&
          !r.p5_1_describa_pensamientos.trim() &&
          !this.audiosGrabados['p5_1']
        );
      default:
        return false;
    }
  }

  public guardarYContinuar(): void {
    this.intentoGuardar = true;

    const obligatorias = ['p1', 'p2', 'p3', 'p4', 'p4_1', 'p4_2', 'p5', 'p5_1'];
    const hayError = obligatorias.some((c) => this.esInvalida(c));

    if (hayError) return;

    this.detenerAudio();
    this.detenerGrabacionSiExiste();
    this.detenerPlaybackGrabado();

    console.log('Resultados ASQ Modoris completados:', this.respuestas);
    console.log('Audios WAV grabados:', this.audiosBlob);

    // Fin del flujo: Navegación a la pantalla final
    this.router.navigate(['/reporte-condicion']);
  }
}