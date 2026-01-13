// src/config/constants/nexus-thresholds.ts
type BaseThreshold = {
  threshold: number;
  type: 'gross' | 'taxable' | 'none';
  window: 'calendar' | 'rolling' | 'none';
  taxable: boolean;
  notes?: string;
  transactions?: number;
  exemption?: number;
  marginal?: boolean;
  allOrNothing?: boolean;
  both?: boolean;
};

export const NEXUS_THRESHOLDS: Record<string, BaseThreshold> = {
  AL: { threshold: 250000, type: 'gross', window: 'rolling', taxable: true },
  AK: { threshold: 100000, type: 'gross', window: 'rolling', taxable: false, notes: 'Local taxes only' },
  AZ: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  AR: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  CA: { threshold: 500000, type: 'gross', window: 'calendar', taxable: true },
  CO: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  CT: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200, both: true },
  DC: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  FL: { threshold: 100000, type: 'taxable', window: 'calendar', taxable: true },
  GA: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  HI: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  ID: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  IL: { threshold: 100000, type: 'gross', window: 'rolling', taxable: true },
  IN: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  IA: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  KS: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  KY: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  LA: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  ME: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  MD: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  MA: { threshold: 100000, type: 'gross', window: 'calendar', taxable: false, exemption: 175, marginal: true },
  MI: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  MN: { threshold: 100000, type: 'gross', window: 'rolling', taxable: false },
  MS: { threshold: 250000, type: 'gross', window: 'rolling', taxable: true },
  MO: { threshold: 100000, type: 'gross', window: 'rolling', taxable: true },
  MT: { threshold: 0, type: 'none', window: 'none', taxable: true, notes: 'No sales tax' },
  NE: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  NV: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  NH: { threshold: 0, type: 'none', window: 'none', taxable: true, notes: 'No sales tax' },
  NJ: { threshold: 100000, type: 'gross', window: 'calendar', taxable: false, transactions: 200 },
  NM: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  NY: { threshold: 500000, type: 'gross', window: 'rolling', taxable: false, exemption: 110, allOrNothing: true, transactions: 100, both: true },
  NC: { threshold: 100000, type: 'gross', window: 'rolling', taxable: true },
  ND: { threshold: 100000, type: 'gross', window: 'rolling', taxable: true },
  OH: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  OK: { threshold: 100000, type: 'taxable', window: 'rolling', taxable: true },
  OR: { threshold: 0, type: 'none', window: 'none', taxable: true, notes: 'No sales tax' },
  PA: { threshold: 100000, type: 'gross', window: 'calendar', taxable: false },
  RI: { threshold: 100000, type: 'gross', window: 'calendar', taxable: false, exemption: 250, marginal: true, transactions: 200 },
  SC: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  SD: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  TN: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  TX: { threshold: 500000, type: 'gross', window: 'rolling', taxable: true },
  UT: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  VT: { threshold: 100000, type: 'gross', window: 'rolling', taxable: false, transactions: 200 },
  VA: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  WA: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  WV: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true, transactions: 200 },
  WI: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
  WY: { threshold: 100000, type: 'gross', window: 'calendar', taxable: true },
} as const;

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

export const STATE_REGISTRATION_URLS: Record<string, string> = {
  AL: 'https://www.revenue.alabama.gov/sales-use/registration/',
  AK: 'https://www.commerce.alaska.gov/web/tax',
  AZ: 'https://azdor.gov/business/transaction-privilege-tax',
  AR: 'https://www.dfa.arkansas.gov/excise-tax/sales-and-use-tax',
  CA: 'https://onlineservices.cdtfa.ca.gov/_/',
  CO: 'https://tax.colorado.gov/sales-use-tax',
  CT: 'https://portal.ct.gov/DRS/Businesses/New-Business/Register-for-a-Sales-and-Use-Tax-Permit',
  DC: 'https://otr.cfo.dc.gov/page/sales-and-use-tax',
  FL: 'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
  GA: 'https://dor.georgia.gov/sales-use-tax',
  HI: 'https://tax.hawaii.gov/geninfo/ge/',
  ID: 'https://tax.idaho.gov/taxes/sales-use-tax/',
  IL: 'https://tax.illinois.gov/businesses/registration.html',
  IN: 'https://www.in.gov/dor/business-tax/sales-tax/',
  IA: 'https://tax.iowa.gov/sales-and-use-tax-permits',
  KS: 'https://www.ksrevenue.org/salesanduse.html',
  KY: 'https://revenue.ky.gov/Collections/Sales-Use-Tax/Pages/default.aspx',
  LA: 'https://revenue.louisiana.gov/SalesTax',
  ME: 'https://www.maine.gov/revenue/taxes/sales-use-tax',
  MD: 'https://www.marylandtaxes.gov/business/sales-use/index.php',
  MA: 'https://www.mass.gov/guides/a-guide-to-sales-and-use-tax',
  MI: 'https://www.michigan.gov/taxes/business-taxes/sales-use-tax',
  MN: 'https://www.revenue.state.mn.us/sales-and-use-tax',
  MS: 'https://www.dor.ms.gov/business/sales-use-tax',
  MO: 'https://dor.mo.gov/taxation/business/tax-types/sales-use/',
  NE: 'https://revenue.nebraska.gov/businesses/sales-and-use-tax',
  NV: 'https://tax.nv.gov/SalesAndUseTax/Sales_and_Use_Tax/',
  NJ: 'https://www.nj.gov/treasury/taxation/businesses/salestax.shtml',
  NM: 'https://www.tax.newmexico.gov/businesses/gross-receipts-tax/',
  NY: 'https://www.tax.ny.gov/bus/st/stidx.htm',
  NC: 'https://www.ncdor.gov/taxes-forms/sales-and-use-tax',
  ND: 'https://www.tax.nd.gov/sales-use-tax',
  OH: 'https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use',
  OK: 'https://oklahoma.gov/tax/businesses/sales-and-use-tax.html',
  PA: 'https://www.revenue.pa.gov/TaxTypes/SUT/Pages/default.aspx',
  RI: 'https://tax.ri.gov/tax-information/sales-and-use-tax',
  SC: 'https://dor.sc.gov/tax/sales',
  SD: 'https://dor.sd.gov/businesses/taxes/sales-use-tax/',
  TN: 'https://www.tn.gov/revenue/taxes/sales-and-use-tax.html',
  TX: 'https://comptroller.texas.gov/taxes/sales/',
  UT: 'https://tax.utah.gov/sales',
  VT: 'https://tax.vermont.gov/business/sales-and-use-tax',
  VA: 'https://www.tax.virginia.gov/sales-and-use-tax',
  WA: 'https://dor.wa.gov/taxes-rates/sales-use-tax',
  WV: 'https://tax.wv.gov/Business/SalesAndUseTax/Pages/SalesAndUseTax.aspx',
  WI: 'https://www.revenue.wi.gov/Pages/FAQS/pcs-sales.aspx',
  WY: 'https://revenue.wyo.gov/divisions/excise-tax-division/sales-and-use-tax'
};

export const PRODUCT_TAX_CODES: Record<string, string> = {
  sneakers: 'txcd_30011000',
  clothing: 'txcd_30011000',
  accessories: 'txcd_30060010',
  electronics: 'txcd_34020027'
};

export type StateCode = keyof typeof NEXUS_THRESHOLDS;
export type NexusThreshold = typeof NEXUS_THRESHOLDS[StateCode];