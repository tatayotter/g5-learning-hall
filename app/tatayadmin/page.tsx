import type { Metadata } from 'next';
import TatayAdminPage from '@/components/TatayAdminPage';

export const metadata: Metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function Page() {
  return <TatayAdminPage />;
}
