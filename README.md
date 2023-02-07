# TON Domains Bot (Server)

## Disclaimer ☝️

This is server side part of TON Domains bot. It was build quite fast, in a hackathon way, to reach MVP asap and bring the value to community.
We are dreaming to rewrite everything from scratch, but MVP is MVP.
Don't judge this too hard, better contribute and help this to improve.

## Install and run 🏃‍♂️

### Few words

- Current application built on [Nest](https://github.com/nestjs/nest) framework.
- Database management via [Prisma](https://docs.nestjs.com/recipes/prisma).
- Blockchain transactions using [Tonweb](https://github.com/toncenter/tonweb) together with [Ton3](https://github.com/tonstack/ton3) libraries.

### How setup project

1. `cp .env.local .env`
2. Fill out `.env` files with your secrets: bot_token, ton_auth_secret static key, etc.
3. `docker-compose up -d mysql` and create new DB
4. `npm install`
5. `npx prisma db push` - one time command to run migrations in your DB
6. `npx prisma generate` - one time command to generate types for Prisma entities
7. `npm run start:dev` - to launch the app for dev

### Database structure

> Check schema.prisma contains all tables, entities and relations.

* UserFollow - domains that the user follows
* BlockchainDomain - system table to keep domains synced with the blockchain
* User - users table
* BalanceTransactions - system table with all topup/withdraw transactions
* Token - system authorisation table


## Contribute 🤝

Later on we gonna add dedicated Contribute.md, for now it's enough to stick to these rules:

1. Use conventional commits while adding changes in your PR
2. When making the PR, describe what problem you solve and/or attach an issue
3. Please make it clean, imagine your grandchildren gonna see that code

## Donate

Just in case, here is our TON wallet: `EQCpYlastF0WWcl-H9DklvLywkZYIgRF6HaPrnh5yp_-7R2U`

All donations will be used, to buy some lush Pu'er tea to boost our productivity 🍵