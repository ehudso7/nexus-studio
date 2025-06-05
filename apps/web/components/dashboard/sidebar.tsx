'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@nexus/ui';
import {
  Home,
  FolderOpen,
  Component,
  Database,
  Workflow,
  Rocket,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Components', href: '/dashboard/components', icon: Component },
  { name: 'Database', href: '/dashboard/database', icon: Database },
  { name: 'Workflows', href: '/dashboard/workflows', icon: Workflow },
  { name: 'Deployments', href: '/dashboard/deployments', icon: Rocket },
];

const secondaryNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help & Support', href: '/dashboard/help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-gray-800 dark:bg-gray-950">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-white">Nexus Studio</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              <Link
                href="/dashboard/projects/new"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 mb-4"
              >
                <Plus className="mr-3 h-5 w-5" />
                New Project
              </Link>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      pathname === item.href
                        ? 'text-gray-300'
                        : 'text-gray-400 group-hover:text-gray-300',
                      'mr-3 h-5 w-5'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="px-2 space-y-1">
              {secondaryNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      pathname === item.href
                        ? 'text-gray-300'
                        : 'text-gray-400 group-hover:text-gray-300',
                      'mr-3 h-5 w-5'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={() => {
                  // Handle logout
                }}
                className="w-full text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <LogOut
                  className="text-gray-400 group-hover:text-gray-300 mr-3 h-5 w-5"
                  aria-hidden="true"
                />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}