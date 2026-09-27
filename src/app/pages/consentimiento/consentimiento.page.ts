import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-consentimiento',
  templateUrl: './consentimiento.page.html',
  styleUrls: ['./consentimiento.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class ConsentimientoPage implements OnDestroy {
  public respuestaSeleccionada: 'SI' | 'NO' | null = null;
  public tieneError: boolean = false;
  public reproduciendoAudio: boolean = false;

  private currentAudio: HTMLAudioElement | null = null;

  constructor(private router: Router) {}

  ngOnDestroy(): void {
    this.detenerAudio();
  }

  public reproducirAudioConsentimiento(): void {
    if (this.reproduciendoAudio) {
      this.detenerAudio();
      return;
    }

    const audioUrl = 'assets/audio/consentimiento_informado/spn_consentimiento_informado.mp3';

    try {
      this.detenerAudio();
      this.currentAudio = new Audio(audioUrl);
      this.reproduciendoAudio = true;

      this.currentAudio.onended = () => {
        this.reproduciendoAudio = false;
      };

      this.currentAudio.onerror = () => {
        console.warn('Archivo de audio no encontrado en:', audioUrl);
        this.reproduciendoAudio = false;
      };

      this.currentAudio.play().catch(() => {
        this.reproduciendoAudio = false;
      });
    } catch {
      this.reproduciendoAudio = false;
    }
  }

  private detenerAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.reproduciendoAudio = false;
  }

  public seleccionar(opcion: 'SI' | 'NO'): void {
    this.respuestaSeleccionada = opcion;
    this.tieneError = false;
  }

  public validarRespuesta(): void {
    if (!this.respuestaSeleccionada) {
      this.tieneError = true;
      return;
    }

    this.detenerAudio();

    if (this.respuestaSeleccionada === 'SI') {
      this.router.navigate(['/datos-generales']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
