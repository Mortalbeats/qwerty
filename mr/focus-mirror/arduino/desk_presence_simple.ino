/*
  Desk Presence Detector — standalone Arduino sketch (NO breadboard needed)
  Hardware: Arduino Uno / Nano / Mega + HC-SR04 ultrasonic sensor

  Direct wiring — the HC-SR04's 4 pins connect straight to the Arduino
  with female-to-female jumper wires:

    HC-SR04 VCC  -> Arduino 5V
    HC-SR04 GND  -> Arduino GND
    HC-SR04 Trig -> D9
    HC-SR04 Echo -> D10   (5V output — fine on 5V boards; on 3.3V boards
                           like ESP32, add a 1k/2k voltage divider)

  LED: use the Arduino's BUILT-IN LED on pin 13 — nothing extra to wire.
  (For an external LED: D13 -> 220 ohm resistor -> LED -> GND, still no breadboard.)

  Mount the sensor pointing at the chair / person's torso.
  The built-in LED lights up when someone is detected at the desk.
  Open Serial Monitor at 115200 baud to see the readings.
*/

const int TRIG_PIN = 9;
const int ECHO_PIN = 10;
const int LED_PIN  = 13;

const int PRESENCE_THRESHOLD_CM = 70;  // <-- TUNE THIS: max distance that means "person at desk"
const int NUM_SAMPLES = 5;             // median of 5 readings = no flicker from random spikes

long readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL); // 30 ms timeout
  if (duration == 0) return -1; // no echo = nothing in range
  return duration * 0.0343 / 2;
}

long medianDistanceCm() {
  long s[NUM_SAMPLES];
  for (int i = 0; i < NUM_SAMPLES; i++) {
    s[i] = readDistanceCm();
    delay(30); // HC-SR04 needs ~60 ms between pings
  }
  for (int i = 1; i < NUM_SAMPLES; i++) { // insertion sort
    long key = s[i];
    int j = i - 1;
    while (j >= 0 && s[j] > key) { s[j + 1] = s[j]; j--; }
    s[j + 1] = key;
  }
  return s[NUM_SAMPLES / 2];
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("Desk presence detector ready");
}

void loop() {
  long cm = medianDistanceCm();
  bool personAtDesk = (cm > 0 && cm <= PRESENCE_THRESHOLD_CM);

  digitalWrite(LED_PIN, personAtDesk ? HIGH : LOW);

  Serial.print("Distance: ");
  if (cm < 0) Serial.print("out of range");
  else { Serial.print(cm); Serial.print(" cm"); }
  Serial.print("  ->  ");
  Serial.println(personAtDesk ? "PERSON AT DESK" : "desk empty");

  delay(500); // update twice per second
}
