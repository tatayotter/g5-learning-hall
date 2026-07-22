import ParentRegisterForm from '@/components/ParentRegisterForm';

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4">
      <div className="max-w-lg mx-auto mb-6 text-center">
        <h1 className="text-2xl font-display font-bold text-white">Parent Registration</h1>
        <p className="text-gray-500 text-sm mt-1">
          Register yourself and your children. An admin will review and approve your account before you can log in to the dashboard.
        </p>
      </div>
      <ParentRegisterForm />
    </main>
  );
}
