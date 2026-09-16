// Retry only idempotent reads; one collector process shares a finite retry budget.
export function createReadWithRetry({ fetcher = (...args) => fetch(...args), pause = ms => new Promise(resolve => setTimeout(resolve, ms)), notice = console.warn, retryBudget = 20 } = {}) {
  let remaining = retryBudget;
  return async function read(url, { headers, timeoutMs = 15_000 } = {}, consume = response => response.json()) {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetcher(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
          error.retryable = [408, 500, 502, 503, 504].includes(response.status);
          await response.body?.cancel();
          throw error;
        }
        return await consume(response);
      } catch (error) {
        const transient = error.retryable || error.name === 'TimeoutError' || (error instanceof TypeError && error.message === 'fetch failed') || ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_SOCKET'].includes(error.cause?.code);
        if (!transient || attempt >= 2 || remaining <= 0) throw error;
        remaining--;
        notice(`${new URL(url).hostname}: transient read failure; retry ${attempt + 1}/2 (${remaining} shared retries left).`);
        await pause(attempt === 0 ? 1000 : 3000);
      }
    }
  };
}
export const readWithRetry = createReadWithRetry();
