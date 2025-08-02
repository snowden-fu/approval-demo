import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/data';

export async function GET() {
  return NextResponse.json(getUsers());
}