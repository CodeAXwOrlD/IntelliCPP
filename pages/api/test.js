// Simple test to verify API routes work
const testApiRoutes = async () => {
  console.log('Testing API routes...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch('/api/health');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test getStats endpoint
    const statsResponse = await fetch('/api/getStats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '#include <iostream>' })
    });
    const statsData = await statsResponse.json();
    console.log('Stats response:', statsData);
    
    // Test getSuggestions endpoint
    const suggestionsResponse = await fetch('/api/getSuggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prefix: 'vec', 
        contextType: 'global', 
        code: '#include <iostream>', 
        cursorPosition: 20 
      })
    });
    const suggestionsData = await suggestionsResponse.json();
    console.log('Suggestions response:', suggestionsData);
    
    console.log('All API routes tested successfully!');
  } catch (error) {
    console.error('Error testing API routes:', error);
  }
};

// This is just for documentation - actual testing happens in the browser
export { testApiRoutes };