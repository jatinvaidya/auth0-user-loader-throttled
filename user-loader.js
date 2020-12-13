#!/usr/bin/env node

// requires
const faker = require('faker')
const dotenv = require('dotenv')
const request = require('request-promise')
const argv = require('yargs').options({
    numusers: { type: 'number', describe: 'Number of users to be created', demandOption: true },
    concurrent: { default: 5, type: 'number', describe: 'Max concurrent reqs (1..20)' },
    delay: { default: 333, type: 'number', describe: 'Min delay (ms) betn reqs (300..3000)' },
    retry: { default: 2, type: 'number', describe: 'Num retries for HTTP429 reqs (1..5)' },
    status: { default: 60, type: 'number', describe: 'Min status reporting interval (sec)' }
}).usage('Usage: $0 --numusers=[num] --concurrent=[num|5] --delay=[num|333] --retry=[num|3] --status=[num|60]').argv;
const fs = require('fs');
const os = require('os');
const bottleneck = require('bottleneck');
const validator = require('node-input-validator');
const randomString = require('randomstring');
const { time } = require('console');
require('log-timestamp')

// env
dotenv.load();

// cmdline args
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_CONNECTION = process.env.AUTH0_CONNECTION;
const AUTH0_TESTUSER_PASSWORD = process.env.AUTH0_TESTUSER_PASSWORD;
const BATCH_SIZE = process.env.BATCH_SIZE;

// cmdline args
const NUM_USERS = argv.numusers;
const MAX_CONCURRENT_REQUESTS = argv.concurrent;
const MIN_DELAY_REQUESTS = argv.delay;
const RETRY_COUNT = argv.retry;
const STATUS_INTERVAL = argv.status;

// just summary of inputs/defaults used
console.debug(`
    Number of users to be created: ${NUM_USERS},
    Max concurrent requests: ${MAX_CONCURRENT_REQUESTS},
    Min delay between requests: ${MIN_DELAY_REQUESTS},
    Number of retry attempts for HTTP 429 failed requests: ${RETRY_COUNT},
    Min status reporting interval: ${STATUS_INTERVAL}
`);

// input valiations
let inputValidator = async () => {

    // input valiation check
    let concurrent = new validator({ concurrent: MAX_CONCURRENT_REQUESTS }, { concurrent: 'required|integer' });
    let retry = new validator({ retry: RETRY_COUNT }, { retry: 'required|between:0,5' });
    let delay = new validator({ delay: MIN_DELAY_REQUESTS }, { delay: 'required|between:300,3000' });
    let status = new validator({ status: STATUS_INTERVAL }, { status: 'required|between:5,3600' });
    let checks = [concurrent, retry, delay, status];

    Promise
        .all(checks.map(check => check.check()))
        .then(values => {
            if (values.includes(false)) {
                console.error(checks[values.indexOf(false)].errors);
                console.error('see usage: ./user-loader.js --help');
                process.exit(1);
            }
        }).catch(error => {
            console.error('error performing validation check', error.message);
            process.exit(1);
        });
}


// globals
var ACCESS_TOKEN = '';
const CSV_OUT = 'users.csv';
const JSON_OUT = `users-list_${Date.now()}.json`;
const FAILURE_LOG = 'failures.log'

// rate limit sending of requests
var limiter = new bottleneck({
    maxConcurrent: MAX_CONCURRENT_REQUESTS,
    minTime: MIN_DELAY_REQUESTS
});

// listen to "failed" event, then retry
limiter.on("failed", (error, jobInfo) => {
    const id = jobInfo.options.id;

    if (error.statusCode === 429) {
        if (jobInfo.retryCount < RETRY_COUNT) { // max-retry-attempts
            // console.warn(`[${id}] failed - will be retried in ${MIN_DELAY_REQUESTS} ms!`);
            return MIN_DELAY_REQUESTS;
        } else {
            console.error(`[${id}] failed - in spite of max retries`)
            appendToFile(FAILURE_LOG, `${id},${error.statusCode}`)
        }
    } else {
        console.error(`[${id}] failed - will NOT be retried as error isn't 429 but ${error.statusCode}`)
        appendToFile(FAILURE_LOG, `${id},${error.statusCode}`)
    }
});

// listen to the "retry" event
limiter.on("retry", (error, jobInfo) => {
    // console.debug(`Now retrying ${jobInfo.options.id}`)
});

// mgmt api access_token
let acquireAccessToken = async () => {
    console.log('acquiring access_token for mgmt-api');
    var options = {
        method: 'POST',
        url: `https://${AUTH0_DOMAIN}/oauth/token`,
        headers: {
            'content-type': 'application/json'
        },
        body: `{
            "client_id":"${AUTH0_CLIENT_ID}",
            "client_secret":"${AUTH0_CLIENT_SECRET}",
            "audience":"https://${AUTH0_DOMAIN}/api/v2/",
            "grant_type":"client_credentials",
            "scope":"create:users"
        }`
    };

    const responseBody = await request(options, error => {
        if (error) throw new Error(error);
    });

    ACCESS_TOKEN = JSON.parse(responseBody).access_token;
}

// generate fake data for one user
// return user
let getFakeUserData = () => {
    var email = faker.internet.email();
    // faker generates duplicates many times, so we append 5 random chars
    email = `${email.split('@')[0]}.${randomString.generate(5)}@${email.split('@')[1]}`;
    var password = AUTH0_TESTUSER_PASSWORD
    var fullname = faker.fake("{{name.lastName}}, {{name.firstName}}")
    var nickname = fullname.split(',')[1].trim()
    return { email, password, fullname, nickname };
}

// create one user on auth0
// return status code
let createUserOnAuth0 = (user) => {
    var options = {
        method: 'POST',
        url: `https://${AUTH0_DOMAIN}/api/v2/users`,
        headers: {
            'Content-Type': 'application/json'
        },
        auth: { 'bearer': ACCESS_TOKEN },
        body: {
            connection: AUTH0_CONNECTION,
            email: user.email,
            password: user.password,
            email_verified: true,
            user_metadata: {
                fullName: user.fullname,
                nickName: user.nickname,
                locale: 'en-US'
            },
            app_metadata: {
                useMfa: false
            }
        },
        json: true
    };

    return limiter.schedule({ id: user.email }, request, options);
}

// write to csv-file
let appendToFile = (path, data) => {
    fs.appendFile(path, data + os.EOL, (error) => {
        if (error) console.error('[appendToFile] data', data, 'error', error);
    });
}

// truncate existing file
let truncateFile = (path) => {
    return new Promise((resolve, reject) => {
        fs.truncate(path, 0, (error) => {
            if (error) {
                reject(error);
            } else {
                console.debug('[truncateFile] file truncated', path)
                resolve();
            }
        });
    });
}

let main = async () => {

    await Promise.all([
        truncateFile(JSON_OUT).catch(error => {
            // it's ok, 'users.csv' probably did not exist
        }),
        truncateFile(FAILURE_LOG).catch(error => {
            // it's ok, 'failures.log' probably did not exist
        })
    ]);

    // acquire access token for create-user mgmt-api calls
    await acquireAccessToken().catch(error => {
        console.error('[main] acquireAccessToken error, cannot continue', error.message);
        process.exit(1);
    });

    console.info('start loading users');
    let success = 0; let failure = 0;

    let jsonOut = new Array();
    for (j = 0; j < Math.floor(NUM_USERS / BATCH_SIZE); j++) {
        let promises = new Array();
        for (i = 0; i < BATCH_SIZE; i++) {
            let user = getFakeUserData();
            promises.push(
                createUserOnAuth0(user)
                    .then(response => {
                        jsonOut.push({
                            user_id: response.user_id,
                            username: user.email
                        });
                        success++;
                    }).catch(error => {
                        console.error('user', user.email, 'error', error.message);
                        failure++;
                    })
            );
        }
        await Promise.all(promises);
        appendToFile(JSON_OUT, `${JSON.stringify(jsonOut)}`);
        jsonOut = new Array();
        console.info('success so far:', success, 'failure so far:', failure);
    }

    let promises = new Array();
    for (i = 0; i < NUM_USERS % BATCH_SIZE; i++) {
        let user = getFakeUserData();
        promises.push(
            createUserOnAuth0(user)
                .then(response => {
                    jsonOut.push({
                        user_id: response.user_id,
                        username: user.email
                    });
                    success++;
                }).catch(error => {
                    console.error('user', user.email, 'error', error.message);
                    failure++;
                })
        );
    }
    await Promise.all(promises);
    appendToFile(JSON_OUT, `${JSON.stringify(jsonOut)}`);

    console.info('*****************************');
    console.info('final success:', success, 'final failure:', failure);
    console.info('*****************************');
}

// execute
main();
