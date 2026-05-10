import api from './api';
import type {
  AiGenerateRequest,
  AiGenerateResponse,
  AiConfirmRequest,
  AiConfirmResponse,
  AiProjectPlan,
} from '../types';

export const aiService = {
  generatePlan: async (requirement: string, language: 'vi' | 'en' = 'vi'): Promise<AiGenerateResponse> => {
    const body: AiGenerateRequest = { requirement, language };
    const res: any = await api.post('/ai/projects/generate', body);
    return res.data ?? res;
  },

  confirmPlan: async (plan: AiProjectPlan, targetProjectId: string | null = null): Promise<AiConfirmResponse> => {
    const body: AiConfirmRequest = { plan, targetProjectId };
    const res: any = await api.post('/ai/projects/confirm', body);
    return res.data ?? res;
  },
};
