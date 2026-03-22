import React, { useEffect, useState } from 'react';
import {
  Typography,
  Tabs,
  Form,
  Input,
  Button,
  Avatar,
  Card,
  Row,
  Col,
  Space,
  Tag,
  Divider,
  Alert,
  message,
  Select,
  Modal,
  Image,
  Spin,
  Switch,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import type { UpdateProfileRequest, ChangePasswordRequest, TwoFactorSetupResponse } from '../types';

const { Title, Text } = Typography;

const TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'UTC',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuthStore();

  const [profileForm] = Form.useForm<UpdateProfileRequest>();
  const [passwordForm] = Form.useForm<ChangePasswordRequest>();
  const [twoFaForm] = Form.useForm<{ code: string }>();

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(user?.twoFactorEnabled ?? false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    // Kiểm tra trạng thái 2FA từ server
    const fetchStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await authService.twoFactorStatus();
        setTwoFaEnabled(res.enabled);
      } catch {
        // dùng giá trị từ user profile
      } finally {
        setStatusLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleSetup2FA = async () => {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      const data = await authService.twoFactorSetup();
      setSetupData(data);
      twoFaForm.resetFields();
      setShowSetupModal(true);
    } catch (err: any) {
      setTwoFaError(err.message || 'Không thể thiết lập 2FA');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleEnable2FA = async (values: { code: string }) => {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      await authService.twoFactorEnable({ code: values.code });
      setTwoFaEnabled(true);
      setShowSetupModal(false);
      setSetupData(null);
      message.success('Đã bật xác thực 2 yếu tố!');
    } catch (err: any) {
      setTwoFaError(err.message || 'Mã xác thực không hợp lệ');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisable2FA = async (values: { code: string }) => {
    setTwoFaLoading(true);
    setTwoFaError(null);
    try {
      await authService.twoFactorDisable({ code: values.code });
      setTwoFaEnabled(false);
      setShowDisableModal(false);
      twoFaForm.resetFields();
      message.success('Đã tắt xác thực 2 yếu tố');
    } catch (err: any) {
      setTwoFaError(err.message || 'Mã xác thực không hợp lệ');
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Điền sẵn form với dữ liệu hiện tại
  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
        language: user.language,
      });
    }
  }, [user, profileForm]);

  const handleProfileSave = async (values: UpdateProfileRequest) => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateProfile(values);
      message.success('Cập nhật hồ sơ thành công!');
    } catch (err: any) {
      setProfileError(err.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (values: ChangePasswordRequest) => {
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await userService.changePassword(values);
      message.success('Đổi mật khẩu thành công!');
      passwordForm.resetFields();
    } catch (err: any) {
      setPasswordError(err.message || 'Không thể đổi mật khẩu');
    } finally {
      setPasswordSaving(false);
    }
  };

  const avatarUrl = user?.avatarUrl;
  const displayName = user?.fullName || user?.username || '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        Hồ sơ cá nhân
      </Title>

      {/* User summary card */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Avatar
              size={80}
              src={avatarUrl}
              icon={!avatarUrl ? <UserOutlined /> : undefined}
              style={{ background: '#1890ff', fontSize: 32, flexShrink: 0 }}
            >
              {!avatarUrl && initial}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>
              {displayName}
            </Title>
            <Space size={4} style={{ marginTop: 4 }}>
              <MailOutlined style={{ color: '#888' }} />
              <Text type="secondary">{user?.email}</Text>
            </Space>
            <br />
            <Space size={8} style={{ marginTop: 8 }} wrap>
              <Tag icon={<UserOutlined />} color="blue">
                @{user?.username}
              </Tag>
              {user?.emailVerified && (
                <Tag color="green">Email đã xác thực</Tag>
              )}
              {user?.isActive === false && (
                <Tag color="red">Tài khoản bị khóa</Tag>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Modal thiết lập 2FA */}
      <Modal
        title={<Space><QrcodeOutlined />Thiết lập xác thực 2 yếu tố</Space>}
        open={showSetupModal}
        onCancel={() => { setShowSetupModal(false); setSetupData(null); setTwoFaError(null); }}
        footer={null}
        width={480}
      >
        {setupData ? (
          <div style={{ textAlign: 'center' }}>
            <Alert
              type="info"
              message="Scan QR code bằng Google Authenticator hoặc ứng dụng TOTP tương tự"
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 16 }}>
              <Image src={setupData.qrCodeUrl} width={200} preview={false} />
            </div>
            <div style={{ marginBottom: 16, background: '#f5f5f5', padding: '8px 12px', borderRadius: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Secret key (nhập thủ công)</Text>
              <br />
              <Text copyable strong style={{ fontFamily: 'monospace' }}>{setupData.secret}</Text>
            </div>
            {twoFaError && (
              <Alert type="error" message={twoFaError} style={{ marginBottom: 12 }} closable onClose={() => setTwoFaError(null)} />
            )}
            <Form form={twoFaForm} onFinish={handleEnable2FA} layout="inline" style={{ justifyContent: 'center' }}>
              <Form.Item name="code" rules={[
                { required: true, message: 'Nhập mã' },
                { len: 6, message: 'Mã gồm 6 chữ số' },
              ]}>
                <Input placeholder="Mã 6 chữ số" maxLength={6} style={{ width: 160 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={twoFaLoading} icon={<SafetyCertificateOutlined />}>
                  Kích hoạt
                </Button>
              </Form.Item>
            </Form>
          </div>
        ) : <div style={{ textAlign: 'center' }}><Spin /></div>}
      </Modal>

      {/* Modal tắt 2FA */}
      <Modal
        title="Tắt xác thực 2 yếu tố"
        open={showDisableModal}
        onCancel={() => { setShowDisableModal(false); setTwoFaError(null); twoFaForm.resetFields(); }}
        footer={null}
        width={380}
      >
        <Alert type="warning" message="Nhập mã từ ứng dụng Authenticator để xác nhận tắt 2FA" style={{ marginBottom: 16 }} />
        {twoFaError && (
          <Alert type="error" message={twoFaError} style={{ marginBottom: 12 }} closable onClose={() => setTwoFaError(null)} />
        )}
        <Form form={twoFaForm} onFinish={handleDisable2FA} layout="inline" style={{ justifyContent: 'center' }}>
          <Form.Item name="code" rules={[{ required: true, message: 'Nhập mã' }, { len: 6 }]}>
            <Input placeholder="Mã 6 chữ số" maxLength={6} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item>
            <Button danger htmlType="submit" loading={twoFaLoading}>Tắt 2FA</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Tabs */}
      <Card style={{ borderRadius: 8 }}>
        <Tabs
          defaultActiveKey="profile"
          items={[
            {
              key: 'profile',
              label: (
                <Space>
                  <EditOutlined />
                  Thông tin cá nhân
                </Space>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  {profileError && (
                    <Alert
                      type="error"
                      message={profileError}
                      style={{ marginBottom: 16 }}
                      closable
                      onClose={() => setProfileError(null)}
                    />
                  )}

                  <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleProfileSave}
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Username">
                          <Input
                            value={user?.username}
                            disabled
                            prefix={<UserOutlined />}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Email">
                          <Input
                            value={user?.email}
                            disabled
                            prefix={<MailOutlined />}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '4px 0 16px' }} />

                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="fullName" label="Họ và tên">
                          <Input placeholder="Nguyễn Văn A" prefix={<UserOutlined />} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="phone"
                          label="Số điện thoại"
                          rules={[
                            {
                              pattern: /^[0-9+\-\s()]{0,20}$/,
                              message: 'Số điện thoại không hợp lệ',
                            },
                          ]}
                        >
                          <Input placeholder="0901234567" prefix={<PhoneOutlined />} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name="avatarUrl"
                      label="URL ảnh đại diện"
                      rules={[
                        {
                          type: 'url',
                          message: 'Vui lòng nhập URL hợp lệ',
                          warningOnly: true,
                        },
                      ]}
                    >
                      <Input placeholder="https://example.com/avatar.png" />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="timezone" label="Múi giờ">
                          <Select
                            placeholder="Chọn múi giờ"
                            suffixIcon={<ClockCircleOutlined />}
                            allowClear
                          >
                            {TIMEZONES.map((tz) => (
                              <Select.Option key={tz} value={tz}>
                                {tz}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="language" label="Ngôn ngữ">
                          <Select
                            placeholder="Chọn ngôn ngữ"
                            suffixIcon={<GlobalOutlined />}
                            allowClear
                          >
                            {LANGUAGES.map((l) => (
                              <Select.Option key={l.value} value={l.value}>
                                {l.label}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={profileSaving}
                      >
                        Lưu thay đổi
                      </Button>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: 'password',
              label: (
                <Space>
                  <LockOutlined />
                  Đổi mật khẩu
                </Space>
              ),
              children: (
                <div style={{ paddingTop: 8, maxWidth: 480 }}>
                  {passwordError && (
                    <Alert
                      type="error"
                      message={passwordError}
                      style={{ marginBottom: 16 }}
                      closable
                      onClose={() => setPasswordError(null)}
                    />
                  )}

                  <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordChange}
                  >
                    <Form.Item
                      name="currentPassword"
                      label="Mật khẩu hiện tại"
                      rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
                    >
                      <Input.Password
                        placeholder="••••••••"
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>

                    <Form.Item
                      name="newPassword"
                      label="Mật khẩu mới"
                      rules={[
                        { required: true, message: 'Nhập mật khẩu mới' },
                        { min: 6, message: 'Mật khẩu ít nhất 6 ký tự' },
                      ]}
                    >
                      <Input.Password
                        placeholder="••••••••"
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="Xác nhận mật khẩu mới"
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: 'Xác nhận mật khẩu mới' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        placeholder="••••••••"
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<LockOutlined />}
                        loading={passwordSaving}
                      >
                        Đổi mật khẩu
                      </Button>
                    </div>
                  </Form>
                </div>
              ),
            },
            {
              key: '2fa',
              label: (
                <Space>
                  <SafetyCertificateOutlined />
                  Bảo mật 2FA
                </Space>
              ),
              children: (
                <div style={{ paddingTop: 8, maxWidth: 480 }}>
                  <Alert
                    type="info"
                    message="Xác thực 2 yếu tố (2FA)"
                    description="Bật 2FA để bảo vệ tài khoản bằng mã TOTP từ Google Authenticator."
                    style={{ marginBottom: 24 }}
                  />
                  {statusLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                  ) : (
                    <Card size="small">
                      <Row align="middle" justify="space-between">
                        <Col>
                          <Space>
                            <SafetyCertificateOutlined style={{ fontSize: 20, color: twoFaEnabled ? '#52c41a' : '#8c8c8c' }} />
                            <div>
                              <Text strong>Xác thực 2 yếu tố</Text>
                              <br />
                              <Tag color={twoFaEnabled ? 'green' : 'default'}>
                                {twoFaEnabled ? 'Đang bật' : 'Đang tắt'}
                              </Tag>
                            </div>
                          </Space>
                        </Col>
                        <Col>
                          <Switch
                            checked={twoFaEnabled}
                            loading={twoFaLoading}
                            onChange={(checked) => {
                              if (checked) {
                                handleSetup2FA();
                              } else {
                                twoFaForm.resetFields();
                                setTwoFaError(null);
                                setShowDisableModal(true);
                              }
                            }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default ProfilePage;
