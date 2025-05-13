import { NextResponse } from 'next/server';
import * as Minio from 'minio';
import { Buffer } from 'buffer'; // Needed for base64 decoding
// fs and path might not be needed anymore unless used for other purposes not shown
// import fs from 'fs/promises';
// import path from 'path';

export const runtime = 'nodejs';

// Initialize MinIO client
// IMPORTANT: Configure these environment variables in your .env file
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true', // e.g., true or false
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin', // Your MinIO access key
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin', // Your MinIO secret key
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'images'; // Your MinIO bucket name

// Ensure the bucket exists
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1'); // Specify region if needed
      console.log(`Bucket ${bucketName} created successfully.`);
    }
  } catch (err) {
    console.error('Error with MinIO bucket:', err);
    throw err; // Rethrow to handle it in the calling function
  }
}

// Original direct upload method
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if this is a presigned URL request
    if (body.getPresignedUrl) {
      return await generatePresignedUrl(body.name);
    }
    
    // Otherwise, proceed with the standard upload method
    const name = body.name;
    const base64Data = body.base64;

    if (!base64Data) {
      return NextResponse.json({ success: false, error: 'base64 data is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Image name parameter is required' }, { status: 400 });
    }

    // Ensure bucket exists before upload
    await ensureBucketExists();

    // Remove potential base64 prefix (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(cleanBase64, 'base64');
    
    // The object name in MinIO. We'll use the provided 'name' and ensure it's a .png
    const objectName = name.endsWith('.png') ? name : `${name}.png`;

    const metaData = {
      'Content-Type': 'image/png',
    };

    await minioClient.putObject(bucketName, objectName, imageBuffer, imageBuffer.length, metaData);

    return NextResponse.json({ 
      success: true, 
      message: `Image '${objectName}' uploaded successfully to bucket '${bucketName}'.`,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error uploading to MinIO:', error);
    if (error.code === 'NoSuchBucket') {
        return NextResponse.json({ success: false, error: `MinIO bucket '${bucketName}' not found. Please create it.` }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: 'Failed to upload image to MinIO', details: error.message }, { status: 500 });
  }
}

// Generate a presigned URL for client-side upload
async function generatePresignedUrl(name: string) {
  if (!name) {
    return NextResponse.json({ success: false, error: 'Image name parameter is required' }, { status: 400 });
  }

  try {
    // Ensure bucket exists before generating URL
    await ensureBucketExists();
    
    const objectName = name.endsWith('.png') ? name : `${name}.png`;
    
    // Generate a presigned URL valid for 10 minutes (600 seconds)
    const presignedUrl = await minioClient.presignedPutObject(bucketName, objectName, 600);
    
    return NextResponse.json({
      success: true,
      presignedUrl,
      objectName,
      bucketName,
      // Include a URL for accessing the image after upload (if MinIO has public access configured)
      publicUrl: `${process.env.MINIO_PUBLIC_URL || ''}/${bucketName}/${objectName}`
    });
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate presigned URL', 
      details: error.message 
    }, { status: 500 });
  }
}

// If you still need a GET endpoint to retrieve images (e.g., from MinIO or elsewhere), you can define it separately.
// For example, to get an image FROM MinIO:
/*
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  const { name } = params;
  const objectName = name.endsWith('.png') ? name : `${name}.png`;

  try {
    const stream = await minioClient.getObject(bucketName, objectName);
    // NextResponse cannot directly handle a stream for the body in this way with proper headers easily for all cases.
    // A common approach is to pipe the stream to the response, but Next.js Edge/Node.js runtime might need specific handling.
    // For simplicity, reading to buffer (might be inefficient for large files):
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: { 'Content-Type': 'image/png' }, // Assuming it's always PNG for this getter
    });

  } catch (error: any) {
    console.error('Error fetching image from MinIO:', error);
    if (error.code === 'NoSuchKey') {
      return NextResponse.json({ success: false, error: 'Image not found in MinIO' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to retrieve image from MinIO', details: error.message }, { status: 500 });
  }
}
*/
