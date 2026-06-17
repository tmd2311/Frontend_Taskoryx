import api from './api';
import type {
  AiGenerateRequest,
  AiSessionResponse,
  AiConfirmRequest,
  AiJobResponse,
  AiProjectPlan,
} from '../types';

const AI_SESSION_KEY = 'ai_session_id';
const AI_JOB_KEY = 'ai_job_id';

export const aiService = {
  // ① Gửi yêu cầu → trả về ngay với sessionId (AI chạy ngầm)
  startGenerate: async (requirement: string, language: 'vi' | 'en' = 'vi'): Promise<AiSessionResponse> => {
    const body: AiGenerateRequest = { requirement, language };
    const res: any = await api.post('/ai/projects/generate', body);
    const data: AiSessionResponse = res.data ?? res;
    localStorage.setItem(AI_SESSION_KEY, data.sessionId);
    return data;
  },

  // ③ Lấy session (plan khi READY)
  getSession: async (sessionId: string): Promise<AiSessionResponse> => {
    const res: any = await api.get(`/ai/projects/sessions/${sessionId}`);
    return res.data ?? res;
  },

  // ⑤ Xác nhận tạo dự án → trả về jobId ngay
  confirmPlan: async (
    plan: AiProjectPlan,
    sessionId: string | null = null,
    targetProjectId: string | null = null,
  ): Promise<AiJobResponse> => {
    const body: AiConfirmRequest = { plan, sessionId, targetProjectId };
    const res: any = await api.post('/ai/projects/confirm', body);
    const data: AiJobResponse = res.data ?? res;
    localStorage.setItem(AI_JOB_KEY, data.jobId);
    return data;
  },

  // ④ Cập nhật plan (PATCH)
  updateSessionPlan: async (sessionId: string, plan: AiProjectPlan): Promise<AiSessionResponse> => {
    const res: any = await api.patch(`/ai/projects/sessions/${sessionId}/plan`, { plan });
    return res.data ?? res;
  },

  // ⑥ Poll job confirm
  getJobStatus: async (jobId: string): Promise<AiJobResponse> => {
    const res: any = await api.get(`/ai/projects/jobs/${jobId}`);
    return res.data ?? res;
  },

  // localStorage helpers
  getSavedSessionId: () => localStorage.getItem(AI_SESSION_KEY),
  getSavedJobId: () => localStorage.getItem(AI_JOB_KEY),
  clearSaved: () => {
    localStorage.removeItem(AI_SESSION_KEY);
    localStorage.removeItem(AI_JOB_KEY);
  },
};
