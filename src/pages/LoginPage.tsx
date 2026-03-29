import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Alert, Steps } from 'antd';
import {
  UserOutlined, LockOutlined, SafetyCertificateOutlined,
  AppstoreOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { LoginRequest } from '../types';

const { Title, Text } = Typography;

const features = [
  'Quản lý dự án & sprint theo mô hình Scrum',
  'Bảng Kanban kéo-thả trực quan',
  'Theo dõi giờ làm & tiến độ theo thời gian thực',
  'Thông báo realtime qua WebSocket',
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form] = Form.useForm();
  const [totpForm] = Form.useForm();

  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [pendingCredentials, setPendingCredentials] = useState<LoginRequest | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);

  const onFinish = async (values: LoginRequest) => {
    try {
      const result = await login(values);
      if (result?.twoFactorRequired) {
        setPendingCredentials(values);
        setStep('totp');
        return;
      }
      const state = useAuthStore.getState();
      if (state.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        message.success('Đăng nhập thành công!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      message.error(error.message || 'Email hoặc mật khẩu không đúng');
    }
  };

  const onTotpFinish = async (values: { totpCode: string }) => {
    if (!pendingCredentials) return;
    setTotpLoading(true);
    setTotpError(null);
    try {
      await login({ ...pendingCredentials, totpCode: values.totpCode } as any);
      const state = useAuthStore.getState();
      if (state.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        message.success('Đăng nhập thành công!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setTotpError(err.message || 'Mã xác thực không hợp lệ');
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      {/* ─── Left branding panel ─── */}
      <div style={{
        flex: '0 0 480px',
        background: 'linear-gradient(145deg, #4361ee 0%, #7c3aed 60%, #a855f7 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="login-brand-panel"
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 260, height: 260,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -40,
          width: 320, height: 320,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <img
            src="/logo.png"
            alt="logo"
            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>Taskoryx</span>
        </div>

        <Title level={2} style={{ color: '#fff', marginBottom: 12, fontWeight: 700, lineHeight: 1.3 }}>
          Quản lý công việc<br />thông minh hơn
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.7, marginBottom: 40, display: 'block' }}>
          Nền tảng quản lý dự án toàn diện, giúp nhóm của bạn làm việc hiệu quả hơn mỗi ngày.
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {features.map((feat) => (
            <div key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircleFilled style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, marginTop: 2 }} />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{feat}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {step === 'credentials' ? (
            <>
              <div style={{ marginBottom: 32 }}>
                <Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>Chào mừng trở lại</Title>
                <Text type="secondary" style={{ fontSize: 15 }}>Đăng nhập để tiếp tục làm việc</Text>
              </div>

              <Form form={form} name="login" onFinish={onFinish} autoComplete="off" layout="vertical" size="large">
                <Form.Item
                  name="email"
                  label={<Text strong style={{ fontSize: 13 }}>Email</Text>}
                  rules={[
                    { required: true, message: 'Vui lòng nhập email!' },
                    { type: 'email', message: 'Email không hợp lệ!' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#8c9ab0' }} />}
                    placeholder="name@company.com"
                    style={{ borderRadius: 10, height: 48 }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<Text strong style={{ fontSize: 13 }}>Mật khẩu</Text>}
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#8c9ab0' }} />}
                    placeholder="••••••••"
                    style={{ borderRadius: 10, height: 48 }}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isLoading}
                    block
                    style={{ height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15 }}
                  >
                    Đăng nhập
                  </Button>
                </Form.Item>
              </Form>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>Xác thực 2 yếu tố</Title>
                <Text type="secondary" style={{ fontSize: 15 }}>Nhập mã từ ứng dụng Authenticator</Text>
              </div>

              <Steps
                size="small"
                current={1}
                items={[{ title: 'Tài khoản' }, { title: '2FA', icon: <SafetyCertificateOutlined /> }]}
                style={{ marginBottom: 24 }}
              />

              {totpError && (
                <Alert
                  type="error"
                  message={totpError}
                  style={{ marginBottom: 16, borderRadius: 10 }}
                  closable
                  onClose={() => setTotpError(null)}
                />
              )}

              <Form form={totpForm} onFinish={onTotpFinish} layout="vertical" size="large">
                <Form.Item
                  name="totpCode"
                  label={<Text strong style={{ fontSize: 13 }}>Mã xác thực (6 chữ số)</Text>}
                  rules={[
                    { required: true, message: 'Nhập mã xác thực' },
                    { len: 6, message: 'Mã gồm 6 chữ số' },
                  ]}
                >
                  <Input
                    prefix={<SafetyCertificateOutlined style={{ color: '#8c9ab0' }} />}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    style={{ borderRadius: 10, height: 48, letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={totpLoading}
                    block
                    style={{ height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15 }}
                  >
                    Xác nhận đăng nhập
                  </Button>
                </Form.Item>
              </Form>

              <div style={{ textAlign: 'center' }}>
                <Button
                  type="link"
                  onClick={() => { setStep('credentials'); setTotpError(null); }}
                  style={{ color: '#4361ee' }}
                >
                  ← Quay lại đăng nhập
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Responsive: hide brand panel on small screens ─── */}
      <style>{`
        @media (max-width: 768px) {
          .login-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
