/*
 * The site's motion grammar.
 *
 * Every explanatory animation is one compact composition that happens
 * sequentially: one thing, then the next. These are the only durations and
 * eases any figure uses, so the whole site moves at one tempo.
 */
import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(DrawSVGPlugin, Flip, ScrollTrigger);

export { gsap, Flip };

// Restrained by design: nothing snaps, nothing lingers. A step that needs to
// read as deliberate uses `slow`; everything else is `base` or shorter.
export const DUR = { quick: 0.25, base: 0.36, slow: 0.55 };
export const EASE = { out: 'power2.out', inOut: 'power2.inOut', draw: 'power1.inOut' };
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const qa = (root, selector) => [...root.querySelectorAll(selector)];
export const q = (root, selector) => root.querySelector(selector);

/*
 * Builds a paused timeline inside a gsap.context and starts it when visible.
 *
 * `start: 'mount'` is for a composition that is on screen the moment the page
 * is (the landing). Everything else uses `start: 'scroll'`. Figures may opt
 * into a restrained replay after the established pause; reduced motion always
 * resolves to the completed static state instead.
 *
 * Reduced motion is handled by completing the timeline rather than by
 * skipping it. The end state of every figure is therefore also its static
 * state, which is what keeps the no-animation rendering correct without a
 * second set of styles to maintain.
 */
export function useSequence(ref, build, { start = 'scroll', repeat = false } = {}) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    let context;
    let frame;
    // Seeded before observing so the ResizeObserver's initial callback does not
    // count as a change and restart the sequence the moment it starts.
    let lastWidth = Math.round(root.getBoundingClientRect().width);

    const create = () => {
      context?.revert();
      context = gsap.context(() => {
        const timeline = gsap.timeline({
          paused: true,
          repeat: repeat ? -1 : 0,
          repeatDelay: repeat ? 1.4 : 0,
          defaults: { ease: EASE.out },
        });
        build(root, timeline);

        if (reducedMotion()) {
          timeline.progress(1).pause();
          return;
        }
        if (start === 'mount') {
          timeline.play();
          return;
        }
        ScrollTrigger.create({ trigger: root, start: 'top 82%', once: true, onEnter: () => timeline.play() });
      }, root);
    };

    create();

    // SVG figures scale with their column, so a width change is the only thing
    // that invalidates the geometry a timeline was built against.
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width === lastWidth) return;
      lastWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(create);
    });
    observer.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      context?.revert();
    };
  }, [build, ref, repeat, start]);
}
