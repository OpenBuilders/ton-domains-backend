# TON Domains Bot (Server)

## Disclaimer

This is server side part of TON Domains bot. It was build quite fast, in a hackathon way, to reach MVP asap and bring the value to community. 
We are dreaming to rewrite everything from scratch, but MVP is MVP. 
Don't judge this too hard, better contribute and help this to improve.

## Installation

```bash
$ npm install
```

## Running the app

Build on [Nest](https://github.com/nestjs/nest) framework.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## App shortly
### How setup
Environment variables
1. `cp .env.local .env`
2. Take secret of ton-auth for put it in your .env

### Database structure

> Check schema.prisma contains all tables, entities and relations.

**UserFollow** - domains user following
**BlockchainDomain** - system table to keep domains synced with the blockchain
**User** - users table
**BalanceTransactions** - system table with all topup/withdraw transactions
**Token** - system table for authorization


## Contribute

Later on we gonna add dedicated Contribute.md, for now it's enough to stick to these rules:

1. Use conventional commits while adding changes in your PR
2. When making the PR, describe what problem you solve and/or attach an issue
3. Please make it clean, imagine your grandchildren gonna see that code