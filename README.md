# ShiftWorkPay

Paycheck estimator for shift workers. Log your hours (regular, OT, double time, holiday,
leave...) and see take-home pay with federal, state and county taxes from your actual W-4.

Started as my LibreOffice spreadsheet for tracking dispatch OT at Lake County 911.
Checked against my real pay stubs - federal, SS, Medicare, Indiana and Lake County
all match to the penny once Setup matches your W-4.

**Live:** https://chanelchrishonda.github.io/ShiftPay/

## Files
| | |
|---|---|
| `index.html` | page layout |
| `styles.css` | look (colors at the top, dark mode included) |
| `js/taxes.js` | paycheck math + leave balances |
| `js/state.js` | pay types, leave banks, saved data format |
| `js/storage.js` | saves to the phone (localStorage) |
| `js/views.js` | builds each tab |
| `js/app.js` | buttons/typing + startup |
| `data/tax-2026.json` | ALL the tax numbers |
| `sw.js` | offline support |

## Every January
1. Copy `data/tax-2026.json` to `tax-2027.json` and update the brackets, standard
   deduction, SS wage base, child credit and any state rates.
2. Change `TAX_FILE` at the top of `js/taxes.js` to the new file.
3. Bump `VERSION` in `sw.js`, add the new file to its list, upload everything.

## Privacy
No accounts, no server. Hours stay on your phone. Backup = History tab > Save backup file.

## Not done yet
- Pay stub checker (compare stub hours to logged hours)
- Real brackets for graduated-tax states (uses one rate for now)
- Social Security yearly wage cap
- Semi-monthly pay periods

Built with help from Claude (AI). Estimates only, not tax advice.
