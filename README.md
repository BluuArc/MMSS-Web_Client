## MMSS-web_client
Web client component for MMSS. Full project can be found [here](https://github.com/Walden1995/MMSS). It is currently modeled to be what the Android Application might've looked like and showcases the functionality of the server.

## Requirements
* A fairly recent version of Node.js installed (tested on v7.6.0)
* A modern web browser (Chrome or Firefox should work; tested on Chrome x64 57.0.2987.133)
* A working setup of the [MMSS-Server](https://github.com/BluuArc/MMSS-Server). Refer to the readme there for specifics on the setup.
* With the web client, it's assumed that you are running everything from a brand new server set up (i.e. no demo mode, no users in the system); this means that you are the server admin. Running the web client with a prepopulated server may result in errors in not having permission to add/edit/remove anything (as if you were a dependent on the server).

## What's in here?
| Path | Description |
| --- | --- |
| `frontend_alpha` | contains necessary files to run the alpha version of the web client |
| `frontend_beta` | contains the necessary files to run the beta version of the web client |

## How to Run The Web Client (Alpha)
1. Run `npm install` to install the dependencies necessary.
2. Start up the web server.
3. Start the web client with `node client_alpha.js`.
4. In your web browser, go to `127.0.0.1:4000` (default startup for the web client). A login page should appear.
5. Enter a name and an IP in the form similar to `127.0.0.1:8081`, check the HTTPS check box if necessary, then click the Send button. 
    * If everything is set up correctly, you should be taken to the main page which contains a quick description about the project and a list of links to do certain actions.
6. From here, feel free to go through each link to see what the functionality of the project is like.

## How to Run the Web Client (Beta)
1. Run `npm install` to install the dependencies necessary.
2. Start up the web server.
3. Start the web client with `node client_beta.js`.
4. In your web browser, go to `127.0.0.1:4000` (default startup for the web client). A login page should appear.
5. Enter a name and an IP in the form similar to `127.0.0.1:8081`, check the HTTPS check box if necessary, then click the Send button. 
    * If everything is set up correctly, you should be taken to the main page which contains a a quick overview of the system.
6. From here, feel free to go through each link to see what the functionality of the project is like.

**Note:** With the way it's currently set up, the test client only supports one test client running per system. I cannot guarantee that it will work correctly with multiple clients on the same system.

## External Dependencies
* See the `package.json` for the dependencies of the web client (both alpha and beta)