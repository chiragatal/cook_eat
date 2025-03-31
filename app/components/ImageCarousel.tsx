'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface ImageCarouselProps {
  images: string[];
  title: string;
  carouselId: string;
  className?: string;
  imageClassName?: string;
  onIndicatorChange?: (index: number) => void;
  navigationButtonSize?: 'small' | 'medium' | 'large';
  showAlways?: boolean;
  onChange?: (images: string[]) => void;
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
  const [isInitialized, setIsInitialized] = useState(false);
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

  // Create a modified array with duplicated images for seamless scrolling
  const extendedImages = [...images, ...images, ...images];

  // Simple method to scroll to an index while updating the indicator
  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!galleryRef.current || images.length <= 1 || preventEventsRef.current) return;

    const gallery = galleryRef.current;
    const clientWidth = gallery.clientWidth;

    // We always want to scroll to the middle set
    const normalizedIndex = ((index % images.length) + images.length) % images.length;
    const targetScrollPosition = (images.length + normalizedIndex) * clientWidth;

    gallery.style.scrollBehavior = behavior;
    gallery.scrollLeft = targetScrollPosition;

    // Update the indicator
    setCurrentImageIndex(normalizedIndex);
    if (onIndicatorChange) {
      onIndicatorChange(normalizedIndex);
    }
  };

  // Initialize the gallery
  useEffect(() => {
    if (!galleryRef.current || images.length <= 1 || isInitialized) return;

    // Position at the middle set without animation
    scrollToIndex(0, 'auto');

    // Mark as initialized to prevent repeated positioning
    setIsInitialized(true);

    // Switch to smooth scrolling after initialization
    setTimeout(() => {
      if (galleryRef.current) {
        galleryRef.current.style.scrollBehavior = 'smooth';
      }
    }, 100);
  }, [images.length, isInitialized, scrollToIndex]);

  // Handle manual scrolling and update indicators
  const handleScroll = () => {
    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const gallery = galleryRef.current;
      if (!gallery) return;

      const scrollLeft = gallery.scrollLeft;
      const clientWidth = gallery.clientWidth;
      const rawIndex = scrollLeft / clientWidth;
      const roundedIndex = Math.round(rawIndex);

      // Calculate the actual image index in the original array
      const actualIndex = ((roundedIndex % images.length) + images.length) % images.length;

      // Update indicator if needed
      if (currentImageIndex !== actualIndex) {
        setCurrentImageIndex(actualIndex);
        if (onIndicatorChange) {
          onIndicatorChange(actualIndex);
        }
      }

      // Check if we need to reposition to stay in the middle set
      const middleSetStart = images.length;
      const middleSetEnd = 2 * images.length;

      // Only reposition if:
      // 1. We're not currently preventing events
      // 2. We're at a complete rest (not in the middle of animation)
      // 3. We've scrolled into the first or third set
      const isInFirstSet = roundedIndex < middleSetStart;
      const isInThirdSet = roundedIndex >= middleSetEnd;

      // Only reposition when scrolling has stopped
      if ((isInFirstSet || isInThirdSet) && !preventEventsRef.current) {
        // Calculate how many widths we need to offset by
        const offset = isInFirstSet
          ? images.length // Move from first set to middle
          : -images.length; // Move from third set to middle

        // Prevent any events during repositioning
        preventEventsRef.current = true;

        // Use requestAnimationFrame to avoid visual jumps
        requestAnimationFrame(() => {
          gallery.style.scrollBehavior = 'auto';
          gallery.scrollLeft += offset * clientWidth;

          // Reset event prevention after reposition is complete
          setTimeout(() => {
            preventEventsRef.current = false;
            gallery.style.scrollBehavior = 'smooth';
          }, 10);
        });
      }
    }, 50);
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    // Simply go to previous index
    const newIndex = (currentImageIndex - 1 + images.length) % images.length;
    scrollToIndex(newIndex);
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    // Simply go to next index
    const newIndex = (currentImageIndex + 1) % images.length;
    scrollToIndex(newIndex);
  };

  // Setup touch event handlers
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || images.length <= 1) return;

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
          const newIndex = (currentImageIndex - 1 + images.length) % images.length;
          scrollToIndex(newIndex);
        } else {
          // Swiped left, go to next
          const newIndex = (currentImageIndex + 1) % images.length;
          scrollToIndex(newIndex);
        }
      }
    };

    // Setup event listeners
    gallery.addEventListener('touchstart', onTouchStart, { passive: true });
    gallery.addEventListener('touchmove', onTouchMove, { passive: false });
    gallery.addEventListener('touchend', onTouchEnd, { passive: true });

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
  }, [images.length, currentImageIndex, handleScroll, scrollToIndex]);

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
        {/* Render tripled set of images for seamless scrolling */}
        {extendedImages.map((image, index) => (
          <div key={index} className="flex-none w-full h-full snap-center relative">
            <div className="w-full h-full flex items-center justify-center">
              <Image
                src={image}
                alt={`${title} - Image ${(index % images.length) + 1}`}
                className={imageClassName}
                style={{ pointerEvents: 'none' }}
                width={800}
                height={600}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Failed+to+Load';
                }}
              />
            </div>
          </div>
        ))}
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
                onClick={() => scrollToIndex(index)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
