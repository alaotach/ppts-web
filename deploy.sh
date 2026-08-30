#!/bin/bash
# Deployment script for Ubuntu on AWS EC2
# Run this script from /home/aloo/ppts-web on your EC2 instance

# Ensure we are in the correct directory
cd /home/aloo/ppts-web

# Install project dependencies
npm install

# Setup environment variables
echo "PORT=3007" > .env
echo "SECRET_CODE=supersecret" >> .env

# Start app with PM2
pm2 start server.js --name "ppts-web"
pm2 save

# Configure Nginx
cat << 'EOF' | sudo tee /etc/nginx/sites-available/ppts-web
server {
    listen 80;
    server_name ppt.eryzalabs.cloud;

    # Allow large uploads for PPTs
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ppts-web /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Certbot
# Make sure your DNS is pointing ppt.eryzalabs.cloud to the EC2 instance IP before running this
sudo certbot --nginx -d ppt.eryzalabs.cloud --non-interactive --agree-tos -m admin@eryzalabs.cloud

echo "Deployment complete! Application should be available at https://ppt.eryzalabs.cloud"
