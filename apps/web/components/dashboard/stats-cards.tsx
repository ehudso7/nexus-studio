import { FolderOpen, Component, Rocket, Users } from 'lucide-react';

const stats = [
  { name: 'Total Projects', stat: '12', icon: FolderOpen },
  { name: 'Components', stat: '248', icon: Component },
  { name: 'Deployments', stat: '36', icon: Rocket },
  { name: 'Team Members', stat: '4', icon: Users },
];

export function StatsCards() {
  return (
    <div>
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative bg-white dark:bg-gray-800 pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
          >
            <dt>
              <div className="absolute bg-primary rounded-md p-3">
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {item.name}
              </p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{item.stat}</p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}