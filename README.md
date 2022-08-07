# TON Domains Bot (Server)

## Disclaimer. Important

This is server side part of TON Domains bot. It was build quite fast, in a hackathon way, to reach MVP asap and bring the value to community.
We are dreaming to rewrite everything from scratch, but MVP is MVP.
Don't judge this too hard, better contribute and help this to improve.

## Install and run

### Few words
- This application build on [Nest](https://github.com/nestjs/nest) framework.
- for database management [Prisma](https://docs.nestjs.com/recipes/prisma).
- for blockchain using [Tonweb](https://github.com/toncenter/tonweb) library.
- also for blockchain using [Ton3](https://github.com/tonstack/ton3) library.

### How setup project
1. `cp .env.local .env`
2. Fill out envs with your secrets like bot token, ton-auth static secret key etc
3. docker-compose up -d mysql # don't forgot create db inside
4. npm install
5. npx prisma db push # one time command for run migrations in your DB
6. npx prisma generate # one time command for generate types for prisma entities
7. npm run start:dev

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