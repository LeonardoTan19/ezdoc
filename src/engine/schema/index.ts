import { z } from 'zod'
import { ContentConfigSchema } from './content-schemas'
import { PageConfigSchema } from './page-schemas'
import { PaginationConfigSchema } from './pagination-schemas'
import { ParserConfigSchema } from './parser-schemas'

export * from './primitives'
export * from './content-schemas'
export * from './page-schemas'
export * from './parser-schemas'
export * from './pagination-schemas'

export const RuleConfigSchema = z.object({
  name: z.string().min(1, 'Rule name must be non-empty'),
  version: z.string().min(1, 'Rule version must be non-empty'),
  description: z.string().optional(),
  content: ContentConfigSchema,
  page: PageConfigSchema,
  pagination: PaginationConfigSchema.optional(),
  parser: ParserConfigSchema,
})

export type RuleConfig = z.infer<typeof RuleConfigSchema>
