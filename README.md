# 1inch Task API

A high-performance NestJS API providing Ethereum gas price tracking and Uniswap V2 token swap estimations with intelligent caching.

## 🚀 Features

- **Gas Price Tracking**: Real-time Ethereum gas price monitoring with background refresh and caching
- **Uniswap V2 Integration**: Accurate token swap amount estimations using Uniswap V2 pair reserves
- **Smart Caching**: caching layer for optimized performance (<50ms response times)
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Type Safety**: Full TypeScript implementation with strict typing
- **Path Aliases**: Clean import statements using `@` aliases

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Ethereum RPC URL**: Access to an Ethereum node (e.g., Infura, Alchemy)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/belalmoh/1inch-task && cd 1inch-task
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Environment Variables
Rename .env.example

```bash
cp .env.example .env
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The API will be available at `http://localhost:3003`

### Production Build
```bash
npm run build
npm run start:prod
```

### Watch Mode (Auto-reload)
```bash
npm run dev
```

## 📚 API Documentation

Once the application is running, access the interactive Swagger documentation at:

```
http://localhost:3003/api
```

## 🔌 API Endpoints

### Gas Price
**GET** `/gasPrice`

Returns the current Ethereum gas price in wei.

**Response:**
```json
{
  "gasPrice": 47888827
}
```

### Uniswap Swap Estimation
**GET** `/return/:fromTokenAddress/:toTokenAddress/:amountIn`

Estimates the output amount for a Uniswap V2 token swap.

**Parameters:**
- `fromTokenAddress`: Source token contract address
- `toTokenAddress`: Destination token contract address
- `amountIn`: Input amount in wei (as string)

**Example:**
```
GET /return/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/1000000000000000000
```

**Response:**
```json
{
  "estimatedOutputAmount": "0.000011085363711895"
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:cov
```

View the HTML coverage report:
```bash
open coverage/lcov-report/index.html
```

### Run Specific Test File
```bash
npm test -- gas.service.spec.ts
```

## 📁 Project Structure

```
src/
├── app.module.ts              # Main application module
├── main.ts                    # Application entry point
├── common/                    # Shared resources
│   ├── dto/                   # Data Transfer Objects
│   │   ├── gas.dto.ts
│   │   └── uniswap.dto.ts
│   └── interceptors/          # HTTP interceptors
│       └── logging.ts
├── gas/                       # Gas price module
│   ├── gas.controller.ts
│   ├── gas.service.ts
│   ├── gas.module.ts
│   ├── gas.controller.spec.ts
│   └── gas.service.spec.ts
└── uniswap/                   # Uniswap module
    ├── uniswap.controller.ts
    ├── uniswap.service.ts
    ├── uniswap.module.ts
    ├── uniswap.controller.spec.ts
    └── uniswap.service.spec.ts
```

## 🏗️ Architecture

### Gas Price Service
- **Background Refresh**: Automatically fetches gas prices every 30 seconds
- **Cache-First Strategy**: Returns cached values for optimal performance
- **Fallback Mechanism**: Fetches immediately if cache is empty
- **Error Resilience**: Continues operation even if individual fetches fail

### Uniswap Service
- **Pair Discovery**: Automatically finds token pairs from Uniswap V2 Factory
- **Reserve Calculation**: Uses real-time pair reserves for accurate estimations
- **Fee Accounting**: Includes 0.3% Uniswap fee in calculations
- **Smart Caching**: Caches swap estimations by token pair and amount

## 📝 License

UNLICENSED

## 👥 Author

Belal Mohammed
