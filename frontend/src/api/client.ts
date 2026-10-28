import {
  HealthResponse,
  PlatformInfo,
  DetectResponse,
  MediaMetadata,
  DownloadOptions,
  TaskOut,
  HistoryEntry,
  QueueStats,
} from '../types/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '') : '') + '/api';

export class ApiError extends Error {
  errorCode?: string;
  hintVi?: string;
  status: number;

  constructor(status: number, message: string, errorCode?: string, hintVi?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.hintVi = hintVi;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail: any = {};
    try {
      const data = await res.json();
      errorDetail = data.detail || data;
    } catch {
      errorDetail = { message: res.statusText };
    }
    throw new ApiError(
      res.status,
      errorDetail.message || 'Yêu cầu không thành công.',
      errorDetail.error_code,
      errorDetail.hint_vi
    );
  }
  return res.json();
}

export const api = {
  // Health
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<HealthResponse>(res);
  },

  // Platforms
  async getPlatforms(): Promise<{ platforms: PlatformInfo[] }> {
    const res = await fetch(`${API_BASE}/platforms`);
    return handleResponse<{ platforms: PlatformInfo[] }>(res);
  },

  // Detect
  async detectUrl(url: string): Promise<DetectResponse> {
    const res = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return handleResponse<DetectResponse>(res);
  },

  // Analyze
  async analyzeUrl(url: string): Promise<MediaMetadata> {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return handleResponse<MediaMetadata>(res);
  },

  // Tasks
  async getTasks(): Promise<{ tasks: TaskOut[]; stats: QueueStats }> {
    const res = await fetch(`${API_BASE}/tasks`);
    return handleResponse<{ tasks: TaskOut[]; stats: QueueStats }>(res);
  },

  async createTask(options: DownloadOptions): Promise<TaskOut> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return handleResponse<TaskOut>(res);
  },

  async getTask(taskId: string): Promise<TaskOut> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`);
    return handleResponse<TaskOut>(res);
  },

  async cancelTask(taskId: string): Promise<TaskOut> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/cancel`, { method: 'POST' });
    return handleResponse<TaskOut>(res);
  },

  async pauseTask(taskId: string): Promise<TaskOut> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/pause`, { method: 'POST' });
    return handleResponse<TaskOut>(res);
  },

  async resumeTask(taskId: string): Promise<TaskOut> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/resume`, { method: 'POST' });
    return handleResponse<TaskOut>(res);
  },

  async retryTask(taskId: string): Promise<TaskOut> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/retry`, { method: 'POST' });
    return handleResponse<TaskOut>(res);
  },

  async deleteTask(taskId: string): Promise<{ ok: boolean }> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    return handleResponse<{ ok: boolean }>(res);
  },

  // History
  async getHistory(): Promise<{ history: HistoryEntry[] }> {
    const res = await fetch(`${API_BASE}/history`);
    return handleResponse<{ history: HistoryEntry[] }>(res);
  },

  async deleteHistory(historyId: string): Promise<{ ok: boolean; file_kept: boolean; message_vi: string }> {
    const res = await fetch(`${API_BASE}/history/${historyId}`, { method: 'DELETE' });
    return handleResponse<{ ok: boolean; file_kept: boolean; message_vi: string }>(res);
  },

  // Settings
  async getDownloadDir(): Promise<{ download_dir: string }> {
    const res = await fetch(`${API_BASE}/settings/download-dir`);
    return handleResponse<{ download_dir: string }>(res);
  },

  async setDownloadDir(path: string): Promise<{ download_dir: string }> {
    const res = await fetch(`${API_BASE}/settings/download-dir`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    return handleResponse<{ download_dir: string }>(res);
  },

  // Files
  async revealInFolder(filePath: string): Promise<{ ok: boolean }> {
    const res = await fetch(`${API_BASE}/files/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath }),
    });
    return handleResponse<{ ok: boolean }>(res);
  },

  // SSE Stream
  subscribeEvents(onMessage: (data: any) => void): () => void {
    const eventSource = new EventSource(`${API_BASE}/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        // SSE keep-alive comments or raw pings
      }
    };

    eventSource.onerror = () => {
      // Browser EventSource automatically attempts reconnection
    };

    return () => {
      eventSource.close();
    };
  },
};
