#!/bin/bash
# Deployment script for Ubuntu on AWS EC2
# Run this script on your EC2 instance

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20) and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Install PM2 globally for managing the Node process
sudo npm install -g pm2

# Move to app directory (Assuming the app is in /var/www/ppts-web)
sudo mkdir -p /var/www/ppts-web
# NOTE: You should copy your project files to /var/www/ppts-web before running npm install here
# Example: scp -r * ubuntu@YOUR_EC2_IP:/var/www/ppts-web

cd /var/www/ppts-web

# Install dependencies
npm install

# Setup environment variables
echo "PORT=3000" > .env
echo "SECRET_CODE=your_secret_code_here" >> .env

# Start app with PM2
pm2 start server.js --name "ppts-web"
pm2 save
pm2 startup

# Configure Nginx
cat << 'EOF' | sudo tee /etc/nginx/sites-available/ppts-web
server {
    listen 80;
    server_name ppt.eryzalabs.cloud;

    # Allow large uploads for PPTs
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/ppts-web /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Certbot
# Make sure your DNS is pointing ppt.eryzalabs.cloud to the EC2 instance IP before running this
sudo certbot --nginx -d ppt.eryzalabs.cloud --non-interactive --agree-tos -m admin@eryzalabs.cloud

echo "Deployment complete! Application should be available at https://ppt.eryzalabs.cloud"
