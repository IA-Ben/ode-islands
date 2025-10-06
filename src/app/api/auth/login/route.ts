import { redirect } from 'next/navigation';

export async function GET() {
  // Redirect to the passport login route
  redirect('/api/login');
}

export async function POST() {
  // Also handle POST requests
  redirect('/api/login');
}