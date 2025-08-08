# Firebase Setup Instructions

## Prerequisites
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication, Firestore Database, Storage, and Cloud Messaging

## Android Setup
1. Add Android app to your Firebase project
   - Package name: `com.expirydatetracker`
   - Download `google-services.json`
   - Replace the template file: `android/app/google-services.json.template` with actual `google-services.json`

## iOS Setup
1. Add iOS app to your Firebase project
   - Bundle ID: `com.expirydatetracker`
   - Download `GoogleService-Info.plist`
   - Replace the template file: `ios/GoogleService-Info.plist.template` with actual `GoogleService-Info.plist`

## Configuration Files
- Template files are provided for both platforms
- Replace placeholder values with actual Firebase project values
- Never commit actual Firebase config files to version control

## Firebase Services Configured
- Authentication
- Firestore Database
- Storage
- Cloud Messaging

## Usage
Import Firebase services from:
```typescript
import FirebaseService from './src/services/FirebaseService';
```
