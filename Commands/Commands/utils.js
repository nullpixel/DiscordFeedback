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

commands['uv-suggest'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    if (suffix === 'list') {
      listSuggestions(Config, uvClient)
      .then(function (suggestionsList) {
        suggestionsList.suggestions.forEach(function (suggestions) {
          message.channel.sendMessage('', false, {
            title: suggestions.title,
            url: suggestions.url,
            timestamp: suggestions.created_at,
            color: 0x3498db,
            author: {
              name: suggestions.creator.name,
              url: suggestions.creator.url,
              icon_url: suggestions.creator.avatar_url
            },
            fields: [
              {
                name: 'Votes',
                value: suggestions.vote_count
              },
              {
                name: 'Created',
                value: suggestions.topic.created_at
              },
              {
                name: 'Last updated',
                value: suggestions.topic.updated_at
              }
            ]
          })
          .catch(function (e) {
            console.log(e.response.error)
            message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
          })
        })
      })
      .catch(function (e) {
        console.log(e)
        message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
      })
    }
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
