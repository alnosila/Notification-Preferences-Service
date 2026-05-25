/**
 * @author alnosila — https://github.com/alnosila
 */

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidPreferenceError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_PREFERENCE');
  }
}
