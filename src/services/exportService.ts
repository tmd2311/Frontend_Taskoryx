import axios from 'axios';
import { config, STORAGE_KEYS } from '../utils/config';

export type ExportSheet = 'overview' | 'tasks' | 'members' | 'sprints' | 'overdue';

export interface ExportTasksParams {
  sheets?: ExportSheet[];
  sprintIds?: string[];
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
  statuses?: string[];
  priorities?: string[];
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportService = {
  exportProjectTasks: async (projectId: string, params: ExportTasksParams = {}) => {
    const query = new URLSearchParams();

    // sheets dùng join(',') vì Spring nhận Set<String>
    if (params.sheets?.length) query.append('sheets', params.sheets.join(','));

    // sprintIds, statuses, priorities dùng multi-value append vì Spring nhận List
    params.sprintIds?.forEach(id => query.append('sprintIds', id));
    params.statuses?.forEach(s => query.append('statuses', s));
    params.priorities?.forEach(p => query.append('priorities', p));

    if (params.assigneeId) query.append('assigneeId', params.assigneeId);
    if (params.dateFrom)   query.append('dateFrom', params.dateFrom);
    if (params.dateTo)     query.append('dateTo', params.dateTo);

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    try {
      const response = await axios.get(
        `${config.apiBaseUrl}/export/projects/${projectId}/tasks/excel`,
        {
          params: query,
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token ?? ''}` },
        }
      );

      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(response.data, `bao-cao-${date}.xlsx`);
    } catch (error: any) {
      // Server trả ApiResponse JSON dưới dạng blob khi lỗi
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Xuất Excel thất bại');
        } catch {
          throw new Error('Xuất Excel thất bại');
        }
      }
      throw error;
    }
  },
};
