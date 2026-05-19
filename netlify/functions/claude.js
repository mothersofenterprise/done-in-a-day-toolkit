exports.handler = async (event) => {
  console.log('Function called:', event.httpMethod);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Model:', body.model, 'Max tokens:', body.max_tokens);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('API key present:', !!apiKey);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model,
        max_tokens: body.max_tokens,
        system: body.system,
        messages: body.messages
      })
    });

    console.log('Anthropic response status:', response.status);
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.log('Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: error.message } })
    };
  }
};
