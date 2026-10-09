/*
  Desk Presence Detector — USB Serial version
  Hardware: Arduino Uno / Nano / Mega + HC-SR04 ultrasonic sensor

  Wiring (HC-SR04 -> Arduino):
    VCC  -> 5V
    GND  -> GND
    Trig -> D9
    Echo -> D10
    NOTE: Echo outputs 5V. Fine for 5V boards (Uno/Nano/Mega).
          For 3.3V boards use a voltage divider:
          Echo -> 1k resistor -> pin, and 2k resistor from pin -> GND.

  Mount the sensor so it points at the chair / person's torso,
  e.g. under the front edge of the desk or on a shelf above the desk.

  The website talks to this sketch over USB using the browser's
  Web Serial API (Chrome/Edge). Open Serial Monitor at 115200 baud
  to test: you should see lines like
    DISTANCE:38
    STATUS:1
*/

const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

const unsigned long SAMPLE_INTERVAL_MS = 500; // send an update twice per second
const int NUM_SAMPLES = 5;                    // median filter ignores random spikes
const int PRESENCE_THRESHOLD_CM = 70;         // <-- TUNE THIS: max distance that counts as "person at desk"
const long MAX_RANGE_CM = 400;                // HC-SR04 practical maximum range

long readPulseCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL); // 30 ms timeout
  if (duration == 0) return -1; // no echo = nothing in range
  return (long)(duration * 0.0343 / 2.0);
}

long medianDistanceCm() {
  long samples[NUM_SAMPLES];
  for (int i = 0; i < NUM_SAMPLES; i++) {
    samples[i] = readPulseCm();
    delay(30); // HC-SR04 needs ~60 ms per cycle
  }
  // insertion sort (5 elements, trivial)
  for (int i = 1; i < NUM_SAMPLES; i++) {
    long key = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > key) {
      samples[j + 1] = samples[j];
      j--;
    }
    samples[j + 1] = key;
  }
  return samples[NUM_SAMPLES / 2];
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  delay(1000);
  Serial.println(F("READY"));
}

void loop() {
  long cm = medianDistanceCm();
  bool present = (cm > 0 && cm < MAX_RANGE_CM && cm <= PRESENCE_THRESHOLD_CM);

  Serial.print(F("DISTANCE:"));
  Serial.println(cm);
  Serial.print(F("STATUS:"));
  Serial.println(present ? 1 : 0);

  delay(SAMPLE_INTERVAL_MS);
}
