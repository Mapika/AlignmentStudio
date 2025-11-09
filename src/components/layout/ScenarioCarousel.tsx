import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Scenario } from '../../types';

interface ScenarioCarouselProps {
  scenarios: Scenario[];
  onSelectScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  itemsPerPage?: number;
  leadingCard?: React.ReactNode;
}

export const ScenarioCarousel: React.FC<ScenarioCarouselProps> = ({
  scenarios,
  onSelectScenario,
  onDeleteScenario,
  itemsPerPage = 3,
  leadingCard,
}) => {
  const ITEM_GAP = 20;
  const SCROLL_ALIGN_DELAY = 700;
  const FAST_SCROLL_DURATION = 250;
  const GENTLE_ALIGN_DURATION = 650;
  const MIN_CARD_WIDTH = 240;
  const MAX_CARD_WIDTH = 400;

  const [activePage, setActivePage] = useState(0);
  const [itemWidth, setItemWidth] = useState(320);
  const [visibleItemsPerPage, setVisibleItemsPerPage] = useState(() => Math.max(1, itemsPerPage));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAlignTimeoutRef = useRef<number | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const activePageRef = useRef(0);

  const totalPages = scenarios.length;
  const pageStride = useMemo(() => {
    const itemStride = itemWidth + ITEM_GAP;
    return Math.max(itemStride, 1);
  }, [itemWidth]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scenario? This cannot be undone.')) {
      onDeleteScenario(id);
    }
  };

  const cancelScrollAnimation = useCallback(() => {
    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, []);

  const clampIndex = useCallback(
    (index: number) => {
      if (totalPages === 0) return 0;
      return Math.max(0, Math.min(index, totalPages - 1));
    },
    [totalPages]
  );

  const scrollToIndex = useCallback(
    (
      index: number,
      {
        duration = FAST_SCROLL_DURATION,
        updateActive = true,
      }: { duration?: number; updateActive?: boolean } = {}
    ) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (pageStride <= 0) return;

      const clampedIndex = clampIndex(index);
      const maxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
      const targetLeft = Math.min(clampedIndex * pageStride, maxScrollLeft);

      cancelScrollAnimation();

      if (duration <= 0) {
        container.scrollLeft = targetLeft;
        if (updateActive) {
          setActivePage(clampedIndex);
        }
        return;
      }

      const startLeft = container.scrollLeft;
      const distance = targetLeft - startLeft;
      if (Math.abs(distance) < 1) {
        if (updateActive) {
          setActivePage(clampedIndex);
        }
        container.scrollLeft = targetLeft;
        return;
      }

      const startTime = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = easeOutCubic(progress);
        container.scrollLeft = startLeft + distance * eased;

        if (progress < 1) {
          scrollAnimationFrameRef.current = requestAnimationFrame(step);
        } else {
          scrollAnimationFrameRef.current = null;
        }
      };

      scrollAnimationFrameRef.current = requestAnimationFrame(step);

      if (updateActive) {
        setActivePage(clampedIndex);
      }
    },
    [clampIndex, pageStride, cancelScrollAnimation]
  );

  const alignToNearestCard = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || pageStride <= 0) return;

    const rawIndex = Math.round(container.scrollLeft / pageStride);
    const clampedIndex = clampIndex(rawIndex);
    const maxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    const targetLeft = Math.min(clampedIndex * pageStride, maxScrollLeft);

    if (Math.abs(container.scrollLeft - targetLeft) < 1) {
      return;
    }

    scrollToIndex(clampedIndex, { duration: GENTLE_ALIGN_DURATION });
  }, [clampIndex, pageStride, scrollToIndex]);

  useEffect(() => {
    setActivePage((prev) => clampIndex(prev));
  }, [clampIndex]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateItemWidth = () => {
      if (container.clientWidth <= 0) return;

      const styles = window.getComputedStyle(container);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const availableWidth = container.clientWidth - paddingLeft - paddingRight;
      if (availableWidth <= 0) return;

      let nextVisibleItems = Math.max(1, itemsPerPage);
      let widthForItems = (availableWidth - (nextVisibleItems - 1) * ITEM_GAP) / nextVisibleItems;

      while (nextVisibleItems > 1 && widthForItems < MIN_CARD_WIDTH) {
        nextVisibleItems -= 1;
        widthForItems =
          (availableWidth - (nextVisibleItems - 1) * ITEM_GAP) / nextVisibleItems;
      }

      const clampedWidth = Math.max(MIN_CARD_WIDTH, Math.min(widthForItems, MAX_CARD_WIDTH));
      const adjustedWidth = Math.min(clampedWidth + 1, MAX_CARD_WIDTH);
      setVisibleItemsPerPage(nextVisibleItems);
      setItemWidth(adjustedWidth);
    };

    updateItemWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateItemWidth);
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateItemWidth);
    return () => window.removeEventListener('resize', updateItemWidth);
  }, [itemsPerPage]);

  useEffect(() => {
    if (totalPages === 0) return;
    scrollToIndex(activePageRef.current, { duration: 0, updateActive: false });
  }, [scrollToIndex, totalPages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (pageStride <= 0) return;
      const { deltaX, deltaY } = event;
      const dominantDelta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
      if (dominantDelta === 0) return;

      event.preventDefault();
      cancelScrollAnimation();
      if (scrollAlignTimeoutRef.current !== null) {
        window.clearTimeout(scrollAlignTimeoutRef.current);
        scrollAlignTimeoutRef.current = null;
      }

      container.scrollLeft += dominantDelta;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [cancelScrollAnimation, pageStride]);

  // Update active indicator while scrolling and schedule gentle snap alignment
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (pageStride <= 0) return;

      if (scrollAlignTimeoutRef.current !== null) {
        window.clearTimeout(scrollAlignTimeoutRef.current);
      }

      scrollAlignTimeoutRef.current = window.setTimeout(() => {
        scrollAlignTimeoutRef.current = null;
        alignToNearestCard();
      }, SCROLL_ALIGN_DELAY);

      const rawIndex = Math.round(container.scrollLeft / pageStride);
      const clampedIndex = clampIndex(rawIndex);
      setActivePage((prev) => (prev === clampedIndex ? prev : clampedIndex));
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollAlignTimeoutRef.current !== null) {
        window.clearTimeout(scrollAlignTimeoutRef.current);
        scrollAlignTimeoutRef.current = null;
      }
    };
  }, [alignToNearestCard, clampIndex, pageStride]);

  useEffect(() => {
    return () => {
      cancelScrollAnimation();
      if (scrollAlignTimeoutRef.current !== null) {
        window.clearTimeout(scrollAlignTimeoutRef.current);
      }
    };
  }, [cancelScrollAnimation]);

  if (scenarios.length === 0 && !leadingCard) {
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
          paddingLeft: '10px',
          paddingRight: '20px',
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
          {leadingCard && (
            <div
              className="min-h-[170px]"
              style={{
                width: `${itemWidth}px`,
                flex: '0 0 auto',
              }}
            >
              {leadingCard}
            </div>
          )}
          {scenarios.map((scenario, idx) => (
            <div
              key={scenario.id}
              onClick={() => onSelectScenario(scenario.id)}
              className="theme-surface bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 rounded-lg p-5 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-lg dark:hover:shadow-orange-500/10 transition-all duration-300 cursor-pointer min-h-[170px] flex flex-col transform hover:scale-[1.03] animate-fade-in"
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
                <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100 mb-1.5 line-clamp-2">
                  {scenario.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mb-3 line-clamp-3">
                  {scenario.systemPrompt || 'No description available'}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-neutral-400 transition-colors duration-300">
                  <span className="px-1.5 py-0.5 bg-[#dfe3e7] dark:bg-neutral-800 rounded transition-colors duration-300">
                    {scenario.informationItems.length} info blocks
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-300 dark:border-neutral-700 transition-colors duration-300">
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
                  className="text-xs font-medium text-slate-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 transition-colors"
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
              onClick={() => scrollToIndex(index, { duration: FAST_SCROLL_DURATION })}
              className={`h-1.5 rounded-full transition-colors duration-300 ease-in-out ${
                index === currentPage
                  ? 'bg-orange-600 w-8'
                  : 'bg-slate-300 dark:bg-neutral-700 hover:bg-orange-400 dark:hover:bg-orange-500 w-1.5'
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
