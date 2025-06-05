import { BuilderLayout } from '@/components/builder/BuilderLayout';

export default function ProjectBuilderPage({
  params,
}: {
  params: { id: string };
}) {
  return <BuilderLayout projectId={params.id} />;
}