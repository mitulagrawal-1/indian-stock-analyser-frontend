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
            
            // This will print the exact structure to your browser console for debugging
            console.log("Backend raw response:", result);

            // Handle both versions of the backend keys safely
            const targetData = result.data || result.saved_data;

            if (!targetData) {
                throw new Error("Backend response missing both 'data' and 'saved_data' keys.");
            }

            renderDashboard(targetData);
            
        } catch (error) {
            console.error('Error during execution:', error);
            // Convert the result object to text so you can read it in the alert box
            const responsePreview = result ? JSON.stringify(result) : 'No response body';
            alert(`Pipeline Error: ${error.message}\n\nBackend sent: ${responsePreview}`);
            document.getElementById('placeholder-text').classList.remove('hidden');
        } finally {
            document.getElementById('loader').classList.add('hidden');
        }
    });
});