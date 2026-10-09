import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface CuestionarioRegistro {
  id: number | string;
  folio: string;
  nombreEncuestado?: string;
  fecha?: string;
  estadoSincronizacion: 'local' | 'subiendo' | 'sincronizado' | 'error';
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;
  private isWeb: boolean = false;

  constructor() {}

  async inicializarBaseDatos() {
    try {
      const platform = Capacitor.getPlatform();
      this.isWeb = platform === 'web';

      if (this.isWeb) {
        await this.sqlite.initWebStore();
      }

      this.db = await this.sqlite.createConnection(
        'la_voz_maya_db',
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();
      await this.crearTablas();
      await this.crearCarpetasLocales();

      console.log('Base de datos y sistema de archivos inicializados correctamente.');
    } catch (error) {
      console.error('Error al inicializar el almacenamiento local:', error);
    }
  }

  private async crearTablas() {
    if (!this.db) return;

    const sqlTablas = `
      CREATE TABLE IF NOT EXISTS encuestas (
        id TEXT PRIMARY KEY,
        folio TEXT,
        nombre_encuestado TEXT,
        fecha_creacion TEXT,
        sincronizado INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS respuestas_cuestionarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        encuesta_id TEXT,
        cuestionario_nombre TEXT,
        datos_json TEXT,
        estado_sincronizacion TEXT DEFAULT 'local',
        fecha TEXT,
        FOREIGN KEY(encuesta_id) REFERENCES encuestas(id)
      );

      CREATE TABLE IF NOT EXISTS audios_respuestas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        encuesta_id TEXT,
        cuestionario_nombre TEXT,
        pregunta_key TEXT,
        ruta_local TEXT,
        url_supabase TEXT,
        FOREIGN KEY(encuesta_id) REFERENCES encuestas(id)
      );
    `;

    await this.db.execute(sqlTablas);
  }

  private async crearCarpetasLocales() {
    try {
      await Filesystem.mkdir({
        path: 'la_voz_maya_audios',
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // Carpeta ya existente
    }
  }

  async guardarAudioLocal(folio: string, preguntaKey: string, audioBlob: Blob): Promise<string> {
    try {
      const base64Data = await this.blobToBase64(audioBlob);
      const fileName = `la_voz_maya_audios/${folio}_${preguntaKey}_${Date.now()}.wav`;

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      });

      return fileName;
    } catch (error) {
      console.error('Error al guardar el audio localmente:', error);
      throw error;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async esperarConexion(): Promise<void> {
    while (!this.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async guardarRespuestasCuestionario(encuestaId: string, cuestionarioNombre: string, respuestas: any) {
    await this.esperarConexion();
    if (!this.db) return;

    const datosJson = JSON.stringify(respuestas);
    const fechaActual = new Date().toISOString();
    const sql = `INSERT INTO respuestas_cuestionarios (encuesta_id, cuestionario_nombre, datos_json, estado_sincronizacion, fecha) VALUES (?, ?, ?, 'local', ?);`;
    
    await this.db.run(sql, [encuestaId, cuestionarioNombre, datosJson, fechaActual]);
  }

  async obtenerCuestionariosLocales(): Promise<CuestionarioRegistro[]> {
    if (!this.db) return [];
    try {
      const res = await this.db.query('SELECT * FROM respuestas_cuestionarios;');
      if (res && res.values) {
        return res.values.map((row: any) => ({
          id: row.id,
          folio: row.encuesta_id || 'S/F',
          fecha: row.fecha || new Date().toISOString(),
          estadoSincronizacion: row.estado_sincronizacion || 'local',
          datos: JSON.parse(row.datos_json || '{}')
        }));
      }
      return [];
    } catch (e) {
      console.error('Error al obtener cuestionarios locales:', e);
      return [];
    }
  }

  async actualizarEstado(id: number | string, estado: 'local' | 'subiendo' | 'sincronizado' | 'error'): Promise<void> {
    if (!this.db) return;
    try {
      const sql = `UPDATE respuestas_cuestionarios SET estado_sincronizacion = ? WHERE id = ?;`;
      await this.db.run(sql, [estado, id]);
    } catch (e) {
      console.error('Error al actualizar estado de sincronización:', e);
    }
  }
}