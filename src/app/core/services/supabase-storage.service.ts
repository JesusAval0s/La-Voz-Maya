import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface MetadataAudioSync {
  encuesta_id: string;
  cuestionario_nombre: string;
  pregunta_key: string;
  ruta_storage: string;
  url_publica?: string;
  fecha?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseStorageService {
  private supabase: SupabaseClient | null = null;
  private readonly DEFAULT_BUCKET = 'audios-encuestas';

  constructor() {
    console.log('✅ SupabaseStorageService instanciado');
  }

  // Inicialización bajo demanda para evitar congelar el arranque
  public getClient(): SupabaseClient {
    if (!this.supabase) {
      if (!environment.supabaseUrl || !environment.supabaseKey) {
        console.error('❌ Falta configurar supabaseUrl o supabaseKey en environment');
      }
      this.supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseKey,
        {
          auth: {
            persistSession: false, // Evita conflictos con localStorage en navegadores/móviles
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
    }
    return this.supabase;
  }

  async sincronizarEncuesta(encuesta: {
    id: string;
    folio: string;
    nombre_encuestado?: string;
    fecha_creacion?: string;
  }) {
    const client = this.getClient();
    const { data, error } = await client
      .from('encuestas')
      .upsert(encuesta, { onConflict: 'id' });

    if (error) throw error;
    return data;
  }

  async sincronizarRespuestas(payload: {
    encuesta_id: string;
    cuestionario_nombre: string;
    datos_json: any;
    fecha?: string;
  }) {
    const client = this.getClient();
    const { data, error } = await client
      .from('respuestas_cuestionarios')
      .insert(payload);

    if (error) throw error;
    return data;
  }

  async subirArchivoAudio(
    rutaEnBucket: string,
    audioBlob: Blob,
    bucket: string = this.DEFAULT_BUCKET
  ): Promise<string> {
    const client = this.getClient();
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(rutaEnBucket, audioBlob, {
        contentType: 'audio/wav',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = client.storage
      .from(bucket)
      .getPublicUrl(rutaEnBucket);

    return data.publicUrl;
  }

  async registrarMetadataAudio(metadata: MetadataAudioSync) {
    const client = this.getClient();
    const { data, error } = await client
      .from('audios_respuestas')
      .insert(metadata);

    if (error) throw error;
    return data;
  }
}