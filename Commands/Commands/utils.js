var commands = []

commands.ping = {
  adminOnly: false,
  modOnly: false,
  fn: function (client, message) {
    message.reply('Pong!')
  }
}

commands['admin-only'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix) {
    message.channel.sendMessage(suffix)
  }
}

commands['mod-only'] = {
  adminOnly: false,
  modOnly: true,
  fn: function (client, message, suffix) {
    message.channel.sendMessage(suffix)
  }
}

commands['shutdown'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix) {
    message.reply('Okay, shutting down.')
    console.log('I was shutdown! I would give a talking to', message.author.username, ', I think they were the one who shut me down.')
    client.disconnect()
  }
}

commands['uservoice'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    uvClient.loginAsOwner()

    uvClient.get('tickets.json')
      .then(function (tickets) {
        message.reply('Ok, Here is all the tickets \'\'\'', tickets, ' \'\'\'')
      })
      .catch(function (error) {
        // error handling
        console.error(error)
      })
  }
}

exports.Commands = commands