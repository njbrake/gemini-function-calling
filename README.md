# gemini-function-calling

sing Gemini Node.JS package for function calling Gemini and getting recipes either from Gemini's logic, or retrieving it from Budget Bytes. This code is invoked via `npm start "<question>"` but is designed to be a starting point for building into a web app or something like that.

# Quick Start

## Pre-Requisites

* Google API key with Gemini-pro enabled: https://makersuite.google.com/app/apikey
* Node V18+

```bash
export GOOGLE_API_KEY=yourkeyhere # or you can make a .env file and put the key in there
npm install 
npm start "get me the Easy Lemon Pepper Chicken off budget bytes"
```

