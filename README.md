# auth0-user-loader
Generate real-looking fake user data and load to Auth0

## Prerequisites
- NodeJS LTS latest version must be installed
- Setup M2M application on Auth0 authorized for Management API with allowed scope `create:users`

## Steps to execute user load
1. Copy `.env.sample` to `.env` and populate all details:
- AUTH0_DOMAIN (name of auth0 domain)
- AUTH0_CLIENT_ID (client_id for M2M application created above)
- AUTH0_CLIENT_SECRET (client_secret for M2M app created above)
- AUTH0_TESTUSER_PASSWORD (common password for all test users)
- AUTH0_CONNECTION (name of auth0 connection to load users to)

2. Execute the following command to start user load:

`./user-loader.js --load=<number-of-users-to-load> --flush=<num-users-before-buffer-flushed-to-csv>`

3. Check generated `users.csv` file for `email` and `password` for all users that were loaded to Auth0.
