import { redirect } from 'next/navigation';

export async function GET() {
  // Redirect to the passport logout route
  redirect('/api/logout');
}

export async function POST() {
  // Also handle POST requests
  redirect('/api/logout');
}