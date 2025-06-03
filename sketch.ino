#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <WiFi.h>
#include <FirebaseESP32.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// === Firebase Config ===
#define WIFI_SSID "Zhanny"
#define WIFI_PASSWORD "123456"
#define API_KEY "AIzaSyABUhatkqnVKHNHgUGLjHlgdjVqrC5oU_M"
#define DATABASE_URL "https://smart-office-room-default-rtdb.asia-southeast1.firebasedatabase.app/"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// === LCD Setup ===
LiquidCrystal_I2C lcd(0x27, 16, 2);

// === Pin Setup ===
#define TRIG_PIN     5
#define ECHO_PIN     18
#define DHT_PIN      15
#define LDR_PIN      34
#define LED_KUNING   2
#define LED_MERAH    4
#define BUTTON_PIN   13

// === DHT Sensor ===
#define DHTTYPE DHT22
DHT dht(DHT_PIN, DHTTYPE);

// === Threshold Cahaya ===
int ldrThreshold = 500;

void setup() {
  Serial.begin(115200);

  // LCD
  lcd.init();
  lcd.backlight();

  // DHT
  dht.begin();

  // Pin Mode
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_KUNING, OUTPUT);
  pinMode(LED_MERAH, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  lcd.setCursor(0, 0);
  lcd.print("Initializing...");

  // WiFi Connection
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi Connected");

  // Firebase Config
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  lcd.clear();
  lcd.print("Ready...");
  delay(1000);
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Ultrasonik
  long duration;
  float distance;
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  duration = pulseIn(ECHO_PIN, HIGH);
  distance = duration * 0.034 / 2;

  // LDR
  int ldrValue = analogRead(LDR_PIN);

  // Tombol
  bool buttonPressed = digitalRead(BUTTON_PIN) == LOW;

  // LED Control
  digitalWrite(LED_KUNING, ldrValue < ldrThreshold ? HIGH : LOW);
  digitalWrite(LED_MERAH, buttonPressed ? HIGH : LOW);

  // LCD Output
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(temperature, 1);
  lcd.print((char)223);
  lcd.print("C H:");
  lcd.print(humidity, 0);
  lcd.print("%");

  lcd.setCursor(0, 1);
  lcd.print("Jarak:");
  lcd.print(distance, 0);
  lcd.print("cm");

  // Serial Output
  Serial.print("Temp: "); Serial.print(temperature);
  Serial.print(" C, Hum: "); Serial.print(humidity);
  Serial.print(" %, Dist: "); Serial.print(distance);
  Serial.print(" cm, LDR: "); Serial.print(ldrValue);
  Serial.print(", Button: "); Serial.println(buttonPressed ? "ON" : "OFF");

  // Kirim ke Firebase
  if (Firebase.ready()) {
    Firebase.setFloat(fbdo, "/sensor/temperature", temperature);
    Firebase.setFloat(fbdo, "/sensor/humidity", humidity);
    Firebase.setFloat(fbdo, "/sensor/distance", distance);
    Firebase.setInt(fbdo, "/sensor/ldr", ldrValue);
    Firebase.setBool(fbdo, "/sensor/button", buttonPressed);
  }

  delay(1000);
}