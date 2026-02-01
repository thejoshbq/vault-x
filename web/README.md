# Budget System - Financial Management Dashboard

A modern, Matrix-themed financial management application for tracking income, expenses, budgets, and visualizing cashflow with interactive Sankey diagrams.

## Features

- 📊 **Dashboard**: Real-time overview of income, expenses, and net cashflow
- 💰 **Manage Items**: Create and manage income sources, expenses, subscriptions, and accounts
- 🔄 **Flow Management**: Define recurring money flows between accounts
- 📈 **Budgets**: Set and track spending budgets across categories
- 🎯 **Goals**: Create and monitor financial goals
- 💹 **Financials**: Detailed financial statements (Income Statement, Balance Sheet, Cash Flow)
- 🔐 **Multi-Profile**: Switch between different financial profiles

## Tech Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.4.21
- **Styling**: Tailwind CSS 3.4.0
- **Charts**: Recharts 2.15.0
- **Icons**: Lucide React 0.469.0

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API server running on `localhost:3000`

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd budget-system/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure backend API is running on `localhost:3000`

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (default Vite port).

## Production Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

The built files will be in the `dist/` directory.

## Project Structure

```
web/
├── src/
│   ├── components/          # React components
│   │   ├── AuthScreen.jsx           # Authentication/login
│   │   ├── BudgetManager.jsx        # Budget tracking
│   │   ├── FinancialDashboard.jsx   # Financial statements
│   │   ├── FlowManagement.jsx       # Money flow definitions
│   │   ├── GoalsManager.jsx         # Financial goals
│   │   ├── NodeManagement.jsx       # Items management
│   │   ├── PageHeader.jsx           # Shared page header
│   │   ├── ProfileSwitcher.jsx      # Profile switching
│   │   ├── SankeyDiagram.jsx        # Cashflow visualization
│   │   └── MatrixSankey.jsx         # Alternative Sankey view
│   ├── contexts/            # React contexts
│   │   └── AuthContext.jsx          # Authentication state
│   ├── lib/                 # Utilities
│   │   └── api.js                   # API client
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Project dependencies
```

## API Configuration

The application connects to a backend API via the Vite proxy configuration in `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

To change the API endpoint, modify the `target` URL in `vite.config.js`.

## Key Components

### Dashboard
Main overview showing key metrics and Sankey cashflow visualization.

### Manage Items
Create and manage:
- Income sources (salary, freelance, etc.)
- Fixed expenses (rent, utilities, etc.)
- Subscriptions (Netflix, Spotify, etc.)
- Budgeted expenses (groceries, entertainment, etc.)
- Accounts (checking, savings, investments)

### Budgets
Set monthly spending limits and track actual vs budgeted amounts.

### Financials
Detailed financial statements:
- Income Statement
- Balance Sheet
- Cash Flow Statement
- Financial Ratios
- Alerts Panel

## Styling

The application uses a Matrix/cyberpunk aesthetic with:
- Dark zinc color scheme
- Green accent colors (#10b981, #22c55e)
- CRT scanline effects
- Monospace fonts
- Glowing text effects

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license here]

## Version

Current version: 2.0.26
