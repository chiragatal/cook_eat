import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageCarousel from '@/app/components/ImageCarousel';

// Enable fake timers
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  x: 0,
  y: 0,
  width: 1000,
  height: 500,
  top: 0,
  right: 1000,
  bottom: 500,
  left: 0,
  toJSON: () => {},
}));

// Mock scrollTo and scrollLeft
Element.prototype.scrollTo = jest.fn();
let scrollLeftValue = 0;
Object.defineProperty(Element.prototype, 'scrollLeft', {
  configurable: true,
  get: jest.fn(() => scrollLeftValue),
  set: jest.fn((val) => { scrollLeftValue = val; }),
});

// Mock scrollWidth
Object.defineProperty(Element.prototype, 'scrollWidth', {
  configurable: true,
  get: jest.fn(() => 3000),
});

// Mock clientWidth
Object.defineProperty(Element.prototype, 'clientWidth', {
  configurable: true,
  get: jest.fn(() => 1000),
});

// Events handlers storage type definition
interface TouchHandlers {
  touchstart: ((event: TouchEvent) => void) | null;
  touchmove: ((event: TouchEvent) => void) | null;
  touchend: ((event: TouchEvent) => void) | null;
}

describe('ImageCarousel Component', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup scrollTo mock
    Element.prototype.scrollTo = jest.fn();

    // Reset global values for each test
    scrollLeftValue = 0;
  });

  it('renders images correctly', () => {
    render(
      <ImageCarousel
        images={mockImages}
        title="Test Carousel"
        carouselId="test-carousel"
      />
    );

    // Should render all images (including duplicates due to extended image array)
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(mockImages.length * 3); // 3x duplicate for extended array

    // Verify the src attributes
    expect(images[0]).toHaveAttribute('src', mockImages[0]);
    expect(images[1]).toHaveAttribute('src', mockImages[1]);
    expect(images[2]).toHaveAttribute('src', mockImages[2]);

    // Check navigation controls
    expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
    expect(screen.getByLabelText('Next image')).toBeInTheDocument();

    // Check indicators
    const indicators = screen.getAllByRole('button');
    // 2 navigation buttons + 3 indicators for 3 images
    expect(indicators.length).toBe(5);
  });

  it('does not render navigation for single image', () => {
    render(
      <ImageCarousel
        images={['https://example.com/single-image.jpg']}
        title="Single Image"
        carouselId="single-image"
      />
    );

    // Should render only one image (repeated 3 times)
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(3); // 3x duplicate for extended array

    // Navigation shouldn't be visible for single image
    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
  });

  it('calls onIndicatorChange when changing slides', () => {
    const mockOnIndicatorChange = jest.fn();

    render(
      <ImageCarousel
        images={mockImages}
        title="Test Carousel"
        carouselId="test-carousel"
        onIndicatorChange={mockOnIndicatorChange}
      />
    );

    // Find indicator buttons (excluding navigation buttons)
    const indicators = screen.getAllByRole('button').filter(
      button => !button.getAttribute('aria-label')?.includes('image')
    );

    // Click on the second indicator
    act(() => {
      fireEvent.click(indicators[1]);
      jest.runAllTimers();
    });

    // Verify the callback was called with the right index
    expect(mockOnIndicatorChange).toHaveBeenCalledWith(1);
  });

  it('navigates to the next slide when clicking next button', () => {
    render(
      <ImageCarousel
        images={mockImages}
        title="Test Carousel"
        carouselId="test-carousel"
      />
    );

    // Get the next button and click it
    const nextButton = screen.getByLabelText('Next image');

    act(() => {
      fireEvent.click(nextButton);
      jest.runAllTimers(); // Fast-forward all timers
    });

    // scrollTo should have been called
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });

  it('navigates to the previous slide when clicking previous button', () => {
    render(
      <ImageCarousel
        images={mockImages}
        title="Test Carousel"
        carouselId="test-carousel"
      />
    );

    // Get the previous button and click it
    const prevButton = screen.getByLabelText('Previous image');

    act(() => {
      fireEvent.click(prevButton);
      jest.runAllTimers(); // Fast-forward all timers
    });

    // scrollTo should have been called
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });

  it('applies custom class names', () => {
    render(
      <ImageCarousel
        images={mockImages}
        title="Test Carousel"
        carouselId="test-carousel"
        className="custom-class"
        imageClassName="custom-image"
      />
    );

    const carouselContainer = document.getElementById('carousel-test-carousel');
    expect(carouselContainer).not.toBeNull();
    expect(carouselContainer?.classList.contains('custom-class')).toBe(true);

    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveClass('custom-image');
    });
  });

  it('applies different button sizes', () => {
    render(
      <ImageCarousel
        images={mockImages}
        title="Test Carousel"
        carouselId="test-carousel"
        navigationButtonSize="small"
      />
    );

    // Check that the small button class is applied
    const prevButton = screen.getByLabelText('Previous image');
    const nextButton = screen.getByLabelText('Next image');

    // The actual class should be p-2 for small buttons
    expect(prevButton.className).toContain('p-2');
    expect(nextButton.className).toContain('p-2');
  });

  it('handles touch events', () => {
    // Store original implementation of addEventListener
    const originalAddEventListener = Element.prototype.addEventListener;

    // Events handlers storage
    let touchHandlers: TouchHandlers = {
      touchstart: null,
      touchmove: null,
      touchend: null
    };

    // Mock addEventListener to capture touch event handlers
    Element.prototype.addEventListener = function(event: string, handler: EventListenerOrEventListenerObject) {
      if (event === 'touchstart' || event === 'touchmove' || event === 'touchend') {
        touchHandlers[event as keyof TouchHandlers] = handler as (event: TouchEvent) => void;
      }
      return originalAddEventListener.apply(this, [event, handler]);
    };

    render(
      <ImageCarousel
        images={mockImages}
        title="Test Carousel"
        carouselId="test-carousel"
      />
    );

    // Reset addEventListener
    Element.prototype.addEventListener = originalAddEventListener;

    // Simulate touch sequence
    if (touchHandlers.touchstart && touchHandlers.touchmove && touchHandlers.touchend) {
      // Create mock touch events
      const createTouchEvent = (type: string, clientX: number, clientY: number) => {
        const event: any = {
          preventDefault: jest.fn()
        };

        if (type === 'touchend') {
          event.changedTouches = [{ clientX, clientY }];
        } else {
          event.touches = [{ clientX, clientY }];
        }

        return event;
      };

      // Touchstart (from right to left swipe)
      act(() => {
        const touchStartEvent = createTouchEvent('touchstart', 500, 200);
        touchHandlers.touchstart!(touchStartEvent);
      });

      // Touchmove
      act(() => {
        const touchMoveEvent = createTouchEvent('touchmove', 300, 200);
        touchHandlers.touchmove!(touchMoveEvent);
      });

      // Touchend
      act(() => {
        const touchEndEvent = createTouchEvent('touchend', 300, 200);
        touchHandlers.touchend!(touchEndEvent);
        jest.runAllTimers();
      });

      // Verify scrollTo was called
      expect(Element.prototype.scrollTo).toHaveBeenCalled();
    }
  });
});
