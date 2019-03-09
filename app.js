#!/usr/bin/env node

const faker = require('faker')
const dotenv = require('dotenv')
const request = require('request-promise')
const argv = require('yargs').argv
const stringify = require('csv-stringify')
const fs = require('fs');

dotenv.load();
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_CONNECTION = process.env.AUTH0_CONNECTION;
const AUTH0_TESTUSER_PASSWORD = process.env.AUTH0_TESTUSER_PASSWORD;
const NUM_USERS = argv.load;
const MAX_BUFFER = argv.flush;
var USER_ARR = new Array();

// mgmt api access_token
async function acquireAccessToken() {
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

    const responseBody = await request(options, function (error, response, body) {
        if (error) throw new Error(error);
    });

    return JSON.parse(responseBody).access_token;
}

// generate fake data for one user
// return user
function getFakeUserData() {
    var email = faker.internet.email();
    var password = AUTH0_TESTUSER_PASSWORD
    return {
        email,
        password
    };
}

// create one user on auth0
// return status code
async function createUserOnAuth0(user, accessToken) {
    var options = {
        method: 'POST',
        url: `https://${AUTH0_DOMAIN}/api/v2/users`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        body: {
            connection: AUTH0_CONNECTION,
            email: user.email,
            password: user.password,
            email_verified: true
        },
        json: true,
        resolveWithFullResponse: true
    };

    const response = await request(options, function (error, response, body) {
        if (error) throw new Error(error);
    });
    console.log(`user created: ${response.body.email}`);
    return response.statusCode;
}

// stringify array to csv and flush to csv-file
// return promise
function flushUsersToCsv() {
    console.log(`--------flush to csv: ${USER_ARR.length}---------`);
    return new Promise((resolve, reject) => {
        stringify(USER_ARR, (err, output) => {
            if (err) reject(err);
            else {
                writeToFileAsPromised('users.csv', output)
                    .then(USER_ARR = new Array())
                    .then(resolve());
            }
        });
    });
}

// write to csv-file
// return promise
function writeToFileAsPromised(path, data) {
    return new Promise((resolve, reject) => {
        fs.appendFile('users.csv', data, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

// truncate csv file
// return promise
function truncateFileAsPromised(path) {
    return new Promise((resolve, reject) => {
        fs.truncate('users.csv', 0, (error) => {
            if (error) reject(error);
            else {
                console.log('truncated users.csv')
                resolve();
            }
        });
    });
}

// main
async function main() {

    // truncate csv-file
    await truncateFileAsPromised();

    // fetch access_token for creating user
    const accessToken = await acquireAccessToken();
    
    // create N users
    for (i = 0; i < NUM_USERS; i++) {
        user = getFakeUserData();
        const statusCode = await createUserOnAuth0(user, accessToken);

        // if creation successful, push to array
        if (statusCode === 201)
            USER_ARR.push(user);

        // time to flush array to csv-file    
        if (USER_ARR.length >= MAX_BUFFER)
            await flushUsersToCsv();
    }
    // flush leftovers to csv file
    if (USER_ARR.length > 0)
        flushUsersToCsv();
}

// execute
main();