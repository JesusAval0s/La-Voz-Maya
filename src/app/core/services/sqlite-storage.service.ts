import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { SupabaseStorageService } from './supabase-storage.service';

export interface CuestionarioRegistro {
  id: string; // Ahora representa el encuesta_id (Folio único de la persona)
  folio: string;
  nombreEncuestado?: string;
  totalCuestionarios?: number;
  totalAudios?: number;
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
  private dbName = 'la_voz_maya_db';
  private isWeb: boolean = false;
  private folioActivo: string | null = null;
  private initPromise: Promise<void> | null = null; // Candado contra llamadas simultáneas

  constructor(private supabaseStorage: SupabaseStorageService) {}

  /**
   * Orquesta la subida completa de una encuesta a Supabase:
   * 1) Cabecera en 'encuestas'
   * 2) Módulos pendientes en 'respuestas_cuestionarios'
   * 3) Archivos .wav al bucket 'audios-encuestas' y sus registros en 'audios_respuestas'
   */
  public async sincronizarEncuestaCompleta(encuestaId: string): Promise<void> {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }
    if (!this.db) throw new Error('Base de datos local no disponible.');

    const isOpen = await this.db.isDBOpen();
    if (!isOpen.result) await this.db.open();

    // 1. Obtener datos de la encuesta maestra
    const resEncuesta = await this.db.query(
      `SELECT * FROM encuestas WHERE id = ? LIMIT 1;`,
      [encuestaId]
    );

    if (!resEncuesta.values || resEncuesta.values.length === 0) {
      throw new Error(`No se encontró la encuesta local con ID: ${encuestaId}`);
    }

    const encuesta = resEncuesta.values[0];
    const folio = encuesta.folio || encuesta.id;

    await this.supabaseStorage.sincronizarEncuesta({
      id: encuesta.id,
      folio: folio,
      nombre_encuestado: encuesta.nombre_encuestado || undefined,
      fecha_creacion: encuesta.fecha_creacion || new Date().toISOString()
    });

    // 2. Obtener y subir cada cuestionario pendiente de esta encuesta
    const resCuestionarios = await this.db.query(
      `SELECT * FROM respuestas_cuestionarios WHERE encuesta_id = ?;`,
      [encuestaId]
    );

    const cuestionarios = resCuestionarios.values || [];
    for (const cuest of cuestionarios) {
      if (cuest.estado_sincronizacion === 'sincronizado') continue;

      let datosParseados = {};
      try {
        datosParseados = JSON.parse(cuest.datos_json || '{}');
      } catch {
        datosParseados = { raw: cuest.datos_json };
      }

      await this.supabaseStorage.sincronizarRespuestas({
        encuesta_id: encuesta.id,
        cuestionario_nombre: cuest.cuestionario_nombre,
        datos_json: datosParseados,
        fecha: cuest.fecha || new Date().toISOString()
      });

      // Guardar progreso parcial en SQLite por si falla algún audio después
      await this.db.run(
        `UPDATE respuestas_cuestionarios SET estado_sincronizacion = 'sincronizado' WHERE id = ?;`,
        [cuest.id]
      );
      if (this.isWeb) await this.sqlite.saveToStore(this.dbName);
    }

    // 3. Obtener y subir todos los audios .wav de esta encuesta
    const resAudios = await this.db.query(
      `SELECT * FROM audios_respuestas WHERE encuesta_id = ?;`,
      [encuestaId]
    );

    const audios = resAudios.values || [];
    for (const audio of audios) {
      if (audio.url_supabase) continue; // Ya fue subido previamente

      const fileData = await Filesystem.readFile({
        path: audio.ruta_local,
        directory: Directory.Data
      });

      const base64Data = fileData.data as string;
      const audioBlob = this.base64ToBlob(base64Data, 'audio/wav');

      const cleanPreguntaKey = String(audio.pregunta_key).replace(/\./g, '_');
      const nombreArchivo = `${cleanPreguntaKey}_${Date.now()}.wav`;
      const rutaEnBucket = `${folio}/${audio.cuestionario_nombre}/${nombreArchivo}`;

      const urlPublica = await this.supabaseStorage.subirArchivoAudio(
        rutaEnBucket,
        audioBlob
      );

      await this.supabaseStorage.registrarMetadataAudio({
        encuesta_id: encuesta.id,
        cuestionario_nombre: audio.cuestionario_nombre,
        pregunta_key: audio.pregunta_key,
        ruta_storage: rutaEnBucket,
        url_publica: urlPublica
      });

      await this.db.run(
        `UPDATE audios_respuestas SET url_supabase = ? WHERE id = ?;`,
        [urlPublica, audio.id]
      );
      if (this.isWeb) await this.sqlite.saveToStore(this.dbName);
    }

    // 4. Marcar toda la encuesta como sincronizada
    await this.actualizarEstado(encuestaId, 'sincronizado');
  }

  private base64ToBlob(base64: string, contentType: string = 'audio/wav'): Blob {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  async inicializarBaseDatos(): Promise<void> {
    // Si ya hay una inicialización en curso, esperar a esa misma promesa
    if (this.initPromise) {
      return this.initPromise;
    }

    // Si ya está abierta y lista, salir de inmediato
    if (this.db) {
      try {
        const isOpen = await this.db.isDBOpen();
        if (isOpen.result) return;
      } catch {
        // Continuar para reabrir si es necesario
      }
    }

    this.initPromise = (async () => {
      try {
        const info = await Device.getInfo();
        this.isWeb = info.platform === 'web' || Capacitor.getPlatform() === 'web';

        if (this.isWeb) {
          // 1. Asegurar una sola etiqueta <jeep-sqlite> en el DOM
          let jeepEl = document.querySelector('jeep-sqlite');
          if (!jeepEl) {
            jeepEl = document.createElement('jeep-sqlite');
            document.body.appendChild(jeepEl);
          }

          // 2. Esperar a que el Custom Element esté definido
          await customElements.whenDefined('jeep-sqlite');

          // 3. Dar un respiro a Stencil para hidratar el componente en frío
          if (typeof (jeepEl as any).componentOnReady === 'function') {
            await (jeepEl as any).componentOnReady();
          }
          await new Promise((resolve) => setTimeout(resolve, 250));

          // 4. Bucle de espera activa hasta que initWebStore() abra correctamente
          let intentos = 0;
          let storeAbierto = false;
          while (intentos < 30 && !storeAbierto) {
            try {
              await this.sqlite.initWebStore();
              storeAbierto = true;
            } catch (e) {
              intentos++;
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }

          if (!storeAbierto) {
            throw new Error('No se pudo abrir el WebStore de jeep-sqlite tras múltiples intentos.');
          }
        }

        // 5. Crear o recuperar la conexión SQLite
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
        this.db = null;
        console.error('Error al inicializar el almacenamiento local:', error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
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

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      });

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

      // Intentar extraer el nombre del encuestado si viene en este cuestionario (ej. datos_generales)
      const nombreDetectado =
        respuestas.nombre_encuestado ||
        respuestas.nombre ||
        respuestas.nombreCompleto ||
        respuestas.nombre_nino ||
        null;

      // 1. Asegurar que la encuesta exista en la tabla padre 'encuestas'
      const sqlEncuesta = `
        INSERT OR IGNORE INTO encuestas (id, folio, nombre_encuestado, fecha_creacion, sincronizado) 
        VALUES (?, ?, ?, ?, 0);
      `;
      await this.db.run(sqlEncuesta, [encuestaId, respuestas.folio || encuestaId, nombreDetectado, fechaActual]);

      // Si ya existía la encuesta pero no tenía nombre_encuestado y ahora sí viene, actualizarlo
      if (nombreDetectado) {
        await this.db.run(
          `UPDATE encuestas SET nombre_encuestado = ? WHERE id = ? AND (nombre_encuestado IS NULL OR nombre_encuestado = '');`,
          [nombreDetectado, encuestaId]
        );
      }

      // 2. Evitar duplicados del mismo módulo para una misma persona: reemplazar si ya existía ese módulo en ese folio
      await this.db.run(
        `DELETE FROM respuestas_cuestionarios WHERE encuesta_id = ? AND cuestionario_nombre = ?;`,
        [encuestaId, cuestionarioNombre]
      );

      // 3. Insertar las respuestas asociadas
      const sql = `
        INSERT INTO respuestas_cuestionarios 
        (encuesta_id, cuestionario_nombre, datos_json, estado_sincronizacion, fecha) 
        VALUES (?, ?, ?, 'local', ?);
      `;
      await this.db.run(sql, [encuestaId, cuestionarioNombre, datosJson, fechaActual]);

      // Marcar encuesta padre como pendiente (0) al agregar/modificar un módulo
      await this.db.run(`UPDATE encuestas SET sincronizado = 0 WHERE id = ?;`, [encuestaId]);

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

  /**
   * Devuelve UNA tarjeta agrupada por encuesta (persona/folio),
   * resumiendo cuántos cuestionarios y audios tiene asociados y su estado global.
   */
  async obtenerCuestionariosLocales(): Promise<CuestionarioRegistro[]> {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }
    try {
      if (this.db) {
        const isOpen = await this.db.isDBOpen();
        if (!isOpen.result) await this.db.open();
      }

      const sql = `
        SELECT 
          e.id AS encuesta_id,
          e.folio,
          e.nombre_encuestado,
          e.fecha_creacion,
          e.sincronizado,
          COUNT(DISTINCT r.id) AS total_cuestionarios,
          COUNT(DISTINCT a.id) AS total_audios,
          SUM(CASE WHEN r.estado_sincronizacion = 'error' THEN 1 ELSE 0 END) AS con_error,
          SUM(CASE WHEN r.estado_sincronizacion = 'subiendo' THEN 1 ELSE 0 END) AS subiendo,
          SUM(CASE WHEN r.estado_sincronizacion = 'local' THEN 1 ELSE 0 END) AS pendientes
        FROM encuestas e
        LEFT JOIN respuestas_cuestionarios r ON e.id = r.encuesta_id
        LEFT JOIN audios_respuestas a ON e.id = a.encuesta_id
        GROUP BY e.id
        ORDER BY e.fecha_creacion DESC;
      `;

      const res = await this.db!.query(sql);
      if (res && res.values) {
        return res.values.map((row: any) => {
          let estado: 'local' | 'subiendo' | 'sincronizado' | 'error' = 'local';
          if (row.subiendo > 0) {
            estado = 'subiendo';
          } else if (row.con_error > 0) {
            estado = 'error';
          } else if (row.pendientes > 0 || row.sincronizado === 0) {
            estado = 'local';
          } else if (row.sincronizado === 1 && row.total_cuestionarios > 0) {
            estado = 'sincronizado';
          }

          return {
            id: row.encuesta_id,
            folio: row.folio || row.encuesta_id,
            nombreEncuestado: row.nombre_encuestado || 'Sin nombre',
            totalCuestionarios: row.total_cuestionarios || 0,
            totalAudios: row.total_audios || 0,
            fecha: row.fecha_creacion || new Date().toISOString(),
            estadoSincronizacion: estado
          };
        });
      }
      return [];
    } catch (e) {
      console.error('Error al obtener encuestas locales agrupadas:', e);
      return [];
    }
  }

  /**
   * Actualiza el estado de sincronización de TODA la encuesta (encuesta padre + todos sus cuestionarios hijos).
   */
  async actualizarEstado(encuestaId: string, estado: 'local' | 'subiendo' | 'sincronizado' | 'error'): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.run(
        `UPDATE respuestas_cuestionarios SET estado_sincronizacion = ? WHERE encuesta_id = ?;`,
        [estado, encuestaId]
      );

      const flagSincronizado = estado === 'sincronizado' ? 1 : 0;
      await this.db.run(
        `UPDATE encuestas SET sincronizado = ? WHERE id = ?;`,
        [flagSincronizado, encuestaId]
      );

      if (this.isWeb) {
        await this.sqlite.saveToStore(this.dbName);
      }
    } catch (e) {
      console.error('Error al actualizar estado de sincronización:', e);
    }
  }

  /**
   * Elimina una encuesta completa por su ID (encuesta + todos sus cuestionarios + todos sus audios físicos y en BD).
   */
  public async eliminarCuestionarioPorId(encuestaId: string): Promise<void> {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }
    if (!this.db) return;

    try {
      const isOpen = await this.db.isDBOpen();
      if (!isOpen.result) await this.db.open();

      // 1. Buscar todos los audios asociados a esta encuesta
      const resAudios = await this.db.query(
        `SELECT ruta_local FROM audios_respuestas WHERE encuesta_id = ?;`,
        [encuestaId]
      );

      // 2. Borrar archivos físicos .wav del dispositivo
      if (resAudios.values && resAudios.values.length > 0) {
        for (const audio of resAudios.values) {
          if (audio.ruta_local) {
            try {
              await Filesystem.deleteFile({
                path: audio.ruta_local,
                directory: Directory.Data
              });
            } catch (fsErr) {
              console.warn('No se pudo borrar el archivo físico de audio:', fsErr);
            }
          }
        }
      }

      // 3. Eliminar registros de audios, respuestas y encuesta padre
      await this.db.run(`DELETE FROM audios_respuestas WHERE encuesta_id = ?;`, [encuestaId]);
      await this.db.run(`DELETE FROM respuestas_cuestionarios WHERE encuesta_id = ?;`, [encuestaId]);
      await this.db.run(`DELETE FROM encuestas WHERE id = ?;`, [encuestaId]);

      if (this.isWeb) {
        await this.sqlite.saveToStore(this.dbName);
      }

      console.log(`🗑️ Encuesta completa con Folio ${encuestaId} eliminada localmente.`);
    } catch (error) {
      console.error(`❌ Error al eliminar encuesta ${encuestaId}:`, error);
      throw error;
    }
  }

  /**
   * Elimina todas las encuestas que ya tengan el estado 'sincronizado'.
   */
  public async eliminarCuestionariosSincronizados(): Promise<void> {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }
    if (!this.db) return;

    try {
      const isOpen = await this.db.isDBOpen();
      if (!isOpen.result) await this.db.open();

      const res = await this.db.query(
        `SELECT id FROM encuestas WHERE sincronizado = 1;`
      );

      const registros = res.values || [];
      for (const reg of registros) {
        await this.eliminarCuestionarioPorId(reg.id);
      }

      console.log(`🗑️ Se eliminaron ${registros.length} encuestas sincronizadas.`);
    } catch (error) {
      console.error('❌ Error al eliminar encuestas sincronizadas:', error);
      throw error;
    }
  }

  async imprimirRespuestasEnConsola(cuestionarioNombre?: string, encuestaId?: string) {
    if (!this.db) {
      await this.inicializarBaseDatos();
    }

    try {
      let sql = 'SELECT id, encuesta_id, cuestionario_nombre, datos_json, fecha FROM respuestas_cuestionarios WHERE 1=1';
      const params: any[] = [];

      if (cuestionarioNombre) {
        sql += ' AND cuestionario_nombre = ?';
        params.push(cuestionarioNombre);
      }

      if (encuestaId) {
        sql += ' AND encuesta_id = ?';
        params.push(encuestaId);
      }

      sql += ' ORDER BY id DESC LIMIT 1;';

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