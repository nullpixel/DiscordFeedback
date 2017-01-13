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
      message.channel.sendTyping()
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
                fields: [{
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
    } else if (suffix === null) {
      message.channel.sendMessage('You need to specify a command.')
    } else {
      message.channel.sendMessage('No such command. :cry:')
    }
  }
}

commands['uv-search'] = {
  adminOnly: true,
  modOnly: false,
  fn: function (client, message, suffix, UserVoice, uvClient, Config) {
    message.channel.sendTyping()
    if (suffix === null) {
      message.channel.sendMessage('You need to specify a search term.')
    } else {
      search(Config, uvClient, suffix)
        .then(function (search) {
          search.suggestions.forEach(function (suggest) {
            var searchSuggest = JSON.stringify(suggest)
            message.channel.sendMessage(['\n```\n' + searchSuggest + '\n```'])
              .catch(function (e) {
                console.log(e)
                message.channel.sendMessage(['There was an error:' + '\n```\n' + e + '\n```'])
              })
          })
        })
        .catch(function (e) {
          console.log(e)
          var er = JSON.stringify(e)
          message.channel.sendMessage(['There was an error:' + '\n```\n' + er + '\n```'])
        })
    }
  }
}

exports.Commands = commands

function listSuggestions(Config, uvClient) {
  return new Promise((resolve, reject) => {
    uvClient.loginAsOwner()
    var uV = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions.json']
    uvClient.get(uV.toString(), {
        sort: 'newest'
      })
      .then(resolve)
      .catch(reject)
  })
}

function search(Config, uvClient, query) {
  return new Promise((resolve, reject) => {
    uvClient.loginAsOwner()
    var uV = ['forums/' + Config.uservoice.forumId.trim() + '/suggestions/search.json']
    uvClient.get(uV.toString(), {
        query: query
      })
      .then(resolve)
      .catch(reject)
  })
}