import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-contacto-seguimiento',
  templateUrl: './contacto-seguimiento.page.html',
  styleUrls: ['./contacto-seguimiento.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class ContactoSeguimientoPage {
  public contacto = {
    nombre: '',
    telefono: '',
    correo: '',
  };

  public intentoGuardar: boolean = false;
  public encuestaCompletada: boolean = false;

  constructor(private router: Router) {}

  // Verifica si algún campo fue llenado
  private tieneAlgunCampoLleno(): boolean {
    return !!(
      this.contacto.nombre.trim() ||
      this.contacto.telefono.trim() ||
      this.contacto.correo.trim()
    );
  }

  // Valida el error visual solo si el usuario empezó a llenar datos y dejó este campo vacío
  public esInvalido(campo: 'nombre' | 'telefono' | 'correo'): boolean {
    if (!this.intentoGuardar) return false;
    // Si dejó todo en blanco, no hay error (es opcional)
    if (!this.tieneAlgunCampoLleno()) return false;
    
    // Si al menos llenó uno, los vacíos se marcan como error
    return !this.contacto[campo]?.trim();
  }

  public finalizarEncuesta(): void {
    this.intentoGuardar = true;

    const algunoLleno = this.tieneAlgunCampoLleno();

    // Caso A: No llenó nada $\rightarrow$ Pasa directo sin error (es opcional)
    if (!algunoLleno) {
      this.router.navigate(['/splash']);
      return;
    }

    // Caso B: Llenó al menos uno, pero le faltó algún otro $\rightarrow$ Se detiene y marca error
    if (
      !this.contacto.nombre.trim() ||
      !this.contacto.telefono.trim() ||
      !this.contacto.correo.trim()
    ) {
      return;
    }

    // Caso C: Llenó los tres campos correctamente $\rightarrow$ Guarda y muestra la vista de éxito
    console.log('Datos de contacto guardados:', this.contacto);
    this.encuestaCompletada = true;
  }

  public irAVentanaPrincipal(): void {
    this.router.navigate(['/splash'], {
      queryParams: { estado: 'guardando' }
    });
  }
}