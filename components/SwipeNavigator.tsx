import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleProp, View, ViewStyle } from 'react-native';

type Axis = 'x' | 'y';

interface SwipeNavigatorProps {
  /** 'x' = swipe left/right (week and day views), 'y' = swipe up/down (month view). */
  axis: Axis;
  /** Called when the user swipes to the next period (left on 'x', up on 'y'). */
  onNext: () => void;
  /** Called when the user swipes to the previous period (right on 'x', down on 'y'). */
  onPrev: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** How far (px) a swipe has to travel before it changes the period. */
const SWIPE_DISTANCE = 60;
/** A quick flick changes the period even if it is shorter than SWIPE_DISTANCE. */
const SWIPE_VELOCITY = 0.5;
/** Mouse wheel / trackpad: how much scrolling counts as one "page". */
const WHEEL_DISTANCE = 80;
/** Ignore wheel events for this long after a page change (trackpads keep sending momentum events). */
const WHEEL_COOLDOWN_MS = 650;
const SLIDE_MS = 220;

const useNativeDriver = Platform.OS !== 'web';

/** When the last swipe gesture moved or ended (shared by every SwipeNavigator). */
let lastSwipeTime = 0;
const markSwipe = () => {
  lastSwipeTime = Date.now();
};

/**
 * True for a moment after a swipe. Lifting the finger (or mouse) at the end of a swipe
 * would otherwise count as a tap on whatever hour cell or task is underneath it.
 */
export function wasJustSwiped(): boolean {
  return Date.now() - lastSwipeTime < 400;
}

/**
 * Wraps a calendar view so it can be swiped to the next or previous month/week/day.
 * The content follows the finger, then slides out and the new period slides in.
 * On the web, dragging with the mouse, the mouse wheel (month) and a horizontal
 * trackpad swipe (week/day) also work.
 */
export function SwipeNavigator({ axis, onNext, onPrev, children, style }: SwipeNavigatorProps) {
  // Lazy useState keeps one Animated.Value for the component's lifetime
  const [offset] = useState(() => new Animated.Value(0));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const isAnimating = useRef(false);
  const wheelTotal = useRef(0);
  const lastWheelPage = useRef(0);
  const containerRef = useRef<View>(null);

  // Keep the latest values in refs, because the PanResponder and wheel listener are created once
  const latest = useRef({ axis, onNext, onPrev, size });
  useEffect(() => {
    latest.current = { axis, onNext, onPrev, size };
  });

  /** Slides the current view out, switches period, then slides the new one in. */
  const changePeriod = useCallback(
    (direction: 1 | -1) => {
      if (isAnimating.current) return;
      isAnimating.current = true;
      const { axis: a, size: s, onNext: next, onPrev: prev } = latest.current;
      const distance = (a === 'x' ? s.width : s.height) || 400;

      Animated.timing(offset, {
        toValue: -direction * distance,
        duration: SLIDE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      }).start(() => {
        if (direction === 1) next();
        else prev();
        offset.setValue(direction * distance);
        Animated.timing(offset, {
          toValue: 0,
          duration: SLIDE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }).start(() => {
          isAnimating.current = false;
        });
      });
    },
    [offset],
  );

  const springBack = useCallback(() => {
    Animated.spring(offset, { toValue: 0, useNativeDriver, bounciness: 4 }).start();
  }, [offset]);

  // Lazy useState initialiser: the PanResponder is created once for the component's lifetime.
  // latest.current is only read inside the gesture handlers, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() => {
    const along = (dx: number, dy: number) => (latest.current.axis === 'x' ? dx : dy);
    const across = (dx: number, dy: number) => (latest.current.axis === 'x' ? dy : dx);
    const isOurSwipe = (dx: number, dy: number) =>
      !isAnimating.current &&
      Math.abs(along(dx, dy)) > 12 &&
      Math.abs(along(dx, dy)) > Math.abs(across(dx, dy)) * 1.5;

    return PanResponder.create({
      // Capture so a swipe along our axis wins over taps on task cards and hour cells,
      // while scrolling along the other axis (e.g. hours in week view) still works
      onMoveShouldSetPanResponderCapture: (_e, g) => isOurSwipe(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_e, g) => isOurSwipe(g.dx, g.dy),
      onPanResponderMove: (_e, g) => {
        markSwipe();
        offset.setValue(along(g.dx, g.dy));
      },
      onPanResponderRelease: (_e, g) => {
        markSwipe();
        const travel = along(g.dx, g.dy);
        const speed = along(g.vx, g.vy);
        if (travel < -SWIPE_DISTANCE || speed < -SWIPE_VELOCITY) changePeriod(1);
        else if (travel > SWIPE_DISTANCE || speed > SWIPE_VELOCITY) changePeriod(-1);
        else springBack();
      },
      onPanResponderTerminate: () => springBack(),
      onPanResponderTerminationRequest: () => false,
    });
  });

  // Web only: pointer drag (mouse and touch), mouse wheel and trackpad swipes.
  // The browser's own pointer events are used here instead of PanResponder, because on the
  // web the responder system kept blocking taps on the grid after a drag.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    const isX = () => latest.current.axis === 'x';

    // Let the browser keep scrolling the other axis, but leave our axis to us.
    // Also stop the browser's "swipe to go back a page" gesture.
    node.style.touchAction = isX() ? 'pan-y' : 'pan-x';
    node.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehaviorX = 'none';
    document.body.style.overscrollBehaviorX = 'none';

    // ── Pointer drag ──
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let dragging = false;

    // Mouse (and pen) use pointer events. Touch is handled by the touch events below,
    // because the browser cancels pointer events as soon as it starts its own pan.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (isAnimating.current || e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      dragging = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const along = isX() ? dx : dy;
      const across = isX() ? dy : dx;
      if (!dragging) {
        if (Math.abs(along) > 12 && Math.abs(along) > Math.abs(across) * 1.5) {
          dragging = true;
          node.setPointerCapture?.(e.pointerId);
        } else {
          return;
        }
      }
      markSwipe();
      offset.setValue(along);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      if (!dragging) return;
      dragging = false;
      finishDrag(isX() ? e.clientX - startX : e.clientY - startY);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      if (dragging) springBack();
      dragging = false;
    };

    /** Shared by mouse and touch: decide whether the drag was long/fast enough. */
    const finishDrag = (travel: number) => {
      markSwipe(); // lifting the finger after a swipe must not count as a tap
      const speed = travel / Math.max(Date.now() - startTime, 1); // px per ms
      if (travel < -SWIPE_DISTANCE || speed < -SWIPE_VELOCITY) changePeriod(1);
      else if (travel > SWIPE_DISTANCE || speed > SWIPE_VELOCITY) changePeriod(-1);
      else springBack();
    };

    // ── Touch (phones and tablets in the browser) ──
    let touchTracking = false;
    let touchDragging = false;

    const onTouchStart = (e: TouchEvent) => {
      if (isAnimating.current || e.touches.length !== 1) {
        touchTracking = false;
        return;
      }
      touchTracking = true;
      touchDragging = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchTracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      const along = isX() ? dx : dy;
      const across = isX() ? dy : dx;
      if (!touchDragging) {
        if (Math.abs(across) > 12 && Math.abs(across) >= Math.abs(along)) {
          touchTracking = false; // it's a normal scroll (e.g. through the hours), not a swipe
          return;
        }
        if (Math.abs(along) > 12 && Math.abs(along) > Math.abs(across) * 1.5) touchDragging = true;
        else return;
      }
      e.preventDefault(); // stop the page from scrolling or going "back" while we swipe
      markSwipe();
      offset.setValue(along);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchTracking) return;
      touchTracking = false;
      if (!touchDragging) return;
      touchDragging = false;
      const t = e.changedTouches[0];
      finishDrag(isX() ? t.clientX - startX : t.clientY - startY);
    };

    // ── Mouse wheel (month) / horizontal trackpad swipe (week, day) ──
    const onWheel = (e: WheelEvent) => {
      const along = isX() ? e.deltaX : e.deltaY;
      const across = isX() ? e.deltaY : e.deltaX;
      if (Math.abs(along) <= Math.abs(across)) return; // scrolling the other way, let it through
      e.preventDefault();

      const now = Date.now();
      if (isAnimating.current || now - lastWheelPage.current < WHEEL_COOLDOWN_MS) {
        wheelTotal.current = 0;
        return;
      }
      wheelTotal.current += along;
      if (Math.abs(wheelTotal.current) >= WHEEL_DISTANCE) {
        const direction = wheelTotal.current > 0 ? 1 : -1;
        wheelTotal.current = 0;
        lastWheelPage.current = now;
        changePeriod(direction);
      }
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerUp);
    node.addEventListener('pointercancel', onPointerCancel);
    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchEnd);
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerCancel);
      node.removeEventListener('wheel', onWheel);
    };
  }, [changePeriod, springBack, offset]);

  const transform = axis === 'x' ? [{ translateX: offset }] : [{ translateY: offset }];

  return (
    <View
      ref={containerRef}
      style={[{ flex: 1, overflow: 'hidden' }, style]}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      {...(Platform.OS === 'web' ? {} : panResponder.panHandlers)}
    >
      <Animated.View style={{ flex: 1, transform }}>{children}</Animated.View>
    </View>
  );
}
