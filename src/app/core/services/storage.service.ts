import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface CuestionarioRegistro {
  id: string; // Folio de 8 dígitos único
  fecha: string;
  nombreEncuestado: string;
  datosCompletos: any;
  estadoSincronizacion: 'sincronizado' | 'local' | 'subiendo' | 'error';
}

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private STORAGE_KEY = 'la_voz_maya_registros_memoria';

  constructor() {}

  // Guarda el cuestionario como un archivo físico individual en la carpeta del dispositivo
  public async guardarCuestionarioEnCarpetaDownloads(
    datosEvaluacion: any,
    nombrePersona: string
  ): Promise<string> {
    const timestamp = Date.now();
    const idUnico = timestamp.toString().slice(-8);
    const fechaActual = new Date().toLocaleDateString('es-MX');

    const objetoGuardar: CuestionarioRegistro = {
      id: idUnico,
      fecha: fechaActual,
      nombreEncuestado: nombrePersona || 'Anónimo',
      datosCompletos: datosEvaluacion,
      estadoSincronizacion: 'local',
    };

    const nombreArchivo = `cuestionario_${idUnico}.json`;

    try {
      // Intenta guardar en la carpeta "La Voz Maya" dentro de Documentos/Downloads del dispositivo
      await Filesystem.writeFile({
        path: `La Voz Maya/${nombreArchivo}`,
        data: JSON.stringify(objetoGuardar, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      console.log(`Archivo físico guardado con éxito: La Voz Maya/${nombreArchivo}`);
    } catch (error) {
      console.warn('Aviso: El almacenamiento en archivos físicos requiere ejecución nativa (Android/iOS). Usando respaldo local en memoria.');
    }

    // Guarda una copia en el listado de memoria para que la interfaz la muestre de inmediato
    const lista = await this.obtenerCuestionariosLocales();
    lista.unshift(objetoGuardar);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lista));

    return idUnico;
  }

  // Obtiene los cuestionarios locales para la vista de la nube
  public async obtenerCuestionariosLocales(): Promise<CuestionarioRegistro[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    
    // Registros iniciales de prueba si la lista está vacía
    return [
      { id: '00000001', fecha: '16/09/2026', nombreEncuestado: 'Jesus Alfredo Avalos Manzo', datosCompletos: {}, estadoSincronizacion: 'sincronizado' },
      { id: '00000002', fecha: '16/09/2026', nombreEncuestado: 'Jesus Alfredo Avalos Manzo', datosCompletos: {}, estadoSincronizacion: 'local' },
      { id: '00000003', fecha: '16/09/2026', nombreEncuestado: 'Jesus Alfredo Avalos Manzo', datosCompletos: {}, estadoSincronizacion: 'subiendo' },
      { id: '00000004', fecha: '16/09/2026', nombreEncuestado: 'Jesus Alfredo Avalos Manzo', datosCompletos: {}, estadoSincronizacion: 'error' },
    ];
  }

  // Actualiza el estado de sincronización de un registro específico
  public async actualizarEstado(id: string, nuevoEstado: CuestionarioRegistro['estadoSincronizacion']): Promise<void> {
    const lista = await this.obtenerCuestionariosLocales();
    const index = lista.findIndex(item => item.id === id);
    if (index !== -1) {
      lista[index].estadoSincronizacion = nuevoEstado;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lista));
    }
  }
}