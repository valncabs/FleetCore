const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Converts an HTTP status code to its digit-by-digit spelling, e.g. 404 -> "four zero four". */
export const codeToWords = (code: number): string =>
  String(code)
    .split('')
    .map((digit) => DIGIT_WORDS[Number(digit)])
    .join(' ');
