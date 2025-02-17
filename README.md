# ClassroomSearchCLI

**ClassroomSearchCLI** is an interactive command-line tool that allows you to search through your Google Classroom data—courses, assignments, and announcements—using fuzzy search. The tool leverages the Google Classroom API for fetching data, Fuse.js for efficient fuzzy matching, and Inquirer for an interactive menu interface.

## Features

- **OAuth2 Authentication:** Securely authenticate with Google and gain access to your Classroom data.
- **Fetch Classroom Data:** Retrieve your list of courses, assignments, and announcements using the Google Classroom API.
- **Interactive CLI Menu:** Navigate through options using arrow keys and prompts.
- **Fuzzy Search:** Quickly find relevant courses, assignments, or announcements even with imprecise queries.

## Prerequisites

- **Node.js:** Version 14 or later is recommended.
- **Google Cloud Project:** Set up an OAuth 2.0 Client ID in the [Google Cloud Console](https://console.cloud.google.com/) with the redirect URI `http://localhost:3000/callback`.
- **Credentials File:** A `credentials.json` file containing your OAuth 2.0 client information (see below).

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/ClassroomSearchCLI.git
   cd ClassroomSearchCLI
   ```

2. **Install Dependencies:**

   This project uses ES Modules. Make sure your `package.json` includes `"type": "module"`. Then run:

   ```bash
   npm install
   ```

3. **Set Up Credentials:**

   Create a `credentials.json` file in the root directory of the project. It should have the following structure:

   ```json
   {
     "installed": {
       "client_id": "YOUR_CLIENT_ID",
       "project_id": "YOUR_PROJECT_ID",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "client_secret": "YOUR_CLIENT_SECRET",
       "redirect_uris": [
         "http://localhost:3000/callback"
       ]
     }
   }
   ```

## Usage

To launch the tool, simply run:

```bash
node app.js
```

### OAuth Authentication

- On the first run, the tool will display an authentication URL.
- Open the URL in your browser, sign in with your Google account, and grant the required permissions.
- After authentication, you will be redirected to `http://localhost:3000/callback`. The tool automatically captures the code, exchanges it for an access token, and stores it in `token.json`.

### Interactive Menu

Once authenticated, you will see an interactive menu with the following options:

- **Search Courses:** Search your courses by name.
- **Search Assignments:** First select a course, then search through its assignments.
- **Search Announcements:** First select a course, then search through its announcements.
- **Exit:** Close the application.

The search uses Fuse.js for fuzzy matching. Results are displayed in the terminal with details like the item name, ID, and matching score.

## Contributing

Contributions are welcome! If you encounter issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [BSD License](LICENSE).
