import React from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userService } from '../services/userService';

const { Title, Text } = Typography;

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearMustChangePassword, logout } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setLoading(true);
    try {
      await userService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      message.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      clearMustChangePassword();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      message.error(error.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 440, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <KeyOutlined style={{ fontSize: 40, color: '#1890ff', marginBottom: 12 }} />
          <Title level={3} style={{ margin: 0 }}>
            Đổi mật khẩu
          </Title>
        </div>

        <Alert
          message="Bắt buộc đổi mật khẩu"
          description="Tài khoản của bạn đang dùng mật khẩu tạm thời. Vui lòng đặt mật khẩu mới để tiếp tục."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="currentPassword"
            label="Mật khẩu tạm thời"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu tạm thời!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu do quản trị viên cấp"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu mới"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập lại mật khẩu mới"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              Xác nhận đổi mật khẩu
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Muốn đăng nhập tài khoản khác?{' '}
              <a onClick={handleLogout}>Đăng xuất</a>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
