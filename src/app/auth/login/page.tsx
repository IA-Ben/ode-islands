import UserLoginForm from '../../../components/auth/UserLoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" data-auth-page>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">The Ode Islands</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to continue your journey
          </p>
        </div>
        
        <UserLoginForm />
      </div>
    </div>
  );
}