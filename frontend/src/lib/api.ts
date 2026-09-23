/**
 * API client: all requests use credentials: 'include' (cookies).
 * Base URL: VITE_API_URL or http://localhost:8000/api
 */

const getBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
let refreshInFlight: Promise<boolean> | null = null;

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem('saarthi-auth');
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

function clearPersistedAuthState() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('saarthi-auth');
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new Event('saarthi:auth-expired'));
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const base = getBaseUrl();
    const refreshUrl = `${base}/auth/refresh`;
    const storedRefresh = (() => { try { return JSON.parse(localStorage.getItem('saarthi-auth') || '{}')?.state?.refreshToken ?? null; } catch { return null; } })();
    const res = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(base.includes('ngrok') ? { 'ngrok-skip-browser-warning': '1' } : {}) },
      body: storedRefresh ? JSON.stringify({ refresh_token: storedRefresh }) : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      const rd = data?.data || data;
      const newToken = rd?.access_token ?? rd?.token ?? null;
      const newRefresh = rd?.refresh_token ?? storedRefresh;
      if (newToken) {
        try {
          const raw = JSON.parse(localStorage.getItem('saarthi-auth') || '{}');
          if (raw?.state) { raw.state.token = newToken; raw.state.refreshToken = newRefresh; localStorage.setItem('saarthi-auth', JSON.stringify(raw)); }
        } catch { /* ignore */ }
      }
    }
    return res.ok;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Turn upload path (e.g. /uploads/xxx) into full URL for storing in DB. */
export function getUploadFullUrl(path: string): string {
    const base = getBaseUrl();
    const origin = base.replace(/\/api\/?$/, '');
    const p = path.startsWith('/') ? path : '/' + path;
    return origin + p;
}

/** URL for viewing a course material file (PDF etc.) with auth. Use in iframe or new tab. */
export function getMaterialFileUrl(courseId: string, materialId: string): string {
    const base = getBaseUrl();
    return `${base}/courses/${courseId}/materials/${materialId}/file`;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProgressResponse {
  coursesEnrolled: number;
  pendingAssignments: number;
  avgQuizScorePercent: number;
  studyTimeHours: number;
  streakDays: number;
}

export interface CourseResponse {
  id: string;
  title: string;
  code: string;
  instructor: string;
  description?: string;
  thumbnailEmoji?: string;
  color?: string;
}

export interface EnrollmentWithCourseResponse {
  id: string;
  courseId: string;
  progressPercent: number;
  lastAccessedAt?: string;
  course: CourseResponse;
}

export interface AssignmentResponse {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate: string;
  points: number;
  topic?: string;
  attachments?: string;
  createdAt: string;
}

export interface MaterialResponse {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  type: string;
  url: string;
  topic?: string;
  createdAt: string;
}

export interface StreamItemResponse {
  id: string;
  courseId: string;
  type: string;
  title?: string;
  description: string;
  author: string;
  createdAt: string;
}

export interface CoursePersonResponse {
  userId: string;
  fullName: string;
  progressPercent: number;
}

export interface SearchItem {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  link?: string;
}

export interface ConversationResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageItemResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ConversationDetailResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageItemResponse[];
}

export interface SendMessageResponse {
  userMessage: ChatMessageItemResponse;
  assistantMessage: ChatMessageItemResponse;
}

export interface SearchResponse {
  courses: SearchItem[];
  materials: SearchItem[];
  videos: SearchItem[];
  totalCourses: number;
  totalMaterials: number;
  totalVideos: number;
  limit: number;
  offset: number;
}

export interface VideoResponse {
  id: string;
  courseId?: string;
  title: string;
  description?: string;
  durationSeconds: number;
  thumbnailUrl?: string;
  url: string;
  embedUrl?: string;
  chaptersJson?: string;
  sortOrder: number;
  hasTranscript: boolean;
}

export interface VideoNoteResponse {
  id: string;
  videoId: string;
  timeSeconds: number;
  text: string;
  createdAt: string;
}

export interface NoteResponse {
  id: string;
  title: string;
  content: string;
  courseId?: string;
  topic?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodeProblemResponse {
  id: number;
  title: string;
  difficulty: string;
  points: number;
  description: string;
  requirements: string[];
  expectedOutput?: string;
  hints: string[];
  starterCode: Record<string, string>;
  topics?: string;
  sortOrder: number;
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options;
  const base = getBaseUrl();
  let url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') search.set(k, String(v));
    });
    const q = search.toString();
    if (q) url += (url.includes('?') ? '&' : '?') + q;
  }
  const isNgrok = getBaseUrl().includes('ngrok');
  const doFetch = () => {
    const token = getStoredToken();
    return fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(isNgrok ? { 'ngrok-skip-browser-warning': '1' } : {}),
        ...init.headers,
      },
    });
  };

  let res = await doFetch();
  const isRefreshPath = path.includes('/auth/refresh');
  const isAuthBootstrapPath = path.includes('/auth/me');
  if (res.status === 401 && !isRefreshPath && !isAuthBootstrapPath) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearPersistedAuthState();
    }
  }
  // 204 No Content has no body - do not parse JSON
  if (res.status === 204) {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return undefined as T;
  }
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(res.ok ? 'Invalid response' : `Request failed: ${res.status}`);
  }
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? data?.message ?? `Request failed: ${res.status}`;
    if (res.status === 401) {
      clearPersistedAuthState();
    }
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};

/** Upload file (course domain); returns { url: string } for assignment attachments etc. */
export async function uploadFile(file: File): Promise<{ url: string }> {
  const base = getBaseUrl();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}/courses/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(getStoredToken() ? { 'Authorization': `Bearer ${getStoredToken()}` } : {}),
      ...(base.includes('ngrok') ? { 'ngrok-skip-browser-warning': '1' } : {}),
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Upload failed');
  return data;
}

export interface DatasetItem {
  filename: string;
  size_kb: number;
}

export interface DatasetUploadResponse {
  status: string;
  filename: string;
  size_bytes: number;
  thread_id: string | null;
  cloud_synced: boolean;
}

/** Upload a CSV dataset for the data_analysis_agent. */
export async function uploadDataset(
  file: File,
  threadId?: string
): Promise<DatasetUploadResponse> {
  const base = getBaseUrl();
  const form = new FormData();
  form.append('file', file);
  if (threadId) form.append('thread_id', threadId);
  const res = await fetch(`${base}/data/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(getStoredToken() ? { 'Authorization': `Bearer ${getStoredToken()}` } : {}),
      ...(base.includes('ngrok') ? { 'ngrok-skip-browser-warning': '1' } : {}),
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Dataset upload failed');
  return data;
}

/** List all CSV datasets currently available for analysis. */
export async function listDatasets(): Promise<DatasetItem[]> {
  const result = await api.get<{ datasets: DatasetItem[] }>('/data/list');
  return result.datasets;
}

// ── Study Guides ─────────────────────────────────────────────────────────────

export interface StudyGuidePromptItem {
  id: number;
  guide_id: number;
  step_number: number;
  title: string;
  prompt_text: string;
  created_at: string;
}

export interface StudyGuideItem {
  id: number;
  title: string;
  description: string | null;
  created_by: number | null;
  created_at: string;
  prompts: StudyGuidePromptItem[];
}

export const studyGuideApi = {
  list: () => api.get<StudyGuideItem[]>('/study-guides'),
  createGuide: (title: string, description?: string) =>
    api.post<StudyGuideItem>('/study-guides', { title, description }),
  deleteGuide: (id: number) => api.delete(`/study-guides/${id}`),
  addPrompt: (guideId: number, title: string, prompt_text: string) =>
    api.post<StudyGuidePromptItem>(`/study-guides/${guideId}/prompts`, { title, prompt_text }),
  deletePrompt: (guideId: number, promptId: number) =>
    api.delete(`/study-guides/${guideId}/prompts/${promptId}`),
};
