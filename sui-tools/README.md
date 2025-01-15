# SuiSage - Sui Blockchain Analytics Assistant

SuiSage is an AI-powered assistant that helps users analyze and understand Sui blockchain data through natural language queries. It provides insights about pools, tokens, and market metrics in a user-friendly way.

## Features

### Pool Analytics

- Total Value Locked (TVL)
- Annual Percentage Rate (APR)
- Daily Trading Fees
- Token Reserves
- Pool Rankings

### Token Information

- Real-time Token Prices
- 24h Price Changes
- Spot Price Between Tokens
- Multi-token Price Comparisons

### Market Analysis

- Top Pools by Different Metrics
- Trading Routes
- Price Impact Analysis

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Atoma SDK Bearer Token

### Installation

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd sui-tools
npm install

# Install frontend dependencies
cd frontend
npm install
```

2. Configure environment variables:

Create `.env` in root directory:

```
ATOMASDK_BEARER_AUTH=your_atoma_sdk_token
```

Create `.env` in frontend directory:

```
SKIP_PREFLIGHT_CHECK=true
```

## Running the Application

1. Start the backend server:

```bash
# From frontend directory
npm run server
```

This starts the Express server on port 3001

2. Start the frontend application:

```bash
# From frontend directory
npm start
```

This launches the React application on port 3000

The application will be available at:

- Frontend UI: http://localhost:3000
- Backend API: http://localhost:3001

## Usage Examples

You can ask SuiSage questions like:

- "What's the TVL of pool 0x123...?"
- "Show me the current price of SUI"
- "What are the top 10 pools by TVL?"
- "What's the spot price between SUI and USDC?"

## Project Structure

```
sui-tools/
├── src/               # Backend source code
│   ├── agent/        # AI agent and tools
│   ├── markets/      # Market data analysis
│   ├── common/       # Shared types and config
│   └── yields/       # Yield calculations
└── frontend/         # Frontend application
    ├── src/          # React components
    └── server.ts     # Express server
```

## Error Handling

The application includes:

- Input validation
- Network timeout handling
- User-friendly error messages
- Detailed error logging

## Support

For issues or questions:

1. Check existing GitHub issues
2. Create a new issue with:
   - Query used
   - Expected vs actual result
   - Error messages (if any)

## License

This project is licensed under the MIT License - see the LICENSE file for details
