/*
 ============================================================================
  Dr. Sum Parking Analytics System - Camera 1 (Front Department: Cars)
  Target   : Cars (10 slots) | Hardware: AI-Thinker ESP32-CAM (OV2640)
  Network  : PSU WiFi (802.1x EAP-PEAP) | Rate: 1 frame every 5s
 ============================================================================
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

#define USE_PSU_WIFI
#ifdef USE_PSU_WIFI
  #include "esp_eap_client.h"
  const char* ssid         = "PSU WiFi (802.1x)";
  const char* eap_identity = "6710110589";
  const char* eap_username = "6710110589";
  const char* eap_password = "Chokun02..";
#else
  const char* ssid     = "YOUR_HOTSPOT_NAME";
  const char* password = "YOUR_HOTSPOT_PASSWORD";
#endif

// ============================================================================
// Server Configuration (Auto-configured with detected host IP)
// ============================================================================
const char* serverIp   = "172.30.228.51"; 
const int   serverPort = 5005;
const char* locationId = "front_dept";
const unsigned long uploadIntervalMs = 2000;
unsigned long lastUploadTime = 0;

// AI-Thinker Pin Definitions
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define LED_STATUS_PIN 33
#define FLASH_LED_PIN 4

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
  }
  return (esp_camera_init(&config) == ESP_OK);
}

void connectWiFi() {
  WiFi.disconnect(true);
  delay(500);
  WiFi.mode(WIFI_STA);
#ifdef USE_PSU_WIFI
  esp_eap_client_set_identity((const unsigned char *)eap_identity, strlen(eap_identity));
  esp_eap_client_set_username((const unsigned char *)eap_username, strlen(eap_username));
  esp_eap_client_set_password((const unsigned char *)eap_password, strlen(eap_password));
  esp_wifi_sta_enterprise_enable();
  WiFi.begin(ssid);
#else
  WiFi.begin(ssid, password);
#endif
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI_OK] IP: " + WiFi.localIP().toString());
  }
}

void captureAndUpload() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }
  digitalWrite(LED_STATUS_PIN, LOW); // LED indicator ON
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    digitalWrite(LED_STATUS_PIN, HIGH);
    return;
  }

  String url = String("http://") + serverIp + ":" + String(serverPort) + "/api/upload?location=" + locationId;
  HTTPClient http;
  http.begin(url);
  http.setTimeout(7000);
  http.addHeader("Content-Type", "image/jpeg");

  int httpCode = http.POST(fb->buf, fb->len);
  if (httpCode > 0) {
    Serial.printf("[HTTP_OK] %s uploaded %u bytes (Code: %d)\n", locationId, fb->len, httpCode);
  } else {
    Serial.printf("[HTTP_ERR] %s failed (Code: %d)\n", locationId, httpCode);
  }
  http.end();
  esp_camera_fb_return(fb);
  digitalWrite(LED_STATUS_PIN, HIGH); // LED indicator OFF
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_STATUS_PIN, OUTPUT);
  digitalWrite(LED_STATUS_PIN, HIGH);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);
  if (!initCamera()) {
    Serial.println("[ERROR] Camera init failed. Restarting...");
    delay(5000);
    ESP.restart();
  }
  connectWiFi();
}

void loop() {
  unsigned long now = millis();
  if (now - lastUploadTime >= uploadIntervalMs) {
    lastUploadTime = now;
    captureAndUpload();
  }
  delay(50);
}
