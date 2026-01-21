# HUMANE HR - Complete Windows 10/11 Deployment Guide

This guide provides step-by-step instructions to deploy the HUMANE HR application on Windows 10 or Windows 11.

---

## Part 1: Installing Prerequisites

### Step 1: Install Git

1. **Download Git:**
   - Go to https://git-scm.com/download/win
   - Click "Click here to download" to get the latest version

2. **Run the Installer:**
   - Double-click the downloaded file (Git-x.x.x-64-bit.exe)
   - Click "Next" through the installation wizard
   - Keep default options (recommended)
   - On "Choosing the default editor", select your preference (Notepad++ or VS Code recommended)
   - On "Adjusting your PATH", select "Git from the command line and also from 3rd-party software"
   - Complete the installation

3. **Verify Installation:**
   - Open Command Prompt (Win + R, type `cmd`, press Enter)
   - Type: `git --version`
   - You should see: `git version 2.x.x`

4. **Configure Git (First-time setup):**
   ```cmd
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

---

### Step 2: Install Node.js

1. **Download Node.js:**
   - Go to https://nodejs.org/
   - Click the **LTS** version (v20.x.x recommended)

2. **Run the Installer:**
   - Double-click the downloaded file (node-v20.x.x-x64.msi)
   - Click "Next" through the wizard
   - Accept the license agreement
   - Keep the default installation path (C:\Program Files\nodejs\)
   - On "Tools for Native Modules", check the box to install tools (recommended)
   - Click "Install"

3. **Verify Installation:**
   - Close and reopen Command Prompt
   - Type: `node --version`
   - You should see: `v20.x.x`
   - Type: `npm --version`
   - You should see: `10.x.x`

---

### Step 3: Install PostgreSQL

1. **Download PostgreSQL:**
   - Go to https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Select the latest version (16.x recommended) for Windows x86-64

2. **Run the Installer:**
   - Double-click the downloaded file (postgresql-16.x-x-windows-x64.exe)
   - Click "Next"
   - Keep the default installation directory
   - Select all components:
     - [x] PostgreSQL Server
     - [x] pgAdmin 4
     - [x] Stack Builder (optional)
     - [x] Command Line Tools
   - Keep the default data directory
   - **Set a password for the postgres user** - REMEMBER THIS PASSWORD!
   - Keep the default port: 5432
   - Keep the default locale
   - Click "Next" and then "Finish"

3. **Add PostgreSQL to System PATH:**
   - Press Win + R, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\16\bin`
   - Click "OK" on all dialogs

4. **Verify Installation:**
   - Close and reopen Command Prompt
   - Type: `psql --version`
   - You should see: `psql (PostgreSQL) 16.x`

---

### Step 4: Install Visual Studio Code (Recommended)

1. **Download VS Code:**
   - Go to https://code.visualstudio.com/
   - Click "Download for Windows"

2. **Run the Installer:**
   - Double-click the downloaded file
   - Accept the agreement
   - Check these options:
     - [x] Add "Open with Code" action to Windows Explorer file context menu
     - [x] Add "Open with Code" action to Windows Explorer directory context menu
     - [x] Add to PATH
   - Complete the installation

---

## Part 2: Setting Up the Application

### Step 1: Clone the Repository

1. **Open Command Prompt:**
   - Press Win + R, type `cmd`, press Enter

2. **Navigate to your desired folder:**
   ```cmd
   cd C:\
   mkdir Apps
   cd Apps
   ```

3. **Clone the repository:**
   ```cmd
   git clone https://github.com/YOUR_USERNAME/humane-hr.git
   cd humane-hr
   ```
   (Replace with your actual repository URL)

---

### Step 2: Create the Database

1. **Open Command Prompt as Administrator:**
   - Press Win, type `cmd`
   - Right-click "Command Prompt" and select "Run as administrator"

2. **Connect to PostgreSQL:**
   ```cmd
   psql -U postgres
   ```
   Enter the password you set during installation.

3. **Create the database:**
   ```sql
   CREATE DATABASE humane_hr;
   \q
   ```

---

### Step 3: Configure Environment Variables

1. **Navigate to the application folder:**
   ```cmd
   cd C:\Apps\humane-hr
   ```

2. **Create the .env file:**
   Open Notepad and paste the following:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/humane_hr
   SESSION_SECRET=your-very-long-random-secret-string-at-least-32-characters
   NODE_ENV=production
   PORT=5000
   ```

3. **Replace values:**
   - Replace `YOUR_PASSWORD` with your PostgreSQL password
   - Replace the SESSION_SECRET with a long random string (you can use: https://randomkeygen.com/)

4. **Save the file:**
   - File > Save As
   - Navigate to `C:\Apps\humane-hr`
   - Filename: `.env` (include the dot)
   - Save as type: "All Files (*.*)"
   - Click Save

---

### Step 4: Install Dependencies

1. **Open Command Prompt in the application folder:**
   ```cmd
   cd C:\Apps\humane-hr
   npm install
   ```
   Wait for all packages to install (may take 2-5 minutes).

---

### Step 5: Initialize the Database

1. **Push the database schema:**
   ```cmd
   npm run db:push
   ```

2. **Create the Super Admin account:**
   Connect to the database:
   ```cmd
   psql -U postgres -d humane_hr
   ```

   Run this SQL command:
   ```sql
   INSERT INTO app_users (id, email, password_hash, role, first_name, last_name)
   VALUES (
     gen_random_uuid()::text,
     'admin@example.com',
     '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.1G',
     'super_admin',
     'Super',
     'Admin'
   );
   \q
   ```

   **Default login credentials:**
   - Email: admin@example.com
   - Password: Admin@123

---

### Step 6: Build and Run the Application

1. **Build the application:**
   ```cmd
   npm run build
   ```

2. **Start the application:**
   ```cmd
   npm start
   ```

3. **Access the application:**
   - Open your browser
   - Go to: http://localhost:5000
   - Login with admin@example.com / Admin@123

---

## Part 3: Running as a Windows Service (Production)

### Option A: Using PM2 (Recommended)

1. **Install PM2 globally:**
   ```cmd
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```

2. **Start the application with PM2:**
   ```cmd
   cd C:\Apps\humane-hr
   pm2 start npm --name "humane-hr" -- start
   ```

3. **Configure auto-start on Windows boot:**
   ```cmd
   pm2-startup install
   pm2 save
   ```

4. **Useful PM2 commands:**
   ```cmd
   pm2 status              # Check application status
   pm2 logs humane-hr      # View application logs
   pm2 restart humane-hr   # Restart the application
   pm2 stop humane-hr      # Stop the application
   pm2 delete humane-hr    # Remove from PM2
   ```

### Option B: Using NSSM (Non-Sucking Service Manager)

1. **Download NSSM:**
   - Go to https://nssm.cc/download
   - Download the latest version
   - Extract the zip file
   - Copy `nssm.exe` from the `win64` folder to `C:\Windows\System32`

2. **Install the service:**
   ```cmd
   nssm install HumaneHR
   ```

3. **Configure in the GUI:**
   - **Path:** `C:\Program Files\nodejs\node.exe`
   - **Startup directory:** `C:\Apps\humane-hr`
   - **Arguments:** `C:\Apps\humane-hr\dist\index.js`
   - Go to "Environment" tab and add:
     ```
     DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/humane_hr
     SESSION_SECRET=your-secret-here
     NODE_ENV=production
     PORT=5000
     ```

4. **Start the service:**
   ```cmd
   nssm start HumaneHR
   ```

5. **Manage the service:**
   ```cmd
   nssm status HumaneHR    # Check status
   nssm stop HumaneHR      # Stop service
   nssm restart HumaneHR   # Restart service
   nssm remove HumaneHR    # Remove service
   ```

---

## Part 4: Network Configuration

### Configure Windows Firewall

1. **Open Windows Defender Firewall:**
   - Press Win, type "Windows Defender Firewall"
   - Click "Advanced settings"

2. **Create Inbound Rule:**
   - Click "Inbound Rules" in the left panel
   - Click "New Rule..." in the right panel
   - Select "Port" > Next
   - Select "TCP" and enter port: 5000 > Next
   - Select "Allow the connection" > Next
   - Check all profiles (Domain, Private, Public) > Next
   - Name: "HUMANE HR Application" > Finish

### Access from Other Computers

1. **Find your computer's IP address:**
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" under your network adapter (e.g., 192.168.1.100)

2. **Access from other devices:**
   - Open browser on any device on the same network
   - Go to: http://192.168.1.100:5000 (use your actual IP)

---

## Part 5: Backup and Maintenance

### Database Backup

**Create a backup:**
```cmd
pg_dump -U postgres humane_hr > C:\Backups\humane_hr_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql
```

**Restore from backup:**
```cmd
psql -U postgres humane_hr < C:\Backups\humane_hr_backup_20240115.sql
```

### Schedule Automatic Backups

1. Open Task Scheduler (Press Win, type "Task Scheduler")
2. Click "Create Basic Task"
3. Name: "HUMANE HR Database Backup"
4. Trigger: Daily at your preferred time
5. Action: Start a program
6. Program: `C:\Program Files\PostgreSQL\16\bin\pg_dump.exe`
7. Arguments: `-U postgres humane_hr -f C:\Backups\humane_hr_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql`

### Updating the Application

```cmd
# 1. Stop the application
pm2 stop humane-hr

# 2. Navigate to application folder
cd C:\Apps\humane-hr

# 3. Pull latest code
git pull origin main

# 4. Install any new dependencies
npm install

# 5. Push database changes (if any)
npm run db:push

# 6. Rebuild the application
npm run build

# 7. Restart the application
pm2 restart humane-hr
```

---

## Part 6: Troubleshooting

### Common Issues

**1. "Port 5000 already in use"**
```cmd
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

**2. "Cannot connect to database"**
- Verify PostgreSQL service is running:
  - Press Win + R, type `services.msc`
  - Find "postgresql-x64-16" and ensure it's "Running"
- Check DATABASE_URL in .env file
- Verify password is correct

**3. "npm command not found"**
- Close and reopen Command Prompt
- If still not working, verify Node.js PATH:
  - System Properties > Environment Variables > Path
  - Should contain: `C:\Program Files\nodejs\`

**4. "git command not found"**
- Close and reopen Command Prompt
- Verify Git PATH in Environment Variables

**5. "Application shows blank page"**
- Clear browser cache (Ctrl + Shift + Delete)
- Check if build was successful: `npm run build`
- Check logs: `pm2 logs humane-hr`

**6. "Session expires immediately"**
- Verify SESSION_SECRET is set in .env
- Ensure it's at least 32 characters long

---

## Part 7: Security Recommendations

1. **Change default admin password** immediately after first login
2. **Use strong passwords** for PostgreSQL and application accounts
3. **Keep software updated:**
   - Node.js: Download new versions from nodejs.org
   - PostgreSQL: Use Stack Builder or download updates
   - Application: `git pull` and rebuild
4. **Regular backups** - Schedule daily database backups
5. **Firewall** - Only open port 5000 if network access is needed
6. **HTTPS** - For internet-facing deployments, use a reverse proxy (nginx/IIS) with SSL

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 (1903+) | Windows 11 |
| RAM | 4 GB | 8 GB |
| Disk Space | 2 GB | 5 GB |
| CPU | 2 cores | 4 cores |
| Browser | Chrome, Firefox, Edge | Latest version |

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Start app (development) | `npm run dev` |
| Build for production | `npm run build` |
| Start app (production) | `npm start` |
| Push DB schema | `npm run db:push` |
| View PM2 status | `pm2 status` |
| View PM2 logs | `pm2 logs humane-hr` |
| Restart with PM2 | `pm2 restart humane-hr` |
| Backup database | `pg_dump -U postgres humane_hr > backup.sql` |
| Connect to database | `psql -U postgres -d humane_hr` |

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review application logs: `pm2 logs humane-hr`
3. Check database connectivity: `psql -U postgres -d humane_hr`
