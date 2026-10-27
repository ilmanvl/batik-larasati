import { redirect } from 'next/navigation';

export default async function TambahJurnalRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ mutasi_id?: string }>;
}) {
  const { mutasi_id } = (await searchParams) || {};
  if (mutasi_id) {
    redirect(`/jurnal/baru?mutasi_id=${mutasi_id}`);
  }
  redirect('/jurnal/baru');
}
