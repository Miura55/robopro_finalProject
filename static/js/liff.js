// User service UUID: Change this to your generated service UUID
const USER_SERVICE_UUID   = '6ee6a04f-2c65-46aa-afcc-9dab3e095190';
// User service characteristics
const NOTIFY_CHARACTERISTIC_UUID   = '62FBD229-6EDD-4D1A-B554-5C4E1BB29169';


// PSDI Service UUID: Fixed value for Developer Trial
const PSDI_SERVICE_UUID         = 'E625601E-9E55-4597-A598-76018A0D293D'; // Device ID
const PSDI_CHARACTERISTIC_UUID  = '26E2B12B-85F0-4F3F-9FDD-91D114270E6E';

// -------------- //
// On window load //
// -------------- //

window.onload = () => {
    initializeApp();
};


// ------------ //
// UI functions //
// ------------ //

function uiToggleLedButton(state) {
  const elStatus = document.getElementById("status");
  const elControls = document.getElementById("controls");

    if (state) {
      el.classList.add("led-on");
    } else {
      el.classList.remove("led-on");
    }
}



function uiToggleDeviceConnected(connected) {
    const elStatus = document.getElementById("status");
    const elControls = document.getElementById("controls");

    elStatus.classList.remove("error");

    if (connected) {
        // Hide loading animation
        uiToggleLoadingAnimation(false);
        // Show status connected
        elStatus.classList.remove("inactive");
        elStatus.classList.add("success");
        elStatus.innerText = "Device connected";
        // Show controls
        elControls.classList.remove("hidden");
    } else {
        // Show loading animation
        uiToggleLoadingAnimation(true);
        // Show status disconnected
        elStatus.classList.remove("success");
        elStatus.classList.add("inactive");
        elStatus.innerText = "Device disconnected";
        // Hide controls
        elControls.classList.add("hidden");
    }
}

function uiToggleLoadingAnimation(isLoading) {
    const elLoading = document.getElementById("loading-animation");

    if (isLoading) {
        // Show loading animation
        elLoading.classList.remove("hidden");
    } else {
        // Hide loading animation
        elLoading.classList.add("hidden");
    }
}

function uiStatusError(message, showLoadingAnimation) {
    uiToggleLoadingAnimation(showLoadingAnimation);

    const elStatus = document.getElementById("status");
    const elControls = document.getElementById("controls");

    // Show status error
    elStatus.classList.remove("success");
    elStatus.classList.remove("inactive");
    elStatus.classList.add("error");
    elStatus.innerText = message;

    // Hide controls
    elControls.classList.add("hidden");
}

function makeErrorMsg(errorObj) {
    return "Error\n" + errorObj.code + "\n" + errorObj.message;
}

// -------------- //
// LIFF functions //
// -------------- //

function initializeApp() {
    liff.init(() => initializeLiff(), error => uiStatusError(makeErrorMsg(error), false));
}

function initializeLiff() {
    liff.initPlugins(['bluetooth']).then(() => {
        liffCheckAvailablityAndDo(() => liffRequestDevice());
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffCheckAvailablityAndDo(callbackIfAvailable) {
    // Check Bluetooth availability
    liff.bluetooth.getAvailability().then(isAvailable => {
        if (isAvailable) {
            uiToggleDeviceConnected(false);
            callbackIfAvailable();
        } else {
            uiStatusError("Bluetooth not available", true);
            setTimeout(() => liffCheckAvailablityAndDo(callbackIfAvailable), 10000);
        }
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });;
}

function liffRequestDevice() {
    liff.bluetooth.requestDevice().then(device => {
        liffConnectToDevice(device);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffConnectToDevice(device) {
    device.gatt.connect().then(() => {
        document.getElementById("device-name").innerText = device.name;

        // Show status connected
        uiToggleDeviceConnected(true);

        // Get service
        device.gatt.getPrimaryService(USER_SERVICE_UUID).then(service => {
            liffGetUserService(service);
        }).catch(error => {
            uiStatusError(makeErrorMsg(error), false);
        });
        device.gatt.getPrimaryService(PSDI_SERVICE_UUID).then(service => {
            liffGetPSDIService(service);
        }).catch(error => {
            uiStatusError(makeErrorMsg(error), false);
        });

        // Device disconnect callback
        const disconnectCallback = () => {
            // Show status disconnected
            uiToggleDeviceConnected(false);

            // Remove disconnect callback
            device.removeEventListener('gattserverdisconnected', disconnectCallback);

            // Try to reconnect
            initializeLiff();
        };

        device.addEventListener('gattserverdisconnected', disconnectCallback);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetUserService(service) {
    // Button pressed state
    service.getCharacteristic(NOTIFY_CHARACTERISTIC_UUID).then(characteristic => {
        liffGetButtonStateCharacteristic(characteristic);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetPSDIService(service) {
    // Get PSDI value
    service.getCharacteristic(PSDI_CHARACTERISTIC_UUID).then(characteristic => {
        return characteristic.readValue();
    }).then(value => {
        // Byte array to hex string
        const psdi = new Uint8Array(value.buffer)
            .reduce((output, byte) => output + ("0" + byte.toString(16)).slice(-2), "");
        // document.getElementById("device-psdi").innerText = psdi;
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetButtonStateCharacteristic(characteristic) {
    // Add notification hook for button state
    // (Get notified when button state changes)
    characteristic.startNotifications().then(() => {
        characteristic.addEventListener('characteristicvaluechanged', e => {
            const val = (new Uint8Array(e.target.value.buffer))[0];
            const el = document.getElementById("temp");
            el.innerText = val;
            plot_graph();
        });
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function plot_graph(){
  // データ範囲 左右別
   var leftRange = [-20, 40];
   var rightRange = [-5, 105];
   // 初期データ
   var data = [
           {
               label: "layer1",
               range: leftRange,
               values: [],
           },
           {
               label: "layer2",
               range: rightRange,
               values: [],
           }
       ]
   ;
   // 初期化
   let chart = $('#myChart').epoch({
       type: 'time.line',                         //グラフの種類
       data: data,                                  //初期値
       axes: ['bottom', 'left', 'right'],       //利用軸の選択
       fps: 24,                                     //フレームレート
       range: {                                     //軸の範囲
           left: leftRange,
           right: rightRange
       },
       queueSize: 1,   // キューサイズ ※push時、キューからあふれたデータは破棄される
       windowSize: 20, // 表示から見切れるまでいくつデータを表示させるか

       // 目盛りの設定。 timeは間隔秒数、他は目盛りの数
       ticks: {time: 5, right: 5, left: 5},
       // 目盛りの書式
       tickFormats: {
           bottom: function (d) {
               return moment(d * 1000).format('HH:mm:ss');
           },
           left: function (d) {
               return (d).toFixed(1) + " ℃";
           },
           right: function (d) {
               return (d).toFixed(0) + " %";
           }

       }
   });

   // リアルタイム表示処理
   setInterval(function () {
       chart.push(
           [
               {time: Date.now() / 1000, y: $("#temperature")[0].value,},
               {time: Date.now() / 1000, y: $("#humidity")[0].value,},
           ],
       );
   }, 1000);
}
