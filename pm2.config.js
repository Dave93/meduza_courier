module.exports = {
  apps: [
    {
      name: "courierbot",
      script: "./index.js",
      watch: false,
      env: {
        PORT: 3000,
        NODE_ENV: "development",
      },
      env_production: {
        PORT: 3232,
        NODE_ENV: "production",
        WEBHOOK_URL: "https://courierbot.meduza-carwash.uz",
        TELEGRAM_TOKEN: "5463442210:AAGwAXHfrTLVjD8dF8bivf--Ckte6uowNq0",
        GRAPHQL_API_URL: "https://api.meduza-carwash.uz/graphql",
	WEB_LINK: "https://webapp.meduza-carwash.uz"
      },
    },
  ],
};
