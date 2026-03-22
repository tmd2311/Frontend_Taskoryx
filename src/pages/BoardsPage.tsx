import React, { useEffect, useState } from 'react';
import {
  Typography,
  Select,
  Button,
  Tabs,
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Badge,
  Empty,
  Spin,
  message,
  ColorPicker,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  CommentOutlined,
  PaperClipOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '../stores/projectStore';
import { useBoardStore } from '../stores/boardStore';
import { useTaskStore } from '../stores/taskStore';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import { StatusTag } from '../components/StatusSelect';
import type { Board, KanbanColumn, TaskSummary } from '../types';
import { TaskPriority } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// ─── Màu ưu tiên ────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  [TaskPriority.LOW]: 'green',
  [TaskPriority.MEDIUM]: 'blue',
  [TaskPriority.HIGH]: 'orange',
  [TaskPriority.URGENT]: 'red',
};
const PRIORITY_LABEL: Record<string, string> = {
  [TaskPriority.LOW]: 'Thấp',
  [TaskPriority.MEDIUM]: 'TB',
  [TaskPriority.HIGH]: 'Cao',
  [TaskPriority.URGENT]: 'Khẩn',
};

// ─── Task Card ───────────────────────────────────────────────
const TaskCard: React.FC<{ task: TaskSummary; onOpen: (id: string) => void }> = ({ task, onOpen }) => (
  <div
    onClick={() => onOpen(task.id)}
    style={{
      background: '#fff',
      border: '1px solid #f0f0f0',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      cursor: 'pointer',
      transition: 'box-shadow .15s, border-color .15s',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 3px 8px rgba(0,0,0,.12)';
      (e.currentTarget as HTMLDivElement).style.borderColor = '#1890ff';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.06)';
      (e.currentTarget as HTMLDivElement).style.borderColor = '#f0f0f0';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
      <Tag style={{ margin: 0, fontSize: 11 }}>{task.taskKey}</Tag>
      <Tag color={PRIORITY_COLOR[task.priority]} style={{ margin: 0, fontSize: 11 }}>
        {PRIORITY_LABEL[task.priority]}
      </Tag>
      <StatusTag status={task.status} small />
    </div>

    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>
      {task.title}
    </div>

    {task.dueDate && (
      <div
        style={{
          fontSize: 11,
          color: task.overdue ? '#f5222d' : '#8c8c8c',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {task.overdue && <ExclamationCircleOutlined />}
        {dayjs(task.dueDate).format('DD/MM/YYYY')}
      </div>
    )}

    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
      }}
    >
      <Text type="secondary" style={{ fontSize: 11 }}>
        {task.assigneeName ?? '—'}
      </Text>
      <Space size={8}>
        {task.commentCount > 0 && (
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>
            <CommentOutlined /> {task.commentCount}
          </span>
        )}
        {task.attachmentCount > 0 && (
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>
            <PaperClipOutlined /> {task.attachmentCount}
          </span>
        )}
      </Space>
    </div>
  </div>
);

// ─── Column Card ─────────────────────────────────────────────
interface ColumnCardProps {
  col: KanbanColumn;
  index: number;
  total: number;
  onEdit: (col: KanbanColumn) => void;
  onDelete: (colId: string) => void;
  onMoveLeft: (colId: string, index: number) => void;
  onMoveRight: (colId: string, index: number) => void;
  onAddTask: (col: KanbanColumn) => void;
  onOpenTask: (taskId: string) => void;
}

const ColumnCard: React.FC<ColumnCardProps> = ({
  col, index, total, onEdit, onDelete, onMoveLeft, onMoveRight, onAddTask, onOpenTask,
}) => {
  const overLimit = col.taskLimit && col.tasks.length > col.taskLimit;

  return (
    <div
      style={{
        width: 280,
        minWidth: 280,
        background: '#f5f5f5',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 260px)',
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: '2px solid ' + (col.color || '#d9d9d9'),
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {/* Dot màu */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: col.color || '#d9d9d9',
            flexShrink: 0,
          }}
        />

        <Text strong style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {col.name}
        </Text>

        {/* Đếm task + limit */}
        <Badge
          count={col.tasks.length}
          showZero
          color={overLimit ? '#f5222d' : '#1890ff'}
          style={{ fontSize: 10 }}
        />
        {col.taskLimit ? (
          <Text type="secondary" style={{ fontSize: 11 }}>/ {col.taskLimit}</Text>
        ) : null}

        {col.isCompleted && (
          <Tag color="success" style={{ fontSize: 10, margin: 0 }}>Hoàn thành</Tag>
        )}

        {/* Actions */}
        <Space size={2}>
          <Tooltip title="Dịch trái">
            <Button
              type="text"
              size="small"
              icon={<ArrowLeftOutlined />}
              disabled={index === 0}
              onClick={() => onMoveLeft(col.id, index)}
            />
          </Tooltip>
          <Tooltip title="Dịch phải">
            <Button
              type="text"
              size="small"
              icon={<ArrowRightOutlined />}
              disabled={index === total - 1}
              onClick={() => onMoveRight(col.id, index)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(col)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa cột này?"
            description="Tất cả task trong cột cũng sẽ bị ảnh hưởng."
            onConfirm={() => onDelete(col.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa cột">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      </div>

      {/* Task list */}
      <div style={{ padding: '8px 8px', overflowY: 'auto', flex: 1 }}>
        {col.tasks.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bfbfbf', padding: '16px 0', fontSize: 12 }}>
            Không có task
          </div>
        ) : (
          col.tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpenTask} />)
        )}
      </div>

      {/* Nút thêm task */}
      <div style={{ padding: '6px 8px 10px' }}>
        <Button
          type="text"
          icon={<PlusOutlined />}
          size="small"
          style={{ width: '100%', color: '#8c8c8c', textAlign: 'left' }}
          onClick={() => onAddTask(col)}
        >
          Thêm task
        </Button>
      </div>
    </div>
  );
};

// ─── BoardsPage ──────────────────────────────────────────────
const BoardsPage: React.FC = () => {
  const { projects, fetchProjects } = useProjectStore();
  const {
    boards,
    currentBoard,
    isLoading,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    fetchKanban,
    createColumn,
    updateColumn,
    deleteColumn,
    moveColumn,
  } = useBoardStore();
  const { createTask } = useTaskStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeBoardId, setActiveBoardId] = useState<string>('');

  // Board modal
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [boardForm] = Form.useForm();
  const [boardSaving, setBoardSaving] = useState(false);

  // Column modal
  const [colModalOpen, setColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<KanbanColumn | null>(null);
  const [colForm] = Form.useForm();
  const [colSaving, setColSaving] = useState(false);

  // Task modal — boardId + columnId xác định bởi vị trí user click
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState<KanbanColumn | null>(null);
  const [taskForm] = Form.useForm();
  const [taskSaving, setTaskSaving] = useState(false);

  // Task detail drawer
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Load projects khi vào trang
  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, []);

  // Chọn project mặc định
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  // Load boards khi chọn project
  useEffect(() => {
    if (selectedProjectId) {
      fetchBoards(selectedProjectId).then(() => {
        // activeBoardId sẽ được set từ boards effect
      });
      setActiveBoardId('');
    }
  }, [selectedProjectId]);

  // Chọn board đầu tiên khi boards thay đổi
  useEffect(() => {
    if (boards.length > 0 && !activeBoardId) {
      setActiveBoardId(boards[0].id);
    }
  }, [boards]);

  // Load kanban khi chọn board
  useEffect(() => {
    if (activeBoardId) fetchKanban(activeBoardId);
  }, [activeBoardId]);

  // ── Board CRUD ──────────────────────────────────────────────

  const openCreateBoard = () => {
    setEditingBoard(null);
    boardForm.resetFields();
    setBoardModalOpen(true);
  };

  const openEditBoard = (board: Board) => {
    setEditingBoard(board);
    boardForm.setFieldsValue({ name: board.name, description: board.description });
    setBoardModalOpen(true);
  };

  const handleBoardSubmit = async (values: any) => {
    setBoardSaving(true);
    try {
      if (editingBoard) {
        await updateBoard(editingBoard.id, values);
        message.success('Đã cập nhật board');
      } else {
        const created = await createBoard(selectedProjectId, values);
        setActiveBoardId(created.id);
        message.success('Đã tạo board mới');
      }
      setBoardModalOpen(false);
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally {
      setBoardSaving(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    try {
      await deleteBoard(boardId);
      setActiveBoardId(boards.find((b) => b.id !== boardId)?.id ?? '');
      message.success('Đã xóa board');
    } catch (e: any) {
      message.error(e.message || 'Xóa board thất bại');
    }
  };

  // ── Column CRUD ─────────────────────────────────────────────

  const openCreateColumn = () => {
    setEditingCol(null);
    colForm.resetFields();
    colForm.setFieldsValue({ color: '#1890ff' });
    setColModalOpen(true);
  };

  const openEditColumn = (col: KanbanColumn) => {
    setEditingCol(col);
    colForm.setFieldsValue({
      name: col.name,
      color: col.color || '#1890ff',
      isCompleted: col.isCompleted ?? false,
      taskLimit: col.taskLimit ?? null,
    });
    setColModalOpen(true);
  };

  const handleColSubmit = async (values: any) => {
    if (!activeBoardId) return;
    setColSaving(true);
    const payload = {
      name: values.name,
      color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.() ?? '#1890ff',
      isCompleted: values.isCompleted ?? false,
      taskLimit: values.taskLimit ?? undefined,
    };
    try {
      if (editingCol) {
        await updateColumn(editingCol.id, payload);
        message.success('Đã cập nhật cột');
      } else {
        await createColumn(activeBoardId, payload);
        message.success('Đã thêm cột mới');
      }
      setColModalOpen(false);
    } catch (e: any) {
      message.error(e.message || 'Thao tác thất bại');
    } finally {
      setColSaving(false);
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    try {
      await deleteColumn(colId);
      message.success('Đã xóa cột');
    } catch (e: any) {
      message.error(e.message || 'Xóa cột thất bại');
    }
  };

  const handleMoveColumn = async (colId: string, fromIndex: number, direction: 'left' | 'right') => {
    const newPosition = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    try {
      await moveColumn(colId, newPosition);
    } catch {
      message.error('Di chuyển cột thất bại');
    }
  };

  // ── Add Task vào cột ────────────────────────────────────────

  const openAddTask = (col: KanbanColumn) => {
    setTargetColumn(col);
    taskForm.resetFields();
    setTaskModalOpen(true);
  };

  const handleTaskSubmit = async (values: any) => {
    // Ưu tiên projectId từ currentBoard (đáng tin cậy hơn selectedProjectId)
    const projectId = currentBoard?.projectId || selectedProjectId;
    if (!projectId || !targetColumn || !activeBoardId) return;

    setTaskSaving(true);
    try {
      const payload: import('../types').CreateTaskRequest = {
        title: values.title as string,
        description: values.description || undefined,
        priority: (values.priority as import('../types').TaskPriority) || TaskPriority.MEDIUM,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        boardId: activeBoardId,    // board đang mở — không hỏi user
        columnId: targetColumn.id, // cột user click — không hỏi user
      };
      await createTask(projectId, payload);
      message.success(`Đã thêm task vào cột "${targetColumn.name}"`);
      setTaskModalOpen(false);
      fetchKanban(activeBoardId);
    } catch (e: any) {
      message.error(e.message || 'Tạo task thất bại');
    } finally {
      setTaskSaving(false);
    }
  };

  // ── Tab items ───────────────────────────────────────────────

  const tabItems = boards.map((board) => ({
    key: board.id,
    label: (
      <span>
        {board.isDefault && <AppstoreOutlined style={{ marginRight: 4, color: '#1890ff' }} />}
        {board.name}
      </span>
    ),
  }));

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const columns = currentBoard?.boardId === activeBoardId ? currentBoard.columns : [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Title level={2} style={{ margin: 0 }}>
          Bảng công việc
        </Title>
        <Select
          style={{ width: 240 }}
          placeholder="Chọn project"
          value={selectedProjectId || undefined}
          onChange={(v) => setSelectedProjectId(v)}
          options={projects.map((p) => ({
            label: `[${p.key}] ${p.name}`,
            value: p.id,
          }))}
        />
      </div>

      {!selectedProjectId ? (
        <Empty description="Vui lòng chọn dự án" />
      ) : (
        <>
          {/* Board tabs + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Tabs
                activeKey={activeBoardId}
                onChange={(key) => setActiveBoardId(key)}
                items={tabItems}
                style={{ marginBottom: 0 }}
                tabBarExtraContent={
                  <Space>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={openCreateBoard}
                    >
                      Tạo board
                    </Button>
                    {activeBoard && (
                      <>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEditBoard(activeBoard)}
                        >
                          Sửa
                        </Button>
                        <Popconfirm
                          title={`Xóa board "${activeBoard.name}"?`}
                          onConfirm={() => handleDeleteBoard(activeBoard.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            Xóa
                          </Button>
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                }
              />
            </div>
          </div>

          {/* Kanban view */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
            </div>
          ) : boards.length === 0 ? (
            <Empty
              description="Chưa có board nào"
              style={{ marginTop: 60 }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateBoard}>
                Tạo board đầu tiên
              </Button>
            </Empty>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 16,
                paddingTop: 12,
                minHeight: 400,
                alignItems: 'flex-start',
              }}
            >
              {columns
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((col, index) => (
                  <ColumnCard
                    key={col.id}
                    col={col}
                    index={index}
                    total={columns.length}
                    onEdit={openEditColumn}
                    onDelete={handleDeleteColumn}
                    onMoveLeft={(id, idx) => handleMoveColumn(id, idx, 'left')}
                    onMoveRight={(id, idx) => handleMoveColumn(id, idx, 'right')}
                    onAddTask={openAddTask}
                    onOpenTask={(id) => setSelectedTaskId(id)}
                  />
                ))}

              {/* Nút thêm cột */}
              <div style={{ minWidth: 200 }}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  style={{ width: 200, height: 48 }}
                  onClick={openCreateColumn}
                >
                  Thêm cột
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal tạo/sửa Board */}
      <Modal
        title={editingBoard ? 'Chỉnh sửa bảng' : 'Tạo bảng mới'}
        open={boardModalOpen}
        onCancel={() => setBoardModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={boardForm} layout="vertical" onFinish={handleBoardSubmit}>
          <Form.Item
            name="name"
            label="Tên board"
            rules={[{ required: true, message: 'Vui lòng nhập tên board' }]}
          >
            <Input placeholder="VD: Sprint 1" maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả board (tùy chọn)" maxLength={500} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={boardSaving}>
                {editingBoard ? 'Cập nhật' : 'Tạo mới'}
              </Button>
              <Button onClick={() => setBoardModalOpen(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* bModal tạo/sửa Column */}
      <Modal
        title={editingCol ? 'Chỉnh sửa cột' : 'Thêm cột mới'}
        open={colModalOpen}
        onCancel={() => setColModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={colForm} layout="vertical" onFinish={handleColSubmit}>
          <Form.Item
            name="name"
            label="Tên cột"
            rules={[{ required: true, message: 'Vui lòng nhập tên cột' }]}
          >
            <Input placeholder="VD: Việc cần làm, Đang làm, Hoàn thành..." maxLength={80} />
          </Form.Item>

          <Form.Item name="color" label="Màu cột">
            <ColorPicker format="hex" />
          </Form.Item>

          <Form.Item name="taskLimit" label="Giới hạn task (tùy chọn)">
            <InputNumber
              min={1}
              max={999}
              style={{ width: '100%' }}
              placeholder="Không giới hạn"
            />
          </Form.Item>

          <Form.Item name="isCompleted" valuePropName="checked">
            <Checkbox>Cột hoàn thành (task ở đây = Done)</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={colSaving}>
                {editingCol ? 'Cập nhật' : 'Thêm cột'}
              </Button>
              <Button onClick={() => setColModalOpen(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer xem / sửa / xóa task */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => activeBoardId && fetchKanban(activeBoardId)}
        onDeleted={() => activeBoardId && fetchKanban(activeBoardId)}
      />

      {/* Modal tạo Task — boardId + columnId ẩn, lấy từ context */}
      <Modal
        title={
          targetColumn ? (
            <Space>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: targetColumn.color || '#1890ff',
                  display: 'inline-block',
                }}
              />
              Thêm task vào cột "{targetColumn.name}"
            </Space>
          ) : 'Thêm task'
        }
        open={taskModalOpen}
        onCancel={() => { setTaskModalOpen(false); taskForm.resetFields(); }}
        footer={null}
        destroyOnHidden
        width={520}
      >
        <Form
          form={taskForm}
          layout="vertical"
          onFinish={handleTaskSubmit}
          style={{ marginTop: 8 }}
          initialValues={{ priority: TaskPriority.MEDIUM }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề task' }]}
          >
            <Input placeholder="Tên công việc..." maxLength={200} autoFocus />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết (tùy chọn)" maxLength={2000} />
          </Form.Item>

          <Form.Item name="priority" label="Mức ưu tiên">
            <Select
              options={[
                { label: <Tag color="green">Thấp</Tag>,      value: TaskPriority.LOW },
                { label: <Tag color="blue">Trung bình</Tag>, value: TaskPriority.MEDIUM },
                { label: <Tag color="orange">Cao</Tag>,       value: TaskPriority.HIGH },
                { label: <Tag color="red">Khẩn cấp</Tag>,    value: TaskPriority.URGENT },
              ]}
            />
          </Form.Item>

          <Form.Item name="dueDate" label="Hạn chót">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={taskSaving}>
                Tạo task
              </Button>
              <Button onClick={() => { setTaskModalOpen(false); taskForm.resetFields(); }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BoardsPage;
