const STORAGE_KEY = "shortTermInvestmentTrades";
const CASH_KEY = "shortTermInvestmentTotalCash";
const CASH_EVENTS_KEY = "shortTermInvestmentCashEvents";

const cashForm = document.querySelector("#cashForm");
const cashInput = document.querySelector("#cashInput");
const addCashButton = document.querySelector("#addCashButton");
const menuButton = document.querySelector("#menuButton");
const sidebar = document.querySelector(".sidebar");
const sidebarBackdrop = document.querySelector("#sidebarBackdrop");
const pageButtons = document.querySelectorAll("[data-page-target]");
const pageSections = document.querySelectorAll("[data-page]");
const form = document.querySelector("#tradeForm");
const closeTradeForm = document.querySelector("#closeTradeForm");
const resetButton = document.querySelector("#resetButton");
const clearAllButton = document.querySelector("#clearAllButton");
const chartViewButtons = document.querySelectorAll("[data-chart-view]");
const chartButtons = document.querySelectorAll("[data-chart]");
const comparisonButtons = document.querySelectorAll("[data-comparison-chart]");
const canvas = document.querySelector("#trendChart");
const ctx = canvas.getContext("2d");
const comparisonCanvas = document.querySelector("#comparisonChart");
const comparisonCtx = comparisonCanvas.getContext("2d");
const stockFilters = document.querySelector("#stockFilters");
const trendsChartView = document.querySelector("#trendsChartView");
const comparisonChartView = document.querySelector("#comparisonChartView");
const processingSelect = document.querySelector("#processingSelect");
const processingList = document.querySelector("#processingList");
const processingEmptyState = document.querySelector("#processingEmptyState");
const completedList = document.querySelector("#completedList");
const completedEmptyState = document.querySelector("#completedEmptyState");
const historyFilterButtons = document.querySelectorAll("[data-history-filter]");
const historyDateFilters = document.querySelector("#historyDateFilters");
const historyStockFilters = document.querySelector("#historyStockFilters");
const historyDateFrom = document.querySelector("#historyDateFrom");
const historyDateTo = document.querySelector("#historyDateTo");
const historyStockSelect = document.querySelector("#historyStockSelect");
const resetHistoryFilter = document.querySelector("#resetHistoryFilter");
const prevHistoryPage = document.querySelector("#prevHistoryPage");
const nextHistoryPage = document.querySelector("#nextHistoryPage");
const historyPageInfo = document.querySelector("#historyPageInfo");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarTitle = document.querySelector("#calendarTitle");
const prevMonthButton = document.querySelector("#prevMonthButton");
const nextMonthButton = document.querySelector("#nextMonthButton");

let trades = loadTrades().map(normalizeTrade);
let totalCash = loadCash(trades);
let cashEvents = loadCashEvents();
let activePage = "home";
let activeChartView = "trends";
let activeChart = "roi";
let activeComparisonChart = "roi";
let selectedStocks = new Set();
let stockFiltersInitialized = false;
let historyFilterMode = "date";
let historyPage = 1;
const HISTORY_PAGE_SIZE = 10;
let editingProcessingId = "";
let calendarDate = new Date();
calendarDate.setDate(1);
const DECIMAL_PLACES = 4;

const fields = {
  buyDate: document.querySelector("#buyDate"),
  stockName: document.querySelector("#stockName"),
  buyPrice: document.querySelector("#buyPrice"),
  shares: document.querySelector("#shares"),
  cashInvested: document.querySelector("#cashInvested"),
};

const closeFields = {
  sellDate: document.querySelector("#closeSellDate"),
  sellPrice: document.querySelector("#closeSellPrice"),
};

function loadTrades() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function loadCash(savedTrades) {
  const savedCash = Number(localStorage.getItem(CASH_KEY));
  if (Number.isFinite(savedCash)) return savedCash;

  const latestWithCash = [...savedTrades].reverse().find((trade) => Number.isFinite(trade.cashBalance));
  return latestWithCash ? latestWithCash.cashBalance : 0;
}

function saveCash() {
  localStorage.setItem(CASH_KEY, String(totalCash));
}

function loadCashEvents() {
  try {
    return JSON.parse(localStorage.getItem(CASH_EVENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCashEvents() {
  localStorage.setItem(CASH_EVENTS_KEY, JSON.stringify(cashEvents));
}

function recordCashEvent(label) {
  cashEvents.push({
    id: newId(),
    label,
    value: totalCash,
    createdAt: new Date().toISOString(),
  });
  saveCashEvents();
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: DECIMAL_PLACES,
    maximumFractionDigits: DECIMAL_PLACES,
  }).format(Number.isFinite(value) ? value : 0);
}

function summaryMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(DECIMAL_PLACES)}%`;
}

function summaryPercent(value) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}

function number(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: DECIMAL_PLACES,
    maximumFractionDigits: DECIMAL_PLACES,
  }).format(Number.isFinite(value) ? value : 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function toNumeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundDecimal(value) {
  const factor = 10 ** DECIMAL_PLACES;
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
}

function decimalInputValue(value) {
  return Number.isFinite(value) ? value.toFixed(DECIMAL_PLACES) : "";
}

function limitDecimalInput(input) {
  const value = input.value;
  const dotIndex = value.indexOf(".");
  if (dotIndex === -1) return;
  const decimals = value.slice(dotIndex + 1);
  if (decimals.length <= DECIMAL_PLACES) return;
  input.value = `${value.slice(0, dotIndex)}.${decimals.slice(0, DECIMAL_PLACES)}`;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function calculateResult(trade) {
  const invested = trade.shares * trade.buyPrice;
  const hasSell = Boolean(trade.sellDate) && Number.isFinite(trade.sellPrice);
  const proceeds = hasSell ? trade.shares * trade.sellPrice : 0;
  const profit = hasSell ? proceeds - invested : 0;
  const roi = hasSell && invested > 0 ? (profit / invested) * 100 : 0;

  return {
    ...trade,
    status: hasSell ? "closed" : "open",
    invested,
    proceeds,
    profit,
    roi,
  };
}

function normalizeTrade(trade) {
  return calculateResult({
    id: trade.id || newId(),
    buyDate: trade.buyDate || "",
    sellDate: trade.sellDate || "",
    stockName: String(trade.stockName || "").trim().toUpperCase(),
    buyPrice: toNumeric(trade.buyPrice),
    sellPrice: trade.sellDate ? toNumeric(trade.sellPrice) : NaN,
    shares: toNumeric(trade.shares),
    cashInvested: toNumeric(trade.cashInvested),
    cashBalance: toNumeric(trade.cashBalance),
    createdAt: trade.createdAt || new Date().toISOString(),
    closedAt: trade.closedAt || "",
  });
}

function calculateShares() {
  const shares = toNumeric(fields.shares.value);
  const buyPrice = toNumeric(fields.buyPrice.value);
  const cashInvested = toNumeric(fields.cashInvested.value);

  if (shares > 0) return shares;
  if (buyPrice > 0 && cashInvested > 0) return roundDecimal(cashInvested / buyPrice);
  return 0;
}

function updateSharePreview() {
  const shares = calculateShares();
  document.querySelector("#sharePreview").textContent = number(shares);
  fields.cashInvested.required = toNumeric(fields.shares.value) === 0;
}

function buildTrade() {
  const trade = calculateResult({
    id: newId(),
    buyDate: fields.buyDate.value,
    sellDate: "",
    stockName: fields.stockName.value.trim().toUpperCase(),
    buyPrice: toNumeric(fields.buyPrice.value),
    sellPrice: NaN,
    shares: calculateShares(),
    cashInvested: toNumeric(fields.cashInvested.value),
    cashBalance: totalCash,
    createdAt: new Date().toISOString(),
    closedAt: "",
  });

  return {
    ...trade,
    cashBalance: totalCash - trade.invested,
  };
}

function validateOpenTrade(trade, options = {}) {
  if (!trade.stockName) return "Please enter a stock name.";
  if (!trade.buyDate) return "Please enter the buy-in date.";
  if (trade.buyPrice <= 0) return "Please check the buy-in price.";
  if (trade.shares <= 0) return "When shares are 0, enter the cash invested so shares can be calculated.";
  if (options.checkCash && totalCash < trade.invested) return "Total cash is not enough for this buy-in record.";
  return "";
}

function validateCompletedTrade(trade) {
  const openError = validateOpenTrade(trade);
  if (openError) return openError;
  if (!trade.sellDate) return "Please enter the sell-out date.";
  if (!Number.isFinite(trade.sellPrice) || trade.sellPrice < 0) return "Please check the sell-out price.";
  if (new Date(trade.sellDate) < new Date(trade.buyDate)) {
    return "Sell-out date cannot be earlier than buy-in date.";
  }
  return "";
}

function completedTrades() {
  return trades.filter((trade) => trade.status === "closed");
}

function processingTrades() {
  return trades.filter((trade) => trade.status === "open");
}

function stockNames() {
  return [...new Set(completedTrades().map((trade) => trade.stockName))].sort();
}

function filteredCompletedTrades() {
  return [...completedTrades()].reverse().filter((trade) => {
    if (historyFilterMode === "stock") {
      return !historyStockSelect.value || trade.stockName === historyStockSelect.value;
    }

    const from = historyDateFrom.value;
    const to = historyDateTo.value;
    if (from && trade.sellDate < from) return false;
    if (to && trade.sellDate > to) return false;
    return true;
  });
}

function renderSummary() {
  const closed = completedTrades();
  const totalProfit = closed.reduce((sum, trade) => sum + trade.profit, 0);
  const averageRoi = closed.length ? closed.reduce((sum, trade) => sum + trade.roi, 0) / closed.length : 0;

  document.querySelector("#totalCash").textContent = summaryMoney(totalCash);
  cashInput.value = totalCash ? decimalInputValue(totalCash) : "";
  document.querySelector("#totalProfit").textContent = summaryMoney(totalProfit);
  document.querySelector("#totalProfit").className = totalProfit >= 0 ? "profit" : "loss";
  document.querySelector("#averageRoi").textContent = summaryPercent(averageRoi);
  document.querySelector("#averageRoi").className = averageRoi >= 0 ? "profit" : "loss";
  document.querySelector("#tradeCount").textContent = closed.length;
}

function tradeOptionLabel(trade) {
  return `${trade.stockName} - Buy ${trade.buyDate} - ${number(trade.shares)} shares @ ${money(trade.buyPrice)}`;
}

function sharesFromValues(sharesValue, buyPriceValue, cashInvestedValue) {
  const shares = toNumeric(sharesValue);
  const buyPrice = toNumeric(buyPriceValue);
  const cashInvested = toNumeric(cashInvestedValue);

  if (shares > 0) return roundDecimal(shares);
  if (buyPrice > 0 && cashInvested > 0) return roundDecimal(cashInvested / buyPrice);
  return 0;
}

function renderProcessingTransactions() {
  const openTrades = processingTrades();
  const selectedId = processingSelect.value || (openTrades[0] ? openTrades[0].id : "");

  processingList.innerHTML = "";
  processingSelect.innerHTML = "";
  processingEmptyState.hidden = openTrades.length > 0;
  closeTradeForm.classList.toggle("is-disabled", openTrades.length === 0);
  [...closeTradeForm.elements].forEach((element) => {
    element.disabled = openTrades.length === 0;
  });

  if (!openTrades.length) {
    editingProcessingId = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No processing records available";
    processingSelect.append(option);
    closeTradeForm.reset();
    return;
  }

  openTrades.forEach((trade) => {
    const option = document.createElement("option");
    option.value = trade.id;
    option.textContent = tradeOptionLabel(trade);
    processingSelect.append(option);
  });

  processingSelect.value = openTrades.some((trade) => trade.id === selectedId) ? selectedId : openTrades[0].id;
  updateCloseFormForSelection();

  [...openTrades].reverse().forEach((trade) => {
    const isEditing = editingProcessingId === trade.id;
    const row = document.createElement("article");
    row.className = "trade-row open-trade";
    row.innerHTML = `
      <div>
        <div class="trade-name">
          <span>${escapeHtml(trade.stockName)}</span>
          <span class="badge open-badge">Processing</span>
        </div>
        <div class="trade-meta">
          Buy ${trade.buyDate}<br>
          Buy ${money(trade.buyPrice)} / ${number(trade.shares)} shares / Invested ${money(trade.invested)}
        </div>
        ${
          isEditing
            ? `
              <form class="processing-edit-form" data-edit-form="${trade.id}">
                <label>
                  Buy-in Date
                  <input name="buyDate" type="date" value="${trade.buyDate}" required />
                </label>
                <label>
                  Stock Name
                  <input name="stockName" type="text" value="${escapeHtml(trade.stockName)}" autocomplete="off" required />
                </label>
                <label>
                  Buy-in Price
                  <input name="buyPrice" type="number" min="0" step="0.0001" inputmode="decimal" value="${decimalInputValue(trade.buyPrice)}" required />
                </label>
                <label>
                  Shares
                  <input name="shares" type="number" min="0" step="0.0001" inputmode="decimal" value="${decimalInputValue(trade.shares)}" required />
                </label>
                <label>
                  Cash Invested if Shares = 0
                  <input name="cashInvested" type="number" min="0" step="0.0001" inputmode="decimal" value="${trade.cashInvested ? decimalInputValue(trade.cashInvested) : ""}" />
                </label>
                <div class="edit-actions">
                  <button class="primary-button" type="submit">Save Edit</button>
                  <button class="secondary-button" type="button" data-cancel-edit-id="${trade.id}">Cancel</button>
                </div>
              </form>
            `
            : ""
        }
      </div>
      <div class="trade-result">
        ${money(trade.invested)}
        <button class="secondary-button edit-trade" type="button" data-edit-id="${trade.id}">${isEditing ? "Editing" : "Edit"}</button>
        <button class="select-trade" type="button" data-select-id="${trade.id}">Select</button>
        <button class="delete-trade" type="button" title="Delete record" aria-label="Delete record" data-delete-id="${trade.id}">x</button>
      </div>
    `;
    processingList.append(row);
  });
}

function renderCompletedTrades() {
  renderHistoryFilters();
  const closed = filteredCompletedTrades();
  const totalPages = Math.max(1, Math.ceil(closed.length / HISTORY_PAGE_SIZE));
  historyPage = Math.min(historyPage, totalPages);
  const pageStart = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const pageTrades = closed.slice(pageStart, pageStart + HISTORY_PAGE_SIZE);

  completedList.innerHTML = "";
  completedEmptyState.hidden = closed.length > 0;
  prevHistoryPage.disabled = historyPage <= 1;
  nextHistoryPage.disabled = historyPage >= totalPages;
  historyPageInfo.textContent = `Page ${historyPage} of ${totalPages}`;

  pageTrades.forEach((trade) => {
    const row = document.createElement("article");
    row.className = "trade-row";
    row.innerHTML = `
      <div>
        <div class="trade-name">
          <span>${escapeHtml(trade.stockName)}</span>
          <span class="badge">${percent(trade.roi)}</span>
        </div>
        <div class="trade-meta">
          Buy ${trade.buyDate} / Sell ${trade.sellDate}<br>
          Buy ${money(trade.buyPrice)} / Sell ${money(trade.sellPrice)} / ${number(trade.shares)} shares
        </div>
      </div>
      <div class="trade-result result-stack">
        <span class="${trade.roi >= 0 ? "profit" : "loss"}">ROI ${percent(trade.roi)}</span>
        <span class="${trade.profit >= 0 ? "profit" : "loss"}">${trade.profit >= 0 ? "Earn" : "Loss"} ${money(Math.abs(trade.profit))}</span>
        <button class="delete-trade" type="button" title="Delete record" aria-label="Delete record" data-delete-id="${trade.id}">x</button>
      </div>
    `;
    completedList.append(row);
  });
}

function renderHistoryFilters() {
  historyFilterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.historyFilter === historyFilterMode);
  });
  historyDateFilters.hidden = historyFilterMode !== "date";
  historyStockFilters.hidden = historyFilterMode !== "stock";

  const currentValue = historyStockSelect.value;
  historyStockSelect.innerHTML = `<option value="">All stocks</option>`;
  stockNames().forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    historyStockSelect.append(option);
  });
  historyStockSelect.value = [...historyStockSelect.options].some((option) => option.value === currentValue) ? currentValue : "";
}

function updateCloseFormForSelection() {
  const selectedTrade = trades.find((trade) => trade.id === processingSelect.value);
  if (!selectedTrade) {
    closeFields.sellDate.value = "";
    closeFields.sellDate.removeAttribute("min");
    return;
  }

  closeFields.sellDate.min = selectedTrade.buyDate;
  if (closeFields.sellDate.value && closeFields.sellDate.value < selectedTrade.buyDate) {
    closeFields.sellDate.value = "";
  }
}

function chartData() {
  if (activeChart === "cash") {
    return [
      ...cashEvents.map((event) => ({
        label: event.label,
        value: toNumeric(event.value),
        createdAt: event.createdAt,
      })),
      ...trades
        .filter((trade) => Number.isFinite(trade.cashBalance))
        .map((trade) => ({
          label: trade.stockName || "Trade",
          value: trade.cashBalance,
          createdAt: trade.closedAt || trade.createdAt,
        })),
    ]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((item, index) => ({
        label: item.label || `#${index + 1}`,
        value: item.value,
      }));
  }

  const source = completedTrades();

  return source.map((trade, index) => ({
    label: trade.stockName || `#${index + 1}`,
    value: trade.roi,
  }));
}

function comparisonSeries() {
  const names = stockNames();
  const activeNames = names.filter((name) => selectedStocks.has(name));

  return activeNames.map((name) => {
    const stockTrades = completedTrades().filter((trade) => trade.stockName === name);
    return {
      label: name,
      values: stockTrades.map((trade, index) => ({
        label: `${name} #${index + 1}`,
        value: activeComparisonChart === "roi" ? trade.roi : trade.profit,
      })),
    };
  });
}

function renderChart() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 680;
  const height = canvas.clientHeight || 360;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const data = chartData();
  const padding = { top: 24, right: 22, bottom: 42, left: 54 };

  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d9ded5";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  if (!data.length) {
    ctx.fillStyle = "#64706c";
    ctx.font = "700 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(activeChart === "roi" ? "Close a trade to see ROI trend" : "Add a record to see cash trend", width / 2, height / 2);
    return;
  }

  const values = data.map((item) => item.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const spread = maxValue - minValue || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const pointFor = (item, index) => {
    const x = padding.left + (data.length === 1 ? plotWidth / 2 : (plotWidth / (data.length - 1)) * index);
    const y = padding.top + plotHeight - ((item.value - minValue) / spread) * plotHeight;
    return { x, y };
  };

  ctx.strokeStyle = activeChart === "roi" ? "#166c55" : "#d99d28";
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((item, index) => {
    const point = pointFor(item, index);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  data.forEach((item, index) => {
    const point = pointFor(item, index);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = activeChart === "roi" ? "#166c55" : "#d99d28";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = "#64706c";
  ctx.font = "700 11px system-ui";
  ctx.textAlign = "right";
  [minValue, minValue + spread / 2, maxValue].forEach((tick) => {
    const y = padding.top + plotHeight - ((tick - minValue) / spread) * plotHeight;
    ctx.fillText(activeChart === "roi" ? percent(tick) : money(tick), padding.left - 8, y + 4);
  });

  ctx.textAlign = "center";
  data.forEach((item, index) => {
    const point = pointFor(item, index);
    ctx.fillText(item.label.slice(0, 6), point.x, height - 16);
  });
}

function renderStockFilters() {
  const names = stockNames();
  stockFilters.innerHTML = "";

  if (names.length && !stockFiltersInitialized) stockFiltersInitialized = true;
  [...selectedStocks].forEach((name) => {
    if (!names.includes(name)) selectedStocks.delete(name);
  });

  if (!names.length) {
    stockFilters.innerHTML = `<span class="filter-empty">Complete trades to compare stocks</span>`;
    return;
  }

  const selectedLabel =
    selectedStocks.size === names.length
      ? "All stocks"
      : selectedStocks.size
        ? `${selectedStocks.size} selected`
        : "No stocks selected";

  stockFilters.innerHTML = `
    <div class="stock-dropdown">
      <button id="stockDropdownButton" class="stock-dropdown-button" type="button" aria-expanded="false">
        <span>Stock Name</span>
        <strong>${escapeHtml(selectedLabel)}</strong>
      </button>
      <div id="stockDropdownMenu" class="stock-dropdown-menu" hidden>
        <div class="stock-dropdown-actions">
          <button id="resetStockFilter" class="secondary-button" type="button">Reset Filter</button>
        </div>
        ${names
          .map(
            (name) => `
              <label class="stock-check">
                <input type="checkbox" value="${escapeHtml(name)}" ${selectedStocks.has(name) ? "checked" : ""} />
                <span>${escapeHtml(name)}</span>
              </label>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function updateStockDropdownLabel() {
  const label = document.querySelector("#stockDropdownButton strong");
  const names = stockNames();
  if (!label) return;
  label.textContent =
    selectedStocks.size === names.length
      ? "All stocks"
      : selectedStocks.size
        ? `${selectedStocks.size} selected`
        : "No stocks selected";
}

function renderComparisonChart() {
  const ratio = window.devicePixelRatio || 1;
  const width = comparisonCanvas.clientWidth || 680;
  const height = comparisonCanvas.clientHeight || 360;
  comparisonCanvas.width = width * ratio;
  comparisonCanvas.height = height * ratio;
  comparisonCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  comparisonCtx.clearRect(0, 0, width, height);

  const series = comparisonSeries().filter((item) => item.values.length);
  const padding = { top: 24, right: 26, bottom: 46, left: 58 };
  const colors = ["#166c55", "#d99d28", "#7a4cc2", "#b4342b", "#2468a8", "#087a46", "#8a5a00"];

  comparisonCtx.fillStyle = "#fbfcfa";
  comparisonCtx.fillRect(0, 0, width, height);
  comparisonCtx.strokeStyle = "#d9ded5";
  comparisonCtx.lineWidth = 1;

  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / 3) * i;
    comparisonCtx.beginPath();
    comparisonCtx.moveTo(padding.left, y);
    comparisonCtx.lineTo(width - padding.right, y);
    comparisonCtx.stroke();
  }

  if (!series.length) {
    comparisonCtx.fillStyle = "#64706c";
    comparisonCtx.font = "700 14px system-ui";
    comparisonCtx.textAlign = "center";
    comparisonCtx.fillText("Select completed stocks to compare", width / 2, height / 2);
    return;
  }

  const allValues = series.flatMap((item) => item.values.map((point) => point.value));
  const maxPoints = Math.max(...series.map((item) => item.values.length), 1);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const spread = maxValue - minValue || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const pointFor = (point, index) => {
    const x = padding.left + (maxPoints === 1 ? plotWidth / 2 : (plotWidth / (maxPoints - 1)) * index);
    const y = padding.top + plotHeight - ((point.value - minValue) / spread) * plotHeight;
    return { x, y };
  };

  series.forEach((item, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];
    comparisonCtx.strokeStyle = color;
    comparisonCtx.lineWidth = 3;
    comparisonCtx.beginPath();
    item.values.forEach((point, index) => {
      const position = pointFor(point, index);
      if (index === 0) comparisonCtx.moveTo(position.x, position.y);
      else comparisonCtx.lineTo(position.x, position.y);
    });
    comparisonCtx.stroke();

    item.values.forEach((point, index) => {
      const position = pointFor(point, index);
      comparisonCtx.fillStyle = "#ffffff";
      comparisonCtx.strokeStyle = color;
      comparisonCtx.lineWidth = 3;
      comparisonCtx.beginPath();
      comparisonCtx.arc(position.x, position.y, 5, 0, Math.PI * 2);
      comparisonCtx.fill();
      comparisonCtx.stroke();
    });
  });

  comparisonCtx.fillStyle = "#64706c";
  comparisonCtx.font = "700 11px system-ui";
  comparisonCtx.textAlign = "right";
  [minValue, minValue + spread / 2, maxValue].forEach((tick) => {
    const y = padding.top + plotHeight - ((tick - minValue) / spread) * plotHeight;
    comparisonCtx.fillText(activeComparisonChart === "roi" ? percent(tick) : money(tick), padding.left - 8, y + 4);
  });

  comparisonCtx.textAlign = "center";
  for (let i = 0; i < maxPoints; i += 1) {
    const x = padding.left + (maxPoints === 1 ? plotWidth / 2 : (plotWidth / (maxPoints - 1)) * i);
    comparisonCtx.fillText(`#${i + 1}`, x, height - 16);
  }

  let legendX = padding.left;
  series.forEach((item, index) => {
    const color = colors[index % colors.length];
    comparisonCtx.fillStyle = color;
    comparisonCtx.fillRect(legendX, 10, 10, 10);
    comparisonCtx.fillStyle = "#14201c";
    comparisonCtx.textAlign = "left";
    comparisonCtx.fillText(item.label, legendX + 14, 19);
    legendX += Math.min(90, 26 + item.label.length * 8);
  });
}

function eventsByDate() {
  return trades.reduce((events, trade) => {
    if (trade.buyDate) {
      events[trade.buyDate] ||= [];
      events[trade.buyDate].push({ type: "buy", label: trade.stockName });
    }
    if (trade.sellDate) {
      events[trade.sellDate] ||= [];
      events[trade.sellDate].push({ type: "sell", label: trade.stockName });
    }
    return events;
  }, {});
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events = eventsByDate();

  calendarTitle.textContent = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  calendarGrid.innerHTML = "";

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    const blank = document.createElement("div");
    blank.className = "calendar-day blank";
    calendarGrid.append(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const dayEvents = events[key] || [];
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (key === dateKey(new Date())) cell.classList.add("today");
    cell.innerHTML = `
      <span class="day-number">${day}</span>
      <div class="calendar-events">
        ${dayEvents
          .map((event) => `<span class="calendar-event ${event.type}">${event.type === "buy" ? "B" : "S"} ${escapeHtml(event.label)}</span>`)
          .join("")}
      </div>
    `;
    calendarGrid.append(cell);
  }
}

function render() {
  renderPage();
  renderSummary();
  renderProcessingTransactions();
  renderCompletedTrades();
  renderChartView();
  renderChart();
  renderStockFilters();
  renderComparisonChart();
  renderCalendar();
}

function renderPage() {
  pageSections.forEach((section) => {
    section.hidden = section.dataset.page !== activePage;
  });
  pageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.pageTarget === activePage);
  });
}

function setToolboxOpen(isOpen) {
  sidebar.classList.toggle("open", isOpen);
  sidebarBackdrop.hidden = !isOpen;
  menuButton.setAttribute("aria-expanded", String(isOpen));
}

function renderChartView() {
  const showingComparison = activeChartView === "comparison";
  trendsChartView.hidden = showingComparison;
  comparisonChartView.hidden = !showingComparison;
  chartViewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.chartView === activeChartView);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const trade = buildTrade();
  const error = validateOpenTrade(trade, { checkCash: true });
  if (error) {
    alert(error);
    return;
  }
  trades.push(trade);
  totalCash = trade.cashBalance;
  saveTrades();
  saveCash();
  form.reset();
  updateSharePreview();
  render();
});

cashForm.addEventListener("submit", (event) => {
  event.preventDefault();
  totalCash = toNumeric(cashInput.value);
  saveCash();
  recordCashEvent("Set");
  renderSummary();
  renderChart();
});

addCashButton.addEventListener("click", () => {
  const amount = toNumeric(cashInput.value);
  if (amount <= 0) return;
  totalCash += amount;
  saveCash();
  recordCashEvent("Add");
  renderSummary();
  renderChart();
});

resetButton.addEventListener("click", () => {
  form.reset();
  updateSharePreview();
  renderSummary();
});

clearAllButton.addEventListener("click", () => {
  if (!trades.length || !confirm("Are you sure you want to clear all records?")) return;
  trades = [];
  saveTrades();
  render();
});

document.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-id]");
  if (editButton) {
    editingProcessingId = editButton.dataset.editId;
    renderProcessingTransactions();
    return;
  }

  const cancelEditButton = event.target.closest("[data-cancel-edit-id]");
  if (cancelEditButton) {
    editingProcessingId = "";
    renderProcessingTransactions();
    return;
  }

  const selectButton = event.target.closest("[data-select-id]");
  if (selectButton) {
    processingSelect.value = selectButton.dataset.selectId;
    updateCloseFormForSelection();
    closeFields.sellDate.focus();
    return;
  }

  const button = event.target.closest("[data-delete-id]");
  if (!button) return;
  const deletedTrade = trades.find((trade) => trade.id === button.dataset.deleteId);
  if (deletedTrade) {
    totalCash += deletedTrade.status === "open" ? deletedTrade.invested : -deletedTrade.profit;
  }
  trades = trades.filter((trade) => trade.id !== button.dataset.deleteId);
  saveTrades();
  saveCash();
  render();
});

closeTradeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const trade = trades.find((item) => item.id === processingSelect.value);
  if (!trade) {
    alert("Please select a processing record.");
    return;
  }

  const updatedTrade = calculateResult({
    ...trade,
    sellDate: closeFields.sellDate.value,
    sellPrice: toNumeric(closeFields.sellPrice.value),
    closedAt: new Date().toISOString(),
  });
  updatedTrade.cashBalance = totalCash + updatedTrade.proceeds;
  const error = validateCompletedTrade(updatedTrade);

  if (error) {
    alert(error);
    return;
  }

  trades = trades.map((item) => (item.id === updatedTrade.id ? updatedTrade : item));
  totalCash = updatedTrade.cashBalance;
  saveTrades();
  saveCash();
  closeTradeForm.reset();
  render();
});

processingList.addEventListener("submit", (event) => {
  const editForm = event.target.closest("[data-edit-form]");
  if (!editForm) return;
  event.preventDefault();

  const originalTrade = trades.find((trade) => trade.id === editForm.dataset.editForm);
  if (!originalTrade) return;

  const formData = new FormData(editForm);
  const editedTrade = calculateResult({
    ...originalTrade,
    buyDate: formData.get("buyDate"),
    stockName: String(formData.get("stockName") || "").trim().toUpperCase(),
    buyPrice: toNumeric(formData.get("buyPrice")),
    shares: sharesFromValues(formData.get("shares"), formData.get("buyPrice"), formData.get("cashInvested")),
    cashInvested: toNumeric(formData.get("cashInvested")),
    sellDate: "",
    sellPrice: NaN,
  });
  const error = validateOpenTrade(editedTrade);
  const availableCash = totalCash + originalTrade.invested;

  if (error) {
    alert(error);
    return;
  }
  if (availableCash < editedTrade.invested) {
    alert("Total cash is not enough for this edited buy-in record.");
    return;
  }

  totalCash = availableCash - editedTrade.invested;
  editedTrade.cashBalance = totalCash;
  trades = trades.map((trade) => (trade.id === editedTrade.id ? editedTrade : trade));
  editingProcessingId = "";
  saveTrades();
  saveCash();
  render();
});

processingSelect.addEventListener("change", updateCloseFormForSelection);

historyFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    historyFilterMode = button.dataset.historyFilter;
    historyPage = 1;
    renderCompletedTrades();
  });
});

[historyDateFrom, historyDateTo, historyStockSelect].forEach((control) => {
  control.addEventListener("input", () => {
    historyPage = 1;
    renderCompletedTrades();
  });
});

resetHistoryFilter.addEventListener("click", () => {
  historyDateFrom.value = "";
  historyDateTo.value = "";
  historyStockSelect.value = "";
  historyPage = 1;
  renderCompletedTrades();
});

prevHistoryPage.addEventListener("click", () => {
  historyPage = Math.max(1, historyPage - 1);
  renderCompletedTrades();
});

nextHistoryPage.addEventListener("click", () => {
  historyPage += 1;
  renderCompletedTrades();
});

menuButton.addEventListener("click", () => {
  setToolboxOpen(!sidebar.classList.contains("open"));
});

sidebarBackdrop.addEventListener("click", () => {
  setToolboxOpen(false);
});

pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activePage = button.dataset.pageTarget;
    renderPage();
    renderChart();
    renderComparisonChart();
    setToolboxOpen(false);
  });
});

chartViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeChartView = button.dataset.chartView;
    renderChartView();
    renderChart();
    renderComparisonChart();
  });
});

chartButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeChart = button.dataset.chart;
    chartButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderChart();
  });
});

comparisonButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeComparisonChart = button.dataset.comparisonChart;
    comparisonButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderComparisonChart();
  });
});

stockFilters.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".stock-check input");
  if (!checkbox) return;
  if (checkbox.checked) selectedStocks.add(checkbox.value);
  else selectedStocks.delete(checkbox.value);
  updateStockDropdownLabel();
  renderComparisonChart();
});

stockFilters.addEventListener("click", (event) => {
  const dropdownButton = event.target.closest("#stockDropdownButton");
  const resetButton = event.target.closest("#resetStockFilter");
  const menu = document.querySelector("#stockDropdownMenu");

  if (dropdownButton && menu) {
    const isOpen = menu.hidden;
    menu.hidden = !isOpen;
    dropdownButton.setAttribute("aria-expanded", String(isOpen));
    return;
  }

  if (resetButton) {
    selectedStocks = new Set();
    renderStockFilters();
    renderComparisonChart();
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".stock-dropdown")) return;
  const menu = document.querySelector("#stockDropdownMenu");
  const button = document.querySelector("#stockDropdownButton");
  if (!menu || !button) return;
  menu.hidden = true;
  button.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setToolboxOpen(false);
});

prevMonthButton.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => {
    updateSharePreview();
    renderSummary();
  });
});

window.addEventListener("resize", () => {
  renderChart();
  renderComparisonChart();
});

document.addEventListener("input", (event) => {
  const input = event.target.closest("input[type='number']");
  if (!input) return;
  limitDecimalInput(input);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

saveTrades();
updateSharePreview();
render();
