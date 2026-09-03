const INTERNAL_ERROR = "internal server error";

/** Build the established JSON API error response without exposing details by default. */
export function apiErrorResponse(err: unknown, exposeMessage = false): Response {
	if (err instanceof Response) return err;

	const message = exposeMessage && err instanceof Error && err.message ? err.message : INTERNAL_ERROR;
	return Response.json({ error: message }, { status: 500 });
}
