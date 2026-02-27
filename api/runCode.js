export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code = '' } = req.body;
    
    // In a real cloud implementation, you'd need a secure sandbox for code execution
    // This is just a mock response
    const hasErrors = code.includes('error') || code.includes('// ERROR') || !code.includes('#include') || !code.includes('int main');
    
    if (hasErrors) {
      res.status(200).json({
        success: false,
        output: '',
        error: 'Compilation error: Please check your syntax',
        executionTime: 0
      });
    } else {
      res.status(200).json({
        success: true,
        output: 'Program executed successfully\nHello, World!',
        error: '',
        executionTime: 123
      });
    }
  } catch (err) {
    console.error('Error running code:', err.message);
    res.status(500).json({
      success: false,
      output: '',
      error: 'Internal server error',
      executionTime: 0
    });
  }
}