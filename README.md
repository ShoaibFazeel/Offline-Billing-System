# Offline Billing and Inventory Management Application

A desktop application for managing inventory, clients, and generating bills with PDF export capabilities.

## Description

This application allows users to manage products, enroll clients, generate bills, and export them as PDF documents. It's designed for offline use with an in-memory database, making it simple to set up and use without requiring external database servers.

## Features

- **Inventory Management**: Add and manage products with names and prices
- **Client Management**: Enroll clients with contact details and tax filer status
- **Bill Generation**: Create bills with multiple products, quantities, and discounts
- **Bonus Items**: Add free/bonus items to bills that don't affect the total
- **Client-Specific Pricing**: Remembers the last used rate and discount for each client-product combination
- **Bill History**: View and edit previously generated bills
- **PDF Export**: Generate professional PDF invoices

## Prerequisites

- Node.js (v14 or later)
- npm or yarn

## Installation

1. Clone the repository:
   \`\`\`
   git clone https://github.com/yourusername/billing-system.git
   cd billing-system
   \`\`\`

2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
   or
   \`\`\`
   yarn install
   \`\`\`

## Running the Application

To start the application in development mode:

\`\`\`
npm run dev
\`\`\`
or
\`\`\`
yarn dev
\`\`\`

## Building for Distribution

To create an executable file for distribution:

1. Run the build command:
   \`\`\`
   npm run build
   \`\`\`
   or
   \`\`\`
   yarn build
   \`\`\`

2. The executable file will be created in the `dist` folder.

## Important Note

The application uses an in-memory database that persists data between sessions. However, unexpected shutdowns might lead to data loss for the current session. It's recommended to save your work frequently.

## License

This project is licensed under the ISC License.
