import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';

// Max size in MB before compression is applied
const MAX_FILE_SIZE_MB = 4;

// Helper function to compress images using Sharp
async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  try {
    let sharpInstance = sharp(buffer);

    // Get image metadata
    const metadata = await sharpInstance.metadata();

    // Calculate target dimensions and quality based on size
    let quality = 80;
    let resize = false;

    // If image is large, apply more aggressive compression
    if (buffer.length > 8 * 1024 * 1024) {
      quality = 60;
      resize = true;
    } else if (buffer.length > 5 * 1024 * 1024) {
      quality = 70;
      resize = true;
    }

    // Resize if needed
    if (resize && metadata.width && metadata.height) {
      const width = metadata.width;
      const targetWidth = Math.round(width * 0.8);

      sharpInstance = sharpInstance.resize(targetWidth);
    }

    // Apply compression based on image type
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return await sharpInstance.jpeg({ quality }).toBuffer();
    } else if (mimeType === 'image/png') {
      // For PNG, Sharp doesn't use the same quality parameter
      // Instead, we use compression level 9 (max) for best compression
      return await sharpInstance.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true
      }).toBuffer();
    } else if (mimeType === 'image/webp') {
      return await sharpInstance.webp({ quality }).toBuffer();
    } else {
      // For other formats, just resize if needed but don't compress
      return await sharpInstance.toBuffer();
    }
  } catch (error) {
    console.error("Error in compression function:", error);
    // If compression fails, return original buffer
    return buffer;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    const imagePaths: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

      try {
        // Convert File to Buffer for processing
        const arrayBuffer = await file.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);
        let finalFile = file;

        // Compress the image if it's larger than our threshold
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024 &&
            file.type.startsWith('image/')) {
          try {
            console.log(`Compressing image: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
            const compressedBuffer = await compressImage(buffer, file.type);
            console.log(`Compressed size: ${(compressedBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

            // Create new File from compressed buffer
            finalFile = new File(
              [compressedBuffer],
              file.name,
              { type: file.type }
            );
          } catch (compressionError) {
            console.error('Error compressing image:', compressionError);
            // Continue with original file if compression fails
          }
        }

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

        // Upload to Vercel Blob Storage
        const { url } = await put(filename, finalFile, {
          access: 'public',
        });

        imagePaths.push(url);
      } catch (error) {
        console.error('Error uploading file:', error);
        continue;
      }
    }

    return NextResponse.json({ imagePaths });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
