
// SINGLE SOURCE OF TRUTH for Game Rules
export const MATCH_RULES = {
  SETS: 1,
  POINTS_TO_WIN: 15,
  WIN_BY: 1,        // effectively disabled (hard cap)
  MAX_POINTS: 15,
  ALLOW_DEUCE: false,
  GOLDEN_POINT_THRESHOLD: 14
};

/**
 * Validates if a score result is legal under the Hard 15 rules.
 * - One side must equal 15.
 * - No side can exceed 15.
 * - Scores cannot be equal (no ties).
 * - Golden Point: 15-14 is valid.
 */
export const isValidScore = (scoreA: number, scoreB: number): boolean => {
  const max = MATCH_RULES.POINTS_TO_WIN;

  // 1. Basic sanity checks
  if (scoreA < 0 || scoreB < 0) return false;

  // 2. Hard Cap Check: No one can exceed 15
  if (scoreA > max || scoreB > max) return false;

  // 3. Special Case: 0-0 is allowed for "Skipped/Timed Out" matches
  if (scoreA === 0 && scoreB === 0) return true;

  // 4. One side MUST hit exactly 15
  if (scoreA !== max && scoreB !== max) return false;

  // 5. No ties allowed (except 0-0)
  if (scoreA === scoreB) return false;

  // Logic verification:
  // If A=15, B=14 -> Valid (Golden Point)
  // If A=15, B=13 -> Valid
  // If A=15, B=0 -> Valid
  // If A=16 -> Invalid (caught by #2)
  // If A=15, B=15 -> Invalid (caught by #4)

  return true;
};

/**
 * Computes League Points based on the result.
 * - Win: 3 Points (+1 for Bagel)
 * - Loss: 1 Point (+1 for Close Loss >= 14, 0 for Bagel)
 */
export const computeLeaguePoints = (
  isWinner: boolean,
  ownScore: number,
  opponentScore: number
): number => {
  if (isWinner) {
    // Win: 3 points base
    // Bonus: +1 if opponent scored 0 (Bagel win)
    return opponentScore === 0 ? 4 : 3;
  } else {
    // Loss: 1 point base
    // Exception: 0 points if own score is 0 (Bagel loss)
    if (ownScore === 0) return 0;
    // Bonus: +1 if own score >= 14 (Close loss, e.g. 14-15)
    if (ownScore >= 14) return 2;
    return 1;
  }
};
