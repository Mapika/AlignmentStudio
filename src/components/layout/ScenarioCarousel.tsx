import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Scenario } from '../../types';

interface ScenarioCarouselProps {
  scenarios: Scenario[];
  onSelectScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  itemsPerPage?: number;
}

export const ScenarioCarousel: React.FC<ScenarioCarouselProps> = ({
  scenarios,
  onSelectScenario,
  onDeleteScenario,
  itemsPerPage = 3,
}) => {
  const ITEM_GAP = 20;
  const WHEEL_SNAP_DELAY = 160;
  const WHEEL_SCROLL_MULTIPLIER = 1.35;
  const SCROLL_ANIMATION_DURATION = 360;
  const MIN_CARD_WIDTH = 240;
  const MAX_CARD_WIDTH = 400;

  const [activePage, setActivePage] = useState(0);
  const [itemWidth, setItemWidth] = useState(320);
  const [visibleItemsPerPage, setVisibleItemsPerPage] = useState(() => Math.max(1, itemsPerPage));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const wheelSnapTimeoutRef = useRef<number | null>(null);

  const totalPages = visibleItemsPerPage > 0 ? Math.ceil(scenarios.length / visibleItemsPerPage) : 0;
  const pageStride = useMemo(() => {
    if (visibleItemsPerPage <= 0) {
      return 0;
    }

    const itemStride = itemWidth + ITEM_GAP;
    const stride = itemStride * visibleItemsPerPage;

    return Math.max(stride, 1);
  }, [itemWidth, visibleItemsPerPage]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scenario? This cannot be undone.')) {
      onDeleteScenario(id);
    }
  };

  const cancelScrollAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const animateScrollTo = useCallback(
    (targetLeft: number, animate = true) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      cancelScrollAnimation();

      if (!animate) {
        container.scrollLeft = targetLeft;
        return;
      }

      const startLeft = container.scrollLeft;
      const distance = targetLeft - startLeft;
      if (Math.abs(distance) < 0.5) {
        container.scrollLeft = targetLeft;
        return;
      }

      const startTime = performance.now();
      const duration = SCROLL_ANIMATION_DURATION;

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        container.scrollLeft = startLeft + distance * eased;

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          container.scrollLeft = targetLeft;
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    },
    [cancelScrollAnimation]
  );

  const scrollToPage = useCallback(
    (page: number, options: { animate?: boolean } = {}) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const clampedPage =
        totalPages > 0 ? Math.max(0, Math.min(page, totalPages - 1)) : 0;
      currentPageRef.current = clampedPage;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) {
        animateScrollTo(0, options.animate !== false);
        if (options.animate === false || container.scrollLeft === 0) {
          setActivePage(clampedPage);
        }
        return;
      }

      // Calculate target with proper page-based scrolling
      const rawTarget = clampedPage * pageStride;
      const constrainedTarget = Math.max(0, Math.min(rawTarget, maxScrollLeft));
      const shouldUpdateImmediately =
        options.animate === false ||
        Math.abs(container.scrollLeft - constrainedTarget) < 1;
      if (shouldUpdateImmediately) {
        setActivePage(clampedPage);
      }
      animateScrollTo(constrainedTarget, options.animate !== false);
    },
    [animateScrollTo, pageStride, totalPages]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateItemWidth = () => {
      if (container.clientWidth <= 0) return;

      let nextVisibleItems = Math.min(itemsPerPage, Math.max(1, scenarios.length));
      let widthForItems =
        (container.clientWidth - (nextVisibleItems - 1) * ITEM_GAP) / nextVisibleItems;

      while (nextVisibleItems > 1 && widthForItems < MIN_CARD_WIDTH) {
        nextVisibleItems -= 1;
        widthForItems =
          (container.clientWidth - (nextVisibleItems - 1) * ITEM_GAP) / nextVisibleItems;
      }

      const clampedWidth = Math.max(MIN_CARD_WIDTH, Math.min(widthForItems, MAX_CARD_WIDTH));
      setVisibleItemsPerPage(nextVisibleItems);
      setItemWidth(clampedWidth);
    };

    updateItemWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateItemWidth);
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateItemWidth);
    return () => window.removeEventListener('resize', updateItemWidth);
  }, [itemsPerPage, scenarios.length]);

  // Track scroll position for pagination and live feedback
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (pageStride <= 0 || totalPages === 0) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      // Find the closest page using the same approach as wheel snap
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (let idx = 0; idx < totalPages; idx += 1) {
        const offset = Math.min(pageStride * idx, maxScrollLeft);
        const distance = Math.abs(container.scrollLeft - offset);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = idx;
        }
      }

      currentPageRef.current = closestIndex;
      setActivePage((prev) => (prev === closestIndex ? prev : closestIndex));
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pageStride, totalPages]);

  useEffect(() => {
    const clamped = totalPages > 0 ? Math.min(currentPageRef.current, totalPages - 1) : 0;
    currentPageRef.current = clamped;
    scrollToPage(clamped, { animate: false });
  }, [scrollToPage, totalPages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (dominantDelta === 0) {
        return;
      }
      event.preventDefault();

      const container = scrollContainerRef.current;
      if (!container) return;

      cancelScrollAnimation();

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;

      const baseDelta =
        event.deltaMode === 1
          ? dominantDelta * 16
          : event.deltaMode === 2
          ? dominantDelta * container.clientHeight
          : dominantDelta;
      const nextLeft = Math.max(
        0,
        Math.min(container.scrollLeft + baseDelta * WHEEL_SCROLL_MULTIPLIER, maxScrollLeft)
      );
      container.scrollLeft = nextLeft;

      if (wheelSnapTimeoutRef.current !== null) {
        window.clearTimeout(wheelSnapTimeoutRef.current);
      }

      if (totalPages <= 1) return;

      wheelSnapTimeoutRef.current = window.setTimeout(() => {
        if (pageStride <= 0) return;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (let idx = 0; idx < totalPages; idx += 1) {
          const offset = Math.min(pageStride * idx, maxScrollLeft);
          const distance = Math.abs(container.scrollLeft - offset);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = idx;
          }
        }
        const targetPage = closestIndex;
        scrollToPage(targetPage);
      }, WHEEL_SNAP_DELAY);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelSnapTimeoutRef.current !== null) {
        window.clearTimeout(wheelSnapTimeoutRef.current);
      }
    };
  }, [cancelScrollAnimation, pageStride, scrollToPage, totalPages]);

  useEffect(() => {
    return () => cancelScrollAnimation();
  }, [cancelScrollAnimation]);

  if (scenarios.length === 0) {
    return null;
  }

  const currentPage = totalPages > 0 ? Math.min(activePage, totalPages - 1) : 0;
  const animationGroupSize = Math.max(1, visibleItemsPerPage);

  return (
    <div className="relative">
      {/* Continuous Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="scrollbar-hide mb-5"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          marginLeft: '-28px',
          marginRight: '-28px',
          paddingTop: '8px',
          paddingBottom: '8px',
          paddingLeft: '20px',
          paddingRight: '28px',
          scrollSnapType: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: `${ITEM_GAP}px`,
            width: 'max-content',
          }}
        >
          {scenarios.map((scenario, idx) => (
            <div
              key={scenario.id}
              onClick={() => onSelectScenario(scenario.id)}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-orange-500 hover:shadow-lg transition-all duration-300 cursor-pointer min-h-[170px] flex flex-col transform hover:scale-[1.03] animate-fade-in"
              style={{
                width: `${itemWidth}px`,
                flex: '0 0 auto',
                animationDelay: `${(idx % animationGroupSize) * 80}ms`,
                transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
              }}
            >
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900 mb-1.5 line-clamp-2">
                  {scenario.name}
                </h3>
                <p className="text-xs text-slate-600 mb-3 line-clamp-3">
                  {scenario.systemPrompt || 'No description available'}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded">
                    {scenario.informationItems.length} info blocks
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectScenario(scenario.id);
                  }}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                >
                  Open →
                </button>
                <button
                  onClick={(e) => handleDelete(e, scenario.id)}
                  className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToPage(index)}
              className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${
                index === currentPage
                  ? 'bg-orange-600 w-8'
                  : 'bg-slate-300 hover:bg-orange-400 w-1.5'
              }`}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
              }}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
