export const environment = {
  production: true,
  cloudflareApiUrl:
    'https://yoga-agent-qualifying-paper.trycloudflare.com/api',

  apiUrl: 
  // 'http://localhost:5001/api'
  'https://yoga-agent-qualifying-paper.trycloudflare.com/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Production Enviorment Loaded. API URL", environment.apiUrl);
