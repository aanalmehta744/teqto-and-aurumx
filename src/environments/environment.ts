export const environment = {
  production: true,
  cloudflareApiUrl:
    'https://correct-manitoba-retention-assistant.trycloudflare.com/api',

  apiUrl: 
  // 'http://localhost:5001/api'
  'https://correct-manitoba-retention-assistant.trycloudflare.com/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Production Enviorment Loaded. API URL", environment.apiUrl);
