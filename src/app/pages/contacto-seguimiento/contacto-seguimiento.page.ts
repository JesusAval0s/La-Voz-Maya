import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { SqliteStorageService } from '../../core/services/sqlite-storage.service'; 


@Component({
  selector: 'app-contacto-seguimiento',
  templateUrl: './contacto-seguimiento.page.html',
  styleUrls: ['./contacto-seguimiento.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class ContactoSeguimientoPage implements OnInit{
  public contacto = {
    nombre: '',
    telefono: '',
    correo: '',
  };

  public intentoGuardar: boolean = false;
  public encuestaCompletada: boolean = false;
  private folioSesion: string | null = null;

  constructor(
    private router: Router,
    private storageService: SqliteStorageService
    ) {}

  ngOnInit(): void {
    this.folioSesion = this.storageService.getFolioActivo();
    if (!this.folioSesion) {
      console.warn('No se detectó un folio activo. Redirigiendo a Datos Generales...');
      this.router.navigate(['/datos-generales']);
    }
  }

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
public async finalizarEncuesta(): Promise<void> {
    this.intentoGuardar = true;

    const algunoLleno = this.tieneAlgunCampoLleno();
    const folio = this.folioSesion || this.storageService.getFolioActivo();

    if (!folio) {
      console.error('No hay folio activo.');
      this.router.navigate(['/datos-generales']);
      return;
    }

    // Caso A: No llenó nada (es opcional) -> Guarda registro de no proporcionado y finaliza
    if (!algunoLleno) {
      try {
        await this.storageService.guardarRespuestasCuestionario(
          folio,
          'contacto_seguimiento',
          { seguimiento_solicitado: false, contacto: 'No proporcionado' }
        );
        console.log(`Cierre de encuesta sin contacto para folio: ${folio}`);
        await this.storageService.imprimirRespuestasEnConsola('contacto_seguimiento', folio);

        // Limpiar la sesión actual y redirigir
        this.storageService.limpiarFolioActivo();
        (document.activeElement as HTMLElement)?.blur();
        this.router.navigate(['/splash'], {
          queryParams: { estado: 'guardando' }
        });
      } catch (error) {
        console.error('Error al guardar cierre sin contacto:', error);
      }
      return;
    }

    // Caso B: Llenó al menos uno, pero le faltó completar los otros -> Marca error en pantalla
    if (
      !this.contacto.nombre.trim() ||
      !this.contacto.telefono.trim() ||
      !this.contacto.correo.trim()
    ) {
      console.warn('Debe completar todos los datos de contacto o dejarlos todos en blanco.');
      return;
    }

    // Caso C: Llenó los tres campos correctamente -> Persiste en SQLite y muestra la vista de éxito
    try {
      const payloadContacto = {
        seguimiento_solicitado: true,
        nombre: this.contacto.nombre.trim(),
        telefono: this.contacto.telefono.trim(),
        correo: this.contacto.correo.trim()
      };

      await this.storageService.guardarRespuestasCuestionario(
        folio,
        'contacto_seguimiento',
        payloadContacto
      );

      console.log(`Contacto de seguimiento guardado con éxito para folio: ${folio}`);
      await this.storageService.imprimirRespuestasEnConsola('contacto_seguimiento', folio);

      (document.activeElement as HTMLElement)?.blur();
      this.encuestaCompletada = true;
    } catch (error) {
      console.error('Error al persistir contacto de seguimiento:', error);
    }
  }

  public irAVentanaPrincipal(): void {
    // Al salir de la pantalla de confirmación, liberamos el folio activo para la siguiente prueba
    this.storageService.limpiarFolioActivo();
    (document.activeElement as HTMLElement)?.blur();
    this.router.navigate(['/splash'], {
      queryParams: { estado: 'guardando' }
    });
  }
  
}