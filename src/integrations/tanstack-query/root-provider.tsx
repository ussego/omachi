import { QueryClient } from "@tanstack/react-query";

interface HttpErrorLike {
	status?: number;
}

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: (failureCount, error) => {
					// A 4xx answer is deterministic — retrying can't turn a missing
					// plugin into a real one, and the page would sit on its loading
					// skeleton for the full backoff. Only transient failures (5xx,
					// network) get the default retries.
					const status = (error as HttpErrorLike | null | undefined)?.status;
					if (typeof status === "number" && status >= 400 && status < 500) return false;
					return failureCount < 3;
				},
			},
		},
	});

	return {
		queryClient,
	};
}
export default function TanstackQueryProvider() {}
