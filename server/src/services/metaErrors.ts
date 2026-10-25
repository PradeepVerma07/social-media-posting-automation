import { ErrorCategory } from '../schemas';

export interface MetaErrorInfo {
  category: ErrorCategory;
  isRetryable: boolean;
  userMessage: string;
}

export function classifyMetaError(
  code: number | string | undefined,
  subcode: number | string | undefined,
  httpStatus: number | undefined,
  rawMessage: string | undefined
): MetaErrorInfo {
  const numericCode = Number(code) || 0;
  const numericSubcode = Number(subcode) || 0;
  const status = Number(httpStatus) || 0;
  const msg = rawMessage || '';

  // 1. Auth errors
  if (
    numericCode === 190 ||
    numericCode === 10 ||
    (numericCode >= 200 && numericCode <= 299) ||
    numericSubcode === 463 || // expired
    numericSubcode === 467 || // invalid access token
    msg.toLowerCase().includes('session has expired') ||
    msg.toLowerCase().includes('invalid oauth access token')
  ) {
    return {
      category: 'auth',
      isRetryable: false,
      userMessage: 'OAuth token is expired or unauthorized. Please re-authenticate your social account.',
    };
  }

  // 2. Policy errors
  if (numericCode === 368 || msg.toLowerCase().includes('blocked for policy') || msg.toLowerCase().includes('community standards')) {
    return {
      category: 'policy',
      isRetryable: false,
      userMessage: 'Content blocked by Meta policy. Manual review required.',
    };
  }

  // 3. Retryable errors: HTTP 5xx, timeouts, rate limits (4, 17, 32, 613, 80001-80014)
  const isRateLimit =
    numericCode === 4 ||
    numericCode === 17 ||
    numericCode === 32 ||
    numericCode === 613 ||
    (numericCode >= 80001 && numericCode <= 80014);

  const isServerTransient =
    numericCode === 1 ||
    numericCode === 2 ||
    status >= 500 ||
    status === 408 ||
    msg.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('transient') ||
    msg.toLowerCase().includes('not ready');

  if (isRateLimit || isServerTransient) {
    return {
      category: 'retryable',
      isRetryable: true,
      userMessage: isRateLimit
        ? 'Meta API rate limit reached. Backing off automatically.'
        : 'Transient Meta server error or timeout. Will retry automatically.',
    };
  }

  // 4. Validation errors: Code 100, bad parameters, media unreachable
  if (
    numericCode === 100 ||
    status === 400 ||
    msg.toLowerCase().includes('parameter') ||
    msg.toLowerCase().includes('aspect ratio') ||
    msg.toLowerCase().includes('media')
  ) {
    return {
      category: 'validation',
      isRetryable: false,
      userMessage: `Invalid media or parameters: ${msg}`,
    };
  }

  // 5. Unknown
  return {
    category: 'unknown',
    isRetryable: true, // Allow 1 retry per spec
    userMessage: msg || 'Unknown Meta publishing error.',
  };
}
