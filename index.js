// Imports
const Discordie = require('discordie')
const UserVoice = require('uservoice-nodejs')
// Map Discordie Events to Events
const Events = Discordie.Events
// Import the seperate files needed for discordie
const Config = require('./config.js')
const Commands = require('./Utils/command_engine').Commands
const AccessChecker = require('./Utils/access_checker')
// Connection Settings for the bot
const bot = new Discordie({
  autoReconnect: true,
  messageCacheLimit:  Config.discord.messageCacheLimit
})

// UserVoice API V2 Variables
var v2Client = new UserVoice.ClientV2({
  clientId: Config.uservoice.key,
  subdomain: Config.uservoice.subdomain
})

// UserVoice API V1 Variables
// All of the Variables are trim()'d because the V1 client fails to work otherwise
// (AKA they don't call trim within the library to keep whitespace outside of the input)
var uvClient = new UserVoice.Client({
  subdomain: Config.uservoice.subdomain.trim(),
  domain: Config.uservoice.domain.trim(),
  apiKey: Config.uservoice.key.trim(),
  apiSecret: Config.uservoice.secret.trim()
})

// This is what allows the bot to repsond to commands
bot.Dispatcher.on(Events.MESSAGE_CREATE, (c) => {
  // Checks if the message has the specified prefix
  if (c.message.content.indexOf(Config.discord.prefix) === 0 || c.message.content.indexOf(bot.User.mention, ' ') === 0) {
    var cmd = c.message.content.substr(Config.discord.prefix.length).split(' ')[0].toLowerCase()
    var suffix
    suffix = c.message.content.substr(Config.discord.prefix.length).split(' ')
    suffix = suffix.slice(1, suffix.length).join(' ')
    var msg = c.message
    // Checks if the message is a command
    if (Commands[cmd]) {
      msg.guild.textChannels.find(c => c.name === 'bot-log').sendMessage(['**' + msg.author.username + '#' + msg.author.discriminator + '**' + ' did the command: ``' + msg.content + '``'])
      // Check is the user calling the command has the correct permissions
      // if the command is restricted to mods, and the user isn't one, fail to exucute the command
      AccessChecker.getLevel(msg.member, (level) => {
        if (level === 0 && Commands[cmd].adminOnly === true || level === 0 && Commands[cmd].modOnly === true) {
          msg.reply('this command is restricted, and not available to you.')
          return
        }
        // if the command is restricted to admins, and the user isn't one, fail to exucute the command
        if (level === 1 && Commands[cmd].adminOnly === true) {
          msg.reply('sorry, only admins can use this command.')
          return
        }
        // if the above checks don't fail, pass specific variables to the commands & exucute them.
        try {
          Commands[cmd].fn(bot, msg, suffix, UserVoice, uvClient, Config)
        // if the command fails (unhandled exception, or bad code, etc.) return the error to console and
        // reply that the command failed to process.
        } catch (e) {
          console.error(e)
          msg.reply('an error occured while proccessing this command, the admins have been alerted, please try again later')
        }
      })
    // If the command a user specified doesn't exist, reply no such command.
    } else {
      msg.reply('No such command, sorry. :cry:')
    }
  }
})

// Gateway connection event
bot.Dispatcher.on(Events.GATEWAY_READY, () => {
  // Log to console that the bot is logged in
  console.log('Feedback bot is ready!')
  // Find the specified guild name in the list of connected guilds
  var guild = bot.Guilds.find(g => g.name === 'Discord Feedback Testing')
  // Find the specified text channel in the guild specified above.
  var channel = guild.textChannels.find(c => c.name === 'bot-spam')

  // In the specified guild & channel, send to a "I'm online" msg
  channel.sendMessage('Bot is Online!')
})

// Log to console when the bot loses conntection with the delay till reconnect
bot.Dispatcher.on(Events.DISCONNECTED, (e) => {
  console.error('Connection to Discord has been lost... Delay till reconnect:', e.delay)
})

// Log to console when there is a successfull reconnect
bot.Dispatcher.on(Events.GATEWAY_RESUMED, () => {
  console.log('Reconnected.')
})

// Connect to the discord Gateway with specified token
bot.connect({
  token: Config.discord.token
})
