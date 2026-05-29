import axios from 'axios';
import { config, STORAGE_KEYS } from '../utils/config';

export type ExportSheet = 'overview' | 'tasks' | 'members' | 'sprints' | 'overdue';

export interface ExportTasksParams {
  sheets?: ExportSheet[];
  sprintId?: string;
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
    const query: Record<string, string> = {};
    if (params.sheets?.length) query.sheets = params.sheets.join(',');
    if (params.sprintId) query.sprintId = params.sprintId;
    if (params.assigneeId) query.assigneeId = params.assigneeId;
    if (params.dateFrom) query.dateFrom = params.dateFrom;
    if (params.dateTo) query.dateTo = params.dateTo;
    if (params.statuses?.length) query.statuses = params.statuses.join(',');
    if (params.priorities?.length) query.priorities = params.priorities.join(',');

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const response = await axios.get(
      `${config.apiBaseUrl}/export/projects/${projectId}/tasks/excel`,
      {
        params: query,
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      }
    );

    downloadBlob(response.data, `bao-cao-${projectId}.xlsx`);
  },
};
