export type IsLine =
  | 'Landscape Services Revenue'
  | 'Maintenance Contract Revenue'
  | 'Wages'
  | 'Materials'
  | 'Subcontractors'
  | 'Rent'
  | 'Fuel'
  | 'Utilities'
  | 'Repairs & Maintenance'
  | 'Payroll Taxes'
  | 'Insurance'
  | 'Software & Subscriptions'
  | 'Professional Fees'
  | 'Bank Fees'
  | 'Depreciation'
  | 'Interest Expense';

export type IsFigures = Record<IsLine, number>;

const REVENUE: IsLine[] = ['Landscape Services Revenue', 'Maintenance Contract Revenue'];
const EXPENSE: IsLine[] = ['Wages', 'Materials', 'Subcontractors', 'Rent', 'Fuel', 'Utilities', 'Repairs & Maintenance', 'Payroll Taxes', 'Insurance', 'Software & Subscriptions', 'Professional Fees', 'Bank Fees', 'Depreciation', 'Interest Expense'];

// Net income of an income-statement figure set.
export function netIncome(f: IsFigures): number {
  let n = 0;
  for (const l of REVENUE) n += f[l];
  for (const l of EXPENSE) n -= f[l];
  return Math.round(n * 100) / 100;
}

function fig(o: Record<string, number>): IsFigures {
  return {
    'Landscape Services Revenue': o.landscape,
    'Maintenance Contract Revenue': o.maintenance,
    Wages: o.wages,
    Materials: o.materials,
    Subcontractors: o.sub,
    Rent: o.rent,
    Fuel: o.fuel,
    Utilities: o.utilities,
    'Repairs & Maintenance': o.repairs,
    'Payroll Taxes': o.payrollTaxes,
    Insurance: o.insurance,
    'Software & Subscriptions': o.software,
    'Professional Fees': o.prof,
    'Bank Fees': o.bankFees,
    Depreciation: o.dep,
    'Interest Expense': o.interest,
  };
}

export const AUG = {
  is: {
    month: fig({ landscape: 63900, maintenance: 24500, wages: 19400, materials: 13100, sub: 6900, rent: 5200, fuel: 4150, utilities: 3050, repairs: 1980, payrollTaxes: 1940, insurance: 1800, software: 1100, prof: 750, bankFees: 295, dep: 2400, interest: 1050 }),
    ytd: fig({ landscape: 480101, maintenance: 194293, wages: 151424, materials: 98249, sub: 52027, rent: 41600, fuel: 30963, utilities: 24668, repairs: 14941, payrollTaxes: 15142, insurance: 14400, software: 8800, prof: 6600, bankFees: 2341, dep: 19200, interest: 8792 }),
    month2025: fig({ landscape: 57711, maintenance: 22183, wages: 18648, materials: 12033, sub: 6507, rent: 5000, fuel: 3794, utilities: 2910, repairs: 1994, payrollTaxes: 1865, insurance: 1650, software: 900, prof: 750, bankFees: 271, dep: 2400, interest: 1218 }),
    ytd2025: fig({ landscape: 434780, maintenance: 179297, wages: 145920, materials: 89260, sub: 47681, rent: 40000, fuel: 28199, utilities: 24788, repairs: 15922, payrollTaxes: 14592, insurance: 13200, software: 7200, prof: 6600, bankFees: 2259, dep: 9600, interest: 10136 }),
  },
  sep2025: fig({ landscape: 56312, maintenance: 22163, wages: 18479, materials: 11291, sub: 6360, rent: 5000, fuel: 3624, utilities: 3130, repairs: 2445, payrollTaxes: 1848, insurance: 1650, software: 900, prof: 750, bankFees: 311, dep: 2400, interest: 1204 }),
  // TTM page columns Oct-25 through Aug-26, transcribed from the August PDF.
  ttm: {
    months: ["Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26", "Mar-26", "Apr-26", "May-26", "Jun-26", "Jul-26", "Aug-26"],
    figures: [
      fig({ landscape: 57627, maintenance: 22698, wages: 18638, materials: 11706, sub: 6204, rent: 5000, fuel: 3718, utilities: 2924, repairs: 1233, payrollTaxes: 1864, insurance: 1650, software: 900, prof: 750, bankFees: 299, dep: 2400, interest: 1190 }),
      fig({ landscape: 51853, maintenance: 22897, wages: 17937, materials: 10707, sub: 5778, rent: 5000, fuel: 3363, utilities: 3193, repairs: 1995, payrollTaxes: 1794, insurance: 1800, software: 900, prof: 750, bankFees: 268, dep: 2400, interest: 1176 }),
      fig({ landscape: 46450, maintenance: 22369, wages: 17281, materials: 9404, sub: 4980, rent: 5000, fuel: 2938, utilities: 2998, repairs: 1422, payrollTaxes: 1728, insurance: 1800, software: 900, prof: 750, bankFees: 301, dep: 2400, interest: 1162 }),
      fig({ landscape: 49210, maintenance: 23886, wages: 17616, materials: 10198, sub: 5273, rent: 5200, fuel: 3104, utilities: 3139, repairs: 2491, payrollTaxes: 1762, insurance: 1800, software: 1100, prof: 750, bankFees: 321, dep: 2400, interest: 1148 }),
      fig({ landscape: 53021, maintenance: 24413, wages: 18079, materials: 10801, sub: 5497, rent: 5200, fuel: 3540, utilities: 3072, repairs: 1797, payrollTaxes: 1808, insurance: 1800, software: 1100, prof: 750, bankFees: 274, dep: 2400, interest: 1134 }),
      fig({ landscape: 57951, maintenance: 24899, wages: 18678, materials: 11810, sub: 6450, rent: 5200, fuel: 3809, utilities: 3143, repairs: 1902, payrollTaxes: 1868, insurance: 1800, software: 1100, prof: 1350, bankFees: 309, dep: 2400, interest: 1120 }),
      fig({ landscape: 64107, maintenance: 24032, wages: 19425, materials: 12862, sub: 6744, rent: 5200, fuel: 4055, utilities: 3044, repairs: 1578, payrollTaxes: 1942, insurance: 1800, software: 1100, prof: 750, bankFees: 278, dep: 2400, interest: 1106 }),
      fig({ landscape: 63897, maintenance: 24017, wages: 19400, materials: 13425, sub: 7048, rent: 5200, fuel: 4051, utilities: 3129, repairs: 1483, payrollTaxes: 1940, insurance: 1800, software: 1100, prof: 750, bankFees: 274, dep: 2400, interest: 1092 }),
      fig({ landscape: 66399, maintenance: 24061, wages: 19703, materials: 13712, sub: 7299, rent: 5200, fuel: 4323, utilities: 3175, repairs: 2289, payrollTaxes: 1970, insurance: 1800, software: 1100, prof: 750, bankFees: 324, dep: 2400, interest: 1078 }),
      fig({ landscape: 61616, maintenance: 24485, wages: 19123, materials: 12341, sub: 6816, rent: 5200, fuel: 3931, utilities: 2916, repairs: 1421, payrollTaxes: 1912, insurance: 1800, software: 1100, prof: 750, bankFees: 266, dep: 2400, interest: 1064 }),
      fig({ landscape: 63900, maintenance: 24500, wages: 19400, materials: 13100, sub: 6900, rent: 5200, fuel: 4150, utilities: 3050, repairs: 1980, payrollTaxes: 1940, insurance: 1800, software: 1100, prof: 750, bankFees: 295, dep: 2400, interest: 1050 }),
    ],
  },
  bs: {
    cash: 59900, ar: 36900, prepaid: 3600, currentAssets: 100400,
    fixedNet: 105600, totalAssets: 206000, ap: 25690, currentLiab: 25690,
    loan: 63640, longTermLiab: 63640, totalLiab: 89330, equity: 116670,
  },
  cf: {
    month: { netIncome: 25285, depreciation: 2400, arChange: -2700, prepaidChange: 1800, apChange: 1790, operating: 28575, loanRepay: -1560, distributions: -20000, financing: -21560, netChange: 7015, cashBegin: 52885, cashEnd: 59900 },
    ytd: { netIncome: 185247, depreciation: 19200, arChange: -5400, prepaidChange: 14400, apChange: 4390, operating: 217837, loanRepay: -12350, distributions: -169900, financing: -182250, netChange: 35587, cashBegin: 24313, cashEnd: 59900 },
  },
};
