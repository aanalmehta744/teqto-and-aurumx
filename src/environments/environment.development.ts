export const environment = {
  production: true,
  
  localApiUrl: 'http://localhost:5001/api',

  cloudflareApiUrl:
    'https://anyway-associates-overview-psychological.trycloudflare.com/api',

  apiUrl:
    'http://localhost:5001/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Development Environment Loaded. API URL", environment.apiUrl);


