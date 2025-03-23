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
  const touchEndXRef = useRef<number>(0);
  const touchMoveXRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
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

  // Add touch event handlers with improved reliability
  const handleTouchStart = (e: TouchEvent) => {
    if (preventEventsRef.current) return;

    // Record start position for both X and Y
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchEndXRef.current = e.touches[0].clientX;
    touchMoveXRef.current = e.touches[0].clientX;
    isHorizontalSwipeRef.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (preventEventsRef.current) return;

    if (isHorizontalSwipeRef.current === null) {
      // Determine swipe direction on first move
      const diffX = Math.abs(e.touches[0].clientX - touchStartXRef.current);
      const diffY = Math.abs(e.touches[0].clientY - touchStartYRef.current);

      // If horizontal movement is dominant, it's a horizontal swipe
      if (diffX > diffY && diffX > 10) {
        isHorizontalSwipeRef.current = true;
      } else if (diffY > diffX && diffY > 10) {
        isHorizontalSwipeRef.current = false; // It's a vertical swipe
      }
    }

    // Only process movement for horizontal swipes
    if (isHorizontalSwipeRef.current === true) {
      e.preventDefault(); // Prevent scrolling the page
      touchMoveXRef.current = e.touches[0].clientX;
      touchEndXRef.current = e.touches[0].clientX;

      // For smoother swipe effect, directly update scroll position
      if (galleryRef.current) {
        const moveDiff = touchMoveXRef.current - touchStartXRef.current; // Changed direction
        const gallery = galleryRef.current;
        const currentScroll = gallery.scrollLeft;
        gallery.scrollLeft = currentScroll - moveDiff / 2; // Negative for correct direction
        touchStartXRef.current = touchMoveXRef.current;
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    // Only process horizontal swipes
    if (isHorizontalSwipeRef.current !== true) {
      return;
    }

    const gallery = galleryRef.current;

    // Calculate swipe distance - changed direction to match natural swipe direction
    const swipeDistance = touchEndXRef.current - touchStartXRef.current;
    const clientWidth = gallery.clientWidth;
    const scrollLeft = gallery.scrollLeft;

    // Determine target based on scroll position and swipe direction
    const rawIndex = scrollLeft / clientWidth;
    let targetIndex = Math.round(rawIndex);

    // Adjust target based on swipe direction if significant swipe detected
    const SWIPE_THRESHOLD = 30; // Reduced threshold for easier swiping
    if (Math.abs(swipeDistance) > SWIPE_THRESHOLD) {
      if (swipeDistance < 0) { // Changed: negative means swiped left (next)
        // Swiped left, go to next
        targetIndex = Math.ceil(rawIndex);
      } else { // Changed: positive means swiped right (previous)
        // Swiped right, go to previous
        targetIndex = Math.floor(rawIndex);
      }
    }

    // Ensure we're within bounds
    targetIndex = Math.max(0, Math.min(targetIndex, images.length + 1));

    // Smooth scroll to the target
    gallery.style.scrollBehavior = 'smooth';
    gallery.scrollLeft = targetIndex * clientWidth;

    // Reset touch tracking
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
    touchMoveXRef.current = 0;
    isHorizontalSwipeRef.current = null;

    // Update indicator based on target index
    setTimeout(() => {
      // Calculate the actual image index (accounting for the clone slides)
      let imageIndex;
      if (targetIndex === 0) {
        imageIndex = images.length - 1; // Clone of last slide
      } else if (targetIndex === images.length + 1) {
        imageIndex = 0; // Clone of first slide
      } else {
        imageIndex = targetIndex - 1; // Regular slides (offset by 1 due to clone)
      }

      // Update indicator state
      setCurrentImageIndex(imageIndex);
      if (onIndicatorChange) {
        onIndicatorChange(imageIndex);
      }
    }, 300);
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    // Get current position
    const clientWidth = gallery.clientWidth;
    const scrollLeft = gallery.scrollLeft;
    const scrollWidth = gallery.scrollWidth;

    // Calculate current index
    const rawIndex = scrollLeft / clientWidth;
    const currentIndex = Math.round(rawIndex);

    // Handle edge cases
    if (currentIndex <= 0) {
      // At the cloned last image, go to the real last image
      preventEventsRef.current = true;
      gallery.style.scrollBehavior = 'auto';
      gallery.scrollLeft = scrollWidth - (clientWidth * 2);
      setTimeout(() => {
        gallery.style.scrollBehavior = 'smooth';
        preventEventsRef.current = false;

        // Force update to last image indicator
        setCurrentImageIndex(images.length - 1);
        if (onIndicatorChange) {
          onIndicatorChange(images.length - 1);
        }
      }, 50);
      return;
    }

    // Normal previous behavior
    gallery.style.scrollBehavior = 'smooth';
    gallery.scrollLeft = (currentIndex - 1) * clientWidth;

    // Update indicator for normal navigation
    const newIndex = currentIndex === 1 ? images.length - 1 : (currentIndex - 2);
    if (newIndex >= 0 && newIndex < images.length) {
      setTimeout(() => {
        setCurrentImageIndex(newIndex);
        if (onIndicatorChange) {
          onIndicatorChange(newIndex);
        }
      }, 300);
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventEventsRef.current || !galleryRef.current || images.length <= 1) return;

    const gallery = galleryRef.current;
    // Get current position
    const clientWidth = gallery.clientWidth;
    const scrollLeft = gallery.scrollLeft;
    const scrollWidth = gallery.scrollWidth;

    // Calculate current index
    const rawIndex = scrollLeft / clientWidth;
    const currentIndex = Math.round(rawIndex);

    // Handle edge cases
    if (currentIndex >= images.length + 1) {
      // At the cloned first image, go to the real first image
      preventEventsRef.current = true;
      gallery.style.scrollBehavior = 'auto';
      gallery.scrollLeft = clientWidth;
      setTimeout(() => {
        gallery.style.scrollBehavior = 'smooth';
        preventEventsRef.current = false;

        // Force update to first image indicator
        setCurrentImageIndex(0);
        if (onIndicatorChange) {
          onIndicatorChange(0);
        }
      }, 50);
      return;
    }

    // Normal next behavior
    gallery.style.scrollBehavior = 'smooth';
    gallery.scrollLeft = (currentIndex + 1) * clientWidth;

    // Update indicator for normal navigation
    const newIndex = currentIndex === images.length ? 0 : currentIndex;
    if (newIndex >= 0 && newIndex < images.length) {
      setTimeout(() => {
        setCurrentImageIndex(newIndex);
        if (onIndicatorChange) {
          onIndicatorChange(newIndex);
        }
      }, 300);
    }
  };

  // Set up event listeners
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || images.length <= 1) return;

    // Start at the first real image (after the cloned last image)
    gallery.style.scrollBehavior = 'auto';
    gallery.scrollLeft = gallery.clientWidth;

    // Setup event listeners
    gallery.addEventListener('scroll', handleScroll, { passive: true });
    gallery.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    gallery.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    gallery.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

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
        gallery.removeEventListener('touchstart', handleTouchStart as EventListener);
        gallery.removeEventListener('touchmove', handleTouchMove as EventListener);
        gallery.removeEventListener('touchend', handleTouchEnd as EventListener);
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
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full touch-pan-x"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
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
