'use client';

const activities = [
  {
    id: 1,
    type: 'deployment',
    person: { name: 'John Doe' },
    project: 'E-commerce Platform',
    time: '2 hours ago',
    status: 'success',
  },
  {
    id: 2,
    type: 'component',
    person: { name: 'Jane Smith' },
    project: 'Marketing Site',
    time: '3 hours ago',
    component: 'Hero Section',
  },
  {
    id: 3,
    type: 'project',
    person: { name: 'Mike Johnson' },
    project: 'Mobile App',
    time: '5 hours ago',
  },
  {
    id: 4,
    type: 'deployment',
    person: { name: 'Sarah Williams' },
    project: 'Dashboard',
    time: '1 day ago',
    status: 'failed',
  },
];

export function RecentActivity() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {activities.map((activity) => (
            <li key={activity.id} className="py-4">
              <div className="flex space-x-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.person.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.type === 'deployment' && (
                      <>
                        Deployed <span className="font-medium">{activity.project}</span>{' '}
                        {activity.status === 'success' ? (
                          <span className="text-green-600">successfully</span>
                        ) : (
                          <span className="text-red-600">failed</span>
                        )}
                      </>
                    )}
                    {activity.type === 'component' && (
                      <>
                        Created component{' '}
                        <span className="font-medium">{activity.component}</span> in{' '}
                        <span className="font-medium">{activity.project}</span>
                      </>
                    )}
                    {activity.type === 'project' && (
                      <>
                        Created new project <span className="font-medium">{activity.project}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}