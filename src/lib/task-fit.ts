import data from '../data/task-fit.json';
import type { Tool } from '../data/tools';

export type Claim = { text: string; source: string };
export type TaskFit = { reviewedAt: string; bestFor: Claim; lookElsewhere: Claim; alternatives: (Claim & { slug: string })[] };
export const taskFits = data as Record<string, TaskFit>;

/** Alternatives that are still listed, paired with their catalog records. */
export function fitAlternatives(fit: TaskFit, tools: Tool[]) {
  return fit.alternatives.flatMap(alternative => {
    const tool = tools.find(candidate => candidate.slug === alternative.slug);
    return tool ? [{ ...alternative, tool }] : [];
  });
}
