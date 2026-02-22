import React from 'react';
import { Typography, Row, Col, Card, Statistic } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div>
      <Title level={2}>Welcome back, {user?.fullName || user?.username}!</Title>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={24}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={8}
              valueStyle={{ color: '#faad14' }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending"
              value={12}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={4}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Activities" bordered={false}>
            <p>No recent activities</p>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Upcoming Deadlines" bordered={false}>
            <p>No upcoming deadlines</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
