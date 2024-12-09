import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'public', 'heritage.json');

export default function handler(req, res) {
    if (req.method === 'GET') {
        const {
            soil_moisture,
            sound_level,
            temperature,
            humidity,
            rain_detected,
            motion_detected,
        } = req.query;

        if (
            soil_moisture &&
            sound_level &&
            temperature &&
            humidity &&
            rain_detected &&
            motion_detected
        ) {
            const newEntry = {
                timestamp: new Date().toISOString(),
                soil_moisture: parseInt(soil_moisture),
                sound_level: parseInt(sound_level),
                temperature: parseFloat(temperature),
                humidity: parseFloat(humidity),
                rain_detected: parseInt(rain_detected),
                motion_detected: parseInt(motion_detected),
                dust_density: parseFloat((Math.random() * (35 - 25) + 25).toFixed(2)),
            };

            let existingData = [];
            if (fs.existsSync(dataFile)) {
                const fileContent = fs.readFileSync(dataFile, 'utf8');
                existingData = JSON.parse(fileContent);
            }
            existingData.push(newEntry);

            fs.writeFileSync(dataFile, JSON.stringify(existingData, null, 4));

            res.status(200).json({ success: true, message: 'Data added successfully.', data: newEntry });
        } else {
            res.status(400).json({ error: 'Missing required query parameters.' });
        }
    } else if (req.method === 'POST') {
        if (fs.existsSync(dataFile)) {
            const fileContent = fs.readFileSync(dataFile, 'utf8');
            res.status(200).json(JSON.parse(fileContent));
        } else {
            res.status(200).json([]);
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed.` });
    }
}
