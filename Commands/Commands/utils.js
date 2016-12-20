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

commands['uv'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    uvClient.loginAsOwner()

    uvClient.get(['forums/' + Config.uservoice.forumId.trim() + '/suggestions.json'])
      .then(function (suggestions) {
        var suggest = JSON.stringify(suggestions)
        //message.channel.sendMessage('Ok, Here is all the comments: \n```json\n', suggest, '\n```')
        message.channel.sendMessage(['Ok, Here are all suggestions:\n```json\n' + suggest.trim() + '\n```'])
        //console.log(suggest)
      })
      .catch(function (error) {
        // error handling
        console.error(error)
      })
  }
}

exports.Commands = commands
