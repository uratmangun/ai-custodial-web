import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import * as Minio from 'minio';
import { Buffer } from 'buffer';

export const runtime = 'nodejs';

// Initialize MinIO client for GET endpoint
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'images';

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  const { name } = await params;
  const objectName = name.endsWith('.png') ? name : `${name}.png`;

  try {
    // Get the object from MinIO
    const stream = await minioClient.getObject(bucketName, objectName);
    
    // Read the stream into a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    // Return the image with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: { 'Content-Type': 'image/png' }
    });
  } catch (error: any) {
    console.error('Error fetching image from MinIO:', error);
    
    // Fall back to local file system if MinIO fails or if the object doesn't exist
    try {
      const folder = path.join(process.cwd(), 'data', 'image');
      const filePath = path.join(folder, objectName);
      const buffer = await fs.readFile(filePath);
      
      return new NextResponse(buffer, {
        status: 200,
        headers: { 'Content-Type': 'image/png' }
      });
    } catch (fsError) {
      // If both MinIO and file system fail, return an error
      return NextResponse.json({ 
        success: false, 
        error: 'Image not found in MinIO or local filesystem' 
      }, { status: 404 });
    }
  }
}

export async function POST(request: Request) {
  try {
    const { name: nameInput, base64 } = await request.json();
    if (!nameInput || !base64) {
      return NextResponse.json({ success: false, error: 'Missing name or base64' }, { status: 400 });
    }

    // Ensure name is a string and add .png extension
    const name = String(nameInput) + '.png';

    const folder = path.join(process.cwd(), 'data', 'image');
    await fs.mkdir(folder, { recursive: true });
    // Strip data URI prefix if present
    const matches = base64.match(/^data:(image\/\w+);base64,(.*)$/);
    const data = matches ? matches[2] : base64;
    const buffer = Buffer.from(data, 'base64');
    const filePath = path.join(folder, name);
    await fs.writeFile(filePath, buffer);
    // Return the path with the .png extension
    return NextResponse.json({ success: true, path: `/data/image/${name}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
