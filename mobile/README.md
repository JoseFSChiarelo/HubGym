# HubGym Mobile

This is the Expo app for HubGym (mobile MVP).

## Setup
1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```
2. Set the API base URL (use your machine IP if testing on a phone):
   ```bash
   # PowerShell (recommended)
   Copy-Item .env.example .env
   # Edit .env and replace SEU_IP with your local IPv4
   ```
   Or set it for the current session only:
   ```bash
   # PowerShell
   $env:EXPO_PUBLIC_API_URL="http://192.168.0.10:3001"
   ```
3. Start Expo:
   ```bash
   npm run start
   ```

## Notes
- The backend must be running on `http://<ip>:3001`.
- Login works with ATHLETE or PERSONAL accounts created in the backend.
