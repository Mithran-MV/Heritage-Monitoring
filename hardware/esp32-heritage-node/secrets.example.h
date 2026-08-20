#pragma once

// Copy to secrets.h and fill in. secrets.h is gitignored — never commit real
// credentials, and rotate DEVICE_API_KEY if a board leaves your custody.

#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"

// Must match DEVICE_API_KEY on the server.
#define DEVICE_API_KEY "paste_the_same_32_byte_hex_secret_here"

// Use https:// in the field. Plain HTTP is for a trusted LAN bench only.
#define INGEST_URL "http://192.168.1.50:3000/api/readings"
