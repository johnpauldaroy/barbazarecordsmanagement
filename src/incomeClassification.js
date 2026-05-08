// Income classification tiers aligned with DSWD/LGU standards
// Used for TUPAD priority targeting and dashboard analytics

export const INCOME_TIERS = [
  {
    key: 'no_income',
    label: 'No Income / No Work',
    short: 'No Income',
    range: 'PHP 0',
    color: '#b91c1c',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
    tupadPriority: true,
    priorityLevel: 4,
  },
  {
    key: 'low_income',
    label: 'Low Income',
    short: 'Low Income',
    range: 'PHP 1 – 9,999/mo',
    color: '#c2410c',
    bgColor: '#ffedd5',
    textColor: '#9a3412',
    tupadPriority: true,
    priorityLevel: 3,
  },
  {
    key: 'moderate',
    label: 'Moderate Income',
    short: 'Moderate',
    range: 'PHP 10,000 – 19,999/mo',
    color: '#b45309',
    bgColor: '#fef3c7',
    textColor: '#92400e',
    tupadPriority: false,
    priorityLevel: 2,
  },
  {
    key: 'above_moderate',
    label: 'Above Moderate',
    short: 'Above Moderate',
    range: 'PHP 20,000+/mo',
    color: '#047857',
    bgColor: '#d1fae5',
    textColor: '#065f46',
    tupadPriority: false,
    priorityLevel: 1,
  },
];

export function classifyIncome(monthlyIncome) {
  const amount = Number(monthlyIncome ?? 0);
  if (Number.isNaN(amount) || amount === 0) return INCOME_TIERS[0];
  if (amount < 10000) return INCOME_TIERS[1];
  if (amount < 20000) return INCOME_TIERS[2];
  return INCOME_TIERS[3];
}

export function isTupadPriority(monthlyIncome) {
  return classifyIncome(monthlyIncome).tupadPriority;
}

export function getTierByKey(key) {
  return INCOME_TIERS.find((tier) => tier.key === key) ?? INCOME_TIERS[0];
}
