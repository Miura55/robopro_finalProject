#include <BLEPeripheral.h>
#include <Adafruit_Microbit.h>

// Device Name: Maximum 20 bytes
#define DEVICE_NAME "micro:bit"
// Local Name in advertising packet: Maximum 29 bytes
#define LOCAL_NAME "BBC micro:bit"

// User Service UUID: Change this to your generated service UUID
#define USER_SERVICE_UUID "6ee6a04f-2c65-46aa-afcc-9dab3e095190"
// User service characteristics
#define WRITE_CHARACTERISTIC_UUID "E9062E71-9E62-4BC6-B0D3-35CDCD9B027B"
#define NOTIFY_CHARACTERISTIC_UUID "62FBD229-6EDD-4D1A-B554-5C4E1BB29169"

// PSDI Service UUID: Fixed value for Developer Trial
#define PSDI_SERVICE_UUID "E625601E-9E55-4597-A598-76018A0D293D"
#define PSDI_CHARACTERISTIC_UUID "26E2B12B-85F0-4F3F-9FDD-91D114270E6E"

BLEPeripheral blePeripheral;
BLEBondStore bleBondStore;

// Setup User Service
BLEService userService(USER_SERVICE_UUID);
BLEUnsignedCharCharacteristic writeCharacteristic(WRITE_CHARACTERISTIC_UUID, BLEWrite);
BLEUnsignedCharCharacteristic notifyCharacteristic(NOTIFY_CHARACTERISTIC_UUID, BLENotify);
// Setup PSDI Service
BLEService psdiService(PSDI_SERVICE_UUID);
BLECharacteristic psdiCharacteristic(PSDI_CHARACTERISTIC_UUID, BLERead, sizeof(uint32_t) * 2);

Adafruit_Microbit_Matrix microbit;
Adafruit_Microbit microbit_t;

volatile int btnAction = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("Initializing...");

  Serial.println("heart rate sensor:");

  pinMode(PIN_BUTTON_A, INPUT_PULLUP);
  pinMode(PIN_BUTTON_B, INPUT_PULLUP);

  // Clear bond store if push button A+B for 3 secs on start up
  // You can bond only one central device on each peripheral device by library restriction
  if (!digitalRead(PIN_BUTTON_A) && !digitalRead(PIN_BUTTON_B)) {
    delay(3000);
    if (!digitalRead(PIN_BUTTON_A) && !digitalRead(PIN_BUTTON_B)) {
      bleBondStore.clearData();
      Serial.println("Cleared bond store");
    }
  }

  attachInterrupt(PIN_BUTTON_A, buttonAction, CHANGE);

  blePeripheral.setDeviceName(DEVICE_NAME);
  blePeripheral.setLocalName(LOCAL_NAME);
  blePeripheral.setBondStore(bleBondStore);
  blePeripheral.setAdvertisedServiceUuid(userService.uuid());

  blePeripheral.addAttribute(userService);
  blePeripheral.addAttribute(writeCharacteristic);
  blePeripheral.addAttribute(notifyCharacteristic);
  blePeripheral.addAttribute(psdiService);
  blePeripheral.addAttribute(psdiCharacteristic);

//  Temp plot
  microbit_t.BTLESerial.begin();
  microbit_t.BTLESerial.setLocalName("microbit");

  // Start LED matrix driver after radio (required)
  microbit_t.begin();

  // Set callback
  blePeripheral.setEventHandler(BLEConnected, blePeripheralConnectHandler);
  blePeripheral.setEventHandler(BLEDisconnected, blePeripheralDisconnectHandler);
  writeCharacteristic.setEventHandler(BLEWritten, writeLEDCallback);

  // Set PSDI (Product Specific Device ID) value
  uint32_t deviceAddr[] = { NRF_FICR->DEVICEADDR[0], NRF_FICR->DEVICEADDR[1] };
  psdiCharacteristic.setValue((unsigned char *)deviceAddr, sizeof(deviceAddr));

  blePeripheral.begin();
  Serial.println("Ready to Connect");

  microbit.begin();
}

void loop() {
  BLECentral central = blePeripheral.central();
  microbit_t.BTLESerial.poll();

  if (central && central.connected()) {
    uint8_t temp;
    temp = microbit_t.getDieTemp();
    notifyCharacteristic.setValue(temp);
    Serial.print("Temperature (C): ");
    Serial.println(temp);  // Float value since temp is in 0.25°C steps
    delay(2000);
  }

  blePeripheral.poll();
}

void buttonAction() {
  btnAction++;
}

void writeLEDCallback(BLECentral& central, BLECharacteristic& characteristic) {
  if (writeCharacteristic.value()) {
    Serial.println("ON");
    microbit.show(microbit.HEART);
  } else {
    Serial.println("OFF");
    microbit.clear();
  }
}

void blePeripheralConnectHandler(BLECentral& central) {
  // central connected event handler
  Serial.print("Connected event, central: ");
  Serial.println(central.address());

  microbit.show(microbit.YES);
}

void blePeripheralDisconnectHandler(BLECentral& central) {
  // central disconnected event handler
  Serial.print("Disconnected event, central: ");
  Serial.println(central.address());

  microbit.show(microbit.NO);
}
