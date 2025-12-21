# HUMANE - Local Deployment Guide for Mac

This guide explains how to run the HUMANE HR Management System locally on your Mac computer.

---

## Prerequisites

Before you begin, make sure you have the following installed on your Mac:

### 1. Node.js (version 18 or higher)

**Install using Homebrew:**
```bash
brew install node
```

**Or download from:** https://nodejs.org/

**Verify installation:**
```bash
node --version
npm --version
```

### 2. PostgreSQL Database

**Install using Homebrew:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Or download from:** https://www.postgresql.org/download/macosx/

**Verify installation:**
```bash
psql --version
```

### 3. Git (usually pre-installed on Mac)

**Verify installation:**
```bash
git --version
```

---

## Step-by-Step Setup

### Step 1: Download the Project

**Option A - Clone from Replit:**
1. Go to your Replit project
2. Click the three dots menu (...)
3. Select "Download as zip"
4. Extract the zip file to your desired location

**Option B - If you have Git access:**
```bash
git clone <your-repository-url>
cd <project-folder>
```

### Step 2: Install Dependencies

Open Terminal, navigate to the project folder, and run:

```bash
npm install
```

### Step 3: Set Up the Database

**Create a new PostgreSQL database:**
```bash
createdb humane_hr
```

**Or using psql:**
```bash
psql postgres
CREATE DATABASE humane_hr;
\q
```

### Step 4: Configure Environment Variables

Create a file named `.env` in the project root folder with the following content:

```env
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/humane_hr
SESSION_SECRET=your-secret-key-here-make-it-long-and-random
NODE_ENV=development
```

**Replace:**
- `your_username` with your Mac username (or postgres username)
- `your_password` with your PostgreSQL password (leave empty if none)
- `your-secret-key-here-make-it-long-and-random` with a random string

**Example (if no password):**
```env
DATABASE_URL=postgresql://johnsmith@localhost:5432/humane_hr
SESSION_SECRET=my-super-secret-key-12345-abcdef
NODE_ENV=development
```

### Step 5: Run Database Migrations

Push the database schema to your local PostgreSQL:

```bash
npm run db:push
```

### Step 6: Start the Application

```bash
npm run dev
```

The application will start and be available at:
```
http://localhost:5000
```

---

## First Time Setup

### Create Super Admin Account

On first run, you'll need to create a Super Admin account. Run this SQL in your database:

```bash
psql humane_hr
```

Then execute:
```sql
-- First, create a password hash for your admin (example password: "Admin@123")
-- You'll need to use the application's registration or manually insert

INSERT INTO app_users (id, email, password, first_name, last_name, role, is_active, is_pending)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$example_hash_here',
  'Super',
  'Admin',
  'super_admin',
  true,
  false
);
```

**Note:** For the password hash, you may need to:
1. Temporarily modify the code to log a hashed password
2. Or use an online bcrypt generator with cost factor 10

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio (database UI) |

---

## Troubleshooting

### "Connection refused" error
- Make sure PostgreSQL is running: `brew services start postgresql@15`

### "Database does not exist" error
- Create the database: `createdb humane_hr`

### "Permission denied" error
- Check your DATABASE_URL username and password

### Port 5000 already in use
- Kill the process using port 5000: `lsof -ti:5000 | xargs kill -9`
- Or change the port in the code

### Node modules issues
- Delete and reinstall: `rm -rf node_modules && npm install`

---

## Accessing the Application

Once running, open your browser and go to:

```
http://localhost:5000
```

You can now:
1. Log in as Super Admin
2. Create organizations
3. Add employees
4. Use all HR features

---

## Stopping the Application

Press `Ctrl + C` in the Terminal where the app is running.

To stop PostgreSQL:
```bash
brew services stop postgresql@15
```

---

## System Requirements

- **macOS:** 10.15 (Catalina) or later
- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 500MB for application + database
- **Node.js:** Version 18 or higher
- **PostgreSQL:** Version 14 or higher
