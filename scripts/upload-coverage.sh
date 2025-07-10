#!/bin/bash

# Load Codacy env variables
if [ -f .env.codacy ]; then
  export $(cat .env.codacy | xargs)
fi

# Run tests with coverage
npm run test:coverage

# Upload to Codacy
bash <(curl -Ls https://coverage.codacy.com/get.sh)
