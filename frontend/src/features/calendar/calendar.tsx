import React, { useState, useEffect, useRef } from 'react';
import ProjectPageLayout from '../project/components/ProjectPageLayout';
import ProjectHeader from '@/features/project/components/ProjectHeader';
import TimelineChart from '../project/components/TimelineChart';
import ProjectCalendar from '../project/components/ProjectCalendar';
import QuickLinksComponent from '@/features/project/components/QuickLinksComponent';
import FileManagerComponent from '../project/components/FileManager';
import { useData } from '@/app/contexts/useData';
import { useSocket } from '../../app/contexts/SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import { findProjectBySlug, slugify } from '../../shared/utils/slug';
import { BudgetProvider } from '@/features/budget/context/BudgetProvider';
import type { Project } from '../../app/contexts/DataProvider';
import type { QuickLinksRef } from '@/features/project/components/QuickLinksComponent';

type TimelineMode = 'overview' | 'agenda';

type ProjectCalendarProject = {
  projectId: string;
  title?: string;
  color?: string;
  dateCreated?: string;
  productionStart?: string;
  finishline?: string;
  timelineEvents?: Array<{
    id: string;
    eventId?: string;
    date: string;
    description?: string;
    hours?: number | string;
    budgetItemId?: string | null;
    createdAt?: string;
    payload?: Record<string, unknown>;
  }>;
  address?: string;
  company?: string;
  clientName?: string;
  invoiceBrandName?: string;
  invoiceBrandAddress?: string;
  clientAddress?: string;
  invoiceBrandPhone?: string;
  clientPhone?: string;
  clientEmail?: string;
};

const CalendarPage: React.FC = () => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const navigate = useNavigate();

  const {
    activeProject: initialActiveProject,
    projects,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
    userId,
  } = useData();

  const { ws } = useSocket();

  const [activeProject, setActiveProject] = useState<Project | null>(
    (initialActiveProject as Project) || null
  );
  const [filesOpen, setFilesOpen] = useState(false);
  const quickLinksRef = useRef<QuickLinksRef | null>(null);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('overview');
  const [timelineDate, setTimelineDate] = useState<string | null>(null);

  useEffect(() => {
    setActiveProject((initialActiveProject as Project) || null);
  }, [initialActiveProject]);

  useEffect(() => {
    if (!initialActiveProject) return;

    if (slugify((initialActiveProject as Project).title) !== projectSlug) {
      const proj = findProjectBySlug(projects, projectSlug || '');
      if (proj) {
        fetchProjectDetails(proj.projectId);
      } else {
        navigate(`/dashboard/projects/${slugify((initialActiveProject as Project).title)}`);
      }
    }
  }, [projectSlug, projects, initialActiveProject, navigate, fetchProjectDetails]);

  useEffect(() => {
    if (!ws || !activeProject?.projectId) return;

    const payload = JSON.stringify({
      action: 'setActiveConversation',
      conversationId: `project#${activeProject.projectId}`,
    });

    const sendWhenReady = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      } else {
        const onOpen = () => {
          ws.send(payload);
          ws.removeEventListener('open', onOpen);
        };
        ws.addEventListener('open', onOpen);
      }
    };

    sendWhenReady();
  }, [ws, activeProject?.projectId]);

  const parseStatusToNumber = (statusString?: string | number | null) => {
    if (statusString === undefined || statusString === null) return 0;
    const str = typeof statusString === 'string' ? statusString : String(statusString);
    const num = parseFloat(str.replace('%', ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const handleActiveProjectChange = (updatedProject: Project) => {
    setActiveProject(updatedProject);
  };

  const handleProjectDeleted = (deletedProjectId: string) => {
    setProjects((prev: Project[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    setSelectedProjects((prev: string[]) => prev.filter((id) => id !== deletedProjectId));
    navigate('/dashboard/projects');
  };

  const handleBack = () => {
    navigate(`/dashboard/projects/${projectSlug}`);
  };

  return (
    <ProjectPageLayout
      projectId={activeProject?.projectId}
      header={
        <ProjectHeader
          activeProject={activeProject}
          parseStatusToNumber={parseStatusToNumber}
          userId={userId}
          onProjectDeleted={handleProjectDeleted}
          showWelcomeScreen={handleBack}
          onActiveProjectChange={handleActiveProjectChange}
          onOpenFiles={() => setFilesOpen(true)}
          onOpenQuickLinks={() => quickLinksRef.current?.openModal()}
        />
      }
    >
      <QuickLinksComponent ref={quickLinksRef} hideTrigger />
      <FileManagerComponent
        isOpen={filesOpen}
        onRequestClose={() => setFilesOpen(false)}
        showTrigger={false}
        folder="uploads"
      />

      <div className="dashboard-layout calendar-layout" style={{ paddingBottom: '5px' }}>
        <BudgetProvider projectId={activeProject?.projectId}>
          <ProjectCalendar
            project={activeProject as ProjectCalendarProject}
            initialFlashDate={null}
            onDateSelect={(d: string) => {
              setTimelineDate(d);
            }}
          />
        </BudgetProvider>
        <TimelineChart
          project={activeProject as {
            color?: string;
            productionStart?: string;
            dateCreated?: string;
            timelineEvents?: Array<{
              date: string;
              hours?: number | string;
              description?: string;
              phase?: string;
              type?: string;
              start?: Date | number;
              startHour?: number;
            }>;
          }}
          mode={timelineMode}
          selectedDate={timelineDate || undefined}
          onModeChange={setTimelineMode}
          onDateChange={setTimelineDate}
        />
      </div>
    </ProjectPageLayout>
  );
};

export default CalendarPage;
