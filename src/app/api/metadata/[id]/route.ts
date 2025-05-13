import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // params is async in Next.js 15+, so await it
    const { id} = await params;

    
    const collection = await getCollection('metadata');
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    const { name, description } = doc;
    return NextResponse.json({ 
      name, 
      description, 
      image: `${process.env.NEXT_PUBLIC_DOMAIN}/api/image/${id}.png`,
      content: {
        uri: `${process.env.NEXT_PUBLIC_DOMAIN}/api/image/${id}.png`,
        mime: 'image/png'
      }
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
