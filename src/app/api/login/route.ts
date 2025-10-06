import { redirect } from 'next/navigation';

export async function GET() {
  // Redirect to the correct auth login route
  redirect('/api/auth/login');
}

export async function POST() {
  // Also handle POST requests to /api/login
  redirect('/api/auth/login');
}