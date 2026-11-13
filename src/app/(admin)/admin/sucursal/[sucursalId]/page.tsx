import { notFound } from 'next/navigation';
import { isValidSucursalId } from '@/modules/sucursales/constants';
import { SucursalWorkspace } from '@/modules/sucursales/components/SucursalWorkspace';

interface SucursalPageProps {
  params: Promise<{
    sucursalId: string;
  }>;
}

export default async function SucursalDetallePage({
  params,
}: SucursalPageProps) {
  const { sucursalId } = await params;
  const normalizedId = sucursalId.toUpperCase();

  if (!isValidSucursalId(normalizedId)) {
    notFound();
  }

  return <SucursalWorkspace sucursalId={normalizedId} />;
}
