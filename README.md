# (JIH) Hospital Queue Reminder

**Note**: It is not official and is not affiliated with the hospital in any way. It is a personal project that I made to help me keep track of my queue information.

This is a Node.js project that automates the process of retrieving a user's queue information from a hospital website and sending it to the user via Telegram. It uses the Playwright library to interact with the website and the Prisma ORM to interact with a PostgreSQL database.

## Installation

1. Clone this repository:

  ```bash
  git clone https://github.com/helmisatria/telebot-jih-reminder.git
  cd telebot-jih-reminder
  ```
2.	Install the dependencies:

  ```bash
  npm install
  ```

3.	Set up the environment variables:

  ```bash
  cp .env.example .env
  ```
  Then edit the `.env` file and fill in the required values.

4.	Set up the database:
  ```bash
  npx prisma migrate dev
  ```

## Usage

  To start the application:
  ```bash
  npx ts-node app.ts
  ```

The application will run continuously and periodically check for updates to the user’s queue information. If there are any updates, it will send a message to the user via Telegram.

## Contributing

Contributions are welcome! If you have any suggestions or bug reports, please open an issue or a pull request.

