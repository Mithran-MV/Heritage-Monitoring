/*
 * Heritage Monitoring — ESP32 sensor node
 * ---------------------------------------------------------------------------
 * Reads the on-site sensor array and POSTs one JSON reading to the dashboard.
 *
 * Wiring (any ESP32 dev board):
 *   DHT22 data ........ GPIO 4    temperature + humidity
 *   Capacitive soil ... GPIO 34   analog, ADC1
 *   Sound module ...... GPIO 35   analog, ADC1
 *   Rain module ....... GPIO 27   digital, LOW when wet
 *   PIR motion ........ GPIO 26   digital, HIGH on movement
 *   GP2Y1010 dust ..... GPIO 33   analog, plus GPIO 25 for the LED pulse
 *   SW-420 vibration .. GPIO 32   analog
 *
 * Libraries: WiFi, HTTPClient, ArduinoJson (v7), DHT sensor library.
 *
 * SECURITY: DEVICE_API_KEY authenticates this node to the ingest endpoint.
 * Keep it out of version control — put it in `secrets.h` (gitignored) and
 * rotate it if a board is lost. Use https:// in the field; the plain-HTTP
 * example is for a lab bench on a trusted LAN only.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#include "secrets.h"  // WIFI_SSID, WIFI_PASSWORD, DEVICE_API_KEY, INGEST_URL

#define SITE_SLUG "red-fort"

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_PIN 34
#define SOUND_PIN 35
#define RAIN_PIN 27
#define MOTION_PIN 26
#define DUST_ANALOG_PIN 33
#define DUST_LED_PIN 25
#define VIBRATION_PIN 32

// One sample per minute balances trend resolution against battery life.
const unsigned long SAMPLE_INTERVAL_MS = 60UL * 1000UL;

DHT dht(DHT_PIN, DHT_TYPE);

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 30000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected." : " failed.");
}

/* Capacitive probes read HIGH when dry, so the ADC range is inverted. */
float readSoilMoisturePercent() {
  const int raw = analogRead(SOIL_PIN);  // 0..4095
  const float percent = 100.0f - (raw / 4095.0f) * 100.0f;
  return constrain(percent, 0.0f, 100.0f);
}

/* Peak-to-peak over a 50 ms window, mapped to an approximate dB scale. */
float readSoundLevelDb() {
  int minimum = 4095;
  int maximum = 0;
  const unsigned long window = millis();
  while (millis() - window < 50) {
    const int sample = analogRead(SOUND_PIN);
    minimum = min(minimum, sample);
    maximum = max(maximum, sample);
  }
  const float amplitude = maximum - minimum;
  return constrain(20.0f * log10f(amplitude + 1.0f) * 1.8f, 0.0f, 130.0f);
}

/* Sharp GP2Y1010: pulse the IR LED, sample during the pulse, then settle. */
float readDustDensity() {
  digitalWrite(DUST_LED_PIN, LOW);
  delayMicroseconds(280);
  const int raw = analogRead(DUST_ANALOG_PIN);
  delayMicroseconds(40);
  digitalWrite(DUST_LED_PIN, HIGH);

  const float voltage = raw * (3.3f / 4095.0f);
  // Datasheet transfer function: 0.17 V per 100 ug/m3 above a 0.1 V floor.
  const float density = (voltage - 0.1f) / 0.0017f;
  return constrain(density, 0.0f, 1000.0f);
}

/* SW-420 output amplitude, scaled to an indicative mm/s figure. */
float readVibration() {
  int peak = 0;
  for (int i = 0; i < 40; i++) {
    peak = max(peak, analogRead(VIBRATION_PIN));
    delay(1);
  }
  return constrain((peak / 4095.0f) * 10.0f, 0.0f, 100.0f);
}

bool postReading() {
  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();

  // A failed DHT read returns NaN. Sending it would store a null island in the
  // archive, so skip this cycle instead.
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT read failed; skipping this sample.");
    return false;
  }

  JsonDocument doc;
  doc["site"] = SITE_SLUG;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soil_moisture"] = readSoilMoisturePercent();
  doc["sound_level"] = readSoundLevelDb();
  doc["dust_density"] = readDustDensity();
  doc["vibration"] = readVibration();
  doc["rain_detected"] = digitalRead(RAIN_PIN) == LOW;
  doc["motion_detected"] = digitalRead(MOTION_PIN) == HIGH;

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);
  http.setTimeout(10000);

  const int status = http.POST(body);
  Serial.printf("POST %s -> %d\n", INGEST_URL, status);
  if (status != 201) {
    Serial.println(http.getString());
  }
  http.end();

  return status == 201;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(RAIN_PIN, INPUT_PULLUP);
  pinMode(MOTION_PIN, INPUT);
  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);

  analogReadResolution(12);
  dht.begin();
  connectWiFi();
}

void loop() {
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    postReading();
  }
  delay(SAMPLE_INTERVAL_MS);
}
