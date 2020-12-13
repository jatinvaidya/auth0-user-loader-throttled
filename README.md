# auth0-user-loader
Generate real-looking fake user data and load to Auth0

## Prerequisites
- NodeJS LTS latest version must be installed
- Setup M2M application on Auth0 authorized for Management API with allowed scope `create:users`

## Steps to execute user load
1. Clone this repo and `cd` to it.

2. `npm install`

3. Copy `.env.sample` to `.env` and populate all details:
- AUTH0_DOMAIN (name of auth0 domain)
- AUTH0_CLIENT_ID (client_id for M2M application created above)
- AUTH0_CLIENT_SECRET (client_secret for M2M app created above)
- AUTH0_TESTUSER_PASSWORD (common password for all test users)
- AUTH0_CONNECTION (name of auth0 connection to load users to)

4. Execute the `user-loader-v2.js`:

```
Usage: user-loader-v2.js --numusers=[num] --concurrent=[num|5] --delay=[num|333]
--retry=[num|3] --status=[num|60]

Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  --numusers    Number of users to be created                [number] [required]
  --concurrent  Max concurrent reqs (1..20)                [number] [default: 5]
  --delay       Min delay (ms) betn reqs (300..3000)     [number] [default: 333]
  --retry       Num retries for HTTP429 reqs (1..5)        [number] [default: 2]
  --status      Min status reporting interval (sec)       [number] [default: 60]
```

5. Check generated `users-list.json` file for `email` and `password` for all users that were loaded to Auth0.

> [{"username":"Dallas.Tromp.n3h@hotmail.com","password":"Mju76yhn"},{"username":"Abigayle.Connelly.Qu2@hotmail.com","password":"Mju76yhn"}]

## Sample Run:

```
auth0-user-loader % ./user-loader-v2.js --concurrent=3 --delay=500 --numusers=5000
[2020-05-01T04:36:29.573Z] 
    Number of users to be created: 5000,
    Max concurrent requests: 3,
    Min delay between requests: 500,
    Number of retry attempts for HTTP 429 failed requests: 2,
    Min status reporting interval: 60

[2020-05-01T04:36:29.579Z] [truncateFile] file truncated users.csv
[2020-05-01T04:36:29.579Z] [truncateFile] file truncated users.csv
[2020-05-01T04:36:29.579Z] acquiring access_token for mgmt-api
[2020-05-01T04:36:29.684Z] start loading users
[2020-05-01T04:37:29.814Z] -------------------------
[2020-05-01T04:37:29.816Z] success so far: 120 failure so far: 0
[2020-05-01T04:37:29.818Z] -------------------------
[2020-05-01T04:38:29.817Z] -------------------------
[2020-05-01T04:38:29.817Z] success so far: 240 failure so far: 0
[2020-05-01T04:38:29.818Z] -------------------------
[2020-05-01T04:39:29.819Z] -------------------------
[2020-05-01T04:39:29.819Z] success so far: 360 failure so far: 0
[2020-05-01T04:39:29.819Z] -------------------------
[2020-05-01T04:40:29.824Z] -------------------------
[2020-05-01T04:40:29.824Z] success so far: 480 failure so far: 0
[2020-05-01T04:40:29.824Z] -------------------------
[2020-05-01T04:40:29.825Z] [Noemy.Pfannerstill39@yahoo.com] failed - in spite of max retries
[2020-05-01T04:41:29.826Z] -------------------------
[2020-05-01T04:41:29.826Z] success so far: 600 failure so far: 1
[2020-05-01T04:41:29.826Z] -------------------------
.
.
.
[2020-05-01T04:42:29.829Z] -------------------------
[2020-05-01T04:42:29.829Z] success so far: 720 failure so far: 5
[2020-05-01T04:42:29.830Z] -------------------------
[2020-05-01T04:43:29.831Z] -------------------------
[2020-05-01T04:43:29.831Z] success so far: 840 failure so far: 5
[2020-05-01T04:43:29.831Z] -------------------------
.
.
.
[2020-05-01T05:15:29.932Z] -------------------------
[2020-05-01T05:15:29.932Z] success so far: 4670 failure so far: 5
[2020-05-01T05:15:29.933Z] -------------------------
[2020-05-01T05:16:29.935Z] -------------------------
[2020-05-01T05:16:29.935Z] success so far: 4790 failure so far: 5
[2020-05-01T05:16:29.935Z] -------------------------
[2020-05-01T05:17:29.940Z] -------------------------
[2020-05-01T05:17:29.940Z] success so far: 4910 failure so far: 5
[2020-05-01T05:17:29.940Z] -------------------------
[2020-05-01T05:18:06.964Z] *****************************
[2020-05-01T05:18:06.964Z] final success: 4985 final failure: 5
[2020-05-01T05:18:06.964Z] *****************************
```


