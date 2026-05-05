# Short-Term Investment Tracker

A static, browser-based tracker for short-term stock trades. The app helps you manage available cash, record buy-in transactions, close trades with sell-out details, and review performance through summaries, charts, filters, and a calendar view.

## Features

- Track total cash and add additional cash over time.
- Create processing buy-in records with stock name, buy date, buy price, shares, or cash invested.
- Automatically calculate shares when cash invested is entered instead of a share count.
- Close processing trades with sell date and sell price.
- Calculate realized profit/loss and ROI for completed trades.
- Edit or delete processing trades.
- Filter completed trade history by date range or stock.
- View ROI and cash trend charts.
- Compare ROI or cash performance across stocks.
- Review buy-in and sell-out activity on a monthly calendar.
- Works as a Progressive Web App with a manifest and service worker cache.
- Stores data locally in the browser with `localStorage`.

## Project Structure

```text
.
+-- index.html              # App markup and page sections
+-- styles.css              # Responsive layout and visual styling
+-- app.js                  # Trade logic, rendering, charts, storage, and events
+-- sw.js                   # Service worker for offline asset caching
+-- manifest.webmanifest    # PWA metadata
+-- icon.svg                # Vector app icon
`-- icon-180.png            # Apple/PWA icon
```

## Getting Started

No build step or package install is required. This is a plain HTML, CSS, and JavaScript app.

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
npx serve .
```

Then open the local URL printed by the server.

## Usage

1. Set your available cash from the Home page.
2. Go to Add Buy-in and enter a stock purchase.
3. Use Transactions to close a processing trade when you sell.
4. Review completed trades, filters, charts, and calendar activity from the Home and Transactions pages.

## Data Storage

Trade records, cash balance, and cash events are saved in the browser's `localStorage` under these keys:

- `shortTermInvestmentTrades`
- `shortTermInvestmentTotalCash`
- `shortTermInvestmentCashEvents`

Because the data is stored locally, it stays on the device/browser where it was entered. Clearing site data or using another browser will not carry the records over.

## Notes

- This project does not connect to a brokerage or stock price API.
- Calculations are based only on values entered by the user.
- The service worker caches local app assets for offline use after the first successful load.
