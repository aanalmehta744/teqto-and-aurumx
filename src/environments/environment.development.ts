export const environment = {
  production: true,
  
  localApiUrl: 'http://localhost:5001/api',

  cloudflareApiUrl:
    'https://yoga-agent-qualifying-paper.trycloudflare.com/api',

  apiUrl:
    // 'http://localhost:5001/api'
    'https://remained-uses-reporter-blocking.trycloudflare.com/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Development Environment Loaded. API URL", environment.apiUrl);


