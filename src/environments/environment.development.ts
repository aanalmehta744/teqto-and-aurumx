export const environment = {
  production: true,
  
  localApiUrl: 'http://localhost:5001/api',

  // cloudflareApiUrl:
  //   'https://hudson-evaluate-courage-measure.trycloudflare.com/api',

  apiUrl:
    'http://localhost:5001/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Development Environment Loaded. API URL", environment.apiUrl);


