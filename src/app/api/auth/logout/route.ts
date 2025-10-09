import { redirect } from 'next/navigation';

// Legacy route - redirects to Stack Auth sign-out
export async function GET() {
  redirect('/handler/sign-out');
}

export async function POST() {
  redirect('/handler/sign-out');
}
