import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');
  if (!collection) {
    return NextResponse.json({ success: false, error: 'Missing collection parameter' }, { status: 400 });
  }
  const coll = await getCollection(collection);
  const results = await coll.find({}).toArray();
  return NextResponse.json({ success: true, results });
}
