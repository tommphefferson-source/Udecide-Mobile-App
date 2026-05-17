# UDecide — Political & Voter App

A full-featured, nonpartisan political and voter information mobile app built with Expo/React Native.

## Run & Operate

- Start the mobile app: restart the `artifacts/udecide: expo` workflow
- Scan the QR code shown in the Expo workflow logs with Expo Go to test on your physical device
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- Expo SDK 54, Expo Router (file-based routing)
- TypeScript, React Native
- AsyncStorage for local persistence
- @tanstack/react-query for server state
- expo-linear-gradient, expo-haptics, expo-blur
- Gemini AI for Fact Checker feature

## App Structure

```
artifacts/udecide/
├── app/
│   ├── _layout.tsx              # Root layout (AuthProvider + AddressProvider)
│   ├── index.tsx                # Auth redirector
│   ├── (auth)/                  # Auth stack
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── profile-setup.tsx
│   ├── (tabs)/                  # Main 5-tab navigation
│   │   ├── index.tsx            # Dashboard (home)
│   │   ├── representatives.tsx
│   │   ├── elections.tsx
│   │   ├── legislation.tsx
│   │   └── more.tsx
│   ├── voter-tools.tsx
│   ├── parties.tsx
│   ├── political-guide.tsx
│   ├── polls.tsx
│   ├── fact-checker.tsx         # Gemini AI chatbot
│   ├── profile.tsx
│   └── address-override.tsx
├── components/                  # Shared components
├── context/                     # AuthContext, AddressContext
├── services/                    # API services (LegiScan, Congress.gov, Gemini)
├── types/                       # TypeScript types
└── utils/                       # Constants, formatters, validation
```

## Features

1. **Auth Flow** — Register/login with AsyncStorage persistence
2. **Dashboard** — Card-based quick access to all features
3. **Representatives** — Federal, state, county, city reps with voting records
4. **Elections & Ballots** — Upcoming elections, candidates, voting deadlines
5. **Legislation Tracker** — LegiScan API integration (mock fallback)
6. **Voter Status Tools** — Registration info, polling place, absentee/early voting
7. **Political Parties** — Nonpartisan party info and platform summaries
8. **Political System Guide** — Civic education: 3 branches, lawmaking, Constitution
9. **Political Polls** — Community polls with vote tracking
10. **Fact Checker** — Gemini AI-powered nonpartisan fact-checking chatbot
11. **Address Override** — View political data for any U.S. location
12. **Profile** — Edit account info and address

## API Keys (Optional)

Set in `.env` file in `artifacts/udecide/`:

```
LEGISCAN_API_KEY=      # legiscan.com — state legislation
CONGRESS_GOV_API_KEY=  # api.congress.gov — federal data
GEMINI_API_KEY=        # Google Gemini — AI fact checker
```

All features work with built-in mock data when keys are absent.

## Architecture Decisions

- **Frontend-only**: No backend needed — all data uses AsyncStorage + external APIs
- **Mock-first**: All API services fall back to rich mock data when API keys are missing
- **Nonpartisan design**: Neutrality notice, no party rankings, no candidate endorsements
- **Address-aware**: AddressContext wraps the app so any screen can access effective location
- **Liquid glass tabs**: Uses `expo-glass-effect` for iOS 26+ liquid glass tab bar with classic BlurView fallback

## User Preferences

_Populate as you build._

## Gotchas

- Do not restart the Expo workflow for normal code changes — Metro HMR handles those
- Only restart when package.json changes or Metro crashes
- Web preview may render fonts differently from native — test on device via Expo Go QR code
