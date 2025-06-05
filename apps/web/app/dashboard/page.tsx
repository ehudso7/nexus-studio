'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  FolderOpen, 
  Clock, 
  Users, 
  BarChart,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useProjects, useCreateProject, useMe } from '@/lib/graphql/hooks';
import { setAuthToken } from '@/lib/graphql-client';

export default function DashboardPage() {
  const router = useRouter();
  
  // Set auth token from localStorage if available
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      setAuthToken(token);
    } else {
      router.push('/auth/signin');
    }
  }, [router]);

  // GraphQL queries
  const { data: user, isLoading: userLoading } = useMe();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const createProjectMutation = useCreateProject();

  const loading = userLoading || projectsLoading;

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, userLoading, router]);

  const stats = {
    totalProjects: projects?.length || 0,
    totalDeployments: projects?.reduce((sum: number, p: any) => sum + (p._count?.deployments || 0), 0) || 0,
    activeCollaborators: 1,
    apiCalls: 0
  };

  const createNewProject = async () => {
    try {
      const newProject = await createProjectMutation.mutateAsync({
        name: 'Untitled Project',
        description: 'A new web application'
      });
      
      // Redirect to builder
      router.push(`/projects/${newProject.id}/builder`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name || user?.email}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem('auth-token');
                  router.push('/');
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Projects"
            value={stats.totalProjects}
            icon={<FolderOpen className="h-4 w-4" />}
            description="Active projects"
          />
          <StatsCard
            title="Deployments"
            value={stats.totalDeployments}
            icon={<BarChart className="h-4 w-4" />}
            description="This month"
          />
          <StatsCard
            title="Collaborators"
            value={stats.activeCollaborators}
            icon={<Users className="h-4 w-4" />}
            description="Team members"
          />
          <StatsCard
            title="API Calls"
            value={stats.apiCalls}
            icon={<Clock className="h-4 w-4" />}
            description="Last 30 days"
          />
        </div>

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Projects</h2>
            <Button onClick={createNewProject} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>

          {!projects || projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-4">Create your first project to get started</p>
                <Button onClick={createNewProject} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects?.map((project: any) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Use AI to generate components and optimize your code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>
                Learn how to build amazing applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/docs">
                <Button variant="link" className="p-0 h-auto">
                  Documentation →
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="link" className="p-0 h-auto">
                  Templates →
                </Button>
              </Link>
              <Link href="/community">
                <Button variant="link" className="p-0 h-auto">
                  Community →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  description 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }: { project: any }) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <Link href={`/projects/${project.id}/builder`}>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>{project.description || 'No description'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{project._count?.pages || 0} pages</span>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}