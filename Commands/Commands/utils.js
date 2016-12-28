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
    var uV = Array.toString(['forums/' + Config.uservoice.forumId.trim() + '/suggestions.json'])
    listSuggestions(Config, uvClient)
      .then(function (suggestionsList) {
        var suggestList = JSON.stringify(suggestionsList)
        message.channel.sendMessage(['```json\n' + suggestList + '\n```'])
      })
      .catch(function (e) {
        console.log(e)
        message.channel.sendMessage(['There was an error accessing:' + '\nURL=``' + uV + '``'])
      })
  }
}

exports.Commands = commands

function listSuggestions (Config, uvClient) {
  return new Promise((resolve, reject) => {
    uvClient.loginAsOwner()
    var uV = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions.json']
    uvClient.get(uV.toString())
      .then(resolve)
      .catch(reject)
  })
}
