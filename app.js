// Detect Backend API URL
const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://127.0.0.1:8000" 
    : "https://indian-stock-backend-5ncd.onrender.com";

let currentSector = "Banking";
let currentTab = "live"; // "live" or "backtest"

// Active State Cache
let liveDataCache = {};
let backtestDataCache = {};

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
    initConnectionCheck();
    setupTabNavigation();
    setupSectorButtons();
    setupModelControls();
    
    // Set initial active button
    const defaultBtn = document.querySelector(`.sector-btn[data-sector="${currentSector}"]`);
    if (defaultBtn) {
        defaultBtn.classList.add("btn-active");
        updateActiveSectorBadge();
    }
});

// 1. Connection Health Check
async function initConnectionCheck() {
    const statusDot = document.getElementById("status-dot");
    const statusText = document.getElementById("status-text");
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/historical-analyses?limit=1`);
        if (response.ok) {
            statusDot.className = "relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 glow-green";
            statusText.innerText = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? "API Active (Local)"
                : "API Active (Production)";
        } else {
            throw new Error();
        }
    } catch (e) {
        statusDot.className = "relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 glow-red";
        statusText.innerText = "API Offline";
        console.error("Backend server connection failed:", e);
    }
}

// 2. Tab Navigation
function setupTabNavigation() {
    const liveBtn = document.getElementById("tab-live-btn");
    const backtestBtn = document.getElementById("tab-backtest-btn");
    const backtestControls = document.getElementById("backtest-controls");
    const liveDashboard = document.getElementById("live-dashboard");
    const backtestDashboard = document.getElementById("backtest-dashboard");
    const placeholder = document.getElementById("placeholder-text");

    liveBtn.addEventListener("click", () => {
        currentTab = "live";
        
        // Update tab styling
        liveBtn.className = "px-5 py-3 font-semibold text-sm border-b-2 border-cyan-500 text-cyan-400 transition-all duration-200 focus:outline-none flex items-center gap-2";
        backtestBtn.className = "px-5 py-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition-all duration-200 focus:outline-none flex items-center gap-2";
        
        // Toggle view elements
        backtestControls.classList.add("hidden");
        backtestDashboard.classList.remove("active");
        backtestDashboard.classList.add("hidden");
        
        if (liveDataCache[currentSector]) {
            renderLiveDashboard(liveDataCache[currentSector]);
            placeholder.classList.add("hidden");
            liveDashboard.classList.remove("hidden");
            liveDashboard.classList.add("active");
        } else {
            liveDashboard.classList.add("hidden");
            placeholder.classList.remove("hidden");
        }
    });

    backtestBtn.addEventListener("click", () => {
        currentTab = "backtest";
        
        // Update tab styling
        backtestBtn.className = "px-5 py-3 font-semibold text-sm border-b-2 border-cyan-500 text-cyan-400 transition-all duration-200 focus:outline-none flex items-center gap-2";
        liveBtn.className = "px-5 py-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition-all duration-200 focus:outline-none flex items-center gap-2";
        
        // Toggle view elements
        backtestControls.classList.remove("hidden");
        liveDashboard.classList.remove("active");
        liveDashboard.classList.add("hidden");
        
        if (backtestDataCache[currentSector]) {
            renderBacktestDashboard(backtestDataCache[currentSector]);
            placeholder.classList.add("hidden");
            backtestDashboard.classList.remove("hidden");
            backtestDashboard.classList.add("active");
        } else {
            backtestDashboard.classList.add("hidden");
            placeholder.classList.remove("hidden");
        }
    });
}

// 3. Sector Buttons Setup
function setupSectorButtons() {
    document.querySelectorAll(".sector-btn").forEach(button => {
        button.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            currentSector = btn.getAttribute("data-sector");
            
            // Toggle active styling
            document.querySelectorAll(".sector-btn").forEach(b => b.classList.remove("btn-active"));
            btn.classList.add("btn-active");
            
            updateActiveSectorBadge();
            
            // Execute action based on active tab
            if (currentTab === "live") {
                await runLiveAnalysis();
            } else {
                // If in backtest tab, check if cached or run
                if (backtestDataCache[currentSector]) {
                    renderBacktestDashboard(backtestDataCache[currentSector]);
                } else {
                    await runBacktest();
                }
            }
        });
    });
}

function updateActiveSectorBadge() {
    const badge = document.getElementById("active-sector-badge");
    badge.innerText = `NSE ${currentSector}`;
}

// 4. Model Training and Backtest Actions
function setupModelControls() {
    const trainBtn = document.getElementById("train-model-btn");
    const backtestBtn = document.getElementById("run-backtest-btn");
    
    trainBtn.addEventListener("click", async () => {
        appendLog("[INFO] Dispatching model training request...");
        trainBtn.disabled = true;
        trainBtn.innerText = "Training...";
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/train-model`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || "Server failed training execution.");
            }
            
            appendLog(`[SUCCESS] ${result.message}`);
            appendLog(`[INFO] Model saved successfully.`);
            alert(`Model trained successfully on ${result.data_points} historical records!`);
            
            // Update the dataset count display if backtest summary is active
            updateDatasetDensity();
        } catch (error) {
            appendLog(`[ERROR] ${error.message}`);
            alert(`Training Failed: ${error.message}`);
        } finally {
            trainBtn.disabled = false;
            trainBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-550" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                </svg>
                Train Logistic Classifier
            `;
        }
    });
    
    backtestBtn.addEventListener("click", async () => {
        await runBacktest();
    });
}

function appendLog(message) {
    const logEl = document.getElementById("model-log");
    const timestamp = new Date().toLocaleTimeString();
    logEl.innerText += `\n[${timestamp}] ${message}`;
    logEl.scrollTop = logEl.scrollHeight;
}

// 5. Run Live Analysis API
async function runLiveAnalysis() {
    const placeholder = document.getElementById("placeholder-text");
    const dashboard = document.getElementById("live-dashboard");
    const loader = document.getElementById("loader");
    const loaderTitle = document.getElementById("loader-title");
    const loaderDesc = document.getElementById("loader-desc");
    
    // UI state reset
    placeholder.classList.add("hidden");
    dashboard.classList.add("hidden");
    loader.classList.remove("hidden");
    
    loaderTitle.innerText = `Fetching ${currentSector} Tracker`;
    loaderDesc.innerText = "Extracting current closing prices, parsing RSS Google News feeds, and predicting sentiment weights...";

    try {
        const response = await fetch(`${BACKEND_URL}/api/analyze-sector`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sector_name: currentSector })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || `Server returned status code: ${response.status}`);
        }
        
        const targetData = result.data;
        if (!targetData) {
            throw new Error("Response body is missing structural data references.");
        }
        
        liveDataCache[currentSector] = targetData;
        renderLiveDashboard(targetData);
        
    } catch (error) {
        console.error("Live analysis pipeline failure:", error);
        alert(`Pipeline Failure: ${error.message}`);
        placeholder.classList.remove("hidden");
    } finally {
        loader.classList.add("hidden");
    }
}

function renderLiveDashboard(data) {
    document.getElementById("metric-price").innerText = `\u20B9${data.close_price.toLocaleString("en-IN")}`;
    
    const changeEl = document.getElementById("metric-change");
    changeEl.innerText = `${data.pct_change > 0 ? "+" : ""}${data.pct_change}%`;
    changeEl.className = `text-sm font-semibold mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
        data.pct_change >= 0 
            ? "bg-green-950/40 text-green-400 border-green-900/40 glow-green" 
            : "bg-red-950/40 text-red-400 border-red-900/40 glow-red"
    }`;

    const labelEl = document.getElementById("metric-sentiment");
    labelEl.innerText = data.sentiment_label;
    if (data.sentiment_label === "Positive") {
        labelEl.className = "text-4xl font-extrabold text-green-400 block mt-3 tracking-tight glow-green";
    } else if (data.sentiment_label === "Negative") {
        labelEl.className = "text-4xl font-extrabold text-red-400 block mt-3 tracking-tight glow-red";
    } else {
        labelEl.className = "text-4xl font-extrabold text-slate-300 block mt-3 tracking-tight";
    }

    document.getElementById("metric-score").innerText = `Composite Weight: ${data.avg_sentiment_score}`;

    const listEl = document.getElementById("headlines-list");
    listEl.innerHTML = "";
    
    data.headlines.forEach(headline => {
        const li = document.createElement("li");
        li.className = "pt-4 pb-1 text-sm text-slate-300 first:pt-0 border-slate-900 flex items-start gap-2.5";
        li.innerHTML = `
            <span class="text-cyan-500 mt-1 select-none font-bold">&bull;</span>
            <span class="leading-relaxed">${headline}</span>
        `;
        listEl.appendChild(li);
    });

    document.getElementById("live-dashboard").classList.remove("hidden");
    document.getElementById("live-dashboard").classList.add("active");
    document.getElementById("placeholder-text").classList.add("hidden");
}

// 6. Run 7-Day Performance Backtest
async function runBacktest() {
    const placeholder = document.getElementById("placeholder-text");
    const dashboard = document.getElementById("backtest-dashboard");
    const loader = document.getElementById("loader");
    const loaderTitle = document.getElementById("loader-title");
    const loaderDesc = document.getElementById("loader-desc");
    
    placeholder.classList.add("hidden");
    dashboard.classList.add("hidden");
    loader.classList.remove("hidden");
    
    loaderTitle.innerText = `Simulating Past Week (${currentSector})`;
    loaderDesc.innerText = "Extracting daily yfinance stock change ranges and querying day-wise RSS news media for backtest validation. Please wait...";
    
    appendLog(`[INFO] Requesting 7-day model backtest for sector: ${currentSector}`);
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/evaluate-past-week`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sector_name: currentSector })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || `Server returned status code: ${response.status}`);
        }
        
        backtestDataCache[currentSector] = result;
        appendLog(`[SUCCESS] Simulation complete. Backtest Accuracy: ${Math.round(result.accuracy * 100)}%`);
        
        await renderBacktestDashboard(result);
        
    } catch (error) {
        console.error("Backtest simulation failure:", error);
        appendLog(`[ERROR] Backtest failure: ${error.message}`);
        alert(`Backtest Failure: ${error.message}`);
        placeholder.classList.remove("hidden");
    } finally {
        loader.classList.add("hidden");
    }
}

async function updateDatasetDensity() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/historical-analyses?limit=200`);
        if (res.ok) {
            const histData = await res.json();
            const count = histData.data ? histData.data.length : 0;
            const densityEl = document.getElementById("backtest-dataset");
            if (densityEl) {
                densityEl.innerText = count;
            }
        }
    } catch (e) {
        console.error("Failed to query historical data density:", e);
    }
}

async function renderBacktestDashboard(result) {
    const accuracy = result.accuracy;
    const accuracyPct = Math.round(accuracy * 100);
    
    // Set text metrics
    document.getElementById("backtest-accuracy").innerText = `${accuracyPct}%`;
    document.getElementById("radial-progress-text").innerText = `${accuracyPct}%`;
    document.getElementById("backtest-correct").innerText = result.correct_predictions;
    document.getElementById("backtest-total").innerText = result.total_days;
    
    // Update Radial SVG Circle
    const circle = document.getElementById("radial-progress-bar");
    const circumference = 2 * Math.PI * 26; // 163.36
    const offset = circumference * (1 - accuracy);
    circle.style.strokeDashoffset = offset;
    
    // Trigger dataset density update asynchronously
    updateDatasetDensity();
    
    // Render Day-wise Cards
    const listEl = document.getElementById("backtest-results-list");
    listEl.innerHTML = "";
    
    if (result.evaluation && result.evaluation.length > 0) {
        result.evaluation.forEach((day, index) => {
            const card = document.createElement("div");
            card.className = "p-5 bg-slate-900/60 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 group";
            
            // Format dates cleanly (e.g. 2026-06-25 to standard format)
            const dateObj = new Date(day.date);
            const formattedDate = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
            
            // Sentiment label color
            let sentimentColor = "text-slate-400";
            if (day.sentiment_label === "Positive") sentimentColor = "text-green-400 glow-green";
            if (day.sentiment_label === "Negative") sentimentColor = "text-red-400 glow-red";
            
            // Direction Arrow
            const trendArrow = day.pct_change >= 0 
                ? `<span class="text-green-400 mr-1">&#9650;</span>` 
                : `<span class="text-red-400 mr-1">&#9660;</span>`;
                
            // Correct/Incorrect badge
            const matchBadge = day.correct
                ? `<span class="inline-flex items-center gap-1 text-xs font-bold text-green-400 px-2.5 py-1 rounded-lg bg-green-950/30 border border-green-900/40 glow-green">
                     <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                     Match
                   </span>`
                : `<span class="inline-flex items-center gap-1 text-xs font-bold text-red-400 px-2.5 py-1 rounded-lg bg-red-950/30 border border-red-900/40 glow-red">
                     <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                     Mismatch
                   </span>`;
                   
            // Build inner HTML with expandable news segment
            card.innerHTML = `
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold text-white text-base">${formattedDate}</h4>
                        ${matchBadge}
                    </div>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span>Price: <strong class="text-slate-200">\u20B9${day.close_price.toLocaleString('en-IN')}</strong></span>
                        <span class="flex items-center">${trendArrow}<strong class="${day.pct_change >= 0 ? 'text-green-400' : 'text-red-400'}">${day.pct_change}%</strong></span>
                        <span>Sentiment: <strong class="${sentimentColor}">${day.sentiment_score} (${day.sentiment_label})</strong></span>
                    </div>
                </div>
                
                <div class="flex items-center gap-4">
                    <div class="text-right flex flex-row md:flex-col gap-3 md:gap-0 md:items-end justify-between items-center bg-slate-950/40 border border-slate-900 px-3 py-1.5 rounded-lg md:bg-transparent md:border-none md:p-0">
                        <div class="text-xs text-slate-500 font-semibold">Directional Alignment:</div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-xs text-slate-400">Actual: <strong class="text-slate-200 font-bold">${day.actual_movement}</strong></span>
                            <span class="text-xs text-slate-500 font-bold">&rarr;</span>
                            <span class="text-xs text-slate-400">AI Predict: <strong class="text-cyan-400 font-bold">${day.predicted_movement}</strong></span>
                        </div>
                    </div>
                    
                    <button class="toggle-news-btn p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer focus:outline-none" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transform transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
                
                <!-- Expandable news segment -->
                <div class="news-segment hidden w-full border-t border-slate-900/60 mt-4 pt-3 space-y-2 col-span-full">
                    <span class="text-2xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">Articles Analysed</span>
                    ${day.headlines.map(headline => `
                        <div class="text-xs text-slate-300 flex items-start gap-2">
                            <span class="text-cyan-500 font-bold">&bull;</span>
                            <span class="leading-relaxed">${headline}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            listEl.appendChild(card);
        });
        
        // Setup toggle buttons for news segments
        listEl.querySelectorAll(".toggle-news-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const button = e.currentTarget;
                const card = button.closest(".group");
                const segment = card.querySelector(".news-segment");
                const svg = button.querySelector("svg");
                
                const isHidden = segment.classList.contains("hidden");
                
                if (isHidden) {
                    segment.classList.remove("hidden");
                    svg.classList.add("rotate-180");
                } else {
                    segment.classList.add("hidden");
                    svg.classList.remove("rotate-180");
                }
            });
        });
    } else {
        listEl.innerHTML = `
            <div class="text-center py-6 text-slate-500 text-sm">
                No evaluation data points available for this period.
            </div>
        `;
    }
    
    document.getElementById("backtest-summary").classList.remove("hidden");
    document.getElementById("backtest-results-container").classList.remove("hidden");
    document.getElementById("backtest-dashboard").classList.remove("hidden");
    document.getElementById("backtest-dashboard").classList.add("active");
    document.getElementById("placeholder-text").classList.add("hidden");
}