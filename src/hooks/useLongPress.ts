import { useCallback, useRef, useState } from "react";

export function useLongPress(
    onLongPress: () => void,
    onClick: (e?: any) => void,
    { shouldPreventDefault = true, delay = 500 } = {}
) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<NodeJS.Timeout | null>(null);
    const target = useRef<EventTarget | null>(null);
    const isDragging = useRef(false);
    const startPos = useRef<{ x: number, y: number } | null>(null);

    const start = useCallback(
        (event: any) => {
            isDragging.current = false;
            
            // Record start position
            if (event.touches && event.touches.length > 0) {
                startPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            } else if (event.clientX) {
                startPos.current = { x: event.clientX, y: event.clientY };
            }

            if (event.target.closest('button')) return;

            if (shouldPreventDefault && event.target) {
                event.target.addEventListener("touchend", preventDefault, {
                    passive: false
                });
                target.current = event.target;
            }
            setLongPressTriggered(false);
            timeout.current = setTimeout(() => {
                onLongPress();
                setLongPressTriggered(true);
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        (event: any, shouldTriggerClick = true) => {
            if (event.target && event.target.closest && event.target.closest('button')) return;
            
            timeout.current && clearTimeout(timeout.current);
            shouldTriggerClick && !longPressTriggered && !isDragging.current && onClick(event);
            setLongPressTriggered(false);
            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener("touchend", preventDefault);
            }
        },
        [shouldPreventDefault, onClick, longPressTriggered]
    );

    return {
        onMouseDown: (e: any) => start(e),
        onTouchStart: (e: any) => start(e),
        onMouseUp: (e: any) => clear(e),
        onMouseLeave: (e: any) => {
            isDragging.current = true;
            clear(e, false);
        },
        onTouchEnd: (e: any) => clear(e),
        onTouchMove: (e: any) => {
            if (!startPos.current) return;
            
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const y = e.touches ? e.touches[0].clientY : e.clientY;
            
            if (x === undefined || y === undefined) return;
            
            const dist = Math.sqrt(Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2));
            
            // Only cancel long press if finger moved more than 10 pixels
            if (dist > 10) {
                isDragging.current = true;
                clear(e, false);
            }
        }
    };
}

const preventDefault = (event: Event) => {
    if (!('touches' in event)) return;
    if ((event as TouchEvent).touches.length < 2 && event.preventDefault) {
        event.preventDefault();
    }
};
