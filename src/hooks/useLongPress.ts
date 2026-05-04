import { useCallback, useRef, useState } from "react";

export function useLongPress(
    onLongPress: () => void,
    onClick: (e?: any) => void,
    { shouldPreventDefault = true, delay = 500 } = {}
) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<NodeJS.Timeout | null>(null);
    const target = useRef<EventTarget | null>(null);

    const start = useCallback(
        (event: any) => {
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
            shouldTriggerClick && !longPressTriggered && onClick(event);
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
        onMouseLeave: (e: any) => clear(e, false),
        onTouchEnd: (e: any) => clear(e),
        onTouchMove: (e: any) => clear(e, false)
    };
}

const preventDefault = (event: Event) => {
    if (!('touches' in event)) return;
    if ((event as TouchEvent).touches.length < 2 && event.preventDefault) {
        event.preventDefault();
    }
};
