import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-datos-generales',
  templateUrl: './datos-generales.page.html',
  styleUrls: ['./datos-generales.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class DatosGeneralesPage implements OnDestroy {
  public formulario = {
    nombreCompleto: '',
    telefonoPersonal: '',
    telefonoEmergencia: '',
    correoElectronico: '',
    edad: '',
    genero: '',
    estadoCivil: '',
    tieneHijos: 'No',
    cuantosHijos: 0,
    municipio: '',
    direccionCompleta: '',
    tiempoVivirYucatan: '',
  };

  public intentoGuardar: boolean = false;
  public audioActivoKey: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  public municipiosYucatan: string[] = [
    'Abalá', 'Acanceh', 'Akil', 'Baca', 'Bokobá', 'Buctzotz', 'Cacalchén', 'Calotmul',
    'Cansahcab', 'Cantamayec', 'Celestún', 'Cenotillo', 'Conkal', 'Cuncunul', 'Cuzamá',
    'Chacsinkín', 'Chankom', 'Chapab', 'Chemax', 'Chicxulub Pueblo', 'Chichimilá',
    'Chikindzonot', 'Chocholá', 'Chumayel', 'Dzán', 'Dzemul', 'Dzidzantún', 'Dzilam de Bravo',
    'Dzilam González', 'Dzitás', 'Dzoncauich', 'Espita', 'Halachó', 'Hocabá', 'Hoctún',
    'Homún', 'Huhí', 'Hunucmá', 'Ixil', 'Izamal', 'Kanasín', 'Kantunil', 'Kaua', 'Kinchil',
    'Kopomá', 'Mama', 'Maní', 'Maxcanú', 'Mayapán', 'Mérida', 'Mocochá', 'Motul', 'Muna',
    'Muxupip', 'Opichén', 'Oxkutzcab', 'Panabá', 'Peto', 'Progreso', 'Quintana Roo',
    'Río Lagartos', 'Sacalum', 'Samahil', 'Sanahcat', 'San Felipe', 'Santa Elena', 'Seyé',
    'Sinanché', 'Sotuta', 'Sucilá', 'Sudzal', 'Suma', 'Tahdziú', 'Tahmek', 'Teabo', 'Tecoh',
    'Tekal de Venegas', 'Tekantó', 'Tekax', 'Tekit', 'Tekom', 'Telchac Pueblo', 'Telchac Puerto',
    'Temax', 'Temozón', 'Tepakán', 'Tetiz', 'Teya', 'Ticul', 'Timucuy', 'Tinum',
    'Tixcacalcupul', 'Tixkokob', 'Tixmehuac', 'Tixpéhual', 'Tizimín', 'Tunkás', 'Tzucacab',
    'Uayma', 'Ucú', 'Umán', 'Valladolid', 'Xocchel', 'Yaxcabá', 'Yaxkukul', 'Yobaín'
  ];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private storageService: StorageService
  ) {}

  ngOnDestroy(): void {
    this.detenerAudio();
  }

  public campoInvalido(campo: string): boolean {
    if (!this.intentoGuardar) return false;

    const f = this.formulario;
    switch (campo) {
      case 'nombreCompleto':
        return !f.nombreCompleto || f.nombreCompleto.trim().length < 3;
      case 'telefonoPersonal':
        return !f.telefonoPersonal || f.telefonoPersonal.length < 10;
      case 'telefonoEmergencia':
        return !f.telefonoEmergencia || f.telefonoEmergencia.length < 10;
      case 'correoElectronico': {
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !f.correoElectronico || !regexEmail.test(f.correoElectronico.trim());
      }
      case 'edad': {
        const numEdad = parseInt(f.edad, 10);
        return !f.edad || isNaN(numEdad) || numEdad < 1 || numEdad > 125;
      }
      case 'genero':
        return !f.genero;
      case 'estadoCivil':
        return !f.estadoCivil;
      case 'municipio':
        return !f.municipio;
      case 'direccionCompleta':
        return !f.direccionCompleta || f.direccionCompleta.trim().length < 5;
      case 'tiempoVivirYucatan':
        return !f.tiempoVivirYucatan || f.tiempoVivirYucatan.trim() === '';
      default:
        return false;
    }
  }

  public validarSoloNumeros(campo: 'telefonoPersonal' | 'telefonoEmergencia' | 'edad' | 'cuantosHijos' | 'tiempoVivirYucatan', evento: Event): void {
    const input = evento.target as HTMLInputElement;
    let valor = input.value.replace(/[^0-9]/g, '');

    if (campo === 'telefonoPersonal' || campo === 'telefonoEmergencia') {
      if (valor.length > 10) valor = valor.slice(0, 10);
      this.formulario[campo] = valor;
    } else if (campo === 'edad') {
      if (valor.length > 3) valor = valor.slice(0, 3);
      this.formulario.edad = valor;
    } else if (campo === 'cuantosHijos') {
      if (valor.length > 2) valor = valor.slice(0, 2);
      this.formulario.cuantosHijos = valor === '' ? 0 : parseInt(valor, 10);
    } else if (campo === 'tiempoVivirYucatan') {
      if (valor.length > 3) valor = valor.slice(0, 3);
      this.formulario.tiempoVivirYucatan = valor;
    }
  }

  public onTieneHijosChange(): void {
    if (this.formulario.tieneHijos === 'No') {
      this.formulario.cuantosHijos = 0;
    }
  }

  public getAudioKeyEstadoCivil(): string {
    switch (this.formulario.estadoCivil) {
      case 'Solter@':
        return 'spn_solter@';
      case 'Casad@':
        return 'spn_casad@';
      case 'Unión libre':
        return 'spn_union_libre';
      default:
        return '';
    }
  }

  public reproducirAudioCampo(nombreAudio: string): void {
    const key = `pregunta_${nombreAudio}`;

    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const audioUrl = `assets/audio/datos_generales/spn_${nombreAudio}.mp3`;
    this.iniciarAudio(audioUrl, key);
  }

  public reproducirAudioRespuestaSeleccionada(): void {
    const audioName = this.getAudioKeyEstadoCivil();
    if (!audioName) return;

    const key = `respuesta_${audioName}`;

    if (this.audioActivoKey === key) {
      this.detenerAudio();
      return;
    }

    this.detenerAudio();
    const audioUrl = `assets/audio/datos_generales/respuestas/${audioName}.mp3`;
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

  public async validarFormulario(): Promise<void> {
    this.intentoGuardar = true;

    const obligatorios = [
      'nombreCompleto',
      'telefonoPersonal',
      'telefonoEmergencia',
      'correoElectronico',
      'edad',
      'genero',
      'estadoCivil',
      'municipio',
      'direccionCompleta',
      'tiempoVivirYucatan'
    ];

    const hayError = obligatorios.some(campo => this.campoInvalido(campo));

    if (hayError) {
      return;
    }

    this.detenerAudio();

    try {
      // Generarando ID para folio
      const encuestaId = `FOLIO_${Date.now()}`;

      // Guardando los datos generales estructurados en la base de datos local SQLite
      await this.storageService.guardarRespuestasCuestionario(
        encuestaId,
        'datos_generales',
        this.formulario
      );

      console.log('Datos Generales guardados localmente con éxito en SQLite.');
      this.router.navigate(['/informacion-adicional']);
    } catch (error) {
      console.error('Error al persistir los datos generales localmente:', error);
    }
  }

  
    // Método puente para emparejar la llamada del HTML con la validación existente

  public guardarYContinuar(): void {
    this.validarFormulario();
  }
}