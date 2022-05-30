const gapiLoadPromise = new Promise((resolve, reject) => {
    gapiLoadOkay = resolve;
    gapiLoadFail = reject;
});
const gisLoadPromise = new Promise((resolve, reject) => {
    gisLoadOkay = resolve;
    gisLoadFail = reject;
});

var tokenClient;

(async () => {
    document.getElementById("showEventsBtn").style.visibility = "hidden";
    document.getElementById("revokeBtn").style.visibility = "hidden";

    // First, load and initialize the gapi.client
    await gapiLoadPromise;
    await new Promise((resolve, reject) => {
        // NOTE: the 'auth2' module is no longer loaded.
        gapi.load('client', { callback: resolve, onerror: reject });
    });
    await gapi.client
        .init({
            // NOTE: OAuth2 'scope' and 'client_id' parameters have moved to initTokenClient().
        })
        .then(function () {  // Load the sheets API discovery document.
            gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4');
        });

    // Now load the GIS client
    await gisLoadPromise;
    await new Promise((resolve, reject) => {
        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: '726017797407-5cjfo1chb9fduq5oa6ahdkn0ihh06g44.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/spreadsheets.readonly',
                //prompt: 'consent',
                callback: '',  // defined at request time in await/promise scope.
            });
            resolve();
        } catch (err) {
            reject(err);
        }
    });

    document.getElementById("showEventsBtn").style.visibility = "visible";
    document.getElementById("revokeBtn").style.visibility = "visible";
})();

async function getToken(err) {

    if (!err || err.result.error.code == 401 || (err.result.error.code == 403) &&
        (err.result.error.status == "PERMISSION_DENIED")) {

        // The access token is missing, invalid, or expired, prompt for user consent to obtain one.
        await new Promise((resolve, reject) => {
            try {
                // Settle this promise in the response callback for requestAccessToken()
                tokenClient.callback = (resp) => {
                    if (resp.error !== undefined) {
                        reject(resp);
                    }
                    // GIS has automatically updated gapi.client with the newly issued access token.
                    console.log('gapi.client access token: ' + JSON.stringify(gapi.client.getToken()));
                    resolve(resp);
                };
                tokenClient.requestAccessToken({ hint: 'jnosek@gmail.com', prompt: 'none' });
            } catch (err) {
                console.log(err)
            }
        });
    } else {
        // Errors unrelated to authorization: server errors, exceeding quota, bad requests, and so on.
        throw new Error(err);
    }
}

async function showEvents() {

    await getToken();

    const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: '1KGv7ri0uLMYs3zJZXmW_XyiWqosSGS8vdGRFgcZKNzA',
        range: 'A:F'
    });

    let row = response.result.values[0];
    console.log(`row: ${row}`)

    // Try to fetch a list of Calendar events. If a valid access token is needed,
    // prompt to obtain one and then retry the original request.
    /* 
    gapi.client.calendar.events.list({ 'calendarId': 'primary' })
        .then(calendarAPIResponse => console.log(JSON.stringify(calendarAPIResponse)))
        .catch(err => getToken(err))  // for authorization errors obtain an access token
        .then(retry => gapi.client.calendar.events.list({ 'calendarId': 'primary' }))
        .then(calendarAPIResponse => console.log(JSON.stringify(calendarAPIResponse)))
        .catch(err => console.log(err));   // cancelled by user, timeout, etc.
        */
}

function revokeToken() {
    let cred = gapi.client.getToken();
    if (cred !== null) {
        google.accounts.oauth2.revoke(cred.access_token, () => { console.log('Revoked: ' + cred.access_token) });
        gapi.client.setToken('');
    }
}