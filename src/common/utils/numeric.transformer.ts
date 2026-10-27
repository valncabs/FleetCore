import { ValueTransformer } from 'typeorm';

/** PostgreSQL returns NUMERIC columns as strings; this converts them back to numbers. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? null : parseFloat(value)),
};
