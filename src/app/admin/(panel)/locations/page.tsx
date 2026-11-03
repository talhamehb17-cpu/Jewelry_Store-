import { requireAdminPage } from '@/lib/auth';
import { listLocations } from '@/lib/locations';
import { PageHeader } from '@/components/admin/ui';
import { LocationManager } from '@/components/admin/location-manager';

export const metadata = { title: 'Locations' };

export default async function LocationsAdmin() {
  await requireAdminPage();
  const rows = await listLocations();
  return (
    <>
      <PageHeader title="Store locations" description="Homepage cards use only locations you save here. Coordinates are optional and never invented." />
      <LocationManager rows={rows} />
    </>
  );
}
