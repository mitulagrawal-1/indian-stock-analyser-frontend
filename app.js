// Configuration: Replace with your actual Render API URL string
const BACKEND_URL = "https://indian-stock-backend-5ncd.onrender.com";

document.querySelectorAll('.sector-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
        const sectorName = e.target.getAttribute('data-sector');
        
        // UI State Reset
        document.getElementById('placeholder-text').classList.add('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('loader').classList.remove('hidden');
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/analyze-sector`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sector_name: sectorName })
            });

            if (!response.ok) {
                throw new Error('Network response evaluation failed.');
            }

            const result = await response.json();
            renderDashboard(result.data);
            
        } catch (error) {
            console.error('Error during execution:', error);
            alert('Failed to connect to Render backend engine.');
            document.getElementById('placeholder-text').classList.remove('hidden');
        } finally {
            document.getElementById('loader').classList.add('hidden');
        }
    });
});

function renderDashboard(data) {
    // Populate Price Metrics
    document.getElementById('metric-price').innerText = `₹${data.close_price.toLocaleString('en-IN')}`;
    
    const changeEl = document.getElementById('metric-change');
    changeEl.innerText = `${data.pct_change > 0 ? '+' : ''}${data.pct_change}%`;
    changeEl.className = `text-sm font-medium mt-1 block ${data.pct_change >= 0 ? 'text-green-400' : 'text-red-400'}`;

    // Populate Sentiment Metrics
    const labelEl = document.getElementById('metric-sentiment');
    labelEl.innerText = data.sentiment_label;
    if(data.sentiment_label === "Positive") labelEl.className = "text-2xl font-bold text-green-400 block mt-1";
    else if(data.sentiment_label === "Negative") labelEl.className = "text-2xl font-bold text-red-400 block mt-1";
    else labelEl.className = "text-2xl font-bold text-slate-300 block mt-1";

    document.getElementById('metric-score').innerText = `Composite Weight: ${data.avg_sentiment_score}`;

    // Populate Headlines
    const listEl = document.getElementById('headlines-list');
    listEl.innerHTML = ''; // clear prior entries
    
    data.headlines.forEach(headline => {
        const li = document.createElement('li');
        li.className = "pt-3 text-sm text-slate-300 first:pt-0 border-slate-700";
        li.innerText = headline;
        listEl.appendChild(li);
    });

    // Make Dashboard Visible
    document.getElementById('dashboard').classList.remove('hidden');
}