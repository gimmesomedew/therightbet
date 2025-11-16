# THERiGHTBET - Sports Betting Analytics Platform

A comprehensive sports betting analytics platform built with SvelteKit, providing data-driven insights for WNBA and NFL betting.

## Features

- **Real-time Sports Data**: Live game scores, statistics, and betting odds
- **Advanced Analytics**: AI-powered insights and trend analysis
- **User Dashboard**: Personalized betting history and performance tracking
- **Multi-Sport Support**: Starting with WNBA, expanding to NFL and beyond
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Frontend**: SvelteKit with Svelte 5
- **UI Components**: Svelte Material UI
- **Database**: Neon PostgreSQL
- **Styling**: Custom CSS with Tailwind-inspired utilities
- **Authentication**: JWT-based user authentication
- **API Integration**: SportsDataIO for sports data

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ or 24+
- npm or yarn
- Neon PostgreSQL database
- SportsDataIO API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd THERiGHTBET
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:port/database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# SportsDataIO API
SPORTSDATAIO_API_KEY=your_sportsdataio_api_key_here

# App Configuration
APP_URL=http://localhost:5173
NODE_ENV=development
```

4. Set up the database:
```bash
# Run the database schema setup
npm run db:setup
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── AppBar.svelte
│   │   ├── NavigationDrawer.svelte
│   │   ├── DashboardOverview.svelte
│   │   ├── TodaysGames.svelte
│   │   └── QuickStats.svelte
│   ├── database/           # Database configuration and models
│   │   ├── connection.ts
│   │   ├── models.ts
│   │   └── schema.sql
│   └── utils/              # Utility functions
├── routes/                 # SvelteKit routes
│   ├── +layout.svelte     # Main layout
│   ├── +page.svelte       # Dashboard page
│   └── api/               # API endpoints
└── app.html               # HTML template
```

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: User accounts and preferences
- **sports**: Available sports (WNBA, NFL, etc.)
- **teams**: Team information and statistics
- **players**: Player data and performance metrics
- **games**: Game schedules, scores, and status
- **betting_history**: User betting records and results
- **analytics_cache**: Cached analytics data for performance

## API Integration

### SportsDataIO

The platform integrates with SportsDataIO for:
- Live game scores and schedules
- Team and player statistics
- Betting odds and lines
- Historical data and trends

### Data Refresh

- **Live Games**: Every 30 seconds during active games
- **General Data**: Every 15 minutes
- **Historical Data**: Daily batch processing

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run check`: Run type checking
- `npm run lint`: Run ESLint

### Code Style

The project follows these conventions:
- TypeScript for type safety
- Svelte 5 with runes syntax
- Custom CSS with CSS variables
- Responsive design with mobile-first approach
- Accessibility-first component design

## Deployment

### Environment Setup

1. Set up a Neon PostgreSQL database
2. Configure environment variables in production
3. Set up SportsDataIO API access
4. Configure JWT secrets for production

### Build and Deploy

```bash
npm run build
```

The built application can be deployed to any static hosting service or serverless platform.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.