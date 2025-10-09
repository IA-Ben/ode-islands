import { redirect } from 'next/navigation';

// Legacy route - redirects to Stack Auth sign-in
export async function GET() {
  redirect('/handler/sign-in');
}

export async function POST() {
  redirect('/handler/sign-in');
}
