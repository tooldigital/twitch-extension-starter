# twitch-extension-starter

Boilerplate for Twitch extensions. 

## Motivations

This project uses Node 6.14 so it can be deployed to Firebase. The official [Twitch extension boilerplate](https://github.com/twitchdev/extensions-hello-world) uses Node 8, so it won't work out of the box on Firebase.


## Twitch extension

There are a few things your extension needs from Twitch before it will work.

- Client ID: the unique identifier for your Extension. Go to the Extensions Dashboard, select the Extension you want to run in the Developer Rig, then look for Client ID under About This Extension.

- Extension Secret: a valid secret, that allows your Extension to authenticate. Go to the Extensions Dashboard, select the Extension you want to run in the Developer Rig, select the settings tab, and then navigate to Secret Keys and create/retrieve a valid secret.

- Owner ID: The numeric id associated with your username. Run this curl command with your client id and username
  - `curl -H 'Client-ID: <client id>' -X GET 'https://api.twitch.tv/helix/users?login=<username>'`


## Dev setup

Use Node 6.14.0 to match the firebase functions environment.

Install dependencies by running `npm install` in `/` and `/functions`

Install global CLI tools

- `npm i -g pm2`
- `npm i -g webpack`
- `npm i -g firebase-tools`
- `npm i -g localtunnel`

Set the Google Cloud project for firebase to use `firebase use {projectID}`. A list of options can be seen with `firebase list`.

Set the Twitch variables in the firebase config.

`firebase functions:config:set twitch.client_id=xxxxx`
`firebase functions:config:set twitch.secret=xxxxx`
`firebase functions:config:set twitch.owner_id=xxxxx`

Running `firebase functions:config:get` should give you an object like this:

```
{
  "twitch": {
    "owner_id": "xxxxx",
    "client_id": "xxxxx",
    "secret": "xxxxx"
  }
}
```

Mirror this config locally by running `npm run get-runtime-config`


### Local development

Run `npm run watch` to run webpack in watch mode. This will generate the static files for deployment, and it will update them whenever a change is detected. 

Run `npm run serve` to serve these files on localhost. This command also starts the Firebase functions emulator, which runs the EBS (extension backend service).

In package.json, change the localtunnel script entry to use a unique subdomain, then run `npm run localtunnel`. This exposes your localhost to a public url, and gives it an https certificate. 

The format of the public url is https://{subdomain}.localtunnel.me. Change your extension's base uri to the localtunnel url. [Dashboard](https://dev.twitch.tv/dashboard/extensions) > {extension_name} > Versions > {version} > Asset Hosting > Testing Base URI


### npm script commands

`build`: build production files for distribution

`watch`: watch files in src and build after every change

`serve`: runs firebase functions and host on localhost

`localtunnel`: exposes localhost via localtunnel (we need https for Twitch). Check `pm2 logs` for url

`get-runtime-config`: makes a local copy of firebase's remote env variables

