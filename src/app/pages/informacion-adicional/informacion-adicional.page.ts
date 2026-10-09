import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { StorageService } from '../../core/services/storage.service';

interface OpcionConAudio {
  texto: string;
  audioKey: string;
}

@Component({
  selector: 'app-informacion-adicional',
  templateUrl: './informacion-adicional.page.html',
  styleUrls: ['./informacion-adicional.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class InformacionAdicionalPage implements OnDestroy {
  public respuestas = {
    p1_suicidio_circulo: [] as string[],
    p2_enfermedades: [] as string[],
    p2_otro_texto: '',
    p3_covid: '',
    p4_con_quien_vive: '',
    p5_violencia: [] as string[],
    p5_otro_texto: '',
    p6_relaciones: {
      padre: '',
      madre: '',
      pareja: '',
      hijos: '',
    },
    p7_situacion_economica: '',
    p8_mascotas: '',
    p9_lengua_materna: '',
    p10_uso_lengua: 0,
    p11_frustracion_lengua: 0,
    p12_acude_problema: '',
    p13_pasatiempo: '',
    p14_bebida_energetica: '',
  };

  // Opciones Pregunta 1
  public opcionesP1: OpcionConAudio[] = [
    { texto: 'Padre', audioKey: 'spn_padre' },
    { texto: 'Madre', audioKey: 'spn_madre' },
    { texto: 'Herman@s', audioKey: 'spn_hermanos' },
    { texto: 'Hij@s', audioKey: 'spn_hijos' },
    { texto: 'Prim@s', audioKey: 'spn_primos' },
    { texto: 'Amig@s', audioKey: 'spn_amigos' },
    { texto: 'Pareja', audioKey: 'spn_pareja' },
    { texto: 'Abuelos', audioKey: 'spn_abuelos' },
  ];

  // Opciones Pregunta 2
  public opcionesP2: OpcionConAudio[] = [
    { texto: 'Asma', audioKey: 'spn_asma' },
    { texto: 'Alergias (respiratorias, alimentarias o cutáneas)', audioKey: 'spn_alergias' },
    { texto: 'Sobrepeso u obesidad', audioKey: 'spn_sobrepeso' },
    { texto: 'Problemas de la piel (acné severo, dermatitis, etc.)', audioKey: 'spn_piel' },
    { texto: 'Migraña o dolores de cabeza frecuentes', audioKey: 'spn_migrana' },
    { texto: 'Anemia', audioKey: 'spn_anemia' },
    { texto: 'Problemas de la vista (miopía, astigmatismo, etc.)', audioKey: 'spn_vista' },
    { texto: 'Problemas gastrointestinales (gastritis, colitis, etc.)', audioKey: 'spn_gastrointestinal' },
    { texto: 'Ninguno', audioKey: 'spn_ninguno' },
    { texto: 'Otro', audioKey: 'spn_otro' },
  ];

  // Opciones Pregunta 4
  public opcionesP4: OpcionConAudio[] = [
    { texto: 'Solo(a)', audioKey: 'spn_solo' },
    { texto: 'Con la familia (padres/hermanos)', audioKey: 'spn_con_padres_hermanos' },
    { texto: 'Con la familia (pareja/hijos)', audioKey: 'spn_con_pareja_hijos' },
    { texto: 'Con la pareja (sin hijos)', audioKey: 'spn_con_pareja_sin_hijos' },
    { texto: 'Con amigos o compañeros de casa', audioKey: 'spn_con_amigos' },
    { texto: 'Otro', audioKey: 'spn_otro_vive' },
  ];

  // Opciones Pregunta 5
  public opcionesP5: OpcionConAudio[] = [
    { texto: 'Física', audioKey: 'spn_violencia_fisica' },
    { texto: 'Psicológica/Emocional', audioKey: 'spn_violencia_psicologica' },
    { texto: 'Económica', audioKey: 'spn_violencia_economica' },
    { texto: 'Sexual', audioKey: 'spn_violencia_sexual' },
    { texto: 'Ninguna de las anteriores', audioKey: 'spn_ninguna_violencia' },
    { texto: 'Otra', audioKey: 'spn_otra_violencia' },
  ];

  // Opciones Pregunta 6
  public opcionesRelacion: OpcionConAudio[] = [
    { texto: 'Muy Buena', audioKey: 'spn_muy_buena' },
    { texto: 'Buena', audioKey: 'spn_buena' },
    { texto: 'Regular', audioKey: 'spn_regular' },
    { texto: 'Mala', audioKey: 'spn_mala' },
    { texto: 'Muy Mala', audioKey: 'spn_muy_mala' },
    { texto: 'No Aplica', audioKey: 'spn_no_aplica' },
  ];

  // Opciones Pregunta 7
  public opcionesP7: OpcionConAudio[] = [
    { texto: 'Estable', audioKey: 'spn_estable' },
    { texto: 'Con dificultades', audioKey: 'spn_con_dificultades' },
    { texto: 'Crítica', audioKey: 'spn_critica' },
  ];

  // Opciones Pregunta 12
  public opcionesP12: OpcionConAudio[] = [
    { texto: 'Familia', audioKey: 'spn_acude_familia' },
    { texto: 'Amig@s', audioKey: 'spn_acude_amigos' },
    { texto: 'Profesor@s', audioKey: 'spn_acude_profesores' },
    { texto: 'Pareja', audioKey: 'spn_acude_pareja' },
    { texto: 'Profesionales de la Salud Mental (psicólogo o psiquiatra)', audioKey: 'spn_acude_profesionales' },
    { texto: 'Asistentes de Inteligencia Artificial (ChatGPT, Gemini, otros)', audioKey: 'spn_acude_ia' },
    { texto: 'No acudo a nadie', audioKey: 'spn_acude_nadie' },
    { texto: 'Otro', audioKey: 'spn_acude_otro' },
  ];

  // Opciones Pregunta 13
  public opcionesP13: OpcionConAudio[] = [
    { texto: 'Videojuegos (en línea o de consola)', audioKey: 'spn_videojuegos' },
    { texto: 'Escuchar música o podcasts', audioKey: 'spn_musica_podcasts' },
    { texto: 'Ver series, películas, etc', audioKey: 'spn_series_peliculas' },
    { texto: 'Salir con amigos o pareja', audioKey: 'spn_salir_amigos' },
    { texto: 'Practicar algún deporte o actividad física', audioKey: 'spn_deporte' },
    { texto: 'Crear contenido (grabar videos, música, etc)', audioKey: 'spn_crear_contenido' },
    { texto: 'Estudiar o capacitarce', audioKey: 'spn_estudiar' },
    { texto: 'Participar en voluntariados o causas sociales', audioKey: 'spn_voluntariado' },
    { texto: 'Actividades religiosas', audioKey: 'spn_actividades_religiosas' },
    { texto: 'Descansar', audioKey: 'spn_descansar' },
    { texto: 'No tengo pasatiempo', audioKey: 'spn_sin_pasatiempo' },
    { texto: 'Otro', audioKey: 'spn_pasatiempo_otro' },
  ];

  public listaLenguas: string[] = [
    'Español', 'Maya', 'Náhuatl', 'Mixteco', 'Zapoteco', 'Tzeltal', 'Tzotzil', 'Otomi',
    'Purépecha', 'Mazateco', 'Huichol', 'Chol', 'Tojolabal', 'Mixe', 'Chinanteco', 'Amuzgo',
    'Tlapaneco', 'Tepehuano', 'Totonaca', 'Popoloca', 'Mazahua', 'Ixcateco', 'Chontal de Oaxaca',
    'Cuicateco', 'Mixe de la Sierra', 'Náhuatl de Guerrero', 'Náhuatl de Veracruz', 'Náhuatl de Puebla',
    'Náhuatl de San Luis Potosí', 'Xinca (considerada extinta)', 'Kikapú', 'Rarámuri (Tarahumara)',
    'Seri (Comcaac)', 'Yaqui (Yoeme)', 'Pápago (Tohono O\'odham)', 'Cora (Náyári)', 'Huichol (Wixárika)',
    'Tepehuano del Norte', 'Tepehuano del Sur', 'Tarahumara (Rarámuri)', 'Mayo (Yaqui)',
    'Pima Bajo (O\'odham)', 'Otomí de la Sierra', 'Otomí de Toluca', 'Otomí de Querétaro',
    'Otomí de México', 'Totonaca de la Sierra', 'Totonaca de la Costa', 'Totonaca del Norte',
    'Totonaca del Sur', 'Chinanteco de la Sierra', 'Chinanteco de la Costa', 'Mixteco del Norte',
    'Mixteco del Sur', 'Zapoteco del Valle Central', 'Zapoteco del Istmo', 'Zapoteco de la Sierra Norte',
    'Zapoteco de la Sierra Sur', 'Zapoteco del Valle de Oaxaca', 'Mazateco del Norte', 'Mazateco del Sur',
    'Tlapaneco del Norte', 'Tlapaneco del Sur', 'Mixe del Norte', 'Mixe del Sur', 'Chontal de Tabasco',
    'Popoloca de Puebla', 'Popoloca de Veracruz', 'Popoloca de Guerrero', 'Otra'
  ];

  public intentoGuardar: boolean = false;
  public audioActivoKey: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  // Grabador directo (Solo operará en p2 y p5)
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
    private cdr: ChangeDetectorRef,
    private storageService: StorageService
  ) {}

  ngOnDestroy(): void {
    this.detenerAudio();
    this.detenerGrabacionSiExiste();
    this.detenerPlaybackGrabado();
  }

  public reproducirAudioPregunta(numPregunta: number): void {
    const key = `pregunta_${numPregunta}`;
    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    this.detenerPlaybackGrabado();

    const audioUrl = `assets/audio/informacion_adicional/spn_${numPregunta}_informacion_adicional.mp3`;
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

    const audioUrl = `assets/audio/informacion_adicional/respuestas/${audioKey}.mp3`;
    this.iniciarAudio(audioUrl, key);
  }

  public getAudioKeyRelacion(valor: string): string {
    const encontrada = this.opcionesRelacion.find((o) => o.texto === valor);
    return encontrada ? encontrada.audioKey : '';
  }

  public getAudioKeyP4(): string {
    const encontrada = this.opcionesP4.find((o) => o.texto === this.respuestas.p4_con_quien_vive);
    return encontrada ? encontrada.audioKey : '';
  }

  public getAudioKeyP12(): string {
    const encontrada = this.opcionesP12.find((o) => o.texto === this.respuestas.p12_acude_problema);
    return encontrada ? encontrada.audioKey : '';
  }

  public getAudioKeyP13(): string {
    const encontrada = this.opcionesP13.find((o) => o.texto === this.respuestas.p13_pasatiempo);
    return encontrada ? encontrada.audioKey : '';
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

  public toggleMultiple(campo: 'p1_suicidio_circulo' | 'p2_enfermedades' | 'p5_violencia', valor: string): void {
    const lista = this.respuestas[campo];

    if (valor === 'Ninguno' || valor === 'Ninguna de las anteriores') {
      this.respuestas[campo] = [valor];
      if (campo === 'p2_enfermedades') this.respuestas.p2_otro_texto = '';
      if (campo === 'p5_violencia') this.respuestas.p5_otro_texto = '';
      return;
    }

    const indexNinguno = lista.findIndex((item) => item.startsWith('Ningun'));
    if (indexNinguno > -1) {
      lista.splice(indexNinguno, 1);
    }

    const idx = lista.indexOf(valor);
    if (idx > -1) {
      lista.splice(idx, 1);
    } else {
      lista.push(valor);
    }
  }

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
    view.setUint16(22, 1, true);
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

  public esFamiliarInvalido(familiar: 'padre' | 'madre' | 'pareja' | 'hijos'): boolean {
    if (!this.intentoGuardar) return false;
    return !this.respuestas.p6_relaciones[familiar];
  }

  public esInvalida(pregunta: string): boolean {
    if (!this.intentoGuardar) return false;
    const r = this.respuestas;

    switch (pregunta) {
      case 'p3':
        return !r.p3_covid;
      case 'p4':
        return !r.p4_con_quien_vive;
      case 'p6': {
        const rel = r.p6_relaciones;
        return !rel.padre || !rel.madre || !rel.pareja || !rel.hijos;
      }
      case 'p7':
        return !r.p7_situacion_economica;
      case 'p8':
        return !r.p8_mascotas;
      case 'p9':
        return !r.p9_lengua_materna;
      case 'p12':
        return !r.p12_acude_problema;
      case 'p13':
        return !r.p13_pasatiempo;
      case 'p14':
        return !r.p14_bebida_energetica;
      default:
        return false;
    }
  }

  public async guardarYContinuar(): Promise<void> {
    this.intentoGuardar = true;

    const obligatorias = ['p3', 'p4', 'p6', 'p7', 'p8', 'p9', 'p12', 'p13', 'p14'];
    const hayError = obligatorias.some((p) => this.esInvalida(p));

    if (hayError) return;

    this.detenerAudio();
    this.detenerGrabacionSiExiste();
    this.detenerPlaybackGrabado();

    try {
      // Generar un ID o folio único para la encuesta (puedes ajustarlo según tu lógica de folios)
      const encuestaId = `FOLIO_${Date.now()}`;

      // 1. Guardar las respuestas estructuradas en la tabla SQLite de respuestas
      await this.storageService.guardarRespuestasCuestionario(
        encuestaId,
        'informacion_adicional',
        this.respuestas
      );

      // 2. Guardar los audios de la pregunta 2 ('p2') si existen localmente
      if (this.audiosBlob['p2']) {
        await this.storageService.guardarAudioLocal(encuestaId, 'p2_enfermedad_otro', this.audiosBlob['p2']);
      }

      // 3. Guardar los audios de la pregunta 5 ('p5') si existen localmente
      if (this.audiosBlob['p5']) {
        await this.storageService.guardarAudioLocal(encuestaId, 'p5_violencia_otra', this.audiosBlob['p5']);
      }

      console.log('Información Adicional guardada localmente con éxito en SQLite y Filesystem.');
      this.router.navigate(['/habitos-alimentacion']);
    } catch (error) {
      console.error('Error al persistir la información adicional de forma local:', error);
    }
  }
}