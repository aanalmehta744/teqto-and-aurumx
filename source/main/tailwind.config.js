module.exports = {
  content: [
    "./src/app/authentication/login/**/*.{html,ts}",
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {},
  },
   theme: {
    extend: {
      screens :{
        '3xl' : '2560px' //custom screen
      }
    },
  },
  plugins: [],
}

