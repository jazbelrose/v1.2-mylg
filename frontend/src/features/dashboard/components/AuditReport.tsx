import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Button, Select, DatePicker, Row, Col, Statistic, Progress, Table, Tag } from 'antd';
import { DownloadOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface AuditReportData {
  metadata: {
    generatedAt: string;
    reportDate: string;
    version: string;
    includeDetails: boolean;
  };
  summary: {
    projects?: {
      totalProjects: number;
      projectsModifiedOnDate: number;
      statusDistribution: Record<string, number>;
      avgBudget: number;
      avgTeamSize: number;
    };
    budgets?: {
      totalBudgetItems: number;
      budgetItemsModifiedOnDate: number;
      totalAllocated: number;
      totalSpent: number;
      avgItemValue: number;
      categoryDistribution: Record<string, number>;
    };
    userActivity?: {
      totalUsers: number;
      activeUsersOnDate: number;
      newUsersOnDate: number;
      roleDistribution: Record<string, number>;
      avgProjectsPerUser: number;
    };
    events?: {
      totalEvents: number;
      eventsOnDate: number;
      totalTasks: number;
      tasksOnDate: number;
      totalHoursLogged: number;
      avgHoursPerEvent: number;
      taskStatusDistribution: Record<string, number>;
    };
    systemHealth?: {
      date: string;
      apiResponseTime: string;
      errorRate: string;
      uptime: string;
      databaseConnections: string;
      memoryUsage: string;
      cpuUsage: string;
      storageUtilization: string;
      activeConnections: number;
      requestsPerMinute: number;
      lastHealthCheck: string;
    };
  };
  details?: {
    projects?: Array<{
      projectId: string;
      title: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      teamSize: number;
      budget: number;
    }>;
    budgets?: Array<{
      budgetItemId: string;
      projectId: string;
      category: string;
      amount: number;
      spent: number;
      description: string;
      createdAt: string;
      updatedAt: string;
    }>;
    userActivity?: Array<{
      userId: string;
      email: string;
      role: string;
      createdAt: string;
      lastActiveAt: string;
      projectCount: number;
    }>;
    events?: {
      events: Array<{
        eventId: string;
        projectId: string;
        description: string;
        date: string;
        hours: number;
        budgetItemId: string;
      }>;
      tasks: Array<{
        taskId: string;
        projectId: string;
        title: string;
        status: string;
        dueDate: string;
        assignedTo: string;
      }>;
    };
  };
}

const AuditReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AuditReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs('2025-09-14'));
  const [includeDetails, setIncludeDetails] = useState(true);

  const fetchAuditReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      // const params = new URLSearchParams({
      //   date: dateStr,
      //   details: includeDetails.toString()
      // });

      // In a real implementation, this would call the actual API
      // For now, we'll simulate the API call
      const mockData: AuditReportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          reportDate: dateStr,
          version: '1.2',
          includeDetails
        },
        summary: {
          projects: {
            totalProjects: 42,
            projectsModifiedOnDate: 7,
            statusDistribution: {
              'active': 25,
              'completed': 12,
              'on-hold': 3,
              'cancelled': 2
            },
            avgBudget: 85000,
            avgTeamSize: 4.2
          },
          budgets: {
            totalBudgetItems: 156,
            budgetItemsModifiedOnDate: 23,
            totalAllocated: 3580000,
            totalSpent: 2940000,
            avgItemValue: 22950,
            categoryDistribution: {
              'labor': 89,
              'materials': 34,
              'equipment': 18,
              'overhead': 15
            }
          },
          userActivity: {
            totalUsers: 127,
            activeUsersOnDate: 89,
            newUsersOnDate: 3,
            roleDistribution: {
              'Admin': 5,
              'Designer': 32,
              'Client': 45,
              'Worker': 38,
              'CEO': 2,
              'CTO': 5
            },
            avgProjectsPerUser: 2.8
          },
          events: {
            totalEvents: 234,
            eventsOnDate: 15,
            totalTasks: 187,
            tasksOnDate: 12,
            totalHoursLogged: 87.5,
            avgHoursPerEvent: 5.8,
            taskStatusDistribution: {
              'pending': 45,
              'in-progress': 67,
              'completed': 58,
              'blocked': 17
            }
          },
          systemHealth: {
            date: dateStr,
            apiResponseTime: '< 100ms',
            errorRate: '< 0.1%',
            uptime: '99.9%',
            databaseConnections: 'healthy',
            memoryUsage: 'normal',
            cpuUsage: 'optimal',
            storageUtilization: '70%',
            activeConnections: 127,
            requestsPerMinute: 450,
            lastHealthCheck: new Date().toISOString()
          }
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setReportData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audit report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleRefresh = () => {
    fetchAuditReport();
  };

  const handleExport = () => {
    if (!reportData) return;
    
    const exportData = JSON.stringify(reportData, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${reportData.metadata.reportDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStatusChart = (distribution: Record<string, number>, title: string) => {
    const data = Object.entries(distribution).map(([status, count]) => ({
      key: status,
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: Math.round((count / Object.values(distribution).reduce((a, b) => a + b, 0)) * 100)
    }));

    const columns = [
      { title: 'Status', dataIndex: 'status', key: 'status' },
      { title: 'Count', dataIndex: 'count', key: 'count' },
      { 
        title: 'Percentage', 
        dataIndex: 'percentage', 
        key: 'percentage',
        render: (value: number) => `${value}%`
      }
    ];

    return (
      <Card title={title} size="small">
        <Table dataSource={data} columns={columns} pagination={false} size="small" />
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Generating comprehensive audit report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button onClick={handleRefresh} type="primary" size="small">
            Retry
          </Button>
        }
      />
    );
  }

  if (!reportData) {
    return <div>No report data available</div>;
  }

  const { summary } = reportData;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2><BarChartOutlined /> Comprehensive Audit Report</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <DatePicker
            value={selectedDate}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
          />
          <Select
            value={includeDetails}
            onChange={setIncludeDetails}
            style={{ width: 150 }}
          >
            <Select.Option value={true}>With Details</Select.Option>
            <Select.Option value={false}>Summary Only</Select.Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      <Card title="Report Metadata" style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="Report Date" value={reportData.metadata.reportDate} />
          </Col>
          <Col span={6}>
            <Statistic title="Generated At" value={dayjs(reportData.metadata.generatedAt).format('YYYY-MM-DD HH:mm:ss')} />
          </Col>
          <Col span={6}>
            <Statistic title="Version" value={reportData.metadata.version} />
          </Col>
          <Col span={6}>
            <Tag color={reportData.metadata.includeDetails ? 'green' : 'blue'}>
              {reportData.metadata.includeDetails ? 'Detailed Report' : 'Summary Report'}
            </Tag>
          </Col>
        </Row>
      </Card>

      {summary.projects && (
        <Card title="Projects Analytics" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Total Projects" value={summary.projects.totalProjects} />
            </Col>
            <Col span={6}>
              <Statistic title="Modified on Date" value={summary.projects.projectsModifiedOnDate} />
            </Col>
            <Col span={6}>
              <Statistic title="Avg Budget" value={summary.projects.avgBudget} prefix="$" />
            </Col>
            <Col span={6}>
              <Statistic title="Avg Team Size" value={summary.projects.avgTeamSize} precision={1} />
            </Col>
          </Row>
          <div style={{ marginTop: '16px' }}>
            {renderStatusChart(summary.projects.statusDistribution, 'Project Status Distribution')}
          </div>
        </Card>
      )}

      {summary.budgets && (
        <Card title="Budget Analytics" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Total Budget Items" value={summary.budgets.totalBudgetItems} />
            </Col>
            <Col span={6}>
              <Statistic title="Total Allocated" value={summary.budgets.totalAllocated} prefix="$" />
            </Col>
            <Col span={6}>
              <Statistic title="Total Spent" value={summary.budgets.totalSpent} prefix="$" />
            </Col>
            <Col span={6}>
              <Progress 
                percent={Math.round((summary.budgets.totalSpent / summary.budgets.totalAllocated) * 100)} 
                format={(percent) => `${percent}% Utilized`}
              />
            </Col>
          </Row>
          <div style={{ marginTop: '16px' }}>
            {renderStatusChart(summary.budgets.categoryDistribution, 'Budget Category Distribution')}
          </div>
        </Card>
      )}

      {summary.userActivity && (
        <Card title="User Activity Analytics" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Total Users" value={summary.userActivity.totalUsers} />
            </Col>
            <Col span={6}>
              <Statistic title="Active on Date" value={summary.userActivity.activeUsersOnDate} />
            </Col>
            <Col span={6}>
              <Statistic title="New Users" value={summary.userActivity.newUsersOnDate} />
            </Col>
            <Col span={6}>
              <Statistic title="Avg Projects/User" value={summary.userActivity.avgProjectsPerUser} precision={1} />
            </Col>
          </Row>
          <div style={{ marginTop: '16px' }}>
            {renderStatusChart(summary.userActivity.roleDistribution, 'User Role Distribution')}
          </div>
        </Card>
      )}

      {summary.events && (
        <Card title="Events & Tasks Analytics" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Events on Date" value={summary.events.eventsOnDate} />
            </Col>
            <Col span={6}>
              <Statistic title="Tasks on Date" value={summary.events.tasksOnDate} />
            </Col>
            <Col span={6}>
              <Statistic title="Hours Logged" value={summary.events.totalHoursLogged} suffix="h" />
            </Col>
            <Col span={6}>
              <Statistic title="Avg Hours/Event" value={summary.events.avgHoursPerEvent} precision={1} suffix="h" />
            </Col>
          </Row>
          <div style={{ marginTop: '16px' }}>
            {renderStatusChart(summary.events.taskStatusDistribution, 'Task Status Distribution')}
          </div>
        </Card>
      )}

      {summary.systemHealth && (
        <Card title="System Health Metrics" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic title="API Response" value={summary.systemHealth.apiResponseTime} />
            </Col>
            <Col span={4}>
              <Statistic title="Error Rate" value={summary.systemHealth.errorRate} />
            </Col>
            <Col span={4}>
              <Statistic title="Uptime" value={summary.systemHealth.uptime} />
            </Col>
            <Col span={4}>
              <Statistic title="Storage" value={summary.systemHealth.storageUtilization} />
            </Col>
            <Col span={4}>
              <Statistic title="Active Connections" value={summary.systemHealth.activeConnections} />
            </Col>
            <Col span={4}>
              <Statistic title="Requests/Min" value={summary.systemHealth.requestsPerMinute} />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default AuditReport;