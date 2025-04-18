# BladeBot

BladeBot is a Discord bot designed for BladeBall clan-servers to manage user applications, warns, and various server events. It is built using TypeScript, Discord.js, and Prisma, and is fully containerized for production deployment.

## Features

### Application Management

Allows users to apply for the clan via interactive modals. Applications are validated against Roblox details and stored in the database. Administrators can view pending applications and process them accordingly.

### Warns & Notifications

Provides comprehensive warning system with multiple warning types:

- **AP Warnings**: Issue warnings for members who don't meet AP (Activity Points) requirements
- **Donation Warnings**: Track members who haven't met donation requirements
- **Warning Management**: View, list, and remove warnings with detailed information
- **Direct Notifications**: Members receive DM notifications about warnings with fallback to channel messages

### Interactive Slash Commands

Supports a range of slash commands such as `/ping` for latency checks, `/settings` for configuring bot settings (including opening/closing applications), and `/embed` for sending application embeds.

### Role & Invite Management

Automatically assigns clan roles upon application acceptance, updates application statuses, and manages pending invites through interactive buttons.

### Changelog Tracking

Tracks repository changes and provides information about the current branch and commit count.

### Settings Management

Allows administrators to configure bot settings through the `/settings` command, including toggling application availability.

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

```bash
git clone <repository-url>
```

2. **Install Dependencies**

Install the required packages using npm:

```bash
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

```bash
npx prisma generate
```

6. **Emojis**

- Upload the emojis from `assets/` folder to your Discord bot via the Discord dashboard (https://discord.com/developers/applications/:appId/emojis)
- Copy the emoji Markdown (`<:Name:ID>`)
- Update the emoji strings in [emoji.ts](src/bot/assets/emoji.ts) with your new emoji

7. **Docker Deployment**

To deploy with Docker, use the provided shell scripts:

- Start the containers:

  ```bash
  sh up.sh
  ```

- To restart the bot:

  ```bash
  sh restart.sh
  ```

- To stop the containers:

  ```bash
  sh down.sh
  ```

## Development

- **TypeScript:**  
  The entire project is written in TypeScript.
- **Linting & Formatting:**  
  Uses Prettier for code formatting. You can format the code by running:

  ```bash
  npm run pretty
  ```

- **Testing:**  
  Run TypeScript type checks using:

  ```bash
  npm run test
  ```

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and open a pull request.

## License

This project is licensed under the ISC License.
