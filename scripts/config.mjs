export const CONFIG = {
  IRS_ACTIVE_URL: process.env.IRS_ACTIVE_URL || '',
  IRS_REVOC_URL:  process.env.IRS_REVOC_URL  || '',
  MAX_RECORDS: parseInt(process.env.MAX_RECORDS || '20000', 10),
  CN_API_KEY: process.env.CN_API_KEY || ''
};
