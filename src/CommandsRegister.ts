import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import dotenv from 'dotenv';

dotenv.config();

const commands = [{
    name: 'test',
    description: 'yes, imagine, the ping command'
}];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

try {
    console.log('Registrando comandos...');

    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
        { body: commands }
    );

    console.log('Command registrated ');
} catch (error) {
    console.error(error);
}