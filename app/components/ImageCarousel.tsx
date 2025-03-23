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

  // Create a modified array with duplicated images for seamless scrolling
  const extendedImages = [...images, ...images, ...images];

  // Update active indicator based on scroll position
  const handleIndicatorUpdate = () => {
    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    const scrollLeft = gallery.scrollLeft;
    const clientWidth = gallery.clientWidth;
    const rawIndex = scrollLeft / clientWidth;
    const roundedIndex = Math.round(rawIndex);

    // Calculate the actual image index in the original array
    const actualIndex = ((roundedIndex % images.length) + images.length) % images.length;

    if (currentImageIndex !== actualIndex) {
      setCurrentImageIndex(actualIndex);
      if (onIndicatorChange) {
        onIndicatorChange(actualIndex);
      }
    }
  };

  const handleScroll = () => {
    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    // Schedule indicator update to run for scrolling
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      handleIndicatorUpdate();
    }, 50);
  };

  // Position the gallery in the middle set of images initially
  useEffect(() => {
    if (!galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    const clientWidth = gallery.clientWidth;

    // Position at the start of the middle set of images
    gallery.style.scrollBehavior = 'auto';
    gallery.scrollLeft = images.length * clientWidth;

    // Force render at correct position
    setCurrentImageIndex(0);
    if (onIndicatorChange) {
      onIndicatorChange(0);
    }

    // Reset scroll behavior to smooth
    setTimeout(() => {
      gallery.style.scrollBehavior = 'smooth';
    }, 100);
  }, [images.length]);

  // Check and reset position to middle set if we reach the edge
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || images.length <= 1) return;

    const checkScrollPosition = () => {
      if (preventEventsRef.current) return;

      const clientWidth = gallery.clientWidth;
      const scrollLeft = gallery.scrollLeft;
      const totalWidth = gallery.scrollWidth;

      // Calculate which set we're in (first, middle, last)
      const firstSetEnd = images.length * clientWidth;
      const middleSetEnd = 2 * images.length * clientWidth;

      // Calculate precise image index
      const currentRawIndex = scrollLeft / clientWidth;

      // If we're in the first set (before the middle set)
      if (scrollLeft < firstSetEnd) {
        // Calculate exact position within the set
        const indexInSet = currentRawIndex;
        const isNearSetBoundary = indexInSet < 0.1 || indexInSet > images.length - 0.1;

        if (isNearSetBoundary) {
          preventEventsRef.current = true;
          requestAnimationFrame(() => {
            gallery.style.scrollBehavior = 'auto';
            // Jump to the same position in the middle set
            gallery.scrollLeft += images.length * clientWidth;

            // Use a slight delay to ensure the jump is not visible
            setTimeout(() => {
              preventEventsRef.current = false;
              gallery.style.scrollBehavior = 'smooth';
            }, 50);
          });
        }
      }
      // If we're in the third set (after the middle set)
      else if (scrollLeft >= middleSetEnd) {
        // Calculate exact position within the set
        const indexInSet = (scrollLeft - middleSetEnd) / clientWidth;
        const isNearSetBoundary = indexInSet < 0.1 || indexInSet > images.length - 0.1;

        if (isNearSetBoundary) {
          preventEventsRef.current = true;
          requestAnimationFrame(() => {
            gallery.style.scrollBehavior = 'auto';
            // Jump to the same position in the middle set
            gallery.scrollLeft -= images.length * clientWidth;

            // Use a slight delay to ensure the jump is not visible
            setTimeout(() => {
              preventEventsRef.current = false;
              gallery.style.scrollBehavior = 'smooth';
            }, 50);
          });
        }
      }
    };

    // Use only the scroll event for smoother detection
    gallery.addEventListener('scroll', checkScrollPosition, { passive: true });

    return () => {
      gallery.removeEventListener('scroll', checkScrollPosition);
    };
  }, [images.length]);

  // Improved goToSlide for better dot navigation
  const goToSlide = (index: number) => {
    if (!galleryRef.current || preventEventsRef.current) return;

    const gallery = galleryRef.current;
    const clientWidth = gallery.clientWidth;

    // Get the current approximate position within all sets
    const currentScrollPosition = gallery.scrollLeft;
    const currentSetIndex = Math.floor(currentScrollPosition / (clientWidth * images.length));

    // Always navigate in the middle set of images
    const middleOffset = images.length * currentSetIndex;

    gallery.style.scrollBehavior = 'smooth';
    gallery.scrollLeft = (middleOffset + index) * clientWidth;

    setCurrentImageIndex(index);
    if (onIndicatorChange) {
      onIndicatorChange(index);
    }
  };

  // Modified navigation handlers for smoother transitions
  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    const clientWidth = gallery.clientWidth;
    const currentScrollLeft = gallery.scrollLeft;

    // Simply scroll one width to the left for smooth experience
    gallery.style.scrollBehavior = 'smooth';
    gallery.scrollLeft = currentScrollLeft - clientWidth;

    // Update the indicator to match
    const newIndex = (currentImageIndex - 1 + images.length) % images.length;
    setCurrentImageIndex(newIndex);
    if (onIndicatorChange) {
      onIndicatorChange(newIndex);
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    const clientWidth = gallery.clientWidth;
    const currentScrollLeft = gallery.scrollLeft;

    // Simply scroll one width to the right for smooth experience
    gallery.style.scrollBehavior = 'smooth';
    gallery.scrollLeft = currentScrollLeft + clientWidth;

    // Update the indicator to match
    const newIndex = (currentImageIndex + 1) % images.length;
    setCurrentImageIndex(newIndex);
    if (onIndicatorChange) {
      onIndicatorChange(newIndex);
    }
  };

  // Set up mouse and touch event handlers
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
        {/* Render tripled set of images for seamless scrolling */}
        {extendedImages.map((image, index) => (
          <div key={index} className="flex-none w-full h-full snap-center relative">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={image}
                alt={`${title} - Image ${(index % images.length) + 1}`}
                className={imageClassName}
                style={{ pointerEvents: 'none' }}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Failed+to+Load';
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
                onClick={() => goToSlide(index)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
