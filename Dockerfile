FROM node:krypton-alpine

WORKDIR /app

COPY package*.json ./

# Dev install including devDependencies
RUN npm install

COPY . .

# Frontend unified to port 80
EXPOSE 80

# Next.js development server running on port 80
CMD ["npm", "run", "dev", "--", "-p", "80"]
