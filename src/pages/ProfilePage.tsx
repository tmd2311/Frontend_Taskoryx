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
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { userService } from '../services/userService';
import type { UpdateProfileRequest, ChangePasswordRequest } from '../types';

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

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
          ]}
        />
      </Card>
    </div>
  );
};

export default ProfilePage;
