/**
 * VideoProvider — interfaz común para futuros proveedores reales.
 * Las implementaciones aquí son STUBS: no llaman a APIs externas.
 * Sirven para validar tipos y dejar la arquitectura preparada.
 */
export type VideoJobInput = {
  prompt: string;
  sourceImageBase64?: string | null;
  duration?: string | null;
  aspectRatio?: string | null;
  cameraMotion?: string | null;
  extra?: Record<string, unknown>;
};

export type VideoJobStatus =
  | "draft"
  | "prepared"
  | "queued"
  | "generating"
  | "completed"
  | "failed";

export type VideoJobResult = {
  jobId: string;
  status: VideoJobStatus;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: string | null;
  error?: string | null;
};

export interface VideoProvider {
  readonly id: string;
  readonly label: string;
  readonly connected: boolean;
  createJob(input: VideoJobInput): Promise<VideoJobResult>;
  getStatus(jobId: string): Promise<VideoJobResult>;
  getResult(jobId: string): Promise<VideoJobResult>;
  cancelJob(jobId: string): Promise<{ ok: boolean; message?: string }>;
}

function unavailable(provider: string): never {
  throw new Error(
    `[${provider}] Proveedor no conectado todavía. Disponible al conectar la API.`,
  );
}

function makeStub(id: string, label: string): VideoProvider {
  return {
    id,
    label,
    connected: false,
    async createJob() {
      unavailable(label);
    },
    async getStatus() {
      unavailable(label);
    },
    async getResult() {
      unavailable(label);
    },
    async cancelJob() {
      unavailable(label);
    },
  };
}

export const VeoProvider = makeStub("veo", "Google Veo");
export const FlowProvider = makeStub("flow", "Flow");
export const KlingProvider = makeStub("kling", "Kling");
export const RunwayProvider = makeStub("runway", "Runway");
export const PikaProvider = makeStub("pika", "Pika");

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  veo: VeoProvider,
  flow: FlowProvider,
  kling: KlingProvider,
  runway: RunwayProvider,
  pika: PikaProvider,
};

export function getProvider(id: string | null | undefined): VideoProvider | null {
  if (!id) return null;
  return VIDEO_PROVIDERS[id] ?? null;
}