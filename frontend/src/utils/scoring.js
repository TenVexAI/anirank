/**
 * Calculate the weighted overall score for an anime entry.
 *
 * @param {Object} scores - { technical, storytelling, enjoyment, xfactor }
 * @param {Object} weights - { technical, storytelling, enjoyment, xfactor }
 * @returns {number} Weighted average rounded to one decimal place
 */
export function calculateOverallScore(scores, weights) {
  const { technical = 0, storytelling = 0, enjoyment = 0, xfactor = 0 } = scores;
  const {
    technical: w1 = 1,
    storytelling: w2 = 1,
    enjoyment: w3 = 1,
    xfactor: w4 = 1,
  } = weights;

  const totalWeight = w1 + w2 + w3 + w4;
  if (totalWeight === 0) return 0;

  const weighted =
    w1 * technical + w2 * storytelling + w3 * enjoyment + w4 * xfactor;

  return Math.round((weighted / totalWeight) * 10) / 10;
}

/**
 * Sort list entries by overall weighted score descending.
 * Ties broken by added_at ascending (earlier entry ranks higher).
 */
export function rankEntries(entries, weights) {
  return [...entries]
    .map((entry) => ({
      ...entry,
      overallScore: calculateOverallScore(
        {
          technical: entry.score_technical,
          storytelling: entry.score_storytelling,
          enjoyment: entry.score_enjoyment,
          xfactor: entry.score_xfactor,
        },
        weights
      ),
    }))
    .sort((a, b) => {
      if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
      return new Date(a.added_at) - new Date(b.added_at);
    });
}
