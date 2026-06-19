# Deployment Guide

This project is fully containerized using Docker and Docker Compose. It includes the Next.js web application, the Node.js background workers (Sync), PostgreSQL, and Redis.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed and running.
- [Docker Compose](https://docs.docker.com/compose/install/) installed.

## Environment Variables
Before running the application, make sure your `.env` file is properly configured.
1. Ensure `NEXT_PUBLIC_APP_URL` is set to the correct URL (e.g., `https://yourdomain.com`).

## Running Locally / Development

To start only the dependencies (PostgreSQL and Redis) so you can run the app natively:
```bash
docker compose up -d db redis
```

Then, generate the Prisma client and push the schema:
```bash
npx prisma generate
npx prisma db push
```

Start the web app:
```bash
npm run dev
```

Start the background workers (in a separate terminal):
```bash
npx ts-node workers/index.ts
```

## Production Deployment

To deploy the entire stack in production using Docker Compose:

1. **Build the images:**
```bash
docker compose build
```

2. **Run the database and redis first** to allow migrations:
```bash
docker compose up -d db redis
```

3. **Apply Database Schema:**
Since the app runs inside Docker, you can run the Prisma push command using a temporary node container:
```bash
docker compose run --rm web npx prisma db push
```

4. **Start the Web and Worker services:**
```bash
docker compose up -d
```

5. **Verify everything is running:**
```bash
docker compose logs -f
```


