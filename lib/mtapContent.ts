// lib/mtapContent.ts
// Static strand/archetype display metadata for the MTAP Expansion Pack (Student
// Enrichment Content). This is structural/display config, not question data — the
// actual questions live in mtap_expansion_content, fetched via lib/mtapEngine.ts.
// Archetype keys here must exactly match the `archetype` column values used when
// the content batches were generated and imported (content/mtap-grade{N}-*-batch.json).
//
// All 5 grades (2-6) are now populated — each batch has been generated, hand-
// verified, and imported into mtap_expansion_content. See MTAP_STRANDS_BY_GRADE
// below for the grade -> strand-list lookup every component should use instead of
// importing a single grade's constant directly.

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

export const MTAP_GRADE3_STRANDS: MtapStrandDef[] = [
  {
    strand: 1,
    name: 'Number Sense',
    archetypes: [
      { key: 'place_value_decomposition', name: 'Place value & decomposition' },
      { key: 'roman_numerals', name: 'Roman numerals' },
      { key: 'order_of_operations_estimation', name: 'Order of operations & estimation' },
      { key: 'prime_goldbach', name: 'Primes & Goldbach-style puzzles' },
      { key: 'digit_relationship_puzzles', name: 'Digit-relationship puzzles' },
      { key: 'division_remainders', name: 'Division & remainders' },
    ],
  },
  {
    strand: 2,
    name: 'Fractions & Decimals',
    archetypes: [
      { key: 'fraction_operations', name: 'Fraction operations' },
      { key: 'fraction_of_number', name: 'Fraction of a number' },
      { key: 'decimal_comparison', name: 'Decimal comparison' },
    ],
  },
  {
    strand: 3,
    name: 'Patterns & Algebra',
    archetypes: [
      { key: 'arithmetic_sequences', name: 'Arithmetic sequences' },
      { key: 'function_machine', name: 'Function machines' },
      { key: 'equation_solving', name: 'Equation solving' },
      { key: 'multiplicative_comparison', name: 'Multiplicative comparison' },
    ],
  },
  {
    strand: 4,
    name: 'Geometry & Measurement',
    archetypes: [
      { key: 'perimeter_area', name: 'Perimeter & area' },
      { key: 'symmetry_polygon', name: 'Symmetry & polygons' },
      { key: 'time_elapsed', name: 'Time & elapsed time' },
    ],
  },
  {
    strand: 5,
    name: 'Statistics',
    archetypes: [
      { key: 'averages', name: 'Averages' },
    ],
  },
  {
    strand: 6,
    name: 'Classic Word Problems',
    archetypes: [
      { key: 'coin_problems', name: 'Coin problems' },
      { key: 'consecutive_integer_sum', name: 'Consecutive-integer sums' },
      { key: 'money_shopping', name: 'Money & shopping' },
    ],
  },
];

export const MTAP_GRADE4_STRANDS: MtapStrandDef[] = [
  {
    strand: 1,
    name: 'Number Sense',
    archetypes: [
      { key: 'place_value_digit_counting', name: 'Place value & digit-counting puzzles' },
      { key: 'rounding_estimation', name: 'Rounding & estimation' },
      { key: 'divisibility_remainders', name: 'Divisibility rules & remainders' },
      { key: 'gcf_lcm', name: 'GCF/LCM' },
    ],
  },
  {
    strand: 2,
    name: 'Fractions, Decimals, Ratio & Proportion, Percentage',
    archetypes: [
      { key: 'fraction_mixed_operations', name: 'Fraction/mixed-number operations' },
      { key: 'ratio_proportion', name: 'Ratio & proportion' },
      { key: 'percentage_discount', name: 'Percentage & discount' },
    ],
  },
  {
    strand: 3,
    name: 'Patterns & Algebra',
    archetypes: [
      { key: 'sequence_nth_term', name: 'Sequence / nth-term patterns' },
      { key: 'two_unknowns_sum_product', name: 'Two-unknowns sum & product' },
    ],
  },
  {
    strand: 4,
    name: 'Geometry & Measurement',
    archetypes: [
      { key: 'perimeter_area_g4', name: 'Perimeter & area' },
      { key: 'angles', name: 'Angles' },
    ],
  },
  {
    strand: 5,
    name: 'Statistics',
    archetypes: [
      { key: 'averages_g4', name: 'Averages' },
    ],
  },
  {
    strand: 6,
    name: 'Classic Word Problems',
    archetypes: [
      { key: 'age_problems_g4', name: 'Age problems' },
      { key: 'lever_balance_g4', name: 'Lever/balance problems' },
      { key: 'rate_motion_g4', name: 'Rate/motion problems' },
      { key: 'custom_operation_g4', name: 'Custom-defined operations' },
    ],
  },
];

export const MTAP_GRADE5_STRANDS: MtapStrandDef[] = [
  {
    strand: 1,
    name: 'Number Sense',
    archetypes: [
      { key: 'place_value_digit', name: 'Place value & digit problems' },
      { key: 'gcf_lcm', name: 'GCF/LCM' },
      { key: 'rounding_comparing', name: 'Rounding & comparing' },
    ],
  },
  {
    strand: 2,
    name: 'Fractions, Decimals, Ratio & Proportion',
    archetypes: [
      { key: 'fraction_decimal_ops', name: 'Fraction/decimal operations' },
      { key: 'ratio_proportion', name: 'Ratio & proportion' },
      { key: 'rate_problems', name: 'Rate problems' },
    ],
  },
  {
    strand: 3,
    name: 'Patterns & Algebra',
    archetypes: [
      { key: 'sequence_nth_term', name: 'Sequence / nth-term patterns' },
      { key: 'missing_number_equations', name: 'Missing-number equations' },
    ],
  },
  {
    strand: 4,
    name: 'Geometry & Measurement',
    archetypes: [
      { key: 'perimeter_area_volume', name: 'Perimeter, area & volume' },
      { key: 'angles', name: 'Angles' },
      { key: 'unit_conversion', name: 'Unit conversion chains' },
    ],
  },
  {
    strand: 5,
    name: 'Statistics',
    archetypes: [
      { key: 'reading_data', name: 'Reading & interpreting data' },
      { key: 'averages', name: 'Averages' },
    ],
  },
  {
    strand: 6,
    name: 'Classic Word Problems',
    archetypes: [
      { key: 'age_problems', name: 'Age problems' },
      { key: 'consecutive_number', name: 'Consecutive-number problems' },
      { key: 'coin_problems', name: 'Coin/money problems' },
      { key: 'clock_problems', name: 'Clock problems' },
      { key: 'lever_balance', name: 'Lever/balance problems' },
      { key: 'mixture_problems', name: 'Mixture problems' },
      { key: 'motion_rate', name: 'Motion/rate problems' },
      { key: 'work_problems', name: 'Work problems' },
    ],
  },
];

export const MTAP_GRADE6_STRANDS: MtapStrandDef[] = [
  {
    strand: 1,
    name: 'Number Sense',
    archetypes: [
      { key: 'gcf_lcm', name: 'GCF/LCM' },
      { key: 'prime_factorization_factorial', name: 'Prime factorization & factorials' },
      { key: 'repeating_decimal_fraction', name: 'Repeating decimals to fractions' },
    ],
  },
  {
    strand: 2,
    name: 'Fractions, Ratio & Proportion, Percentage',
    archetypes: [
      { key: 'fraction_operations', name: 'Fraction operations' },
      { key: 'ratio_proportion', name: 'Ratio & proportion' },
      { key: 'percentage_discount_profit', name: 'Percentage, discount & profit/loss' },
    ],
  },
  {
    strand: 3,
    name: 'Patterns & Algebra',
    archetypes: [
      { key: 'sequences', name: 'Sequences' },
      { key: 'linear_equations_polynomial', name: 'Linear equations & polynomial substitution' },
    ],
  },
  {
    strand: 4,
    name: 'Geometry & Measurement',
    archetypes: [
      { key: 'circle_solid_geometry', name: 'Circle & solid geometry' },
      { key: 'percentage_change_geometry', name: 'Percentage-change geometry' },
      { key: 'similar_figures_shadow', name: 'Similar figures & shadow proportions' },
    ],
  },
  {
    strand: 5,
    name: 'Statistics & Probability',
    archetypes: [
      { key: 'averages_weighted', name: 'Averages, incl. weighted/combined' },
      { key: 'probability', name: 'Probability' },
    ],
  },
  {
    strand: 6,
    name: 'Classic Word Problems',
    archetypes: [
      { key: 'age_problems', name: 'Age problems' },
      { key: 'work_problems', name: 'Work problems' },
      { key: 'relative_motion', name: 'Relative-motion problems' },
      { key: 'digit_rearrangement_permutation', name: 'Digit-rearrangement & permutations' },
      { key: 'money_pricing', name: 'Money & pricing problems' },
    ],
  },
];

// Lookup every component should use instead of importing a single grade's
// constant directly — keeps grade-branching logic in one place.
export const MTAP_STRANDS_BY_GRADE: Record<number, MtapStrandDef[]> = {
  2: MTAP_GRADE2_STRANDS,
  3: MTAP_GRADE3_STRANDS,
  4: MTAP_GRADE4_STRANDS,
  5: MTAP_GRADE5_STRANDS,
  6: MTAP_GRADE6_STRANDS,
};

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
