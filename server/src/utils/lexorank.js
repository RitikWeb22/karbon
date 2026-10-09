/**
 * Calculates a new fractional rank for a task based on surrounding items.
 *
 * @param {number|null} prevRank - Rank of previous item, or null if placed at the top.
 * @param {number|null} nextRank - Rank of next item, or null if placed at the bottom.
 * @returns {number} The calculated rank.
 */
export function calculateRank(prevRank, nextRank) {
  const DEFAULT_INITIAL_RANK = 1000;
  const RANK_SPACING = 1000;

  // Case 1: Column is empty
  if (prevRank == null && nextRank == null) {
    return DEFAULT_INITIAL_RANK;
  }

  // Case 2: Inserted at top
  if (prevRank == null && nextRank != null) {
    if (nextRank > 1) {
      return Number((nextRank / 2).toFixed(6));
    }
    return Number((nextRank - 0.5).toFixed(6));
  }

  // Case 3: Inserted at bottom
  if (prevRank != null && nextRank == null) {
    return Number((prevRank + RANK_SPACING).toFixed(6));
  }

  // Case 4: Inserted between prevRank and nextRank
  if (prevRank != null && nextRank != null) {
    const midpoint = (prevRank + nextRank) / 2;
    return Number(midpoint.toFixed(6));
  }

  return DEFAULT_INITIAL_RANK;
}
