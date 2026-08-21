// export const environment = {
//   production: true,
//   // apiUrl: 'https://portal.eliteinfotec.in/api'
//   apiUrl: 'http://localhost:5001/api'
  
//   // apiUrl: 'https://teqto-and-aurumx.onrender.com/api'
// };
export const environment = {
  production: true,
  // cloudflareApiUrl:
  //   'https://hudson-evaluate-courage-measure.trycloudflare.com/api',

  // Change this to whichever backend you want to use
  apiUrl: 'https://protect-everything-pac-volumes.trycloudflare.com/api'
};

console.log(
  'Production Environment Loaded. API URL:',
  environment.apiUrl
);
console.log("Production Enviorment Loaded. API URL", environment.apiUrl);
