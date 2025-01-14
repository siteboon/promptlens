/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              '&:hover': {
                color: 'inherit',
                textDecoration: 'none',
              },
            },
            code: {
              color: 'inherit',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              backgroundColor: 'hsl(var(--bc) / 0.1)',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              color: 'inherit',
              backgroundColor: 'hsl(var(--bc) / 0.1)',
              borderRadius: '0.5rem',
              padding: '1rem',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      "light",
      "dark",
      "cupcake",

    ],
    darkTheme: "dark",
  },
}

