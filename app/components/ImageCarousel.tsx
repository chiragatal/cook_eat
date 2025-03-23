'use client';

import { useState, useEffect, useRef } from 'react';

interface ImageCarouselProps {
  images: string[];
  title: string;
  carouselId: string | number;
  className?: string;
  imageClassName?: string;
  onIndicatorChange?: (index: number) => void;
  navigationButtonSize?: 'small' | 'medium' | 'large';
  showAlways?: boolean;
}

export default function ImageCarousel({
  images,
  title,
  carouselId,
  className = "h-96",
  imageClassName = "max-w-full max-h-full w-auto h-auto object-contain",
  onIndicatorChange,
  navigationButtonSize = 'medium',
  showAlways = false
}: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const preventEventsRef = useRef<boolean>(false);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uniqueId = `carousel-${carouselId}`;

  // Explicitly set nav button sizing
  const getButtonSize = () => {
    switch (navigationButtonSize) {
      case 'small': return { button: 'p-2', icon: 'w-5 h-5' };
      case 'large': return { button: 'p-4', icon: 'w-7 h-7' };
      default: return { button: 'p-3', icon: 'w-6 h-6' };
    }
  };

  const buttonSize = getButtonSize();

  // Update active indicator based on scroll position
  const handleIndicatorUpdate = () => {
    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    const scrollLeft = gallery.scrollLeft;
    const clientWidth = gallery.clientWidth;
    const scrollWidth = gallery.scrollWidth;
    const rawIndex = scrollLeft / clientWidth;
    const roundedIndex = Math.round(rawIndex);

    let imageIndex = 0;

    // Convert from scroll position to image index (accounting for clones)
    if (roundedIndex === 0) {
      // At clone of last image
      imageIndex = images.length - 1;
    } else if (roundedIndex >= images.length + 1) {
      // At clone of first image
      imageIndex = 0;
    } else {
      imageIndex = roundedIndex - 1;
    }

    // Ensure index is within bounds
    imageIndex = Math.max(0, Math.min(imageIndex, images.length - 1));

    if (currentImageIndex !== imageIndex) {
      setCurrentImageIndex(imageIndex);
      if (onIndicatorChange) {
        onIndicatorChange(imageIndex);
      }
    }
  };

  const handleScroll = () => {
    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    const scrollLeft = gallery.scrollLeft;
    const scrollWidth = gallery.scrollWidth;
    const clientWidth = gallery.clientWidth;

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Check if we're at the beginning or end edge
    if (Math.abs(scrollLeft) < 20) {
      // We're at the clone of the last image, prevent further interaction
      preventEventsRef.current = true;

      // Jump to the real last image
      gallery.style.scrollBehavior = 'auto';

      // Calculate real last image position (total width - 2 slides)
      const targetPosition = scrollWidth - (clientWidth * 2);
      gallery.scrollLeft = targetPosition;

      // Reset scroll behavior and re-enable events after a delay
      setTimeout(() => {
        gallery.style.scrollBehavior = 'smooth';
        preventEventsRef.current = false;

        // Force indicator update to last image
        setCurrentImageIndex(images.length - 1);
        if (onIndicatorChange) {
          onIndicatorChange(images.length - 1);
        }
      }, 150);
    }
    else if (scrollLeft + clientWidth >= scrollWidth - 20) {
      // We're at the clone of the first image, prevent further interaction
      preventEventsRef.current = true;

      // Jump to the real first image
      gallery.style.scrollBehavior = 'auto';
      gallery.scrollLeft = clientWidth;

      // Reset scroll behavior and re-enable events after a delay
      setTimeout(() => {
        gallery.style.scrollBehavior = 'smooth';
        preventEventsRef.current = false;

        // Force indicator update to first image
        setCurrentImageIndex(0);
        if (onIndicatorChange) {
          onIndicatorChange(0);
        }
      }, 150);
    } else {
      // Schedule indicator update to run for normal scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        handleIndicatorUpdate();
      }, 50);
    }
  };

  const goToSlide = (index: number) => {
    if (!galleryRef.current || preventEventsRef.current) return;

    const gallery = galleryRef.current;
    const clientWidth = gallery.clientWidth;

    // Account for the clone slide at the beginning
    const actualIndex = index + 1;

    gallery.style.scrollBehavior = 'smooth';
    gallery.scrollLeft = actualIndex * clientWidth;

    setCurrentImageIndex(index);
    if (onIndicatorChange) {
      onIndicatorChange(index);
    }
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const newIndex = (currentImageIndex - 1 + images.length) % images.length;
    goToSlide(newIndex);
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const newIndex = (currentImageIndex + 1) % images.length;
    goToSlide(newIndex);
  };

  // Set up mouse and touch event handlers
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || images.length <= 1) return;

    // Start at the first real image (after the cloned last image)
    gallery.style.scrollBehavior = 'auto';
    gallery.scrollLeft = gallery.clientWidth;

    // Setup scroll listener
    gallery.addEventListener('scroll', handleScroll, { passive: true });

    let startX = 0;
    let startY = 0;
    let isHorizontalSwipe = false;
    let hasMoved = false;

    const onTouchStart = (e: TouchEvent) => {
      if (preventEventsRef.current) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontalSwipe = false;
      hasMoved = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (preventEventsRef.current) return;
      if (!hasMoved) {
        const diffX = Math.abs(e.touches[0].clientX - startX);
        const diffY = Math.abs(e.touches[0].clientY - startY);

        // If it's clearly a horizontal swipe, prevent default
        if (diffX > diffY && diffX > 10) {
          isHorizontalSwipe = true;
          e.preventDefault();
        }
        hasMoved = true;
      } else if (isHorizontalSwipe) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (preventEventsRef.current || !isHorizontalSwipe) return;

      const endX = e.changedTouches[0].clientX;
      const diffX = endX - startX;

      if (Math.abs(diffX) > 50) { // Threshold for swipe
        if (diffX > 0) {
          // Swiped right, go to previous
          handlePrevClick(new MouseEvent('click') as any);
        } else {
          // Swiped left, go to next
          handleNextClick(new MouseEvent('click') as any);
        }
      }
    };

    // Setup event listeners
    gallery.addEventListener('touchstart', onTouchStart, { passive: true });
    gallery.addEventListener('touchmove', onTouchMove, { passive: false });
    gallery.addEventListener('touchend', onTouchEnd, { passive: true });

    // Reset behavior after positioning and ensure indicators are correct
    setTimeout(() => {
      if (gallery) {
        gallery.style.scrollBehavior = 'smooth';

        // Force update to the first image indicator
        setCurrentImageIndex(0);
        if (onIndicatorChange) {
          onIndicatorChange(0);
        }
      }
    }, 100);

    return () => {
      // Clean up timeouts
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Remove event listeners
      if (gallery) {
        gallery.removeEventListener('scroll', handleScroll);
        gallery.removeEventListener('touchstart', onTouchStart);
        gallery.removeEventListener('touchmove', onTouchMove);
        gallery.removeEventListener('touchend', onTouchEnd);
      }
    };
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`relative group overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`} id={uniqueId}>
      <div
        ref={galleryRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        {/* Add last image at the beginning for smooth transition */}
        {images.length > 1 && (
          <div className="flex-none w-full h-full snap-center relative">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={images[images.length - 1]}
                alt={`${title} - Image ${images.length}`}
                className={imageClassName}
                style={{ pointerEvents: 'none' }}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Failed+to+Load';
                }}
              />
            </div>
          </div>
        )}

        {images.map((image, index) => (
          <div key={index} className="flex-none w-full h-full snap-center relative">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={image}
                alt={`${title} - Image ${index + 1}`}
                className={imageClassName}
                style={{ pointerEvents: 'none' }}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Failed+to+Load';
                }}
              />
            </div>
          </div>
        ))}

        {/* Add first image at the end for smooth transition */}
        {images.length > 1 && (
          <div className="flex-none w-full h-full snap-center relative">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={images[0]}
                alt={`${title} - Image 1`}
                className={imageClassName}
                style={{ pointerEvents: 'none' }}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Failed+to+Load';
                }}
              />
            </div>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevClick}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white ${buttonSize.button} rounded-full z-10 transition-all duration-200 ${showAlways ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            aria-label="Previous image"
          >
            <svg className={buttonSize.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNextClick}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white ${buttonSize.button} rounded-full z-10 transition-all duration-200 ${showAlways ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            aria-label="Next image"
          >
            <svg className={buttonSize.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  currentImageIndex === index
                    ? 'bg-white'
                    : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
