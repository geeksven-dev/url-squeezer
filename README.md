## URL QUEEZR -  a url shortening service

### Running the service
From the root of the project execute:
```
npm install
```
After successfully installing all dependencies you are good to go and may start developing via
```
npm run dev
```

### Testing 
The tests for this little demo application run with jest. To execute them use:
```
npm run test
```
Or if you are interested in deeper coverage execute:
```
npm run test:detail
```

### Building the service 
To build a deployable js version just run 
```
npm run build
```
After a successful build you will find your js files in the **dist** directory.

### Running the service
After a successful build you may want to start the dist files using:
```
npm run start
```

### HTTP testing via Insomnia collection
As I'am a big fan of Insomnia HTTP Client you will find a **insomnia.json** in the root of this application.
To use it just import this file into a running Insomnia HTTP Client. You are then able to make requests to the default
location **http://localhost:5000**

### Environment 
Checking the **.env** file in the root of your application you will see the following simple settings:
```
PORT=5000
# usually this would be the place to place your public domain / loadbalancer
APP_BASE_URL=http://localhost:5000
APP_DB_INMEMORY=0
```
You may change the app port to your needs. But **APP_BASE_URL** should always be adapted to still have working short urls. You may also define
a fake domain in /etc/hosts of your system to work with something other than **localhost**.

One final notice is that you are running a PouchDB starting the application. You either run in persistent with APP_DB_INMEMORY=0 or run it completely 
in memory using APP_DB_INMEMORY=1. This will then discard any data on restart of the application.