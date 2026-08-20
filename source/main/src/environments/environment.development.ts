export const environment = {
  production: true,
  localApiUrl: 'http://localhost:3000/api',

  // cloudflareApiUrl:
  //   'https://temp-acrylic-velvet-lynn.trycloudflare.com/api',

  apiUrl:
    'http://localhost:3000/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Development Environment Loaded. API URL", environment.apiUrl);


