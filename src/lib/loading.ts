import { useEffect, useState } from "react";

/**
 * True only once `isLoading` has held for `delayMs` milliseconds.
 * Fast loads (warm edge cache, client cache) resolve before the timer fires
 * and never flash a skeleton; genuinely slow loads get one after the grace
 * period. Resets as soon as loading ends.
 */
export function useSkeletonDelay(isLoading: boolean, delayMs = 250): boolean {
	const [show, setShow] = useState(false);
	useEffect(() => {
		if (!isLoading) {
			setShow(false);
			return;
		}
		const timer = setTimeout(() => setShow(true), delayMs);
		return () => clearTimeout(timer);
	}, [isLoading, delayMs]);
	return show;
}
