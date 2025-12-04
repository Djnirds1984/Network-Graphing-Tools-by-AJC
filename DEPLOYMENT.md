# Deployment Guide: Network Graphing Tools

This guide covers how to deploy the application on a Linux environment (Ubuntu, Debian, or Armbian on Orange Pi/Raspberry Pi) using Nginx as a reverse proxy.

## Prerequisites

Ensure your system has the following installed:
*   **Node.js** (v18 or higher)
*   **npm** (usually comes with Node.js)
*   **Nginx**
*   **PM2** (Process Manager for Node.js)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (example for NodeSource setup)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx

# Install PM2 globally
sudo npm install -g pm2
```

---

## 1. Backend Setup

The backend connects to MikroTik routers and serves the API.

1.  Navigate to the backend directory:
    ```bash
    cd /path/to/project/backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the backend using PM2:
    ```bash
    pm2 start server.js --name "netgraph-api"
    pm2 save
    pm2 startup
    ```
    *The backend will now run on `localhost:3001`.*

---

## 2. Frontend Setup

The frontend needs to be built into static HTML/JS/CSS files.

1.  Navigate to the project root:
    ```bash
    cd /path/to/project
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Build the project:
    ```bash
    npm run build
    ```
    *This creates a `dist/` folder containing the production assets.*

4.  Move the build artifacts to a standard web directory (optional but recommended):
    ```bash
    sudo mkdir -p /var/www/netgraph
    sudo cp -r dist/* /var/www/netgraph/
    sudo chown -R www-data:www-data /var/www/netgraph
    ```

---

## 3. Nginx Configuration

Configure Nginx to serve the frontend and proxy API requests to the backend.

1.  Create a new Nginx site configuration:
    ```bash
    sudo nano /etc/nginx/sites-available/netgraph
    ```

2.  Paste the following configuration:
    ```nginx
    server {
        listen 80;
        server_name _;  # Or your domain name / IP

        root /var/www/netgraph;
        index index.html;

        # Serve Frontend
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Proxy API Requests to Backend
        location /api/ {
            proxy_pass http://localhost:3001/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  Enable the site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/netgraph /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default  # Optional: Remove default if conflicting
    ```

4.  Test and restart Nginx:
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## 4. Environment Variables

To use Gemini AI features, you need to provide the API Key during the build or runtime.

Create a `.env` file in the root directory **before building the frontend**:

```env
VITE_API_KEY=your_google_gemini_api_key
```

Then rebuild:
```bash
npm run build
sudo cp -r dist/* /var/www/netgraph/
```
*(Note: Updated `App.tsx` or `geminiService` to use `import.meta.env.VITE_API_KEY` if using Vite, though `process.env` is polyfilled by some bundlers, Vite prefers `import.meta.env`.)*

## 5. Usage

Open your browser and navigate to `http://<your-orange-pi-ip>/`.

*   **Frontend**: Loads from Nginx.
*   **Backend**: API calls go to `/api/...`, which Nginx forwards to `localhost:3001`.
