// lib/mtapContent.ts
// Static strand/archetype display metadata for the MTAP Expansion Pack (Student
// Enrichment Content). This is structural/display config, not question data — the
// actual questions live in mtap_expansion_content, fetched via lib/mtapEngine.ts.
// Archetype keys here must exactly match the `archetype` column values used when
// the content batches were generated and imported (content/mtap-grade2-*-batch.json).
//
// Only Grade 2 is populated for now — content/mtap-grade{3-6}-expansion-bow.md exist
// as research docs but have no generated question batches yet (see
// content/mtap-expansion-overview.md's Next Steps). Add a grade here only once its
// batch has actually been generated, verified, and imported — never speculatively.

export interface MtapArchetypeDef {
  key: string;
  name: string;
}

export interface MtapStrandDef {
  strand: number;
  name: string;
  archetypes: MtapArchetypeDef[];
}

export const MTAP_GRADE2_STRANDS: MtapStrandDef[] = [
  {
    strand: 1,
    name: 'Number Sense',
    archetypes: [
      { key: 'place_value', name: 'Place value, order of operations, comparison' },
      { key: 'roman_numerals', name: 'Roman numerals' },
      { key: 'digit_property_counting', name: 'Digit-property counting puzzles' },
      { key: 'calendar_patterns', name: 'Calendar/day-of-week patterns' },
    ],
  },
  {
    strand: 2,
    name: 'Fractions & Decimals',
    archetypes: [
      { key: 'fraction_comparison', name: 'Fraction comparison' },
      { key: 'fraction_of_quantity', name: 'Fraction of a quantity' },
    ],
  },
  {
    strand: 3,
    name: 'Ratio & Proportion',
    archetypes: [
      { key: 'ratio_scaling', name: 'Ratio scaling' },
    ],
  },
  {
    strand: 4,
    name: 'Patterns & Algebra',
    archetypes: [
      { key: 'arithmetic_sequences', name: 'Arithmetic sequences' },
      { key: 'two_unknowns_sum_diff', name: 'Two-unknowns sum/difference puzzles' },
      { key: 'simultaneous_constraints', name: 'Simultaneous-constraint puzzles' },
    ],
  },
  {
    strand: 5,
    name: 'Geometry & Measurement',
    archetypes: [
      { key: 'area_perimeter', name: 'Area & perimeter' },
      { key: 'length_division', name: 'Length & division into groups' },
    ],
  },
  {
    strand: 6,
    name: 'Statistics',
    archetypes: [
      { key: 'averages', name: 'Averages' },
      { key: 'data_graph_reading', name: 'Data/graph reading' },
    ],
  },
  {
    strand: 7,
    name: 'Classic Word Problems',
    archetypes: [
      { key: 'age_problems', name: 'Age problems' },
      { key: 'coin_problems', name: 'Coin problems' },
      { key: 'clock_elapsed_time', name: 'Clock & elapsed time' },
      { key: 'rate_speed', name: 'Rate/speed' },
      { key: 'additive_comparison', name: 'Additive comparison' },
      { key: 'position_in_line', name: 'Position/counting-in-a-line' },
      { key: 'fractional_spending_chain', name: 'Fractional-spending-chain' },
      { key: 'wage_rate_to_total', name: 'Wage/rate-to-total money' },
    ],
  },
  // Strand 8 (Mixed Trainer Track) is a shuffled capstone drawn from the strands
  // above, not its own authored archetype — deliberately omitted here; it needs
  // its own "unlock once every strand has a mastered archetype" UI treatment,
  // not yet built (see docs/sec-shop-design.md Open Items).
];

export const TIERS = ['easy', 'average', 'difficult'] as const;
export type MtapTier = (typeof TIERS)[number];

export const TIER_LABEL: Record<MtapTier, string> = {
  easy: 'Easy',
  average: 'Average',
  difficult: 'Difficult',
};

export const TIER_TIME_BUDGET: Record<MtapTier, number> = {
  easy: 15,
  average: 30,
  difficult: 60,
};
