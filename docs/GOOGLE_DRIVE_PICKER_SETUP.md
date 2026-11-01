# Google Drive folder picker setup

The Ledger's case editor can link a case to a Drive folder. The picker stores only the selected folder's ID in `cases.drive_folder_id`; it does not upload or move files. The picker requests the narrow `drive.file` OAuth scope and prompts the signed-in user to grant it.

## Google Cloud configuration

Use a Google Cloud project owned by Brandex for this application. Do not reuse a project created for an unrelated integration.

1. Enable the Google Picker API for the project.
2. Create an OAuth client of type **Web application**. Add the production site and each approved preview hostname as authorized JavaScript origins. No redirect URI or browser client secret is used by this picker.
3. Configure the OAuth consent screen with the Brandex app name, support contact, and privacy-policy URL. Add staff as test users while the app remains in testing.
4. Create a browser API key, restrict its application referrers to the production and approved preview origins (and `https://docs.google.com/*` for the Picker iframe), and restrict its API access to Google Picker API.
5. Copy the OAuth client ID, API key, and numeric Cloud project number into `google-drive-config.js` (`clientId`, `apiKey`, `appId`). These are browser identifiers, not secrets. Never put a client secret or service-account key in this file.
6. Apply Supabase migration 007 to the isolated preview database before saving a folder link; it adds `cases.drive_folder_id`. Production requires its own reviewed migration and approval.

The implementation uses Google's Picker API and the `drive.file` scope, which is limited to files the user selects or opens with this app. See Google's [Picker web app guide](https://developers.google.com/workspace/drive/picker/guides/web-picker) and [OAuth scope list](https://developers.google.com/identity/protocols/oauth2/scopes#drive).

