module.exports = {
  content: [
    "./src/app/authentication/login/**/*.{html,ts}",
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      screens: { '3xl': '2560px' }, 
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',   
        '5xl': '3rem',   
      },
      fontSize: {
        'metric': ['48px', { lineHeight: '52px', fontWeight: '800' }],   // big KPI numbers
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}