
# Heritage Monuments Monitoring System

The **Heritage Monuments Monitoring System** is an advanced IoT-enabled dashboard designed to monitor, analyze, and visualize critical data related to the preservation and maintenance of heritage monuments. By integrating IoT devices and advanced web technologies, this platform provides real-time insights into environmental and structural conditions, enabling proactive decision-making for conservation efforts.

## Key Features

- **IoT Data Integration**: Seamless integration with IoT devices to collect real-time data from heritage sites.
- **Dynamic Data Visualization**: Interactive charts and graphs powered by `Chart.js` for comprehensive trend analysis.
- **Responsive User Interface**: Fully responsive design built with **Material-UI**, ensuring accessibility across devices.
- **Real-Time Alerts**: Instant notifications for threshold breaches, such as environmental anomalies or structural changes.
- **Scalable Architecture**: Built with Next.js for efficient server-side rendering and scalable deployments.
- **Customizable Dashboards**: Modular components allow users to configure dashboards tailored to specific monitoring needs.

## Project Overview

The system is designed to address the critical need for real-time monitoring of heritage monuments. IoT sensors deployed on-site capture environmental data (e.g., temperature, humidity, vibrations), structural integrity metrics, and other relevant parameters. The data is transmitted to this platform for visualization and analysis, empowering stakeholders to take timely actions.

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) - A powerful React framework for SSR and SSG.
- **UI Library**: [Material-UI](https://mui.com/) - Modern and customizable components for professional-grade interfaces.
- **Data Visualization**: [Chart.js](https://www.chartjs.org/) - Interactive and customizable data visualization tools.
- **Backend**: Node.js for API integration and real-time data processing.
- **IoT Protocols**: Compatibility with common IoT communication protocols like MQTT and REST APIs.

## Project Structure

- **`pages/`**: Application routes, including:
  - `index.js`: A comprehensive dashboard overview.
  - `[monumentId].js`: Dynamic pages for detailed monitoring of individual monuments.
- **`components/`**: Reusable UI components like charts, headers, sidebars, and notification systems.
- **`styles/`**: CSS modules and global styles for a consistent look and feel.
- **`public/`**: Static assets, including images and icons.
- **`node_modules/`**: Managed project dependencies.

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (or yarn)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Mithran-MV/Heritage-Monitoring.git
   ```
2. Navigate to the project directory:
   ```bash
   cd heritage-monuments-monitoring-system
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```
The application will be accessible at [https://heritagedash.deployforge.com/](https://heritagedash.deployforge.com/).

### Production

1. Build the application for production:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

### IoT Integration

- **Connecting Devices**: Configure IoT sensors to send data via MQTT or REST API to the server endpoint.
- **Real-Time Data**: Data is visualized dynamically as it is received from connected devices.

## Usage

### Monitoring Heritage Sites
- View real-time data trends such as environmental conditions, structural integrity, and historical metrics.
- Receive alerts and notifications for predefined conditions (e.g., high humidity or abnormal vibrations).

### Customizing Dashboards
- Use modular components to create tailored dashboards for specific monument monitoring needs.

### Data Analysis
- Leverage interactive charts to identify trends and correlations over time.


## Acknowledgements

This project uses the following technologies:
- [Next.js](https://nextjs.org/)
- [Material-UI](https://mui.com/)
- [Chart.js](https://www.chartjs.org/)
- [React](https://reactjs.org/)

