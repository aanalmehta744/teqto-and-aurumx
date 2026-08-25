export const environment = {
  production: true,
  cloudflareApiUrl:
    'https://anyway-associates-overview-psychological.trycloudflare.com/api',

  // Change this to whichever backend you want to us

  apiUrl: 'http://localhost:5001/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Production Enviorment Loaded. API URL", environment.apiUrl);
