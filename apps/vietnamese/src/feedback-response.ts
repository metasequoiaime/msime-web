export class FeedbackResponseError extends Error {}

// A static preview or an upstream error page can return HTML even with status 200.
export async function readFeedbackResponse(response: Response, message: string) {
  const mediaType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json" && !mediaType?.endsWith("+json")) throw new FeedbackResponseError(message);
  try {
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new FeedbackResponseError(message);
    return data;
  } catch {
    throw new FeedbackResponseError(message);
  }
}
