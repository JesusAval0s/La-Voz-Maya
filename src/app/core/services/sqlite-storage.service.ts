import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';

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
export class SqliteStorageService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;
  private dbName = 'la_voz_maya_db'; // <--- ¡Aquí definimos el nombre de la base de datos!
  private isWeb: boolean = false;
  private folioActivo: string | null = null;

  constructor() {}

  private static isWebStoreInitialized = false;

  async inicializarBaseDatos() {
  try {
    const info = await Device.getInfo();
    this.isWeb = info.platform === 'web' || Capacitor.getPlatform() === 'web';

    if (this.isWeb) {
      // 1. Esperar a que el navegador registre el Custom Element de jeep-sqlite
      await customElements.whenDefined('jeep-sqlite');
      
      const jeepEl = document.querySelector('jeep-sqlite');
      if (jeepEl) {
        // 2. Esperar a que el componente esté hidratado en el DOM
        await (jeepEl as any).componentOnReady?.();
      }

      // 3. Inicializar el WebStore
      await this.sqlite.initWebStore();
    }

    // 4. Crear y abrir conexión
    const checkConn = await this.sqlite.isConnection(this.dbName, false);
    if (checkConn.result) {
      this.db = await this.sqlite.retrieveConnection(this.dbName, false);
    } else {
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false,
        'no-encryption',
        1,
        false
      );
    }

    await this.db.open();
    await this.crearTablas();
    await this.crearCarpetasLocales();

    console.log('Base de datos inicializada y abierta exitosamente.');
  } catch (error) {
    console.error('Error al inicializar el almacenamiento local:', error);
    throw error;
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

  async guardarAudioLocal(folio: string, preguntaKey: string, audioBlob: Blob, cuestionarioNombre: string = 'general'): Promise<string> {
    try {
      const base64Data = await this.blobToBase64(audioBlob);
      const fileName = `la_voz_maya_audios/${folio}_${preguntaKey}_${Date.now()}.wav`;

      // 1. Guardar archivo físico en disco
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      });

      // 2. Registrar la referencia en SQLite
      if (!this.db) await this.inicializarBaseDatos();
      if (this.db) {
        const sqlAudio = `
          INSERT INTO audios_respuestas (encuesta_id, cuestionario_nombre, pregunta_key, ruta_local)
          VALUES (?, ?, ?, ?);
        `;
        await this.db.run(sqlAudio, [folio, cuestionarioNombre, preguntaKey, fileName]);

        if (this.isWeb) {
          await this.sqlite.saveToStore(this.dbName);
        }
      }

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

  private async esperarConexion(): Promise<boolean> {
    let intentos = 0;
    while (!this.db && intentos < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      intentos++;
    }
    return !!this.db;
  }

  public setFolioActivo(folio: string): void {
    this.folioActivo = folio;
    try {
      localStorage.setItem('folio_activo', folio);
    } catch (e) {
      console.warn('No se pudo persistir el folio en localStorage:', e);
    }
  }

  public getFolioActivo(): string | null {
    if (!this.folioActivo) {
      try {
        this.folioActivo = localStorage.getItem('folio_activo');
      } catch (e) {
        console.warn('No se pudo recuperar el folio de localStorage:', e);
      }
    }
    return this.folioActivo;
  }

  public limpiarFolioActivo(): void {
    this.folioActivo = null;
    try {
      localStorage.removeItem('folio_activo');
    } catch (e) {
      console.warn('Error al limpiar el folio de localStorage:', e);
    }
  }

  async guardarRespuestasCuestionario(encuestaId: string, cuestionarioNombre: string, respuestas: any) {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }

    try {
      if (this.db) {
        const isOpen = await this.db.isDBOpen();
        if (!isOpen.result) {
          await this.db.open();
        }
      }
    } catch (e) {
      // Ignorar si ya está abierta
    }

    const conexionLista = await this.esperarConexion();
    if (!conexionLista || !this.db) {
      console.error('No se pudo guardar: La base de datos no está inicializada.');
      throw new Error('La base de datos SQLite no está inicializada.');
    }

    try {
      const datosJson = JSON.stringify(respuestas);
      const fechaActual = new Date().toISOString();

      // 1. Asegurar que la encuesta exista en la tabla padre 'encuestas'
      const sqlEncuesta = `
        INSERT OR IGNORE INTO encuestas (id, folio, fecha_creacion, sincronizado) 
        VALUES (?, ?, ?, 0);
      `;
      await this.db.run(sqlEncuesta, [encuestaId, respuestas.folio || encuestaId, fechaActual]);

      // 2. Insertar las respuestas asociadas
      const sql = `
        INSERT INTO respuestas_cuestionarios 
        (encuesta_id, cuestionario_nombre, datos_json, estado_sincronizacion, fecha) 
        VALUES (?, ?, ?, 'local', ?);
      `;
      await this.db.run(sql, [encuestaId, cuestionarioNombre, datosJson, fechaActual]);
      
      // Respaldo en IndexedDB para la plataforma web
      if (this.isWeb) {
        await this.sqlite.saveToStore(this.dbName);
      }

      console.log('Guardado exitoso en SQLite para:', cuestionarioNombre);
    } catch (error) {
      console.error('Error al ejecutar la consulta SQL:', error);
      throw error;
    }
  }

  async obtenerRespuestasCuestionario(encuestaId: string, cuestionarioNombre: string): Promise<any | null> {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }

    try {
      if (this.db) {
        const isOpen = await this.db.isDBOpen();
        if (!isOpen.result) await this.db.open();
      }

      const sql = `
        SELECT datos_json 
        FROM respuestas_cuestionarios 
        WHERE encuesta_id = ? AND cuestionario_nombre = ? 
        ORDER BY id DESC LIMIT 1;
      `;
      const res = await this.db!.query(sql, [encuestaId, cuestionarioNombre]);

      if (res && res.values && res.values.length > 0) {
        return JSON.parse(res.values[0].datos_json || '{}');
      }
      return null;
    } catch (error) {
      console.error(`Error al recuperar respuestas para [${cuestionarioNombre}]:`, error);
      return null;
    }
  }

  async obtenerCuestionariosLocales(): Promise<CuestionarioRegistro[]> {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }
    try {
      if (this.db) {
        const isOpen = await this.db.isDBOpen();
        if (!isOpen.result) await this.db.open();
      }
      const res = await this.db!.query('SELECT * FROM respuestas_cuestionarios;');
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
      if (this.isWeb) {
        await this.sqlite.saveToStore(this.dbName);
      }
    } catch (e) {
      console.error('Error al actualizar estado de sincronización:', e);
    }
  }

  async imprimirRespuestasEnConsola(cuestionarioNombre?: string, encuestaId?: string) {
  if (!this.db) {
    await this.inicializarBaseDatos();
  }

  try {
    let sql = 'SELECT id, encuesta_id, cuestionario_nombre, datos_json, fecha FROM respuestas_cuestionarios WHERE 1=1';
    const params: any[] = [];

    // Filtro por nombre de cuestionario
    if (cuestionarioNombre) {
      sql += ' AND cuestionario_nombre = ?';
      params.push(cuestionarioNombre);
    }

    // Filtro por folio de encuesta activa
    if (encuestaId) {
      sql += ' AND encuesta_id = ?';
      params.push(encuestaId);
    }

    sql += ' ORDER BY id DESC LIMIT 1;'; // Trae el registro más reciente

    const res = await this.db!.query(sql, params);
    const registros = res.values || [];

    if (registros.length === 0) {
      console.warn(`No hay respuestas guardadas para el cuestionario: [${cuestionarioNombre || 'TODOS'}]`);
      return;
    }

    

    registros.forEach((row: any) => {
      let respuestasParseadas: Record<string, any> = {};
      try {
        respuestasParseadas = JSON.parse(row.datos_json || '{}');
      } catch {
        respuestasParseadas = { raw: row.datos_json };
      }

      const tablaDetalle = Object.entries(respuestasParseadas).map(([pregunta, respuesta]) => ({
        'Pregunta / Campo': pregunta,
        'Respuesta': typeof respuesta === 'object' ? JSON.stringify(respuesta) : respuesta
      }));

      console.table(tablaDetalle);
    });

    console.groupEnd();
  } catch (error) {
    console.error('Error al leer e imprimir respuestas locales:', error);
  }
}

}