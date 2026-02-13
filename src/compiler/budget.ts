import { estimateTokens, estimateTokensForStrings } from "../utils"
import type { BudgetConfig } from "../types"
import type { LocalePlan } from "./types"

// Apply a token budget to a list of items, allowing partial results.
export function applyBudget<T extends { source: string }>(
  items: T[],
  budgetTokens: number
): { allowed: T[]; skipped: T[]; usedTokens: number } {
  if (!Number.isFinite(budgetTokens)) {
    return {
      allowed: items,
      skipped: [],
      usedTokens: estimateTokensForStrings(items.map((item) => item.source))
    }
  }

  let used = 0
  const allowed: T[] = []
  const skipped: T[] = []

  for (const item of items) {
    const cost = estimateTokens(item.source)
    if (used + cost <= budgetTokens) {
      allowed.push(item)
      used += cost
    } else {
      skipped.push(item)
    }
  }

  return { allowed, skipped, usedTokens: used }
}

// Distribute global and per-locale budgets across locale plans.
export function applyBudgetsToPlans(
  plans: LocalePlan[],
  sourceLocale: string,
  budget: Required<BudgetConfig>
): void {
  let remainingTokens = budget.maxTokensPerRun

  for (const plan of plans) {
    if (plan.locale === sourceLocale) {
      plan.budgetTokens = Number.POSITIVE_INFINITY
      continue
    }

    const requiredTokens = estimateTokensForStrings(
      plan.toTranslate.map((item) => item.source)
    )
    const localeCap = budget.maxTokensPerLocale
    const allowed = Math.min(requiredTokens, localeCap, remainingTokens)
    plan.budgetTokens = allowed
    remainingTokens = Math.max(0, remainingTokens - allowed)
  }
}
