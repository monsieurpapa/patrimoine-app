# Heritage Asset Manager

A comprehensive financial management application for tracking heritage assets, transactions, and personnel in the DRC/Kivu region context.

![React](https://img.shields.io/badge/React-18.3-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Asset Management** - Track heritage assets across multiple sectors (retail, warehouse, apartments, agribusiness, equipment)
- **Financial Transactions** - Record income and expenses with multi-currency support (USD, CDF, EUR)
- **Personnel Management** - Manage staff and their assignments to specific assets
- **Dashboard & Analytics** - Visual charts showing financial performance, sector distribution, and trends
- **Data Persistence** - Local storage for development, Firebase Firestore for production

## Tech Stack

- **Frontend**: React 18 + Vite
- **UI Components**: Lucide React (icons)
- **Charts**: Recharts
- **Database**: Firebase Firestore (production) / LocalStorage (development)
- **Styling**: Custom CSS with CSS variables

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/monsieurpapa/patrimoine-app.git
cd patrimoine-app

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Firebase Setup (Production)

1. Create a project at [firebase.google.com](https://firebase.google.com)
2. Enable **Firestore Database** in test mode
3. Create a web app and copy the configuration
4. Copy `.env.example` to `.env.local` and fill in your values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository at [vercel.com](https://vercel.com)
3. Add the Firebase environment variables in the Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any static hosting service:
- Netlify
- Cloudflare Pages
- GitHub Pages

## Project Structure

```
heritage-app/
├── src/
│   ├── App.jsx          # Main application component
│   ├── firebase.js      # Firebase configuration and services
│   ├── storage.js       # Storage abstraction layer
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies
└── .env.example         # Environment variables template
```

## Usage

1. **First Launch**: The app starts with demo data showing sample assets and transactions
2. **Add Assets**: Use the "+" button to add new heritage assets
3. **Record Transactions**: Press `N` or use the "+" button to add income/expenses
4. **Manage Personnel**: Track staff assigned to each asset
5. **View Analytics**: Check the dashboard for financial insights

## License

MIT License - see [LICENSE](LICENSE) for details

## Author

Created for heritage asset management in the DRC/Kivu region
