import { useEffect, useRef, useState } from 'react';

/**
 * SSR-safe "reveal on enter" hook.
 *
 * Progressive enhancement: the element is fully visible by default (server
 * render, no-JS, and reduced-motion all skip the animation). Only on the
 * client, when animation is allowed, do we apply the hidden -> visible
 * transition as the element enters the viewport.
 *
 * Returns:
 * - `ref`: attach to the element you want to reveal.
 * - `enabled`: true once on the client AND animation is allowed
 *   (IntersectionObserver available, prefers-reduced-motion not set). Use it to
 *   apply the initial "hidden" styles ONLY when we can animate, so SSR/no-JS
 *   output is never left invisible.
 * - `revealed`: flips to true when the element enters the viewport.
 *
 * @param {Object} options
 * @param {number} [options.threshold=0.15] IntersectionObserver threshold
 * @param {string} [options.rootMargin='0px 0px -10% 0px'] IntersectionObserver rootMargin
 * @returns {{ ref: Object, enabled: boolean, revealed: boolean }}
 */
export const useReveal = (options = {}) => {
  const { threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = options;
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // No animation path: render content as-is, fully visible.
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }

    setEnabled(true);

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, enabled, revealed };
};

export default useReveal;
