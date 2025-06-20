const { REST, Routes } = require('discord.js');

require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Borra todos los comandos globales
async function deleteGlobalCommands(clientId) {
  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] }
    );
    console.log('Todos los comandos globales han sido eliminados.');
  } catch (error) {
    console.error(error);
  }
}

// Borra todos los comandos de un servidor específico (guild)
async function deleteGuildCommands(clientId, guildId) {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: [] }
    );
    console.log(`Todos los comandos del servidor ${guildId} han sido eliminados.`);
  } catch (error) {
    console.error(error);
  }
}

// Usa tu clientId y opcionalmente guildId
const clientId = process.env.CLIENT_ID;

// Elimina comandos globales
deleteGlobalCommands(clientId);

// Si quieres eliminar comandos de un servidor específico, descomenta la siguiente línea:
// deleteGuildCommands(clientId, guildId);