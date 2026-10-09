/*
  Desk Presence Detector — WiFi version (ESP32 or ESP8266)
  POSTs JSON to your website backend every 2 seconds:

    POST /api/presence
    {"device":"focus-mirror-01","distance":38,"present":true}

  See server.js in this folder for a ready-made backend.
  Requires the ArduinoJson-free approach below (plain strings),
  so no extra libraries are needed beyond the board's WiFi library.
*/

#if defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
#endif

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://YOUR_SERVER_IP_OR_DOMAIN:3000/api/presence";
const char* DEVICE_ID     = "focus-mirror-01";

// Pin choice: avoid strapping/boot pins. GPIO 25/26 are safe on most ESP32 boards.
const int TRIG_PIN = 25;
const int ECHO_PIN = 26;

const unsigned long SEND_INTERVAL_MS = 2000;
const int PRESENCE_THRESHOLD_CM = 70;   // <-- TUNE THIS to your desk
const long MAX_RANGE_CM = 400;

long readPulseCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return -1;
  return (long)(duration * 0.0343 / 2.0);
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  long cm = readPulseCm();
  bool present = (cm > 0 && cm < MAX_RANGE_CM && cm <= PRESENCE_THRESHOLD_CM);

  Serial.print("Distance: ");
  Serial.print(cm);
  Serial.print(" cm, present: ");
  Serial.println(present ? "yes" : "no");

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    String body = String("{\"device\":\"") + DEVICE_ID +
                  "\",\"distance\":" + String(cm) +
                  ",\"present\":" + (present ? "true" : "false") + "}";
    int code = http.POST(body);
    if (code > 0) {
      Serial.print("Server responded: HTTP ");
      Serial.println(code);
    } else {
      Serial.print("POST failed: ");
      Serial.println(http.errorToString(code).c_str());
    }
    http.end();
  } else {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.reconnect();
  }

  delay(SEND_INTERVAL_MS);
}
