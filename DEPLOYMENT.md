# Deployment Guide: Network Graphing Tools (Default Nginx Config)

This guide explains how to deploy the application on Linux (Ubuntu/Armbian) by modifying the **default** Nginx configuration file.

## Prerequisites

1.  **Update System & Install Tools**:
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y nodejs npm nginx git
    
    # Install PM2 (Process Manager)
    sudo npm install -g pm2
    ```

---

## 1. Get the Source Code

Clone the project repository to your server:

```bash
cd ~
git clone https://github.com/Djnirds1984/Network-Graphing-Tools-by-AJC.git
cd Network-Graphing-Tools-by-AJC
```

---

## 2. Backend Setup (API)

The backend runs on port 3001 and handles MikroTik connections.

1.  Navigate to the backend folder:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the server with PM2:
    ```bash
    pm2 start server.js --name "netgraph-api"
    pm2 save
    pm2 startup
    ```

---

## 3. Frontend Setup (React App)

We will build the frontend and copy the files to the default Nginx web root (`/var/www/html`).

1.  Navigate back to the project root:
    ```bash
    cd ..
    ```

2.  **Configure API Key**:
    Create a `.env` file for the build process (replacing `your_key_here` with your actual Gemini API Key):
    ```bash
    echo "VITE_API_KEY=your_key_here" > .env
    ```

3.  Install dependencies and Build:
    ```bash
    npm install
    npm run build
    ```

4.  **Deploy to Web Root**:
    Remove default Nginx files and copy your build:
    ```bash
    sudo rm -rf /var/www/html/*
    sudo cp -r dist/* /var/www/html/
    
    # Set permissions
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 755 /var/www/html
    ```

---

## 4. Nginx Configuration (Default File)

We will edit `/etc/nginx/sites-available/default` to serve the React app and proxy the API.

1.  Open the default config:
    ```bash
    sudo nano /etc/nginx/sites-available/default
    ```

2.  **Replace the entire file content** with the following configuration:

    ```nginx
    server {
        listen 80 default_server;
        listen [::]:80 default_server;

        # The root directory where we copied the 'dist' files
        root /var/www/html;

        # Add index.html to the list
        index index.html index.htm index.nginx-debian.html;

        server_name _;

        # 1. Frontend: Serve React App
        location / {
            # This is crucial for React Router (Single Page Apps)
            # If file doesn't exist, serve index.html
            try_files $uri $uri/ /index.html;
        }

        # 2. Backend: Proxy API requests to Node.js
        location /api/ {
            # Proxy to the PM2 process running on port 3001
            proxy_pass http://localhost:3001/api/;
            
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  Save and Exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

4.  Test and Restart Nginx:
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## 5. Verification

1.  Open your browser and enter the IP address of your Orange Pi/Server.
    *   Example: `http://192.168.1.100`
2.  You should see the login screen.
3.  Register a new account.
4.  Add a router. The app will attempt to connect to the router via the backend proxy (`/api/...` -> `localhost:3001`).

## Troubleshooting

*   **API Connection Failed**: Check if the backend is running: `pm2 status`.
*   **404 on Refresh**: Ensure the `try_files $uri $uri/ /index.html;` line is correct in Nginx config.
*   **Permission Denied**: Ensure `/var/www/html` is owned by `www-data` or readable by Nginx.
