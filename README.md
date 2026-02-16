# findCoins Frontend

A modern, premium React dashboard for tracking and analyzing Solana tokens. Features real-time data updates, beautiful dark mode UI with glassmorphism effects, and comprehensive token analytics.

## Features

- 🎨 **Premium Dark UI**: Sleek dark theme with gradients, glassmorphism, and smooth animations
- 📊 **Real-time Token Data**: Live updates from Supabase with price, market cap, volume, and more
- 🔍 **Advanced Filtering**: Filter by strategy, market cap, holders, and custom criteria
- 📈 **Historical Charts**: Visualize price and holder trends over time
- 🎯 **Multi-Strategy Support**: Track different token discovery strategies simultaneously
- 💎 **DEX Integration**: See which DEXs tokens are listed on with icons
- ⚡ **On-Demand Metadata**: Fetch Twitter, website, and description only when needed
- 🕐 **Relative Time Display**: Human-readable token creation times (e.g., "1 month and 4 days ago")

## Project Structure

```
findCoins-frontend/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── supabaseClient.js       # Supabase client configuration
│   ├── index.css               # Global styles and design system
│   └── main.jsx                # Application entry point
├── public/                     # Static assets
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── .env                        # Environment variables (create from .env.example)
├── .env.example               # Environment variable template
└── README.md                  # This file
```

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account with database set up

## Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd findCoins-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

## Configuration

Edit the `.env` file with your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_HELIUS_API_KEY=your_helius_api_key
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

## Building for Production

Create an optimized production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Vercel will auto-detect Vite configuration
4. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
   - `VITE_HELIUS_API_KEY`
5. Deploy!

**Vercel CLI (Alternative)**:
```bash
npm install -g vercel
vercel
```

### Netlify

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com) and import your repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

**Netlify CLI (Alternative)**:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Other Platforms

The built files in the `dist/` folder can be deployed to any static hosting service:
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront
- Firebase Hosting

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_KEY` | Supabase anon/public key | Yes |
| `VITE_HELIUS_API_KEY` | Helius API key for Solana data | Yes |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Supabase** - Backend and real-time database
- **Lucide React** - Icon library
- **Vanilla CSS** - Styling with custom design system

## Features in Detail

### Real-time Updates
The dashboard automatically subscribes to Supabase changes and updates the UI in real-time when new tokens are added or existing tokens are updated.

### Token Filtering
Filter tokens by:
- Strategy/filter configuration
- Market cap range
- Holder count
- Price change percentages
- Token age

### Historical Data
View historical charts for:
- Price trends
- Market cap changes
- Holder growth
- Volume patterns

### On-Demand Metadata
Click on a token to expand details and fetch:
- Twitter profile
- Official website
- Token description
- Additional social links

## Troubleshooting

**Blank page after deployment?**
- Check browser console for errors
- Verify environment variables are set correctly
- Ensure Supabase URL and key are correct

**Data not loading?**
- Check Supabase connection
- Verify your backend bot is running
- Check browser network tab for failed requests

**Build errors?**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`
- Update dependencies: `npm update`

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project however you'd like.
