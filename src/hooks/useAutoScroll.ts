import { useEffect, useRef } from 'react';

export function useAutoScroll<T extends HTMLElement>(
    dependency: unknown[],
    options: { behavior?: ScrollBehavior; delay?: number } = {}
) {
    const ref = useRef<T>(null);
    const { behavior = 'smooth', delay = 100 } = options;

    useEffect(() => {
        const timer = setTimeout(() => {
            if (ref.current) {
                ref.current.scrollTo({
                    top: ref.current.scrollHeight,
                    behavior,
                });
            }
        }, delay);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependency);

    return ref;
}
