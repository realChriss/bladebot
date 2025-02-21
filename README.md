# BladeBot

BladeBot is a Discord bot designed for BladeBall clan-servers to manage user applications, warns, and various server events. It is built using TypeScript, Discord.js, and Prisma, and is fully containerized for production deployment.

## Features

- **Application Management**  
  Allows users to apply for the clan via interactive modals. Applications are validated against Roblox details and stored in the database. Administrators can view pending applications (see [`pendingApplications`](src/bot/slash/pendingApplications.ts)) and process them accordingly.

- **Warns & Notifications**  
  Provides commands to issue warnings for unmet AP or donation requirements. Each warn is recorded in the database and users are notified through direct messages. Check out the [`warn`](src/bot/slash/warn.ts) command for details.

- **Interactive Slash Commands**  
  Supports a range of slash commands such as `/ping` for latency checks, `/open` and `/close` for toggling application availability, and `/embed` for sending application embeds. The commands are built with [Discord.js](https://discord.js.org) and managed via [`ClientSlash`](src/bot/classes/ClientSlash.ts).

- **Role & Invite Management**  
  Automatically assigns clan roles upon application acceptance, updates application statuses, and manages pending invites through interactive buttons. Refer to [`applicationAction`](src/bot/events/applicationAction.ts) and [`inviteSend`](src/bot/events/inviteSend.ts) for more details.

## Project Structure

- **src/**
  Contains all source code. Major folders include:
  - **bot/**: Discord bot logic, command and event handlers, slash commands, and stores.
  - **db/**: Prisma client and database schema interactions.
  - **utils/**: Utility classes like the Logger and ConfigManager.
- **env/**
  Environment variable files for different deployments (e.g. `clan.env`).

- **schema.prisma**
  Prisma schema file defining the database models.

- **package.json**
  Contains project scripts and dependencies.

## Setup Instructions

1. **Clone the Repository**

Run the following in your terminal:

```
git clone <repository-url>
```

2. **Install Dependencies**

Install the required packages using npm:

```
npm install
```

3. **Environment Configuration**

- Create a folder called `env` in the root of the project.
- Create an environment file (e.g `clan.env`).
- Fill it with the values of the [.env.example](.env.example) file.
- Link the file to your `docker-compose.yaml` file.

4. **Database Setup**

- Create a database.
- Make sure to correctly paste the URL into the `env` file.
- The tables will be configured, when the bot runs (database must be empty).

5. **Prisma Schema**

To generate the Prisma schema, run:

```
npx prisma generate
```

6. **Docker Deployment**

To deploy with Docker, use the provided shell scripts:

- Start the containers:

  ```
  sh up.sh
  ```

- To restart the bot:

  ```
  sh restart.sh
  ```

- To stop the containers:

  ```
  sh down.sh
  ```

## Development

- **TypeScript:**  
  The entire project is written in TypeScript.
- **Linting & Formatting:**  
  Uses Prettier for code formatting. You can format the code by running:

  ```
  npm run pretty
  ```

- **Testing:**  
  Run TypeScript type checks using:

  ```
  npm run test
  ```

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and open a pull request.

## License

This project is licensed under the ISC License.
