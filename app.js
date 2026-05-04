const STORAGE_KEY = "shortTermInvestmentTrades";

const form = document.querySelector("#tradeForm");
const resetButton = document.querySelector("#resetButton");
const clearAllButton = document.querySelector("#clearAllButton");
const chartButtons = document.querySelectorAll("[data-chart]");
const canvas = document.querySelector("#trendChart");
const ctx = canvas.getContext("2d");

let trades = loadTrades();
let activeChart = "roi";

const fields = {
  buyDate: document.querySelector("#buyDate"),
  sellDate: document.querySelector("#sellDate"),
  stockName: document.querySelector("#stockName"),
  buyPrice: document.querySelector("#buyPrice"),
  sellPrice: document.querySelector("#sellPrice"),
  shares: document.querySelector("#shares"),
  cashInvested: document.querySelector("#cashInvested"),
  cashBalance: document.querySelector("#cashBalance"),
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

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}

function number(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(
    Number.isFinite(value) ? value : 0,
  );
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

function calculateShares() {
  const shares = toNumeric(fields.shares.value);
  const buyPrice = toNumeric(fields.buyPrice.value);
  const cashInvested = toNumeric(fields.cashInvested.value);

  if (shares > 0) return shares;
  if (buyPrice > 0 && cashInvested > 0) return cashInvested / buyPrice;
  return 0;
}

function updateSharePreview() {
  const shares = calculateShares();
  document.querySelector("#sharePreview").textContent = number(shares);
  fields.cashInvested.required = toNumeric(fields.shares.value) === 0;
}

function buildTrade() {
  const buyPrice = toNumeric(fields.buyPrice.value);
  const sellPrice = toNumeric(fields.sellPrice.value);
  const shares = calculateShares();
  const invested = shares * buyPrice;
  const proceeds = shares * sellPrice;
  const profit = proceeds - invested;
  const roi = invested > 0 ? (profit / invested) * 100 : 0;

  return {
    id: crypto.randomUUID(),
    buyDate: fields.buyDate.value,
    sellDate: fields.sellDate.value,
    stockName: fields.stockName.value.trim().toUpperCase(),
    buyPrice,
    sellPrice,
    shares,
    cashInvested: toNumeric(fields.cashInvested.value),
    cashBalance: toNumeric(fields.cashBalance.value),
    invested,
    proceeds,
    profit,
    roi,
    createdAt: new Date().toISOString(),
  };
}

function validateTrade(trade) {
  if (!trade.stockName) return "Please enter a stock name.";
  if (!trade.buyDate || !trade.sellDate) return "Please enter both buy-in and sell-out dates.";
  if (new Date(trade.sellDate) < new Date(trade.buyDate)) return "Sell-out date cannot be earlier than buy-in date.";
  if (trade.buyPrice <= 0 || trade.sellPrice < 0) return "Please check the buy-in and sell-out prices.";
  if (trade.shares <= 0) return "When shares are 0, enter the cash invested so shares can be calculated.";
  return "";
}

function renderSummary() {
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const averageRoi = trades.length
    ? trades.reduce((sum, trade) => sum + trade.roi, 0) / trades.length
    : 0;
  const latestCash = trades.length ? trades[trades.length - 1].cashBalance : toNumeric(fields.cashBalance.value);

  document.querySelector("#totalCash").textContent = money(latestCash);
  document.querySelector("#totalProfit").textContent = money(totalProfit);
  document.querySelector("#totalProfit").className = totalProfit >= 0 ? "profit" : "loss";
  document.querySelector("#averageRoi").textContent = percent(averageRoi);
  document.querySelector("#averageRoi").className = averageRoi >= 0 ? "profit" : "loss";
  document.querySelector("#tradeCount").textContent = trades.length;
}

function renderTrades() {
  const list = document.querySelector("#tradeList");
  const emptyState = document.querySelector("#emptyState");
  list.innerHTML = "";
  emptyState.hidden = trades.length > 0;

  [...trades].reverse().forEach((trade) => {
    const row = document.createElement("article");
    row.className = "trade-row";
    row.innerHTML = `
      <div>
        <div class="trade-name">
          <span>${escapeHtml(trade.stockName)}</span>
          <span class="badge">${percent(trade.roi)}</span>
        </div>
        <div class="trade-meta">
          ${trade.buyDate} to ${trade.sellDate}<br>
          Buy ${money(trade.buyPrice)} / Sell ${money(trade.sellPrice)} / ${number(trade.shares)} shares
        </div>
      </div>
      <div class="trade-result ${trade.profit >= 0 ? "profit" : "loss"}">
        ${money(trade.profit)}
        <button class="delete-trade" type="button" title="Delete trade" aria-label="Delete trade" data-id="${trade.id}">x</button>
      </div>
    `;
    list.append(row);
  });
}

function chartData() {
  return trades.map((trade, index) => ({
    label: trade.stockName || `#${index + 1}`,
    value: activeChart === "roi" ? trade.roi : trade.cashBalance,
  }));
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
    ctx.fillText("Add a trade to see your trend", width / 2, height / 2);
    return;
  }

  const values = data.map((item) => item.value);
  const minValue = Math.min(...values, activeChart === "roi" ? 0 : Math.min(...values));
  const maxValue = Math.max(...values, activeChart === "roi" ? 0 : Math.max(...values));
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

function render() {
  renderSummary();
  renderTrades();
  renderChart();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const trade = buildTrade();
  const error = validateTrade(trade);
  if (error) {
    alert(error);
    return;
  }
  trades.push(trade);
  saveTrades();
  form.reset();
  fields.cashBalance.value = trade.cashBalance.toFixed(2);
  updateSharePreview();
  render();
});

resetButton.addEventListener("click", () => {
  form.reset();
  updateSharePreview();
  renderSummary();
});

clearAllButton.addEventListener("click", () => {
  if (!trades.length || !confirm("Are you sure you want to clear all trade history?")) return;
  trades = [];
  saveTrades();
  render();
});

document.querySelector("#tradeList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  trades = trades.filter((trade) => trade.id !== button.dataset.id);
  saveTrades();
  render();
});

chartButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeChart = button.dataset.chart;
    chartButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderChart();
  });
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => {
    updateSharePreview();
    renderSummary();
  });
});

window.addEventListener("resize", renderChart);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

updateSharePreview();
render();
