'use client';

import Link from 'next/link';
import { Globe, Smartphone, Monitor, MoreVertical } from 'lucide-react';

const mockProjects = [
  {
    id: '1',
    name: 'E-commerce Platform',
    type: 'WEB',
    status: 'PUBLISHED',
    thumbnail: '/api/placeholder/400/300',
    lastUpdated: '2 hours ago',
  },
  {
    id: '2',
    name: 'Mobile Banking App',
    type: 'MOBILE',
    status: 'DRAFT',
    thumbnail: '/api/placeholder/400/300',
    lastUpdated: '1 day ago',
  },
  {
    id: '3',
    name: 'Marketing Website',
    type: 'WEB',
    status: 'PUBLISHED',
    thumbnail: '/api/placeholder/400/300',
    lastUpdated: '3 days ago',
  },
  {
    id: '4',
    name: 'Dashboard Analytics',
    type: 'WEB',
    status: 'DRAFT',
    thumbnail: '/api/placeholder/400/300',
    lastUpdated: '1 week ago',
  },
  {
    id: '5',
    name: 'Desktop Tool',
    type: 'DESKTOP',
    status: 'DRAFT',
    thumbnail: '/api/placeholder/400/300',
    lastUpdated: '2 weeks ago',
  },
  {
    id: '6',
    name: 'Social Media App',
    type: 'MOBILE',
    status: 'PUBLISHED',
    thumbnail: '/api/placeholder/400/300',
    lastUpdated: '3 weeks ago',
  },
];

const projectTypeIcons = {
  WEB: Globe,
  MOBILE: Smartphone,
  DESKTOP: Monitor,
  API: Globe,
};

interface ProjectGridProps {
  limit?: number;
}

export function ProjectGrid({ limit }: ProjectGridProps) {
  const projects = limit ? mockProjects.slice(0, limit) : mockProjects;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const Icon = projectTypeIcons[project.type as keyof typeof projectTypeIcons];
        return (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className="group relative bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
              <div className="flex items-center justify-center h-40">
                <Icon className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Updated {project.lastUpdated}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // Handle menu
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {project.status.toLowerCase()}
                </span>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Icon className="h-4 w-4 mr-1" />
                  {project.type.toLowerCase()}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}