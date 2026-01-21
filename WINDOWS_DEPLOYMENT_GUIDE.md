# HUMANE HR - Windows 10/11 Deployment Guide

## Prerequisites

### 1. Install Node.js (v20 or higher)
1. Download Node.js from https://nodejs.org/
2. Choose the LTS version (v20.x recommended)
3. Run the installer and follow the prompts
4. Verify installation by opening Command Prompt or PowerShell:
   ```
   node --version
   npm --version
   ```

### 2. Install PostgreSQL (v14 or higher)
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Set a password for the postgres user (remember this!)
4. Keep the default port (5432)
5. Complete the installation
6. Verify by opening pgAdmin or running in Command Prompt:
   ```
   psql --version
   ```

### 3. Install Git (Optional but recommended)
1. Download from https://git-scm.com/download/win
2. Run the installer with default options

## Database Setup

### Create the Database
1. Open pgAdmin (installed with PostgreSQL) or use Command Prompt
2. Using pgAdmin:
   - Right-click "Databases" > Create > Database
   - Name it `humane_hr`
   - Click Save

3. Or using Command Prompt (run as Administrator):
   ```
   psql -U postgres
   CREATE DATABASE humane_hr;
   \q
   ```

## Application Setup

### Step 1: Download/Copy the Application
Copy the application folder to your desired location, for example:
```
C:\Apps\humane-hr
```

### Step 2: Install Dependencies
Open Command Prompt or PowerShell, navigate to the application folder:
```
cd C:\Apps\humane-hr
npm install
```

### Step 3: Configure Environment Variables
Create a file named `.env` in the application root folder with the following content:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/humane_hr
SESSION_SECRET=your-secure-random-string-here-make-it-long
NODE_ENV=production
PORT=5000
```

Replace:
- `YOUR_PASSWORD` with your PostgreSQL password
- `your-secure-random-string-here-make-it-long` with a random string (at least 32 characters)

### Step 4: Initialize the Database
Run the database migration:
```
npm run db:push
```

### Step 5: Create Super Admin Account
Run the seed script or manually create via SQL:
```sql
-- Run this in pgAdmin or psql
INSERT INTO app_users (email, password_hash, role, first_name, last_name)
VALUES (
  'admin@example.com',
  '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.1G',
  'super_admin',
  'Super',
  'Admin'
);
```
Default credentials: admin@example.com / Admin@123

## Running the Application

### Development Mode
```
npm run dev
```
Access at: http://localhost:5000

### Production Mode
```
npm run build
npm start
```
Access at: http://localhost:5000

## Running as a Windows Service (Recommended for Production)

### Option 1: Using PM2
1. Install PM2 globally:
   ```
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```

2. Start the application:
   ```
   pm2 start npm --name "humane-hr" -- start
   ```

3. Configure auto-start on boot:
   ```
   pm2-startup install
   pm2 save
   ```

4. Useful PM2 commands:
   ```
   pm2 status          # Check status
   pm2 logs humane-hr  # View logs
   pm2 restart humane-hr  # Restart app
   pm2 stop humane-hr     # Stop app
   ```

### Option 2: Using NSSM (Non-Sucking Service Manager)
1. Download NSSM from https://nssm.cc/download
2. Extract and copy nssm.exe to C:\Windows\System32
3. Install the service:
   ```
   nssm install HumaneHR
   ```
4. In the GUI:
   - Path: C:\Program Files\nodejs\node.exe
   - Startup directory: C:\Apps\humane-hr
   - Arguments: C:\Apps\humane-hr\dist\index.js
5. Start the service:
   ```
   nssm start HumaneHR
   ```

## Firewall Configuration

To allow access from other computers on the network:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Select "Inbound Rules" > "New Rule"
4. Choose "Port" > Next
5. Select "TCP" and enter port 5000
6. Allow the connection
7. Apply to all profiles
8. Name it "HUMANE HR"

## Accessing from Other Devices

Once running, access the application:
- Same computer: http://localhost:5000
- Other devices on network: http://YOUR_COMPUTER_IP:5000

Find your IP address:
```
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

## Backup and Maintenance

### Database Backup
```
pg_dump -U postgres humane_hr > backup_YYYYMMDD.sql
```

### Database Restore
```
psql -U postgres humane_hr < backup_YYYYMMDD.sql
```

### Updating the Application
1. Stop the service/application
2. Replace application files with new version
3. Run `npm install`
4. Run `npm run db:push` (if database changes)
5. Run `npm run build`
6. Start the service/application

## Troubleshooting

### Port Already in Use
```
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Database Connection Issues
- Verify PostgreSQL service is running (Services > postgresql)
- Check DATABASE_URL in .env file
- Ensure password is correct

### Application Won't Start
- Check logs: `npm run dev` for detailed errors
- Verify Node.js version: `node --version`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Session Issues
- Clear browser cookies
- Verify SESSION_SECRET is set in .env

## Security Recommendations

1. Change default admin password immediately after first login
2. Use HTTPS in production (configure with reverse proxy like nginx or IIS)
3. Keep PostgreSQL password secure
4. Regularly update Node.js and dependencies
5. Enable Windows Firewall
6. Backup database regularly

## System Requirements

- Windows 10 (version 1903 or later) or Windows 11
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space
- Modern web browser (Chrome, Firefox, Edge)
