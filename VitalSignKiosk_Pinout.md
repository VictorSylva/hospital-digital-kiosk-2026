# Vital-Sign Kiosk System - Pin Connections

This document details all hardware connections for the Vital-Sign Kiosk system using an ESP32 microcontroller.

## 1. Microcontroller: ESP32

All sensors and components connect to the ESP32. Ensure you are using the correct GPIO numbers as labeled on your specific ESP32 development board.

---

## 2. Shared I2C Bus (LCD & Temperature Sensor)

The **16x4 I2C LCD Display** and the **MLX90614 Temperature Sensor** both communicate via the I2C protocol. They share the same two data pins on the ESP32.

| Component Pin | ESP32 Pin | Description |
| :--- | :--- | :--- |
| **SDA** (Data) | **GPIO 21** | Shared I2C Data line for both LCD and MLX90614 |
| **SCL** (Clock) | **GPIO 22** | Shared I2C Clock line for both LCD and MLX90614 |
| **VCC** | **5V** / **3.3V** | LCD typically requires 5V (VIN/VUSB); MLX90614 uses 3.3V |
| **GND** | **GND** | Common Ground |

---

## 3. HX711 Weight Sensor Amplifier

| HX711 Pin | ESP32 Pin | Description |
| :--- | :--- | :--- |
| **DT** (Data) | **GPIO 14** | Serial Data Output |
| **SCK** (Clock) | **GPIO 12** | Serial Clock Input |
| **VCC** | **3.3V** or **5V**| Power supply for HX711 |
| **GND** | **GND** | Common Ground |

### Load Cell Wiring (Wheatstone Bridge)
If using four standard 3-wire bathroom scale load cells, wire them to the HX711 board as follows:

1. **Front-Left WHITE** wire  --> **Front-Right WHITE** wire (Twist together)
2. **Back-Left WHITE** wire   --> **Back-Right WHITE** wire (Twist together)
3. **Front-Left BLACK** wire  --> **Back-Left BLACK** wire (Twist together)
4. **Front-Right BLACK** wire --> **Back-Right BLACK** wire (Twist together)
5. **Front-Left RED** wire    --> **E+** pin on HX711
6. **Back-Right RED** wire    --> **E-** pin on HX711
7. **Front-Right RED** wire   --> **A+** pin on HX711
8. **Back-Left RED** wire     --> **A-** pin on HX711

*(Note: If the scale reads negative weight when pressure is applied, swap the A+ and A- connections)*

---

## 4. Next-Patient Button

A push-button used to cycle to the next patient ID and reset the readings on the screen.

| Button Leg | ESP32 Connection | Description |
| :--- | :--- | :--- |
| **Leg 1** | **GPIO 15** | Configured as `INPUT_PULLUP` in the firmware |
| **Leg 2** | **GND** | Connects to ground when pressed |

---

## Summary Pinout Table

| ESP32 Pin | Connected Component | Function / Role |
| :--- | :--- | :--- |
| **GPIO 12** | HX711 | Serial Clock Input (SCK) |
| **GPIO 14** | HX711 | Serial Data Output (DT) |
| **GPIO 15** | Push Button | Next Patient Reset (Active LOW) |
| **GPIO 21** | LCD / MLX90614 | Shared I2C Data (SDA) |
| **GPIO 22** | LCD / MLX90614 | Shared I2C Clock (SCL) |

---
**Important Note:** Always ensure that your ESP32, all sensors, and the LCD display share a **common Ground (GND)** connection to prevent erratic readings and ensure system stability.
