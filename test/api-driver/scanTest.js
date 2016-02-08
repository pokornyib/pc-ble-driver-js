'use strict';

const assert = require('assert');

const setup = require('./setup');
const adapterFactory = setup.adapterFactory;
const ServiceFactory = setup.ServiceFactory;

const connectionParameters = {
           min_conn_interval: 7.5,
           max_conn_interval: 7.5,
           slave_latency: 0,
           conn_sup_timeout: 4000,
       };

const scanParameters = {
   active: true,
   interval: 100,
   window: 50,
   timeout: 20,
};

const options = {
   scanParams: scanParameters,
   connParams: connectionParameters,
};

const advOptions = {
    interval: 100,
    timeout: 10000,
};

const openOptions = {
            baudRate: 115200,
            parity: 'none',
            flowControl: 'none',
};

function runTests(adapterOne, adapterTwo) {
    let connect_in_progress = false;

    adapterOne.on('logMessage', (severity, message) => { console.log(`#1 logMessage: ${message}`)});
    adapterTwo.on('logMessage', (severity, message) => { console.log(`#2 logMessage: ${message}`)});

    adapterOne.on('status', (code, message) => { console.log(`#1 status: code:${code} status:${message}`); });
    adapterTwo.on('status', (code, message) => { console.log(`#2 status: code:${code} status:${message}`); });

    adapterOne.on('error', error => { console.log('#1 error: ' + JSON.stringify(error, null, 1)); });
    adapterTwo.on('error', error => { console.log('#2 error: ' + JSON.stringify(error, null, 1)); });

    adapterOne.on('stateChanged', state => { console.log('#1 stateChanged: ' + JSON.stringify(state));});
    adapterTwo.on('stateChanged', state => { console.log('#2 stateChanged: ' + JSON.stringify(state));});

    adapterOne.on('deviceDisconnected', device => { console.log('#1 deviceDisconnected: ' + JSON.stringify(device)); });
    adapterTwo.on('deviceDisconnected', device => { console.log('#2 deviceDisconnected: ' + JSON.stringify(device)); });

    adapterOne.on('deviceDiscovered', device => {
        if (!connect_in_progress) {
            connect_in_progress = true;
            adapterOne.connect(
                { address: device.address, type: device.addressType },
                options,
                error => {
                    if (error) {
                        console.log(error);
                    }

                    setTimeout(() => {
                        adapterOne.startScan(scanParameters, () => {
                            console.log('started scan after connect');
                        });
                    }, 2000);
                });

            console.log(`Discovered device: ${JSON.stringify(device)}`);
        }
    });

    adapterOne.open(
        openOptions,
        error => {
            assert(!error);

            adapterOne.close(error => {
                assert(!error);

                adapterOne.open(
                    openOptions,
                    error => {
                        assert(!error);

                        let advData = {
                            completeLocalName: 'adapterOne',
                            txPowerLevel: 20,
                        };

                        adapterOne.setName('adapterOne');
                        adapterOne.setAdvertisingData(
                            advData,
                            {},
                            error => {
                                assert(!error);
                                adapterOne.startAdvertising(advOptions, error => {
                                    assert(!error);

                                    adapterOne.startScan(scanParameters, (error) => {
                                        assert(!error);
                                    });
                                });
                            }
                        );
                });
            });
    });

    adapterTwo.open(
        openOptions,
        error => {
            assert(!error);
            adapterTwo.setName('adapterTwo');
            let advData = {};

            if (advData.completeLocalName === undefined) {
                advData.completeLocalName = 'adapterTwo';
            }

            if (advData.txPowerLevel === undefined) {
                advData.txPowerLevel = 20;
            }

            const scanRespData = {};

            adapterTwo.setAdvertisingData(advData, scanRespData, error => {
                assert(!error);

                const advOptions = {
                    interval: 100,
                    timeout: 10000,
                };

                adapterTwo.startAdvertising(advOptions, error => {
                    assert(!error);
                });
            });
        }
    );
}

adapterFactory.getAdapters((err, adapters) => {
    if (err) {
        console.log('Error:' + err);
        return;
    }

    let adapterOne;
    let adapterTwo;

    assert(Object.keys(adapters).length >= 2);

    adapterOne = adapters[Object.keys(adapters)[0]];
    adapterTwo = adapters[Object.keys(adapters)[1]];

    runTests(adapterOne, adapterTwo);
});
