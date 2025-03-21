'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export default function ImageCropper({ imageUrl, onCropComplete, onCancel, aspectRatio = 16 / 9 }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [currentAspectRatio, setCurrentAspectRatio] = useState<number | undefined>(aspectRatio);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Detect dark mode
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    // Add listener for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number | undefined) {
    if (!aspect) {
      // For free-size crop (no aspect ratio), use a default sized box in the center
      return {
        unit: '%' as const,
        x: 25,
        y: 25,
        width: 50,
        height: 50
      };
    }

    return centerCrop(
      makeAspectCrop(
        {
          unit: '%' as const,
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    );
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setImageDimensions({ width, height });
    setCrop(centerAspectCrop(width, height, currentAspectRatio));
    setImageLoaded(true);
  }

  // Function to create a local image from URL for processing
  const createLocalImage = async (url: string): Promise<HTMLImageElement> => {
    // For data URLs or local files, we can use them directly
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }

    // For remote URLs, we need to fetch and convert to blob to avoid CORS issues
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = objectUrl;
      });
    } catch (error) {
      console.error('Error creating local image:', error);
      throw error;
    }
  };

  const handleApplyCrop = async () => {
    if (!completedCrop || !canvasRef.current || !imgRef.current) {
      return;
    }

    try {
      const canvas = canvasRef.current;
      const crop = completedCrop;

      // Create a new local image to avoid CORS issues
      const localImage = await createLocalImage(imageUrl);

      const scaleX = localImage.naturalWidth / imageDimensions.width;
      const scaleY = localImage.naturalHeight / imageDimensions.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      // Calculate the dimensions of the crop
      const pixelRatio = window.devicePixelRatio;
      canvas.width = crop.width * pixelRatio * scaleX;
      canvas.height = crop.height * pixelRatio * scaleY;

      // Scale the canvas
      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';

      // Fill the canvas with the appropriate background color
      ctx.fillStyle = isDarkMode ? '#1f2937' : '#f9fafb'; // gray-800 for dark mode, gray-50 for light mode
      ctx.fillRect(0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio);

      // Calculate source and destination coordinates
      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;
      const cropWidth = crop.width * scaleX;
      const cropHeight = crop.height * scaleY;

      // Calculate the dimensions for the portion of the image to draw
      // These may be different than the crop dimensions if crop extends beyond image boundaries
      const srcX = Math.max(0, cropX);
      const srcY = Math.max(0, cropY);
      const srcWidth = Math.min(localImage.naturalWidth - srcX, cropWidth - Math.max(0, -cropX));
      const srcHeight = Math.min(localImage.naturalHeight - srcY, cropHeight - Math.max(0, -cropY));

      // Calculate destination coordinates (where in the canvas to draw the image portion)
      const dstX = Math.max(0, -cropX / scaleX);
      const dstY = Math.max(0, -cropY / scaleY);

      // Only draw the image if there's a valid portion to draw
      if (srcWidth > 0 && srcHeight > 0) {
        ctx.drawImage(
          localImage,
          srcX,
          srcY,
          srcWidth,
          srcHeight,
          dstX,
          dstY,
          srcWidth / scaleX,
          srcHeight / scaleY
        );
      }

      const croppedImageUrl = canvas.toDataURL('image/png');
      onCropComplete(croppedImageUrl);

    } catch (error) {
      console.error('Error applying crop:', error);
      alert('There was an error cropping the image. Please try again.');
    }
  };

  const handleAspectRatioChange = (newRatio: number | undefined) => {
    setCurrentAspectRatio(newRatio);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, newRatio));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Crop Image</h2>

        <div className="flex flex-col items-center mb-4">
          <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={currentAspectRatio}
              className="max-h-[60vh] mx-auto"
              minWidth={10}
              minHeight={10}
              keepSelection
              ruleOfThirds
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageUrl}
                onLoad={onImageLoad}
                className="max-h-[60vh]"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>

          <div className="flex flex-wrap justify-center space-x-4 mb-4">
            <button
              onClick={() => handleAspectRatioChange(undefined)}
              className={`px-3 py-1 mb-2 rounded-md text-sm ${currentAspectRatio === undefined
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              Free
            </button>
            <button
              onClick={() => handleAspectRatioChange(1)}
              className={`px-3 py-1 mb-2 rounded-md text-sm ${currentAspectRatio === 1
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              1:1
            </button>
            <button
              onClick={() => handleAspectRatioChange(16/9)}
              className={`px-3 py-1 mb-2 rounded-md text-sm ${currentAspectRatio === 16/9
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              16:9
            </button>
            <button
              onClick={() => handleAspectRatioChange(4/3)}
              className={`px-3 py-1 mb-2 rounded-md text-sm ${currentAspectRatio === 4/3
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              4:3
            </button>
            <button
              onClick={() => handleAspectRatioChange(3/2)}
              className={`px-3 py-1 mb-2 rounded-md text-sm ${currentAspectRatio === 3/2
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            >
              3:2
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Tip: You can drag the crop area beyond the image boundaries. The empty areas will be filled automatically.
          </p>

          <canvas
            ref={canvasRef}
            style={{
              display: 'none',
              width: completedCrop?.width ?? 0,
              height: completedCrop?.height ?? 0,
            }}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyCrop}
            disabled={!completedCrop || !imageLoaded}
            className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${
              !completedCrop || !imageLoaded ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
