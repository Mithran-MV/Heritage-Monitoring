import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

// Dynamically import LineChart to avoid SSR issues
const LineChart = dynamic(() => import('../components/LineChart'), { ssr: false });

export default function HeritageDashboard() {
  const [data, setData] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/monitor', { method: 'POST' });
        const result = await response.json();
        setData(result);
        setAlerts(generateAlerts(result[result.length - 1] || {}));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const generateAlerts = (latestData) => ({
    soilMoisture: latestData?.soil_moisture < 20 || latestData?.soil_moisture > 80 ? 'Abnormal' : 'Normal',
    soundLevel: latestData?.sound_level > 85 ? 'High' : 'Normal',
    temperature: latestData?.temperature < 15 || latestData?.temperature > 35 ? 'Out of Range' : 'Normal',
    humidity: latestData?.humidity < 30 || latestData?.humidity > 70 ? 'Out of Range' : 'Normal',
    humanTemperature: latestData?.human_temperature < 36 || latestData?.human_temperature > 38 ? 'Abnormal' : 'Normal',
    rainDetected: latestData?.rain_detected ? 'Rain Detected' : 'No Rain',
    motionDetected: latestData?.motion_detected ? 'Motion Detected' : 'No Motion Detected',
  });

  return (
    <div style={{ backgroundColor: '#1b1f38', color: '#fff', minHeight: '100vh', paddingBottom: '20px' }}>
      {/* Heading Section */}
      <Container sx={{ textAlign: 'center', padding: '20px 0' }}>
  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>
    Heritage Monitoring Dashboard
  </Typography>
  <Typography variant="subtitle1" sx={{ marginTop: '10px', color: '#ccc' }}>
    Real-time monitoring and alerting for heritage site conditions.
  </Typography>
  <Divider sx={{ margin: '20px 0', backgroundColor: '#FFFFFF' }} />

  {/* New Row with Containers */}
  <Grid container spacing={3} sx={{ marginTop: '20px', justifyContent: 'center' }}>
    {/* Red Fort */}
    <Grid item xs={12} sm={4}>
      <Card
        sx={{
          backgroundColor: '#2E3B55',
          borderRadius: '10px',
          textAlign: 'center',
          padding: '10px',
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#FFFFFF', marginBottom: '10px' }}>
            Red Fort
          </Typography>
          <img
            src="https://cdn.britannica.com/20/189820-050-D650A54D/Red-Fort-Old-Delhi-India.jpg"
            alt="Red Fort"
            style={{ width: '100%', borderRadius: '10px' }}
          />
        </CardContent>
      </Card>
    </Grid>

    {/* Ellora Caves */}
    <Grid item xs={12} sm={4}>
      <Card
        sx={{
          backgroundColor: '#2E3B55',
          borderRadius: '10px',
          textAlign: 'center',
          padding: '10px',
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#FFFFFF', marginBottom: '10px' }}>
            Ellora Caves
          </Typography>
          <img
            src="https://t3.gstatic.com/licensed-image?q=tbn:ANd9GcQ-vOwliw2t7qMHxQW7kLnXc1Q40-zEM5Ywrqk3_WPGAv-alz-owOKrGOK9BSs7YooL"
            alt="Ellora Caves"
            style={{ width: '100%', borderRadius: '10px' }}
          />
        </CardContent>
      </Card>
    </Grid>

    {/* Gateway Of India Mumbai */}
    <Grid item xs={12} sm={4}>
      <Card
        sx={{
          backgroundColor: '#2E3B55',
          borderRadius: '10px',
          textAlign: 'center',
          padding: '10px',
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#FFFFFF', marginBottom: '10px' }}>
          Gateway Of India Mumbai
          </Typography>
          <img
            src="https://t1.gstatic.com/licensed-image?q=tbn:ANd9GcR5CYJKRS2NU348ljrA2LBxvHvYPUJS01yUw2xTfs_MCr6wPFeYVM18x611dT0IEQm1"
            alt="Gateway Of India Mumbai"
            style={{ width: '100%', borderRadius: '10px' }}
          />
        </CardContent>
      </Card>
    </Grid>
  </Grid>
</Container>


      <Divider sx={{ margin: '20px 0', backgroundColor: '#FFFFFF' }} />

      {/* Alerts Section */}
      <Container>
        <Box sx={{ marginBottom: '40px' }}>
          <Grid container spacing={2} justifyContent="center">
            {Object.entries(alerts).map(([key, alert]) => (
              <Grid item xs={6} sm={4} md={3} key={key}>
                <Card
                  sx={{
                    backgroundColor: alert === 'Normal' ? '#28a745' : '#dc3545',
                    color: '#1f2937',
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '10px',
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1')}
                    </Typography>
                    <Typography variant="h6">{alert}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      <Divider sx={{ margin: '20px 0', backgroundColor: '#FFFFFF' }} />

      {/* Graphs Section */}
      <Container>
        <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: '20px', color: '#FFFFFF', textAlign: 'center' }}>
          Real-Time Data Graphs
        </Typography>
        <Grid container spacing={3}>
          {[
            { param: 'soil_moisture', label: 'Soil Moisture (%)' },
            { param: 'sound_level', label: 'Sound Level (dB)' },
            { param: 'temperature', label: 'Temperature (°C)' },
            { param: 'humidity', label: 'Humidity (%)' },
            { param: 'human_temperature', label: 'Human Temperature (°C)' },
            { param: 'dust_density', label: 'Dust Density (µg/m³)' },
            { param: 'motion_detected', label: 'Motion Detected' },
          ].map(({ param, label }) => (
            <Grid item xs={12} md={6} key={param}>
              <Card sx={{ backgroundColor: '#2E3B55', borderRadius: '10px' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#FFFFFF', marginBottom: '10px' }}>
                    {label}
                  </Typography>
                  <LineChart data={data} parameter={param} label={label} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Divider sx={{ margin: '40px 0', backgroundColor: '#FFFFFF' }} />

      {/* Data Table Section */}
{/* Data Table Section */}
<Container sx={{ marginTop: '20px' }}>
  <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: '20px', color: '#FFFFFF', textAlign: 'center' }}>
    Historical Data
  </Typography>
  <Paper elevation={3} sx={{ padding: '20px', backgroundColor: '#2E3B55', borderRadius: '10px' }}>
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={data.map((item, index) => ({ id: index, ...item }))}
        columns={[
          { field: 'timestamp', headerName: 'Timestamp', flex: 1 },
          { field: 'soil_moisture', headerName: 'Soil Moisture', flex: 1 },
          { field: 'sound_level', headerName: 'Sound Level', flex: 1 },
          { field: 'temperature', headerName: 'Temperature', flex: 1 },
          { field: 'humidity', headerName: 'Humidity', flex: 1 },
          { field: 'human_temperature', headerName: 'Human Temperature', flex: 1 },
          { field: 'rain_detected', headerName: 'Rain Detected', flex: 1 },
          { field: 'motion_detected', headerName: 'Motion Detected', flex: 1 },
          { field: 'dust_density', headerName: 'Dust Density', flex: 1 },
        ]}
        pageSize={10}
        rowsPerPageOptions={[5, 10, 25]}
        sx={{
          color: '#FFFFFF', // Text color for all table content
          '& .MuiDataGrid-row': {
            backgroundColor: '#374151', // Row background
            '&:hover': {
              backgroundColor: '#374151', // Hover color for rows
            },
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #1f2937', // Border color
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#1f2937', // Column header background
            color: 'black', // Column header text color
            fontWeight: 'bold', // Bold header text
          },
          '& .MuiDataGrid-footerContainer': {
            backgroundColor: '#1f2937', // Footer background color
            color: '#E5E7EB', // Footer text color
          },
        }}
      />
    </div>
  </Paper>
</Container>

    </div>
  );
}
