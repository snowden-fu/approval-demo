import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/data';

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users);
}